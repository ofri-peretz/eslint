#!/usr/bin/env -S npx tsx

/**
 * check-published-artifacts.ts — fails closed when a package would publish
 * files that have no business in a consumer's node_modules.
 *
 * Two classes of waste shipped for months before the 2026-08-02 sweep, both
 * invisible without running `npm pack`:
 *
 *   1. Source maps (322 kB across 93 files). `tsconfig.base.json` sets
 *      `sourceMap: true`, and only eslint-devkit opted out. Every published
 *      map was DEAD — `.npmignore` strips `*.ts`, so each one pointed at a
 *      source file absent from the tarball.
 *
 *   2. AGENTS.md (48 kB across 12 packages). Contributor documentation
 *      ("context for AI coding agents working on <pkg>") with monorepo-root
 *      install steps and `nx` commands this repo no longer uses.
 *
 * WHERE THIS RUNS: `npm run quality` and the release workflow's pre-publish
 * stage, where it inspects the exact artifact STAGE 3 will publish. It is
 * deliberately NOT a lefthook pre-push command: that group runs in parallel,
 * and a gate that reads `dist/` either races the sibling `build` or (if it
 * builds defensively) runs a second concurrent turbo build over the same
 * output — which corrupts dist and fails typecheck, shim-verify and build
 * along with it. Verified the hard way on 2026-08-03.
 *
 * Both are excluded by scripts/build-package.ts. This gate proves the
 * exclusion still works, because the failure mode is silent: nothing errors,
 * the tarball just gets fatter. Note a root-level .npmignore does NOT do the
 * job — every package sets `files`, and that allowlist out-ranks it; the rule
 * has to live inside the emitted source directory.
 *
 * Usage:
 *   tsx scripts/check-published-artifacts.ts           # exit 1 on violation
 *   tsx scripts/check-published-artifacts.ts --json
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(ROOT, 'packages');
const JSON_OUT = process.argv.includes('--json');

/** Patterns that must never appear in a published tarball. */
const FORBIDDEN: {
  label: string;
  test: (p: string) => boolean;
  why: string;
}[] = [
  {
    label: 'source map',
    test: (p) => p.endsWith('.map'),
    why: 'points at a .ts source that is not published',
  },
  {
    label: 'AGENTS.md',
    test: (p) => p === 'AGENTS.md' || p.endsWith('/AGENTS.md'),
    why: 'contributor docs, wrong outside this repo',
  },
];

type Violation = {
  pkg: string;
  file: string;
  kb: number;
  label: string;
  why: string;
};

/**
 * Sentinel proving the comment-strip pass ran.
 *
 * build-package.ts re-emits .js with `--removeComments` (561 kB of JSDoc
 * across the ecosystem that no consumer reads — the .d.ts keeps its docs,
 * which is what editors actually surface). If that pass silently stops
 * running nothing errors; the tarballs just get fat again.
 *
 * 90% of source files open with this licence header and it exists ONLY inside
 * a comment, so its presence in emitted .js means comments survived. Checked
 * as a plain substring deliberately: a regex comment-counter looked appealing
 * but produced false positives on rule fixtures whose *string literals*
 * contain `/**` (eslint-plugin-modularity documents JSDoc patterns). Counting
 * comments correctly needs a real parser; this needs neither.
 */
const STRIP_SENTINEL = 'Copyright (c) 2025 Ofri Peretz';

/**
 * Detects emitted JS that still carries tsc's layout.
 *
 * Indentation alone is ~32% of a compiled rule file, so build-package.ts step
 * 3e re-emits every .js through esbuild's `minifyWhitespace`. Measured across
 * the ecosystem that is 3233 kB -> 2023 kB. Nothing else would notice if that
 * step were removed or silently failed — the build still succeeds and the
 * package still works, just 37% fatter.
 *
 * The naive check ("any line starting with spaces") false-positives the same
 * way the comment-counter did: a multi-line template literal inside a rule's
 * message or fixture legitimately contains indented lines, and stripping
 * whitespace never touches string contents. So this requires BOTH a high
 * absolute count and a high proportion — tsc indents nearly every line of a
 * real module, while a stripped file's only indented lines are inside string
 * literals.
 */
