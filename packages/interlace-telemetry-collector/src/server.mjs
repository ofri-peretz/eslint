#!/usr/bin/env node
/**
 * @interlace/telemetry-collector — minimal reference HTTP collector for
 * @interlace/telemetry payloads (roadmap item 6.F).
 *
 * Built on Node's built-in `http` — zero dependencies, runs anywhere Node 22+
 * runs. Self-host this on any VPS / Fly.io / Railway / your own k8s, then
 * point your developer machines at it via:
 *
 *   export INTERLACE_TELEMETRY=1
 *   export INTERLACE_TELEMETRY_ENDPOINT=https://collector.your-org.example/ingest
 *
 * What it does:
 *
 *   POST /ingest      Accepts a telemetry batch (JSON), validates the
 *                     schema, appends one NDJSON row per event to the
 *                     storage file. Strips connection IPs at receipt.
 *   GET  /policy      Returns the operator's privacy policy (configurable).
 *   GET  /healthz     Liveness probe.
 *   GET  /metrics     Prometheus-format counters (events_total, etc.).
 *
 * What it does NOT do:
 *
 *   - Per-user analytics (sessionId is random + non-persistent by design)
 *   - PII storage (the wire format excludes PII; we don't add any)
 *   - Authentication (run behind your reverse proxy / OAuth gateway if you
 *     want auth — most self-hosters won't)
 *
 * Configuration (env vars):
 *
 *   PORT                       default 4317
 *   STORAGE_PATH               default ./telemetry-events.ndjson
 *   POLICY_PATH                default ./POLICY.md (served as text/markdown)
 *   MAX_BATCH_SIZE_BYTES       default 256 * 1024 (256 KiB)
 *   ALLOW_ORIGIN               default '*'
 *
 * Storage format: one JSON object per line, schema:
 *
 *   { receivedAt, sessionId, ts, ruleId, severity, pluginVersion,
 *     toolchain: { node, eslint, typescript, tsCompiler, ... } }
 *
 * No connection IP, no User-Agent, no inferred device fingerprint. The
 * sessionId is whatever the client sent (random UUID per process; not
 * persistent).
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const PORT                  = Number.parseInt(process.env.PORT ?? '4317', 10);
const STORAGE_PATH          = path.resolve(process.env.STORAGE_PATH ?? './telemetry-events.ndjson');
const POLICY_PATH           = path.resolve(process.env.POLICY_PATH ?? './POLICY.md');
const MAX_BATCH_SIZE_BYTES  = Number.parseInt(process.env.MAX_BATCH_SIZE_BYTES ?? String(256 * 1024), 10);
const ALLOW_ORIGIN          = process.env.ALLOW_ORIGIN ?? '*';

const counters = { events_total: 0, batches_total: 0, rejected_total: 0, started_at: Date.now() };

function corsHeaders(extra = {}) {
  return {
    'access-control-allow-origin': ALLOW_ORIGIN,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    ...extra,
  };
}

function jsonResponse(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, corsHeaders({ 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) }));
  res.end(payload);
}

function textResponse(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, corsHeaders({ 'content-type': contentType, 'content-length': Buffer.byteLength(body) }));
  res.end(body);
}

function readBody(req, max) {
  return new Promise((resolve, reject) => {
    let buf = '';
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > max) { req.destroy(); reject(new Error('payload too large')); return; }
      buf += chunk.toString('utf8');
    });
    req.on('end', () => resolve(buf));
    req.on('error', reject);
  });
}

function validateBatch(payload) {
  if (!payload || typeof payload !== 'object') return 'payload not object';
  if (payload.schemaVersion !== '1') return `unknown schemaVersion ${payload.schemaVersion}`;
  if (!payload.sessionId || typeof payload.sessionId !== 'string') return 'sessionId missing';
  if (!Array.isArray(payload.events)) return 'events not array';
  if (payload.events.length === 0) return 'events empty';
  if (payload.events.length > 1000) return `events too many (${payload.events.length})`;
  if (!payload.toolchain || typeof payload.toolchain !== 'object') return 'toolchain missing';
  // Strict allowlist on event keys to enforce the no-PII contract
  for (const e of payload.events) {
    for (const k of Object.keys(e)) {
      if (!['sessionId', 'ts', 'ruleId', 'severity', 'pluginVersion'].includes(k)) {
        return `event has disallowed key "${k}" (PII contract)`;
      }
    }
  }
  return null;
}

function appendBatch(payload) {
  const receivedAt = new Date().toISOString();
  const lines = payload.events.map((e) =>
    JSON.stringify({
      receivedAt,
      sessionId: e.sessionId ?? payload.sessionId,
      ts: e.ts,
      ruleId: e.ruleId,
      severity: e.severity,
      pluginVersion: e.pluginVersion,
      toolchain: payload.toolchain,
    })
  );
  fs.appendFileSync(STORAGE_PATH, lines.join('\n') + '\n', 'utf8');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/healthz') {
    return jsonResponse(res, 200, { ok: true, uptimeSeconds: Math.floor((Date.now() - counters.started_at) / 1000) });
  }

  if (req.method === 'GET' && req.url === '/policy') {
    if (fs.existsSync(POLICY_PATH)) {
      return textResponse(res, 200, fs.readFileSync(POLICY_PATH, 'utf8'), 'text/markdown; charset=utf-8');
    }
    return textResponse(res, 404, '# Policy not configured\n\nThe operator has not provided a privacy policy. Refuse to send data here.\n', 'text/markdown; charset=utf-8');
  }

  if (req.method === 'GET' && req.url === '/metrics') {
    const lines = [
      `# HELP interlace_telemetry_events_total Total events appended.`,
      `# TYPE interlace_telemetry_events_total counter`,
      `interlace_telemetry_events_total ${counters.events_total}`,
      `# HELP interlace_telemetry_batches_total Total batches received.`,
      `# TYPE interlace_telemetry_batches_total counter`,
      `interlace_telemetry_batches_total ${counters.batches_total}`,
      `# HELP interlace_telemetry_rejected_total Total batches rejected.`,
      `# TYPE interlace_telemetry_rejected_total counter`,
      `interlace_telemetry_rejected_total ${counters.rejected_total}`,
    ];
    return textResponse(res, 200, lines.join('\n') + '\n', 'text/plain; version=0.0.4');
  }

  if (req.method === 'POST' && req.url === '/ingest') {
    let raw;
    try { raw = await readBody(req, MAX_BATCH_SIZE_BYTES); }
    catch (err) {
      counters.rejected_total++;
      return jsonResponse(res, 413, { error: err.message });
    }
    let payload;
    try { payload = JSON.parse(raw); }
    catch (err) {
      counters.rejected_total++;
      return jsonResponse(res, 400, { error: 'invalid json: ' + err.message });
    }
    const validationError = validateBatch(payload);
    if (validationError) {
      counters.rejected_total++;
      return jsonResponse(res, 422, { error: validationError });
    }
    try {
      appendBatch(payload);
      counters.batches_total++;
      counters.events_total += payload.events.length;
      return jsonResponse(res, 202, { accepted: payload.events.length });
    } catch (err) {
      return jsonResponse(res, 500, { error: 'storage append failed: ' + err.message });
    }
  }

  jsonResponse(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`@interlace/telemetry-collector listening on :${PORT}`);
  console.log(`  storage: ${STORAGE_PATH}`);
  console.log(`  policy:  ${POLICY_PATH}${fs.existsSync(POLICY_PATH) ? '' : ' (missing — clients should refuse to send)'}`);
  console.log(`  CORS:    ${ALLOW_ORIGIN}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
