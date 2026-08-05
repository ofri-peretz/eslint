#!/usr/bin/env -S npx tsx
/**
 * Build helper invoked by each package's `npm run build` script.
 *
 * Steps:
 *   1. Compile TypeScript via the package's `tsconfig.lib.json` to `<pkg>/dist/`.
 *   2. Copy publish-time assets (README, CHANGELOG, LICENSE, .npmignore,
 *      package.json) into `<pkg>/dist/`, and exclude what must never reach
 *      npm (source maps, AGENTS.md) — see steps 3 and 3b.
 *
 * After this runs, `<pkg>/dist/` is the publishable artifact:
 *   - `dist/src/index.js` etc. (matches the published `package.json`'s
 *     `main: "./src/index.js"` so consumer-facing paths are unchanged).
 *   - `dist/package.json`, `dist/README.md`, etc. at the dist root.
 *
 * Run from the package directory; intended to be invoked by Turbo via
 * the workspace's `build` task.
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import { lazifyRuleBarrel } from './lib/lazify-rule-barrel';
import { overlayJs } from './lib/overlay-js';
import process from 'node:process';

const pkgDir = process.cwd();
const pkgJsonPath = resolve(pkgDir, 'package.json');
if (!existsSync(pkgJsonPath)) {
  console.error(`build-package: no package.json found in ${pkgDir}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
const distDir = resolve(pkgDir, 'dist');

// 1. Clean prior output so stale files (e.g. removed source files) don't linger.
//    Also drop the tsc incremental buildinfo — otherwise `tsc --build` sees
//    "up to date" against the (now-deleted) dist and skips emit silently.
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
const tsBuildInfo = resolve(pkgDir, '.tsbuildinfo');
if (existsSync(tsBuildInfo)) {
  rmSync(tsBuildInfo, { force: true });
}
mkdirSync(distDir, { recursive: true });

// 2. Compile TypeScript. Use `tsc --build` so cross-package project
//    references resolve correctly (each plugin's tsconfig.lib.json
//    declares a `references: [{ path: "../eslint-devkit/tsconfig.lib.json" }]`
//    when it imports from devkit, and tsc --build walks the graph).
//    tsc --build is incremental and skips already-built upstream projects.
const tsconfig = existsSync(resolve(pkgDir, 'tsconfig.lib.json'))
  ? 'tsconfig.lib.json'
  : 'tsconfig.json';

const tscResult = spawnSync('npx', ['tsc', '--build', tsconfig], {
  cwd: pkgDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (tscResult.status !== 0) {
  console.error(
    `build-package(${pkg.name}): tsc failed with status ${tscResult.status}`,
  );
  process.exit(tscResult.status ?? 1);
}

// 2b. Re-emit the JavaScript without comments.
//
//     JSDoc is 17% of the emitted .js across this ecosystem — 561 kB that no
//     consumer ever reads, because nobody opens `node_modules/**/dist/*.js`.
//     The same comments in the .d.ts ARE read: that is what powers editor
//     hover docs, so they must survive.
//
//     `removeComments` cannot be set on the main build — it strips .d.ts
//     comments too (verified: devkit's declarations drop 98 kB -> 31 kB and
//     every hover doc disappears). Nor can the second pass write in place:
//     these are composite projects, so `--declaration false` is rejected and
//     tsc clobbers the good .d.ts. So: emit both to a scratch dir, then copy
//     ONLY the .js back over dist. Same compiler, same input — the output is
//     byte-identical apart from comments.
//
//     Costs ~1.5 s per package on a cold build; turbo caches it.
//
//     Note the per-file MIT headers go with the comments. The LICENSE file
//     still ships at every package root, which is what the licence requires.
const noCommentsDir = resolve(pkgDir, '.build-nocomments');
rmSync(noCommentsDir, { recursive: true, force: true });
const stripResult = spawnSync(
  'npx',
  [
    'tsc',
    '-p',
    tsconfig,
    '--removeComments',
    // tsconfig.lib.json now sets emitDeclarationOnly (pass 1 wants declarations
    // only). This pass is the ONLY producer of .js, so it must opt back in.
    '--emitDeclarationOnly',
    'false',
    // Also drops the `//# sourceMappingURL=` pragma, which `--removeComments`
    // leaves behind (tsc emits it separately). Without this the overlaid .js
    // would point at maps that step 3b deletes.
    '--sourceMap',
    'false',
    // Inline the TypeScript helpers instead of requiring them from `tslib`.
    // tslib was a NON-OPTIONAL peer of eslint-devkit, which every plugin then
    // had to declare as a dependency to satisfy — 27 manifests carrying a
    // 124 kB package so that 12 `require("tslib")` calls could resolve.
    // Inlining costs ~9.5 kB of emitted JS in devkit and lets tslib disappear
    // from every manifest. Only the SHIPPED javascript is re-emitted this way;
    // the workspace build that typecheck reads is untouched.
    '--importHelpers',
    'false',
    '--outDir',
    noCommentsDir,
    '--tsBuildInfoFile',
    join(noCommentsDir, '.tsbuildinfo'),
  ],
  { cwd: pkgDir, stdio: 'inherit', shell: process.platform === 'win32' },
);

if (stripResult.status === 0) {
  const copied = overlayJs(noCommentsDir, join(distDir, 'src'));
  if (copied === 0) {
    // tsc reported success yet produced no .js to copy back. That is a broken
    // build pipeline, not a degraded optimisation — failing here is the only
    // thing that surfaces it, since the gate that would catch commented output
    // runs in `npm run quality` and the release workflow, not on every build.
    console.error(
      `build-package(${pkg.name}): comment-strip pass reported success but emitted no .js.\n` +
        `  Expected files under ${noCommentsDir}/src matching dist/src.\n` +
        `  This is a build-pipeline bug — dist would ship commented JS silently.`,
    );
    process.exit(1);
  }
} else {
  // The strip pass itself failed (bad tsconfig, tsc crash). That IS just a
  // degraded optimisation — warn and ship commented JS rather than blocking
  // every local build. Contrast the `copied === 0` branch above, where tsc
  // claimed success and produced nothing, which is a real defect.
  console.error(
    `build-package(${pkg.name}): comment-strip pass failed (status ${stripResult.status}); shipping commented JS.`,
  );
}
rmSync(noCommentsDir, { recursive: true, force: true });

// 3. Copy publish-time assets to the dist root.
//    package.json gets a path-rewrite pass: source main/types/exports point
//    at `./dist/src/...` so workspace symlinks resolve to the built artifact
//    without needing in-place .js files (the stale-build-artifacts guardrail
//    enforces no .js next to .ts in src/). The published tarball's root IS
//    `dist/`, so we strip the `dist/` prefix on copy.
//
//    AGENTS.md is deliberately NOT copied. It is contributor documentation
//    ("context for AI coding agents working on <pkg>", with monorepo-root
//    install steps), not consumer documentation — it was shipping to npm in 12
//    packages, 48 kB of instructions that are wrong outside this repo.
//
//    CHANGELOG.md is not copied either. It was 225 kB across the ecosystem —
//    6% of everything we ship — and it is the one component that grows with
//    every release forever, so the share only increases. npm does not render
//    it on the package page; the history stays available on GitHub, in the
//    npm "Versions" tab, and in the changesets-generated release notes.
//    README.md is kept: it IS the npm package page.
const assets = ['README.md', 'LICENSE', '.npmignore'];
for (const asset of assets) {
  const src = resolve(pkgDir, asset);
  if (existsSync(src)) {
    copyFileSync(src, join(distDir, asset));
  }
}

// 3b. Guarantee the tarball never carries source maps.
//
//     `tsconfig.base.json` sets `sourceMap: true`, so most packages emit
//     `.js.map` next to every rule — 322 kB across the ecosystem. Those maps
//     are DEAD ON ARRIVAL once published: `.npmignore` strips `*.ts`, so every
//     map points at a source file that isn't in the tarball.
//
//     They are deleted outright rather than excluded at pack time: a map is
//     only useful next to the source it maps to, `.npmignore` strips every
//     `*.ts`, and the comment-strip pass below rewrites the `.js` anyway — so
//     a retained map would be stale as well as unpublishable.
const emittedSrcDir = join(distDir, 'src');
const deleteMaps = (dir: string): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) deleteMaps(p);
    else if (entry.name.endsWith('.map')) rmSync(p, { force: true });
  }
};
if (existsSync(emittedSrcDir)) deleteMaps(emittedSrcDir);

// 3c. Prune generated declarations for the eslint-plugin-* packages.
//
//     A plugin is consumed by ESLint at runtime, not imported as a typed
//     library — nobody writes `import { noXyz } from 'eslint-plugin-foo'`.
//     But tsc still inlines every inferred rule-option type into the entry
//     declaration, and those files got huge: eslint-plugin-import-next ships
//     a 166 kB `index.d.ts`. Across the plugins that is 595 kB of types no
//     consumer reads.
//
//     They cannot simply be deleted. A TypeScript flat config
//     (`eslint.config.ts`) does `import plugin from 'eslint-plugin-foo'`, and
//     with no declaration that is error TS7016 under `noImplicitAny`
//     (verified). So the entry declarations are REPLACED by a hand-written
//     minimal one — ~350 bytes that types the plugin object shape, which is
//     all a config file ever touches.
//
//     `src/types/**` is preserved verbatim: 14 plugins expose it as a public
//     `./types` subpath export (`import type { NoUnsafeQueryOptions } from
//     'eslint-plugin-mongodb-security/types'`), and those ARE meant to be
//     imported. Only the plugin packages are pruned — @interlace/eslint-devkit
//     is a real library whose declarations are the product.
const isPluginPackage = String(pkg.name).startsWith('eslint-plugin-');

if (isPluginPackage && existsSync(emittedSrcDir)) {
  const MINIMAL_ENTRY_DTS = `// Minimal declaration written by scripts/build-package.ts.
//
// tsc's generated entry declaration inlined every inferred rule-option type
// (up to 166 kB per plugin) for an API no consumer calls directly. This types
// what a flat config actually touches. Per-rule option types remain available
// from the "./types" subpath export where a plugin provides one.
import type { Linter, Rule } from 'eslint';

export declare const rules: Record<string, Rule.RuleModule>;
export declare const configs: Record<string, Linter.Config>;
export declare const plugin: {
  meta: { name: string; version: string };
  rules: Record<string, Rule.RuleModule>;
};

declare const _default: typeof plugin;
export default _default;
`;

  const prune = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      const relative = p.slice(emittedSrcDir.length + 1);
      if (entry.isDirectory()) {
        if (relative !== 'types') prune(p); // keep the public ./types subpath
      } else if (entry.name.endsWith('.d.ts')) {
        rmSync(p, { force: true });
      }
    }
  };
  prune(emittedSrcDir);

  writeFileSync(join(emittedSrcDir, 'index.d.ts'), MINIMAL_ENTRY_DTS);
  // `./oxlint` re-exports the same plugin object.
  if (existsSync(join(emittedSrcDir, 'oxlint.js'))) {
    writeFileSync(join(emittedSrcDir, 'oxlint.d.ts'), MINIMAL_ENTRY_DTS);
  }
}

// 3d. Defer every rule module behind a getter on the entry's `rules` object.
//
//     A plugin barrel `require`s all of its rules at load. ESLint only ever
//     reads `plugin.rules[id]` for the rules a config ENABLES, so everything
//     else is parse-and-compile cost for code that never runs. Measured on a
//     7-plugin / 34-enabled-rule config: 184 rule modules loaded, 181 ms of
//     plugin load, against 34 modules and 8.5 ms once deferred — total ESLint
//     wall time 211 ms → 70 ms. On a preset that enables most of a plugin it is
//     a wash (59 vs 64 ms), never a loss.
//
//     Done to the ARTIFACT, not the source. Getters in `index.ts` would have to
//     call `require('./rules/x')`, and vitest runs the .ts directly — Node's
//     require can't resolve an extensionless specifier to a .ts file, so every
//     rule lookup throws under test while working perfectly once compiled.
//     Transforming the emitted CJS keeps source, types, and tests untouched.
//     `__tests__/lazy-rules-artifact.test.ts` locks the emitted shape.
//
//     Bindings referenced anywhere outside the `rules` object keep their eager
//     require: `export { noAlgorithmNone } from './rules/...'` is public API
//     (eslint-plugin-jwt, eslint-plugin-vercel-ai-security re-export every
//     rule), and a re-export cannot be deferred. Those plugins are unchanged.
if (isPluginPackage) {
  const entry = join(emittedSrcDir, 'index.js');

  // Read first and let the read report absence, rather than `existsSync` then
  // `readFileSync` — that pair is a check-then-use race (CodeQL
  // js/file-system-race), and it is the same defect this ecosystem ships
  // `node-security/no-toctou-vulnerability` to catch. ENOENT here just means a
  // package with no compiled entry, which is not an error.
  let source: string | undefined;
  try {
    source = readFileSync(entry, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }

  if (source !== undefined) {
    const result = lazifyRuleBarrel(source);
    if (result) {
      writeFileSync(entry, result.code);
      console.log(
        `build-package(${pkg.name}): deferred ${result.deferred} rules behind getters.`,
      );
    } else {
      // Not fatal — a plugin can legitimately have no matching barrel — but it
      // means this plugin silently keeps paying full load cost, so say so.
      console.warn(
        `build-package(${pkg.name}): rule barrel not recognised; rules stay eager.`,
      );
    }
  }
}

const stripDistPrefix = (value: unknown): unknown => {
  if (typeof value === 'string') return value.replace(/^\.\/dist\//, './');
  if (Array.isArray(value)) return value.map(stripDistPrefix);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        stripDistPrefix(v),
      ]),
    );
  }
  return value;
};

// Packages list AGENTS.md in `files`, and an allowlist entry can out-rank
// .npmignore. Drop it here so the two mechanisms can't disagree. `dist/` is
// also a no-op entry — the tarball root IS dist, so it can never match.
const DROPPED_FILE_ENTRIES = new Set([
  'AGENTS.md',
  'CHANGELOG.md',
  'dist/',
  'dist',
]);
const publishedFiles = Array.isArray(pkg.files)
  ? (pkg.files as string[]).filter((f) => !DROPPED_FILE_ENTRIES.has(f))
  : pkg.files;

// Fields that exist only to build the package. `scripts` (build/test/typecheck)
// and `devDependencies` cannot do anything in a consumer's node_modules — npm
// never runs them and never installs them — but they ship in every manifest,
// clutter the npm page's dependency section, and get picked up by SCA tools
// scanning installed manifests. None of our packages declares a lifecycle hook
// (preinstall/postinstall/prepare/...), so nothing observable changes.
const BUILD_ONLY_FIELDS = ['scripts', 'devDependencies'] as const;

const publishedPkg: Record<string, unknown> = {
  ...pkg,
  ...(publishedFiles ? { files: publishedFiles } : {}),
  main: stripDistPrefix(pkg.main),
  types: stripDistPrefix(pkg.types),
  exports: stripDistPrefix(pkg.exports),
};
for (const field of BUILD_ONLY_FIELDS) delete publishedPkg[field];

writeFileSync(
  join(distDir, 'package.json'),
  JSON.stringify(publishedPkg, null, 2) + '\n',
);

console.log(`build-package(${pkg.name}@${pkg.version}): wrote ${distDir}`);