const INDENT_MIN_LINES = 20;
const INDENT_MIN_RATIO = 0.25;
const INDENTED_LINE = {
  test(source: string): boolean {
    const lines = source.split('\n');
    if (lines.length < INDENT_MIN_LINES) return false;
    const indented = lines.filter((l) => /^ {2,}\S/.test(l)).length;
    return (
      indented >= INDENT_MIN_LINES &&
      indented / lines.length >= INDENT_MIN_RATIO
    );
  },
};

/**
 * Fields that must never survive into a published manifest.
 *
 * `scripts` and `devDependencies` are build-time only — npm never runs one in a
 * consumer's node_modules and never installs the other — but they shipped in
 * all 27 manifests until 2026-08-03, cluttering the npm page and getting read
 * by SCA tools that scan installed manifests. build-package.ts deletes them.
 * Without this check, removing that delete would silently put them back in
 * every package and nothing in CI would notice.
 */
const FORBIDDEN_MANIFEST_FIELDS = ['scripts', 'devDependencies'] as const;

/**
 * Metadata every published package must carry.
 *
 * These are the fields npm's own search ranking and third-party quality
 * scorers read, and the ones that render as trust signals on the package
 * page. All 21 packages already satisfy this — the check exists so a new
 * package can't ship without them, which is exactly how such gaps appear.
 *
 * Deliberately NOT checked: `publishConfig.provenance`. Provenance is real
 * and already enabled, but via `npm publish --provenance` in release.yml
 * (with `id-token: write`). Putting it in package.json too would make any
 * emergency local publish fail, since provenance needs CI's OIDC token.
 */
const REQUIRED_METADATA: { field: string; get: (j: PkgJson) => unknown }[] = [
  { field: 'description', get: (j) => j.description },
  { field: 'keywords', get: (j) => j.keywords?.length },
  { field: 'license', get: (j) => j.license },
  { field: 'author', get: (j) => j.author },
  { field: 'homepage', get: (j) => j.homepage },
  { field: 'bugs', get: (j) => j.bugs },
  { field: 'funding', get: (j) => j.funding },
  { field: 'engines', get: (j) => j.engines },
  // Points npm at the right subdirectory of the monorepo, which is what makes
  // "Repository" on the package page deep-link correctly.
  { field: 'repository.directory', get: (j) => j.repository?.directory },
];

type PkgJson = {
  name?: string;
  description?: string;
  keywords?: string[];
  license?: string;
  author?: unknown;
  homepage?: unknown;
  bugs?: unknown;
  funding?: unknown;
  engines?: unknown;
  repository?: { directory?: string };
};

/**
 * Every path an `exports` map advertises must actually exist in the tarball.
 *
 * This is the highest-consequence check here: a dangling subpath is a hard
 * failure for the consumer (`Cannot find module 'pkg/types'`) and is invisible
 * to every other gate — the package installs, loads, and lints fine.
 * eslint-plugin-browser-security and eslint-plugin-lambda-security both
 * advertised a `./types` subpath that never existed in any published version.
 */
const exportGaps: { pkg: string; subpath: string; missing: string }[] = [];

const violations: Violation[] = [];
const commentRegressions: { pkg: string; files: number }[] = [];
const whitespaceRegressions: { pkg: string; files: number }[] = [];
const metadataGaps: { pkg: string; fields: string[] }[] = [];
const manifestLeaks: { pkg: string; fields: string[] }[] = [];
const sizes: { name: string; kb: number }[] = [];

