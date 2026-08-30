#!/usr/bin/env -S npx tsx

/**
 * devkit-infra-metrics.ts — measures `@interlace/eslint-devkit` as
 * infrastructure rather than as a tarball.
 *
 * `check-artifact-size.ts` already answers "how big is the devkit package".
 * That is the wrong question for a layer 30 packages depend on. The cost of
 * infrastructure is what it forces on a consumer, and none of it is visible in
 * an unpacked-size number:
 *
 *   - The largest win this package ever shipped was making
 *     `@typescript-eslint/utils` an OPTIONAL peer. Its non-optional `typescript`
 *     peer had been dragging 24 MB of compiler into every install of every
 *     plugin, including plain-JS projects. Nothing measured that before, and
 *     nothing would notice it coming back.
 *   - `oxc-resolver` (a native binary) is a peer needed only by `src/resolver/`,
 *     and is loaded lazily so importing the barrel does not require it. That is
 *     an invariant defended by a comment in `src/index.ts`, not by a check.
 *
 * Both are consumer-facing costs that were argued in prose and never measured.
 * These three metrics measure them.
 *
 * ponytail: no `du`, no bundler, no new dependency — `npm pack` and Node's own
 * `require.cache` already know everything here.
 *
 * Usage:
 *   tsx scripts/devkit-infra-metrics.ts            # report vs baseline
 *   tsx scripts/devkit-infra-metrics.ts --update   # rewrite the baseline
 *   tsx scripts/devkit-infra-metrics.ts --json     # machine-readable
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import process from 'node:process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEVKIT = join(ROOT, 'packages', 'eslint-devkit');
const BASELINE_PATH = join(ROOT, '.agent', 'devkit-infra-baseline.json');

const args = new Set(process.argv.slice(2));
const UPDATE = args.has('--update');
const JSON_OUT = args.has('--json');

export type InfraMetrics = {
  /** Peers a consumer MUST install. `optional: true` in peerDependenciesMeta excluded. */
  mandatoryPeers: string[];
  /** Own devkit files evaluated by `require('@interlace/eslint-devkit')`. */
  barrelOwnFiles: number;
  /** kB of own devkit source evaluated at barrel import time. */
  barrelOwnKb: number;
  /** External packages pulled into the module graph by importing the barrel. */
  barrelExternals: string[];
  /** Exported symbols on the barrel. Every one is 30 packages' worth of surface. */
  barrelExports: number;
};

type Baseline = { generated: string; metrics: InfraMetrics };

/**
 * Peers with no `optional: true` are a tax on every consumer. This is the
 * 24 MB `typescript` incident expressed as a list that a test can assert on.
 */
export function mandatoryPeers(manifest: {
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}): string[] {
  const peers = Object.keys(manifest.peerDependencies ?? {});
  const meta = manifest.peerDependenciesMeta ?? {};
  return peers.filter((p) => !meta[p]?.optional).sort();
}

/**
 * Split a loaded module path into "devkit's own" vs "some other package".
 * Externals are reported by package name, because *which* package got pulled
 * in is the signal — a native binary or a compiler appearing here is the
 * regression, not a byte count.
 */
export function classifyModule(
  file: string,
  devkitDist: string,
): { own: boolean; external?: string } {
  if (file.startsWith(devkitDist)) return { own: true };
  const idx = file.lastIndexOf('/node_modules/');
  if (idx === -1) return { own: false };
  const rest = file.slice(idx + '/node_modules/'.length).split('/');
  const name = rest[0]?.startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
  return { own: false, external: name };
}

