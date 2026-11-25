#!/usr/bin/env tsx
/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * vendor-estree-types — devkit owns the AST and rule TYPES it publishes.
 *
 * `@interlace/eslint-devkit`'s published `.d.ts` files reference
 * `@typescript-eslint/utils`, which is why every consumer had to resolve
 * that package (and its peer graph) just to type-check a config. This copies
 * the type-only declarations devkit uses — `TSESTree`, `TSESLint` (rule,
 * context, source code, scope), `ParserServices`, `JSONSchema4` — out of the
 * PINNED `@typescript-eslint/*` devDependencies into
 * `packages/eslint-devkit/src/types/estree/`, rewriting the cross-package
 * specifiers to relative paths. Nothing here runs; it is declarations only.
 *
 * The pin still decides the content: `--check` regenerates in memory and
 * fails when the snapshot and the installed version disagree, so a parser
 * upgrade still reaches us. It is just no longer a dependency.
 *
 *   npx tsx scripts/vendor-estree-types.ts           # write the snapshot
 *   npx tsx scripts/vendor-estree-types.ts --check   # exit 1 on drift
 *
 * docs/intents/2026-11-03-our-code-owns-the-tree (phase 1.1)
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(
  ROOT,
  'packages',
  'eslint-devkit',
  'src',
  'types',
  'estree',
);
const CHECK = process.argv.includes('--check');
const require = createRequire(
  path.join(ROOT, 'packages', 'eslint-devkit', 'package.json'),
);

/** The packages whose declarations are vendored, and the entry each starts from. */
const PACKAGES = [
  'types',
  'utils',
  'scope-manager',
  'typescript-estree',
  'visitor-keys',
  'project-service',
] as const;
type Pkg = (typeof PACKAGES)[number];

const distOf = (pkg: Pkg): string =>
  path.join(
    path.dirname(require.resolve(`@typescript-eslint/${pkg}/package.json`)),
    'dist',
  );
const versionOf = (pkg: Pkg): string =>
  (require(`@typescript-eslint/${pkg}/package.json`) as { version: string })
    .version;

/** Entry points devkit's own imports reach. */
const ENTRIES: [Pkg, string][] = [
  ['utils', 'index.d.ts'],
  ['utils', 'json-schema.d.ts'],
  ['types', 'index.d.ts'],
];

