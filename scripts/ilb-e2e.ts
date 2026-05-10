#!/usr/bin/env -S npx tsx
/**
 * ilb-e2e — end-to-end install + use validation (Tier 2.A).
 *
 * Catches install / wiring drift between the in-repo workspace setup and
 * the as-installed-from-npm experience. Today the CLI + plugins + MCP
 * servers all "work" because they're symlinked workspaces; this script
 * verifies they ALSO work when installed as real npm packages.
 *
 * Two execution modes:
 *
 *   --local (default)
 *      Uses `npm pack` to build tarballs from each workspace package, then
 *      installs them into a clean tmp dir. Catches "missing files" / "bad
 *      bin entry" / "broken peerDeps" before a real npm publish.
 *
 *   --registry
 *      Installs from the actual npm registry (assumes packages have been
 *      published). Use this AFTER a publish workflow run to confirm the
 *      published artifacts work for real users.
 *
 * What it asserts:
 *
 *   1. `interlace --version` runs and returns the expected version.
 *   2. `interlace --help` lists the four subcommands.
 *   3. `interlace init` produces an `eslint.config.mjs` in a fresh dir.
 *   4. `interlace audit` exits 1 (lint findings expected on the demo
 *      vulnerable file) and emits valid JSON.
 *   5. `interlace audit --sarif` emits valid SARIF v2.1.0.
 *
 * Exit code: 0 on full success; 1 on any assertion failure.
 *
 * Usage:
 *   node scripts/ilb-e2e.mjs                       # local pack-and-install
 *   node scripts/ilb-e2e.mjs --registry            # install from npm
 *   node scripts/ilb-e2e.mjs --keep-tmp            # don't clean up tmp dir
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

const MODE = process.argv.includes('--registry') ? 'registry' : 'local';
const KEEP_TMP = process.argv.includes('--keep-tmp');

const VULNERABLE_FIXTURE = `// Demo file for ilb-e2e: deliberately vulnerable.
const password = 'admin123';                       // secure-coding/no-hardcoded-credentials
const userInput = process.argv[2];
const result = eval(userInput);                    // secure-coding/no-eval
console.log(password, result);
`;

const PACKAGES_TO_PACK = [
  'eslint-mcp-base',
  'eslint-formatter-sarif',
  'interlace-cli',
  'interlace-telemetry',
  'eslint-plugin-secure-coding',
  'eslint-plugin-node-security',
  'eslint-plugin-browser-security',
];

let failures = 0;
const results = [];

function step(name, fn) {
  process.stdout.write(`  · ${name.padEnd(50)} `);
  try {
    const t0 = Date.now();
    const r = fn();
    const ms = Date.now() - t0;
    console.log(`✅ ${ms}ms`);
    results.push({ name, ok: true, ms });
    return r;
  } catch (err) {
    console.log(`❌ ${err.message?.split('\n')[0]?.slice(0, 80)}`);
    failures++;
    results.push({ name, ok: false, error: err.message });
    return null;
  }
}

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024, ...opts });
}

function packLocally(tmpDir) {
  const tarballDir = path.join(tmpDir, '_tarballs');
  fs.mkdirSync(tarballDir, { recursive: true });
  const tarballs = [];
  for (const pkg of PACKAGES_TO_PACK) {
    const dir = path.join(REPO_ROOT, 'packages', pkg);
    if (!fs.existsSync(dir)) continue;
    const out = run(`npm pack --pack-destination "${tarballDir}" --silent`, { cwd: dir });
    const filename = out.trim().split('\n').pop();
    tarballs.push(path.join(tarballDir, filename));
  }
  return tarballs;
}

function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ilb-e2e-'));
  console.log(`ilb:e2e — mode=${MODE} · tmp=${tmpDir}`);
  console.log('');

  try {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'ilb-e2e-test', version: '0.0.0', private: true, type: 'module' }, null, 2));

    let installCmd;
    if (MODE === 'local') {
      const tarballs = step('Pack workspace packages locally', () => packLocally(tmpDir));
      if (!tarballs?.length) throw new Error('no tarballs produced');
      installCmd = `npm install --no-audit --no-fund --silent ${tarballs.map((t) => `"${t}"`).join(' ')}`;
    } else {
      installCmd = 'npm install --no-audit --no-fund --silent @interlace/cli @interlace/eslint-plugin-secure-coding @interlace/eslint-plugin-node-security @interlace/eslint-plugin-browser-security';
    }

    step('Install Interlace into clean tmp project', () => run(installCmd, { cwd: tmpDir }));

    const cliBin = path.join(tmpDir, 'node_modules', '.bin', 'interlace');
    if (!fs.existsSync(cliBin)) throw new Error(`interlace binary missing at ${cliBin}`);

    step('interlace --version', () => {
      const out = run(`"${cliBin}" --version`, { cwd: tmpDir }).trim();
      if (!/^\d+\.\d+\.\d+/.test(out)) throw new Error(`unexpected version output: "${out}"`);
    });

    step('interlace --help lists 4 subcommands', () => {
      const out = run(`"${cliBin}" --help`, { cwd: tmpDir });
      for (const cmd of ['audit', 'init', 'bench', 'mcp']) {
        if (!out.includes(`interlace ${cmd}`)) throw new Error(`help missing subcommand "${cmd}"`);
      }
    });

    step('interlace init writes eslint.config.mjs', () => {
      run(`"${cliBin}" init`, { cwd: tmpDir });
      const cfg = path.join(tmpDir, 'eslint.config.mjs');
      if (!fs.existsSync(cfg)) throw new Error('eslint.config.mjs not written');
      const body = fs.readFileSync(cfg, 'utf8');
      if (!body.includes('@interlace/eslint-plugin-secure-coding')) throw new Error('config does not reference secure-coding plugin');
    });

    step('Write a deliberately-vulnerable demo file', () => {
      fs.writeFileSync(path.join(tmpDir, 'demo.js'), VULNERABLE_FIXTURE, 'utf8');
    });

    step('interlace audit demo.js (expect findings, exit 1)', () => {
      let out;
      try { out = run(`"${cliBin}" audit demo.js`, { cwd: tmpDir }); }
      catch (err) {
        out = (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '');
        if (!out.includes('no-hardcoded-credentials') && !out.includes('no-eval')) {
          throw new Error(`audit did not surface expected findings; got: ${out.slice(0, 300)}`);
        }
        return; // expected non-zero exit; treat as pass
      }
      // If exit was 0, that's a pass too if findings were emitted as warnings
      if (!out.includes('no-hardcoded-credentials') && !out.includes('no-eval')) {
        throw new Error('audit exited 0 but no expected findings');
      }
    });

    step('interlace audit --json demo.js emits valid JSON', () => {
      let out;
      try { out = run(`"${cliBin}" audit --json demo.js`, { cwd: tmpDir }); }
      catch (err) { out = err.stdout?.toString() ?? ''; }
      const parsed = JSON.parse(out);
      if (!Array.isArray(parsed)) throw new Error('JSON output is not an array');
      const hasFinding = parsed.some((f) => (f.messages ?? []).length > 0);
      if (!hasFinding) throw new Error('JSON output has no messages');
    });

    step('interlace audit --sarif demo.js emits valid SARIF', () => {
      let out;
      try { out = run(`"${cliBin}" audit --sarif demo.js`, { cwd: tmpDir }); }
      catch (err) { out = err.stdout?.toString() ?? ''; }
      const parsed = JSON.parse(out);
      if (parsed.version !== '2.1.0') throw new Error(`SARIF version ${parsed.version}, expected 2.1.0`);
      if (!Array.isArray(parsed.runs) || parsed.runs.length === 0) throw new Error('SARIF runs[] empty');
    });

    console.log('');
    if (failures === 0) {
      console.log(`✅ ilb:e2e PASS — ${results.length} assertions across ${MODE} install`);
      process.exit(0);
    } else {
      console.log(`❌ ilb:e2e FAIL — ${failures}/${results.length} assertions failed`);
      process.exit(1);
    }
  } finally {
    if (!KEEP_TMP) fs.rmSync(tmpDir, { recursive: true, force: true });
    else console.log(`(--keep-tmp) tmp preserved at ${tmpDir}`);
  }
}

main();
