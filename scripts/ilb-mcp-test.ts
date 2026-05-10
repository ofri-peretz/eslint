#!/usr/bin/env -S npx tsx
/**
 * ilb-mcp-test — protocol-conformance test for every Interlace MCP server
 * (Tier 2.B). Spawns each server, sends an initialize handshake + a
 * `tools/list` request, then a representative `tools/call`, and asserts
 * the response shape matches the MCP spec.
 *
 * Why this exists: the 11 plugin-MCP servers compile and *look* right,
 * but no one has actually exercised the JSON-RPC plumbing. This script
 * catches:
 *
 *   - Bin entry missing or wrong path
 *   - JSON-RPC protocol violations (missing `jsonrpc: "2.0"`, etc.)
 *   - Tool definitions out of sync with the schemas
 *   - Server crash on initialize
 *
 * No real MCP SDK dependency — talks raw JSON-RPC over the server's stdio.
 *
 * Usage:
 *   node scripts/ilb-mcp-test.mjs                  # test all 11 servers
 *   node scripts/ilb-mcp-test.mjs --plugin secure-coding
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

const ARG = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};
const ONLY_PLUGIN = ARG('--plugin');

const FLEET = [
  'secure-coding', 'browser-security', 'node-security', 'crypto', 'jwt',
  'express-security', 'lambda-security', 'mongodb-security', 'nestjs-security',
  'vercel-ai-security', 'pg',
];

const EXPECTED_TOOL_NAMES = ['list_rules', 'audit_file', 'find_rule_violations', 'suggest_fix'];

let totalFailures = 0;
const perServer = [];

async function testServer(plugin) {
  const result: any = { plugin, ok: false, assertions: [] };
  const serverPath = path.join(REPO_ROOT, 'packages', `${plugin}-mcp`, 'src', 'index.mjs');
  const child = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'], cwd: REPO_ROOT });

  let buf = '';
  let pending = new Map();
  let nextId = 1;

  function send(method: string, params: any): Promise<any> {
    const id = nextId++;
    return new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`timeout waiting for ${method}`)); }, 8000);
      pending.set(id, { resolve, reject, timeout });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  }

  child.stdout.on('data', (chunk) => {
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        const p = pending.get(msg.id);
        if (p) { clearTimeout(p.timeout); pending.delete(msg.id); p.resolve(msg); }
      } catch { /* non-JSON line; ignore */ }
    }
  });

  let stderr = '';
  child.stderr.on('data', (c) => { stderr += c.toString(); });

  function assert(name, ok, detail = '') {
    result.assertions.push({ name, ok, detail });
    if (!ok) result.firstFailure = result.firstFailure ?? `${name}: ${detail}`;
  }

  try {
    // 1. initialize handshake
    const init = await send('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'ilb-mcp-test', version: '0.1.0' },
    });
    assert('initialize returns jsonrpc:2.0', init.jsonrpc === '2.0', `got ${JSON.stringify(init).slice(0, 120)}`);
    assert('initialize has serverInfo', !!init.result?.serverInfo, JSON.stringify(init.result ?? {}).slice(0, 120));
    assert('serverInfo.name matches plugin', init.result?.serverInfo?.name === `${plugin}-mcp`, `got "${init.result?.serverInfo?.name}"`);

    // 2. tools/list
    const list = await send('tools/list', {});
    const tools = list.result?.tools ?? [];
    assert('tools/list returns array', Array.isArray(tools), `got ${typeof tools}`);
    assert(`tools/list returns ${EXPECTED_TOOL_NAMES.length} tools`, tools.length === EXPECTED_TOOL_NAMES.length, `got ${tools.length}`);
    for (const expected of EXPECTED_TOOL_NAMES) {
      assert(`tools includes "${expected}"`, tools.some((t) => t.name === expected), '');
    }
    for (const t of tools) {
      assert(`tool "${t.name}" has inputSchema`, !!t.inputSchema, '');
      assert(`tool "${t.name}" has description`, !!t.description, '');
    }

    // 3. tools/call list_rules — should return at least 1 rule for any non-empty plugin
    const listRules = await send('tools/call', { name: 'list_rules', arguments: {} });
    const content = listRules.result?.content ?? [];
    assert('list_rules returns content[]', Array.isArray(content) && content.length > 0, JSON.stringify(listRules).slice(0, 150));
    if (content[0]?.type === 'text') {
      try {
        const parsed = JSON.parse(content[0].text);
        assert('list_rules content is JSON with rules[]', Array.isArray(parsed.rules), `parsed: ${JSON.stringify(parsed).slice(0, 100)}`);
        assert('list_rules.totalCount is a number', typeof parsed.totalCount === 'number', `got ${typeof parsed.totalCount}`);
      } catch (err) {
        assert('list_rules content is parseable JSON', false, err.message);
      }
    }

    result.ok = result.assertions.every((a) => a.ok);
  } catch (err) {
    result.firstFailure = result.firstFailure ?? err.message;
  } finally {
    child.kill();
  }

  result.stderr = stderr.slice(0, 200);
  return result;
}

async function main() {
  const targets = ONLY_PLUGIN ? [ONLY_PLUGIN] : FLEET;
  console.log(`ilb:mcp-test — testing ${targets.length} MCP server(s)`);
  console.log('');

  for (const plugin of targets) {
    process.stdout.write(`  ${plugin.padEnd(22)} `);
    try {
      const r = await testServer(plugin);
      perServer.push(r);
      const passed = r.assertions.filter((a) => a.ok).length;
      const total = r.assertions.length;
      if (r.ok) {
        console.log(`✅ ${passed}/${total} assertions`);
      } else {
        console.log(`❌ ${passed}/${total} — ${r.firstFailure ?? 'unknown'}`);
        totalFailures++;
      }
    } catch (err) {
      console.log(`❌ crash: ${err.message?.slice(0, 80)}`);
      perServer.push({ plugin, ok: false, error: err.message });
      totalFailures++;
    }
  }

  console.log('');
  if (totalFailures === 0) {
    console.log(`✅ ilb:mcp-test PASS — ${targets.length}/${targets.length} servers conform to MCP protocol`);
    process.exit(0);
  } else {
    console.log(`❌ ilb:mcp-test FAIL — ${totalFailures}/${targets.length} server(s) failed`);
    for (const r of perServer.filter((s) => !s.ok)) {
      console.log(`   ${r.plugin}: ${r.firstFailure ?? r.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => { console.error('ilb:mcp-test fatal:', err); process.exit(2); });