for (const dir of readdirSync(PACKAGES_DIR)) {
  const pkgDir = join(PACKAGES_DIR, dir);
  // A live package has a source package.json; a bare dist/ is stale build
  // output from a deleted package (e.g. eslint-plugin-crypto) — skip it.
  if (!existsSync(join(pkgDir, 'package.json'))) continue;
  // Skip private packages — they never reach npm, so their artifact is not a
  // published artifact. (@interlace/ui is private; auditing it reported gaps
  // that could never matter.)
  const srcManifest = JSON.parse(
    readFileSync(join(pkgDir, 'package.json'), 'utf8'),
  ) as { private?: boolean };
  if (srcManifest.private) continue;
  const distDir = join(pkgDir, 'dist');
  if (!existsSync(join(distDir, 'package.json'))) continue;

  const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: distDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const meta = JSON.parse(raw)[0] as {
    name: string;
    unpackedSize: number;
    files: { path: string; size: number }[];
  };

  sizes.push({ name: meta.name, kb: meta.unpackedSize / 1024 });

  const manifest = JSON.parse(
    readFileSync(join(distDir, 'package.json'), 'utf8'),
  ) as PkgJson;
  const gaps = REQUIRED_METADATA.filter((r) => !r.get(manifest)).map(
    (r) => r.field,
  );
  if (gaps.length > 0) metadataGaps.push({ pkg: meta.name, fields: gaps });

  const leaked = FORBIDDEN_MANIFEST_FIELDS.filter(
    (f) => f in (manifest as Record<string, unknown>),
  );
  if (leaked.length > 0)
    manifestLeaks.push({ pkg: meta.name, fields: [...leaked] });

  // Resolve every target an exports map (and top-level main/types) declares.
  const shipped = new Set(meta.files.map((f) => f.path));
  const declared: { subpath: string; target: string }[] = [];
  const collect = (subpath: string, node: unknown): void => {
    if (typeof node === 'string') declared.push({ subpath, target: node });
    else if (node && typeof node === 'object')
      for (const v of Object.values(node as Record<string, unknown>))
        collect(subpath, v);
  };
  const exportsMap = (manifest as { exports?: Record<string, unknown> })
    .exports;
  if (exportsMap)
    for (const [sub, node] of Object.entries(exportsMap)) collect(sub, node);
  for (const field of ['main', 'types'] as const) {
    const v = (manifest as Record<string, unknown>)[field];
    if (typeof v === 'string') declared.push({ subpath: field, target: v });
  }
  for (const { subpath, target } of declared) {
    const rel = target.replace(/^\.\//, '');
    if (rel.includes('*')) continue; // wildcard subpaths can't be checked statically
    if (!shipped.has(rel))
      exportGaps.push({ pkg: meta.name, subpath, missing: rel });
  }

  const commented = meta.files.filter(
    (f) =>
      f.path.endsWith('.js') &&
      readFileSync(join(distDir, f.path), 'utf8').includes(STRIP_SENTINEL),
  );
  if (commented.length > 0) {
    commentRegressions.push({ pkg: meta.name, files: commented.length });
  }

  const indented = meta.files.filter(
    (f) =>
      f.path.endsWith('.js') &&
      INDENTED_LINE.test(readFileSync(join(distDir, f.path), 'utf8')),
  );
  if (indented.length > 0) {
    whitespaceRegressions.push({ pkg: meta.name, files: indented.length });
  }

  for (const f of meta.files) {
    const hit = FORBIDDEN.find((r) => r.test(f.path));
    if (hit) {
      violations.push({
        pkg: meta.name,
        file: f.path,
        kb: f.size / 1024,
        label: hit.label,
        why: hit.why,
      });
    }
  }
}

// One list, one exit decision — used by BOTH the --json branch and the human
// output below. Adding a sixth category means adding it here and nowhere else.
// Declared before either consumer: an earlier version referenced it only from
// the --json branch while declaring it further down, so `--json` crashed on a
// temporal dead zone. CodeQL caught that; the lock is that both readers now
// sit below this line.
const FAILURES = [
  violations.length,
  commentRegressions.length,
  whitespaceRegressions.length,
  metadataGaps.length,
  exportGaps.length,
  manifestLeaks.length,
];

if (sizes.length === 0) {
  console.error(
    'check-published-artifacts: no built packages found — run `npx turbo build --filter="./packages/*"` first.',
  );
  process.exit(1);
}

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        violations,
        commentRegressions,
        whitespaceRegressions,
        metadataGaps,
        exportGaps,
        manifestLeaks,
        sizes,
      },
      null,
      2,
    ),
  );
  process.exit(FAILURES.some((n) => n > 0) ? 1 : 0);
}