function collect(): InfraMetrics {
  const manifest = JSON.parse(
    readFileSync(join(DEVKIT, 'package.json'), 'utf8'),
  ) as Parameters<typeof mandatoryPeers>[0];

  const distDir = join(DEVKIT, 'dist', 'src');
  if (!existsSync(join(distDir, 'index.js'))) {
    console.error(
      'devkit-infra-metrics: eslint-devkit is not built — run\n' +
        '  npx turbo build --filter=@interlace/eslint-devkit',
    );
    process.exit(1);
  }

  // A child process, because the measurement IS "what does a cold require pull
  // in". Measuring inside this process would see everything tsx already loaded.
  const probe = `
    const path = require('node:path');
    const fs = require('node:fs');
    const before = new Set(Object.keys(require.cache));
    const barrel = require(${JSON.stringify(join(distDir, 'index.js'))});
    const loaded = Object.keys(require.cache).filter((f) => !before.has(f));
    process.stdout.write(JSON.stringify({
      loaded,
      sizes: loaded.map((f) => { try { return fs.statSync(f).size; } catch { return 0; } }),
      exports: Object.keys(barrel).length,
    }));
  `;
  // FORCE_COLOR=0 because this stdout is parsed, not read. A developer shell
  // with FORCE_COLOR=1 makes Node wrap child output in ANSI codes even when
  // piped, and the parse then fails on invisible characters.
  // `lazy-rules-artifact.test.ts` uses the same child-process shape and its
  // count becomes NaN in exactly that environment.
  const raw = execFileSync(process.execPath, ['-e', probe], {
    encoding: 'utf8',
    cwd: ROOT,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
  });
  const probed = JSON.parse(raw) as {
    loaded: string[];
    sizes: number[];
    exports: number;
  };

  let barrelOwnFiles = 0;
  let ownBytes = 0;
  const externals = new Set<string>();
  probed.loaded.forEach((file, i) => {
    const c = classifyModule(file, distDir);
    if (c.own) {
      barrelOwnFiles += 1;
      ownBytes += probed.sizes[i] ?? 0;
    } else if (c.external) {
      externals.add(c.external);
    }
  });

  return {
    mandatoryPeers: mandatoryPeers(manifest),
    barrelOwnFiles,
    barrelOwnKb: Math.round(ownBytes / 1024),
    barrelExternals: [...externals].sort(),
    barrelExports: probed.exports,
  };
}

function main(): void {
  const current = collect();

  if (UPDATE) {
    const next: Baseline = {
      generated: new Date().toISOString().slice(0, 10),
      metrics: current,
    };
    writeFileSync(BASELINE_PATH, JSON.stringify(next, null, 2) + '\n');
    console.log(`  devkit infra baseline updated.\n  ${BASELINE_PATH}`);
    process.exit(0);
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(current, null, 2));
    process.exit(0);
  }

  console.log('\n  DEVKIT INFRASTRUCTURE METRICS\n');
  console.log(
    `    mandatory peers   ${current.mandatoryPeers.join(', ') || '(none)'}`,
  );
  console.log(
    `    barrel own load   ${current.barrelOwnKb} kB across ${current.barrelOwnFiles} files`,
  );
  console.log(
    `    barrel externals  ${current.barrelExternals.join(', ') || '(none)'}`,
  );
  console.log(`    barrel exports    ${current.barrelExports} exports\n`);

  if (!existsSync(BASELINE_PATH)) {
    console.log('  No baseline yet:  npm run devkit:infra -- --update\n');
    process.exit(0);
  }

  const baseline = (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Baseline)
    .metrics;
  const drift: string[] = [];
  const added = (a: string[], b: string[]) => a.filter((x) => !b.includes(x));

  for (const gained of added(current.mandatoryPeers, baseline.mandatoryPeers))
    drift.push(
      `mandatory peer ADDED: ${gained} — every consumer now installs it`,
    );
  for (const gained of added(current.barrelExternals, baseline.barrelExternals))
    drift.push(
      `barrel now loads ${gained} at import time — lazy-loading invariant broken`,
    );
  if (current.barrelExports > baseline.barrelExports)
    drift.push(
      `barrel exports ${baseline.barrelExports} → ${current.barrelExports} exports`,
    );

  if (drift.length) {
    console.log('  ⚠️  drift vs baseline:');
    for (const d of drift) console.log(`    - ${d}`);
    console.log(
      '\n    If intended, refresh in this PR:\n      npm run devkit:infra -- --update\n',
    );
  } else {
    console.log('  No infrastructure drift.\n');
  }
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
