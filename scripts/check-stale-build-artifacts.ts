#!/usr/bin/env tsx

/**
 * check-stale-build-artifacts.ts
 *
 * Two assertions, both about compiled output that no longer matches source.
 *
 * 1. SHADOWING — no `.js`, `.d.ts` or `.js.map` alongside `.ts` inside
 *    `packages/<pkg>/src/`. They are gitignored leftovers from a prior
 *    in-place build configuration that no longer runs, but Node and vitest
 *    resolvers silently prefer the stale `.js` over the current `.ts` when a
 *    `package.json#main` points at `./src/index.js`. That is how the
 *    import-next/no-cycle regression hid for weeks between b40bc678 and
 *    139b6208.
 *
 * 2. DANGLING — every relative `require()` call in `packages/<pkg>/dist/` resolves
 *    to a file that is actually there. Assertion 1 alone let a genuinely
 *    stale dist through in 0.49s: `eslint-devkit/dist/src/index.js` required
 *    `./types/meta-augmentation`, which the last build had not emitted, and
 *    the check reported clean because it never looks inside dist. The very
 *    next pre-commit step then failed 60 tests, every one of them
 *    `Cannot find module './types/meta-augmentation'`.
 *
 *    A dist that cannot resolve its own internals is stale by definition:
 *    the source it was built from has since gained or moved a module. This
 *    is deliberately the cheap symptom rather than an mtime comparison —
 *    mtimes are noise in a worktree, an unresolvable specifier is not.
 *
 * Wired as the `stale-build-artifacts` step in lefthook's pre-commit.
 *
 * Usage: check-stale-build-artifacts.ts [packagesDir]
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import process from 'node:process';

import { parse } from 'acorn';

import { walkFiles } from './lib/walk.js';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const PACKAGES_DIR = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : join(REPO_ROOT, 'packages');
const STALE_EXTENSIONS = ['.js', '.d.ts', '.js.map'] as const;

/** `require("./x")` / `require('../x')` — tsc emits CJS, minified to one line. */
const RELATIVE_REQUIRE = /require\(\s*(["'])(\.[^"']*)\1\s*\)/g;

/** Node's CJS extension search, in order, plus the directory-index forms. */
const CJS_SUFFIXES = [
  '',
  '.js',
  '.json',
  '.node',
  '/index.js',
  '/index.json',
  '/index.node',
] as const;

const resolves = (from: string, spec: string): boolean => {
  try {
    createRequire(from).resolve(spec);
    return true;
  } catch {
    return false;
  }
};

/**
 * Specifiers of `require(<string>)` calls that the parser agrees are calls —
 * a string literal or a comment holding the same text is not one. Returns
 * undefined when the file will not parse, which the caller treats as "trust
 * the regex": this gate fails closed.
 */
const requireCallSpecifiers = (src: string): Set<string> | undefined => {
  let ast;
  try {
    ast = parse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  } catch {
    return undefined;
  }
  const out = new Set<string>();
  const visit = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    const n = node as Record<string, unknown>;
    if (n.type === 'CallExpression') {
      const callee = n.callee as { type?: string; name?: string } | undefined;
      const args = n.arguments as { type?: string; value?: unknown }[];
      if (
        callee?.type === 'Identifier' &&
        callee.name === 'require' &&
        args.length === 1 &&
        args[0].type === 'Literal' &&
        typeof args[0].value === 'string'
      ) {
        out.add(args[0].value);
      }
    }
    for (const key of Object.keys(n)) if (key !== 'type') visit(n[key]);
  };
  visit(ast);
  return out;
};

let packageDirs: string[];
try {
  packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(PACKAGES_DIR, d.name));
} catch {
  // A checkout without packages/ is not this gate's failure mode.
  process.exit(0);
}

const shadowing: string[] = [];
const dangling: string[] = [];

for (const pkgDir of packageDirs) {
  for (const file of walkFiles(join(pkgDir, 'src'), {
    relativeTo: PACKAGES_DIR,
    extensions: STALE_EXTENSIONS,
  })) {
    shadowing.push(file);
  }

  const distDir = join(pkgDir, 'dist');
  const present = new Set(walkFiles(distDir, { skipDirs: ['node_modules'] }));

  for (const file of present) {
    if (!file.endsWith('.js')) continue;
    const src = readFileSync(file, 'utf8');
    const dir = dirname(file);
    // Parsed lazily: on a clean tree nothing reaches the confirmation path,
    // so no dist file is ever parsed. Calling createRequire for all ~730 of
    // them cost 4.4s; both confirmations together cost ~0.
    let calls: Set<string> | undefined;
    let parsed = false;
    for (const [, , spec] of src.matchAll(RELATIVE_REQUIRE)) {
      const base = resolve(dir, spec);
      // The Set covers only this package's own dist, so a miss is a
      // suspicion, not a verdict — confirm against the real resolver, which
      // also sees specifiers that legitimately escape dist.
      if (CJS_SUFFIXES.some((s) => present.has(base + s))) continue;
      if (resolves(file, spec)) continue;
      // Second confirmation: the regex also matches `require("./x")` written
      // inside a string literal or a comment, which resolves to nothing and
      // is nobody's bug. Only the parser can tell those from a real call.
      if (!parsed) {
        calls = requireCallSpecifiers(src);
        parsed = true;
      }
      if (calls !== undefined && !calls.has(spec)) continue;
      dangling.push(`${relative(PACKAGES_DIR, file)} → ${spec}`);
    }
  }
}

const PREVIEW = 10;
const list = (files: string[]): void => {
  for (const f of files.slice(0, PREVIEW)) console.error(`  ${f}`);
  if (files.length > PREVIEW)
    console.error(`  … and ${files.length - PREVIEW} more`);
  console.error('');
};

if (shadowing.length > 0) {
  console.error('');
  console.error(
    `Stale build artifacts found in packages/<pkg>/src/ (${shadowing.length} files):`,
  );
  console.error('');
  list(shadowing);
  console.error(
    'These shadow .ts source under vitest and break workspace runtime',
  );
  console.error(
    'resolution (package.json#main points at ./src/index.js). They are',
  );
  console.error('gitignored leftovers — safe to delete. Run:');
  console.error('');
  console.error("  find packages -path '*/src/*' \\");
  console.error(
    "    \\( -name '*.js' -o -name '*.d.ts' -o -name '*.js.map' \\) \\",
  );
  console.error(
    "    -not -path '*/node_modules/*' -not -path '*/dist/*' -delete",
  );
  console.error('');
}

if (dangling.length > 0) {
  console.error('');
  console.error(
    `Stale dist: ${dangling.length} require() specifier(s) resolve to nothing:`,
  );
  console.error('');
  list(dangling);
  console.error(
    'The build that produced these files predates a module that its own',
  );
  console.error(
    'output now imports, so anything requiring the package dies with',
  );
  console.error('"Cannot find module". Rebuild the affected workspace(s):');
  console.error('');
  console.error('  npx turbo run build');
  console.error('');
}

process.exit(shadowing.length + dangling.length === 0 ? 0 : 1);
