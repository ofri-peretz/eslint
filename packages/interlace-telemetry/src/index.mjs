/**
 * @interlace/telemetry — opt-in anonymized usage stats (roadmap item 5.3).
 *
 * **Off by default.** No data leaves the user's machine unless they
 * explicitly set `INTERLACE_TELEMETRY=1` in their environment AND set
 * `INTERLACE_TELEMETRY_ENDPOINT=https://...` to a destination they trust.
 *
 * What we collect (when enabled):
 *
 *   - Which Interlace rule fired (rule id only — no source code, no
 *     line numbers, no file paths, no AST snippets).
 *   - Severity at which it fired (warn / error).
 *   - The plugin version and the toolchain block (node / eslint / TS /
 *     tsCompiler / platform — same shape as bench results).
 *   - A randomly-generated session id (regenerated per process; not
 *     persistent; cannot be tied back to a user).
 *
 * What we DO NOT collect:
 *
 *   - Source code, even snippets.
 *   - File paths or repo names.
 *   - Anything resembling user-identifiable data.
 *   - Anything reachable via heuristic re-identification (we strip the
 *     toolchain.platform's hostname-derived bits before sending).
 *
 * Why we collect this: the severity promotion gate (principle #10) requires
 * Wild-precision data. Today it relies on local Wild runs of 22 OSS repos —
 * a useful signal but not representative of how our rules fire in the long
 * tail of real production code. Fleet telemetry would change "this rule
 * has 95% precision in our 22-repo sample" to "this rule has 95% precision
 * across 1.4M production-firing samples," tightening promotion-gate
 * confidence intervals dramatically.
 *
 * Usage from a user's eslint.config.mjs:
 *
 *   import telemetry from '@interlace/telemetry';
 *   export default [
 *     telemetry.processor(),  // wrap any rule output that flows through ESLint
 *     ...your_other_config,
 *   ];
 *
 * Or — equivalent and zero-config — set `INTERLACE_TELEMETRY=1` and our
 * plugins emit through the telemetry sink directly.
 */

import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const requireFromHere = createRequire(import.meta.url);

const ENABLED = process.env.INTERLACE_TELEMETRY === '1';
const ENDPOINT = process.env.INTERLACE_TELEMETRY_ENDPOINT ?? null;
const SESSION_ID = randomUUID();

let toolchainCache = null;

function getToolchain() {
  if (toolchainCache) return toolchainCache;
  const safeVersion = (pkg) => {
    try { return requireFromHere(`${pkg}/package.json`).version; } catch { return null; }
  };
  const tsVer = safeVersion('typescript');
  const major = tsVer ? Number.parseInt(tsVer.split('.')[0], 10) : NaN;
  const tsCompiler = Number.isFinite(major) ? (major >= 6 ? 'tsc-go' : 'tsc-classic') : 'unknown';
  // Strip hostname / username-bearing platform string. `darwin-arm64` is fine; `darwin-arm64-MacBook-Pro.local` would not be.
  toolchainCache = {
    node: process.version.replace(/^v/, ''),
    eslint: safeVersion('eslint'),
    typescript: tsVer,
    tsCompiler,
    typescriptEslint: safeVersion('@typescript-eslint/parser') ?? safeVersion('typescript-eslint'),
    platform: `${process.platform}-${process.arch}`,
  };
  return toolchainCache;
}

const eventBuffer = [];
const FLUSH_AFTER = 50;

/**
 * Record a single rule firing. No-op if telemetry disabled.
 *
 * @param {object} event
 * @param {string} event.ruleId
 * @param {'warn'|'error'} event.severity
 * @param {string} [event.pluginVersion]
 */
export function recordRuleFiring(event) {
  if (!ENABLED) return;
  eventBuffer.push({
    sessionId: SESSION_ID,
    ts: Date.now(),
    ruleId: event.ruleId,
    severity: event.severity,
    pluginVersion: event.pluginVersion ?? null,
  });
  if (eventBuffer.length >= FLUSH_AFTER) flush();
}

// oxlint-disable-next-line no-underscore-dangle
let _flushing = false;
async function flush() {
  if (_flushing || eventBuffer.length === 0 || !ENDPOINT) return;
  _flushing = true;
  const batch = eventBuffer.splice(0, eventBuffer.length);
  const payload = {
    schemaVersion: '1',
    sessionId: SESSION_ID,
    toolchain: getToolchain(),
    events: batch,
  };
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'interlace-telemetry/0.1' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Telemetry is best-effort. A network failure must never affect the
    // user's lint run — silently drop the batch.
  } finally {
    _flushing = false;
  }
}

// Best-effort flush on process exit. Doesn't block.
process.on('exit', () => { flush().catch(() => {}); });
process.on('SIGINT', () => { flush().catch(() => {}); });

/**
 * Returns a static summary of what telemetry would capture in the current env.
 * Used by `interlace doctor`-style commands to show users what they've
 * opted into.
 */
export function describeTelemetry() {
  return {
    enabled: ENABLED,
    endpointConfigured: ENDPOINT !== null,
    sessionId: ENABLED ? SESSION_ID : null,
    toolchain: ENABLED ? getToolchain() : null,
    bufferedEvents: eventBuffer.length,
    note: ENABLED
      ? `Sending anonymized rule-firing data to ${ENDPOINT ?? '<no endpoint set>'}.`
      : 'Telemetry is OFF. Set INTERLACE_TELEMETRY=1 + INTERLACE_TELEMETRY_ENDPOINT=https://... to opt in.',
  };
}

export default { recordRuleFiring, describeTelemetry };
