/**
 * Cache key for the ILB-Oxlint-Parity `--cached` fast path.
 *
 * The invariant: a cached `pass` under this key means a fresh run on the same
 * inputs would pass. So the key has to cover EVERYTHING that decides the
 * verdict, on both sides of the comparison:
 *
 *   - what ESLint runs:   each plugin's src/ (eslint.benchmark.config.mjs
 *                         imports src), the bench config, the eslint version
 *   - what oxlint runs:   each plugin's dist/, the generated shims under
 *                         tools/oxlint-plugins, the oxlint version + bundles
 *   - what both share:    @interlace/eslint-devkit, src and dist — every rule
 *                         imports it
 *   - what is linted:     the corpus
 *   - how it is judged:   run.ts, allowlist.json, the shim manifest, this file,
 *                         the plugin set and the threshold
 *
 * The key this replaces hashed plugin src, the oxlint bundles and the corpus
 * only. A devkit change, a regenerated shim, a stale local dist, a new
 * allowlist entry or a change to the harness itself all left it unchanged, so
 * a `pass` recorded before the change was served after it.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface ParityCacheKeyInputs {
  repoRoot: string;
  plugins: readonly string[];
  corpus: string;
  threshold: number;
  eslintConfig: string;
}

const SRC = /\.(ts|tsx|mts|cts)$/;
const TEST = /\.(test|spec)\.[cm]?tsx?$/;
const BUILT = /\.(js|cjs|mjs)$/;
const FIXTURE = /\.(js|ts|jsx|tsx|mjs|cjs|mts|cts)$/;

function walk(dir: string, keep: (name: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      out.push(...walk(full, keep));
    } else if (e.isFile() && keep(e.name)) out.push(full);
  }
  return out.sort();
}

export function computeParityCacheKey(inputs: ParityCacheKeyInputs): string {
  const { repoRoot, corpus, threshold, eslintConfig } = inputs;
  const plugins = [...inputs.plugins].sort();
  const h = crypto.createHash('sha256');

  const file = (label: string, abs: string) => {
    h.update(
      `${label}:${path.relative(repoRoot, abs).split(path.sep).join('/')}\n`,
    );
    h.update(fs.existsSync(abs) ? fs.readFileSync(abs) : '<absent>');
    h.update('\n');
  };
  const tree = (
    label: string,
    dir: string,
    keep: (name: string) => boolean,
  ) => {
    const files = walk(dir, keep);
    h.update(`${label}-tree:${path.relative(repoRoot, dir)}:${files.length}\n`);
    for (const f of files) file(label, f);
  };
  const version = (pkg: string) => {
    const manifest = path.join(repoRoot, 'node_modules', pkg, 'package.json');
    const v = fs.existsSync(manifest)
      ? (JSON.parse(fs.readFileSync(manifest, 'utf-8')) as { version?: string })
          .version
      : undefined;
    h.update(`version:${pkg}@${v ?? '<absent>'}\n`);
  };

  const isSrc = (n: string) => SRC.test(n) && !TEST.test(n);
  const isBuilt = (n: string) => BUILT.test(n);

  for (const short of plugins) {
    const pkg = path.join(repoRoot, 'packages', `eslint-plugin-${short}`);
    tree(`src:${short}`, path.join(pkg, 'src'), isSrc);
    tree(`dist:${short}`, path.join(pkg, 'dist'), isBuilt);
  }
  const devkit = path.join(repoRoot, 'packages', 'eslint-devkit');
  tree('src:devkit', path.join(devkit, 'src'), isSrc);
  tree('dist:devkit', path.join(devkit, 'dist'), isBuilt);
  tree('shims', path.join(repoRoot, 'tools', 'oxlint-plugins'), isBuilt);

  version('eslint');
  version('oxlint');
  for (const f of ['plugins.js', 'plugins-dev.js', 'lint.js', 'bindings.js']) {
    file('oxlint', path.join(repoRoot, 'node_modules', 'oxlint', 'dist', f));
  }

  const suite = path.join(
    repoRoot,
    'benchmarks',
    'suites',
    'ilb-oxlint-parity',
  );
  file('harness', path.join(suite, 'run.ts'));
  file('harness', path.join(suite, 'cache-key.ts'));
  file('harness', path.join(suite, 'allowlist.json'));
  file(
    'harness',
    path.join(repoRoot, '.agent', 'oxlint-jsplugins-manifest.json'),
  );
  file('harness', path.resolve(eslintConfig));

  if (fs.existsSync(corpus) && fs.statSync(corpus).isDirectory()) {
    tree('fixture', corpus, (n) => FIXTURE.test(n));
  } else {
    file('fixture', corpus);
  }

  h.update(JSON.stringify({ plugins, threshold }));
  return h.digest('hex');
}