const total = sizes.reduce((a, s) => a + s.kb, 0);
console.log(
  `\n  PUBLISHED ARTIFACT GATE — ${sizes.length} packages, ${total.toFixed(1)} kB unpacked\n`,
);

if (commentRegressions.length > 0) {
  console.error(
    `  ❌ ${commentRegressions.length} package(s) ship commented JS — the` +
      ' comment-strip pass in scripts/build-package.ts is not running:\n',
  );
  for (const c of commentRegressions) {
    console.error(`    ${c.pkg}  ${c.files} .js file(s) still carry comments`);
  }
  console.error('');
}

if (whitespaceRegressions.length > 0) {
  console.error(
    `  ❌ ${whitespaceRegressions.length} package(s) ship indented JS — the` +
      ' whitespace-strip pass in scripts/build-package.ts is not running:\n',
  );
  for (const w of whitespaceRegressions) {
    console.error(
      `    ${w.pkg}  ${w.files} .js file(s) still carry tsc layout`,
    );
  }
  console.error(
    '\n    Indentation is ~32% of a compiled rule file; the pass is worth\n' +
      '    37% of the shipped JavaScript across the ecosystem.\n',
  );
}

if (exportGaps.length > 0) {
  console.error(
    `  ❌ ${exportGaps.length} declared export path(s) missing from the tarball:\n`,
  );
  for (const g of exportGaps) {
    console.error(
      `    ${g.pkg}  "${g.subpath}" -> ${g.missing}  (NOT SHIPPED)`,
    );
  }
  console.error(
    '\n    A consumer importing that subpath gets "Cannot find module".\n' +
      '    Either ship the file or drop the entry from `exports`.\n',
  );
}

if (manifestLeaks.length > 0) {
  console.error(
    `  ❌ ${manifestLeaks.length} manifest(s) still carry build-only fields:\n`,
  );
  for (const m of manifestLeaks)
    console.error(`    ${m.pkg}  ${m.fields.join(', ')}`);
  console.error(
    '\n    build-package.ts deletes these; if that stopped, they ship to every\n' +
      '    consumer and clutter the npm page.\n',
  );
}

if (metadataGaps.length > 0) {
  console.error(
    `  ❌ ${metadataGaps.length} package(s) missing discoverability metadata:\n`,
  );
  for (const g of metadataGaps) {
    console.error(`    ${g.pkg}  ${g.fields.join(', ')}`);
  }
  console.error('');
}

const failed = FAILURES.some((n) => n > 0);

if (!failed) {
  console.log(
    '  ✅ No source maps, no AGENTS.md, no commented or indented JS;' +
      ' every declared export resolves; no build-only manifest fields;' +
      ' metadata complete.\n',
  );
  process.exit(0);
}

// Every category above has already printed its own detail block; only
// `violations` still needs rendering before we exit non-zero.
if (violations.length === 0) process.exit(1);

const wasted = violations.reduce((a, v) => a + v.kb, 0);
console.error(
  `  ❌ ${violations.length} forbidden file(s), ${wasted.toFixed(1)} kB of dead weight:\n`,
);
const byPkg = new Map<string, Violation[]>();
for (const v of violations) byPkg.set(v.pkg, [...(byPkg.get(v.pkg) ?? []), v]);
for (const [pkg, vs] of byPkg) {
  const kb = vs.reduce((a, v) => a + v.kb, 0);
  console.error(`    ${pkg}  (${vs.length} files, ${kb.toFixed(1)} kB)`);
  for (const v of vs.slice(0, 3))
    console.error(`      ${v.label} (${v.why}): ${v.file}`);
  if (vs.length > 3) console.error(`      … and ${vs.length - 3} more`);
}
console.error(
  '\n  Fix: scripts/build-package.ts owns the exclusions. Rebuild with' +
    '\n  `npx turbo build --filter="./packages/*" --force` and re-run.\n',
);
process.exit(1);
