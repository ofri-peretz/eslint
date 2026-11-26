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
 * 3. MISSING EXPORTS — every name a source `index.ts` under `src/` exports is exported by
 *    its built `index.d.ts`. A dist can resolve all its own requires and still
 *    be stale: on 2026-11-25 devkit's dist lacked `valueFollow`, which the
 *    source of node-security's `no-timing-unsafe-compare` already imported, and
 *    `case-registry` crashed with "Cannot read properties of undefined
 *    (reading 'follow')" minutes into a commit. Same cheap-symptom reasoning:
 *    an export the source has and the build lacks proves the build is older.
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
import ts from 'typescript';

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

/**
 * Checked-in declarations, not build output: devkit's vendored AST and rule
 * types (scripts/vendor-estree-types.ts). No `.ts` sits beside them, so they
 * cannot shadow anything, and `--check` holds them to the pinned packages.
 */
const VENDORED_DECLARATIONS = join('eslint-devkit', 'src', 'types', 'estree');

/**
 * Value (runtime) names a source index exports, read by the TypeScript parser so a code sample
 * inside a string is not an export. Types vanish at build, so type-only exports are skipped.
 */
const sourceValueExports = (text: string): Set<string> => {
  const names = new Set<string>();
  const sf = ts.createSourceFile('index.ts', text, ts.ScriptTarget.Latest);
  const mods = (n: ts.Node) =>
    ts.canHaveModifiers(n) ? (ts.getModifiers(n) ?? []) : [];
  const has = (n: ts.Node, k: ts.SyntaxKind) =>
    mods(n).some((m) => m.kind === k);
  for (const st of sf.statements) {
    if (ts.isExportAssignment(st)) names.add('default');
    if (ts.isExportDeclaration(st) && !st.isTypeOnly && st.exportClause) {
      if (ts.isNamespaceExport(st.exportClause))
        names.add(st.exportClause.name.text);
      else
        for (const el of st.exportClause.elements)
          if (!el.isTypeOnly) names.add(el.name.text);
    }
    if (
      !has(st, ts.SyntaxKind.ExportKeyword) ||
      has(st, ts.SyntaxKind.DeclareKeyword)
    )
      continue;
    if (has(st, ts.SyntaxKind.DefaultKeyword)) {
      names.add('default');
      continue;
    }
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations)
        if (ts.isIdentifier(d.name)) names.add(d.name.text);
    } else if (
      (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) &&
      st.name
    ) {
      names.add(st.name.text);
    } else if (
      ts.isEnumDeclaration(st) &&
      !has(st, ts.SyntaxKind.ConstKeyword)
    ) {
      names.add(st.name.text);
    }
  }
  return names;
};

/** Names a built CommonJS module assigns to `exports`. */
const builtExports = (text: string): Set<string> => {
  const names = new Set<string>();
  for (const m of text.matchAll(/\bexports\.([A-Za-z_$][\w$]*)\s*=/g))
    names.add(m[1]);
  for (const m of text.matchAll(
    /defineProperty\(\s*exports\s*,\s*["']([\w$]+)["']/g,
  ))
    names.add(m[1]);
  return names;
};

const shadowing: string[] = [];
const missingExports: string[] = [];
const dangling: string[] = [];

for (const pkgDir of packageDirs) {
  for (const file of walkFiles(join(pkgDir, 'src'), {
    relativeTo: PACKAGES_DIR,
    extensions: STALE_EXTENSIONS,
  })) {
    if (file.endsWith('.d.ts') && file.includes(VENDORED_DECLARATIONS))
      continue;
    shadowing.push(file);
  }

  const distDir = join(pkgDir, 'dist');
  const present = new Set(walkFiles(distDir, { skipDirs: ['node_modules'] }));

  for (const file of walkFiles(join(pkgDir, 'src'), { extensions: ['.ts'] })) {
    if (!file.endsWith('/index.ts') || file.endsWith('.d.ts')) continue;
    const rel = relative(join(pkgDir, 'src'), file).replace(/\.ts$/, '.js');
    const built = [join(distDir, 'src', rel), join(distDir, rel)].find((f) =>
      present.has(f),
    );
    if (!built) continue; // not built, or not emitted: not this gate's failure mode
    const have = builtExports(readFileSync(built, 'utf8'));
    // A bundler that does not emit `exports.x` gives no names to compare: skip, do not guess.
    if (have.size === 0) continue;
    const want = sourceValueExports(readFileSync(file, 'utf8'));
    for (const name of want) {
      if (!have.has(name))
        missingExports.push(
          `${relative(PACKAGES_DIR, built)} lacks \`${name}\``,
        );
    }
  }

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

if (missingExports.length > 0) {
  const pkgs = [...new Set(missingExports.map((m) => m.split('/')[0]))];
  console.error('');
  console.error(
    `Stale dist: ${missingExports.length} export(s) the source has and the build lacks:`,
  );
  console.error('');
  list(missingExports);
  console.error('Anything importing them gets undefined. Rebuild:');
  console.error('');
  console.error(
    `  npx turbo run build ${pkgs.map((p) => `--filter=./packages/${p}`).join(' ')}`,
  );
  console.error('');
}

process.exit(
  shadowing.length + dangling.length + missingExports.length === 0 ? 0 : 1,
);