const SPECIFIER = /(from\s+|import\s*\(\s*|require\s*\(\s*)(['"])([^'"]+)\2/g;

interface Out {
  rel: string; // path under OUT
  text: string;
}

function resolveRelative(fromFile: string, spec: string): string | null {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const candidate of [
    `${base}.d.ts`,
    path.join(base, 'index.d.ts'),
    base.replace(/\.js$/, '.d.ts'),
  ]) {
    if (fs.existsSync(candidate) && candidate.endsWith('.d.ts'))
      return candidate;
  }
  return null;
}

/** `@typescript-eslint/<pkg>[/sub]` → the declaration file it resolves to. */
function resolvePackage(spec: string): { pkg: Pkg; file: string } | null {
  const m = /^@typescript-eslint\/([a-z-]+)(\/.*)?$/.exec(spec);
  if (!m || !(PACKAGES as readonly string[]).includes(m[1])) return null;
  const pkg = m[1] as Pkg;
  const sub = (m[2] ?? '').replace(/^\//, '');
  const file =
    sub === ''
      ? path.join(distOf(pkg), 'index.d.ts')
      : resolveRelative(path.join(distOf(pkg), 'x'), `./${sub}`);
  return file ? { pkg, file } : null;
}

function pkgOf(file: string): Pkg {
  for (const pkg of PACKAGES)
    if (file.startsWith(distOf(pkg) + path.sep)) return pkg;
  throw new Error(`not a vendored package file: ${file}`);
}

function outRel(file: string): string {
  const pkg = pkgOf(file);
  return path.join(pkg, path.relative(distOf(pkg), file));
}

/**
 * Private and protected members make a class NOMINAL: two declarations of `ScopeVariable`
 * with a `#private` slot are incompatible even when every public member
 * matches, so a typescript-eslint consumer's `RuleContext` could not be passed
 * where ours is expected (caught by devkit-types-compat.lock.test.ts). Those
 * members are not part of any type a rule can use, so the snapshot drops
 * them and its classes compare structurally.
 */
function structural(text: string): string {
  return text.replace(
    /^[ \t]*(?:#private;|(?:private|protected)\b[^\n]*;)[ \t]*\n/gm,
    '',
  );
}

function vendor(): { files: Out[]; externals: Set<string> } {
  const queue = ENTRIES.map(([pkg, rel]) => path.join(distOf(pkg), rel));
  const seen = new Set<string>();
  const files: Out[] = [];
  const externals = new Set<string>();
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const rel = outRel(file);
    const source = fs.readFileSync(file, 'utf8');
    const text = source.replace(
      SPECIFIER,
      (whole, lead: string, quote: string, spec: string) => {
        if (spec.startsWith('.')) {
          const target = resolveRelative(file, spec);
          if (target) queue.push(target);
          return whole;
        }
        const resolved = resolvePackage(spec);
        if (!resolved) {
          externals.add(spec);
          return whole;
        }
        queue.push(resolved.file);
        let relative = path
          .relative(path.dirname(rel), outRel(resolved.file))
          .replace(/\\/g, '/')
          .replace(/\.d\.ts$/, '');
        if (!relative.startsWith('.')) relative = `./${relative}`;
        return `${lead}${quote}${relative}${quote}`;
      },
    );
    files.push({ rel, text: structural(text) });
  }
  return { files, externals };
}

const HEADER = (pkg: Pkg) =>
  `// Vendored from @typescript-eslint/${pkg}@${versionOf(pkg)} (MIT, Copyright JS Foundation and other contributors).\n` +
  `// Generated by scripts/vendor-estree-types.ts — do not edit; regenerate.\n`;

const { files, externals } = vendor();
const rendered = files
  .map(({ rel, text }) => ({
    rel,
    text:
      HEADER(
        pkgOf(
          path.join(
            distOf(rel.split(path.sep)[0] as Pkg),
            path.relative(rel.split(path.sep)[0], rel),
          ),
        ),
      ) + text,
  }))
  .sort((a, b) => a.rel.localeCompare(b.rel));

if (CHECK) {
  const drift: string[] = [];
  for (const { rel, text } of rendered) {
    const target = path.join(OUT, rel);
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== text)
      drift.push(rel);
  }
  const expected = new Set(rendered.map((r) => r.rel));
  const walk = (dir: string): string[] =>
    fs.existsSync(dir)
      ? fs
          .readdirSync(dir, { withFileTypes: true })
          .flatMap((e) =>
            e.isDirectory()
              ? walk(path.join(dir, e.name))
              : [path.relative(OUT, path.join(dir, e.name))],
          )
      : [];
  for (const rel of walk(OUT))
    if (rel.endsWith('.d.ts') && !expected.has(rel))
      drift.push(`${rel} (stale)`);
  if (drift.length > 0) {
    console.error(
      `❌ vendored estree types drift from the pinned @typescript-eslint packages:\n  ${drift.slice(0, 20).join('\n  ')}`,
    );
    console.error('Run `npx tsx scripts/vendor-estree-types.ts`.');
    process.exit(1);
  }
  console.log(
    `✅ ${rendered.length} vendored declaration files match the pin.`,
  );
} else {
  fs.rmSync(OUT, { recursive: true, force: true });
  for (const { rel, text } of rendered) {
    fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
    fs.writeFileSync(path.join(OUT, rel), text);
  }
  console.log(
    `wrote ${rendered.length} declaration files to ${path.relative(ROOT, OUT)}`,
  );
  console.log(
    `external type imports left as-is: ${[...externals].sort().join(', ')}`,
  );
}
