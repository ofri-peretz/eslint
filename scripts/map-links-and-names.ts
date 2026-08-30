/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Generate `.agent/link-and-name-map.md` — one page naming every identifier and
 * URL shape a plugin has, and which file owns each.
 *
 * WHY THIS IS GENERATED
 * ---------------------
 * A plugin is not one name. It is a directory, an npm package, a rule-id prefix
 * (plus, after a rename, a deprecated alias), a docs slug under a pillar, an OG
 * image, an ecosystem logo and a codecov component — eight identifiers derived from
 * each other by convention and stored in eight different files. #414 renamed two
 * packages and moved four of the eight; the other four sat wrong for months because
 * nothing put them side by side.
 *
 * So this map is DERIVED, never hand-maintained. Every hand-maintained list of
 * plugins in this repo has drifted: the `DESCRIPTIONS` map, `VALID_PLUGINS` in the
 * documentation-standards test, the README ecosystem table, the codecov flags. A map
 * that needs updating is one more of those. Run it, read it, and when it disagrees
 * with a source file, the source file is what changes.
 *
 * `--check` fails when the committed map is stale, so a rename cannot land without
 * the map moving with it.
 *
 * Usage:
 *   tsx scripts/map-links-and-names.ts            # write
 *   tsx scripts/map-links-and-names.ts --check    # CI
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
const DOCS_CONTENT = path.join(REPO_ROOT, 'apps/docs/content/docs');
const IMAGES_DIR = path.join(REPO_ROOT, 'apps/docs/public/images');
const LOGOS_DIR = path.join(REPO_ROOT, 'apps/docs/public/logos');
const OUT = path.join(REPO_ROOT, '.agent/link-and-name-map.md');

const DOCS_ORIGIN = 'https://eslint.interlace.tools';
const REPO_URL = 'https://github.com/ofri-peretz/eslint';

const read = (p: string) => fs.readFileSync(p, 'utf-8');

// --- sources of truth -------------------------------------------------------

/** slug / package / pillar / description — drives the docs nav and the README tables. */
function loadRegistry(): {
  slug: string;
  pkg: string;
  pillar: string;
  description: string;
}[] {
  const src = read(path.join(REPO_ROOT, 'apps/docs/src/lib/plugins.ts'));
  const arr = src.match(/export const PLUGINS:[^=]*=\s*\[([\s\S]*?)\];/);
  if (!arr)
    throw new Error('PLUGINS array not found in apps/docs/src/lib/plugins.ts');
  const re =
    /\{\s*slug:\s*['"]([^'"]+)['"][\s\S]*?package:\s*['"]([^'"]+)['"][\s\S]*?pillar:\s*['"]([^'"]+)['"][\s\S]*?description:\s*['"]([^'"]+)['"]/g;
  const out = [...arr[1].matchAll(re)].map((m) => ({
    slug: m[1],
    pkg: m[2],
    pillar: m[3],
    description: m[4],
  }));
  if (out.length === 0) throw new Error('registry parsed to zero entries');
  return out;
}

/**
 * Rule-id prefixes that a rename retired. Parsed from the lock that enforces them,
 * `benchmarks/__tests__/plugin-prefix-identity.lock.test.ts`, so the map cannot claim
 * an alias the presets do not actually register.
 */
function loadDeprecatedAliases(): Map<string, string> {
  const src = read(
    path.join(
      REPO_ROOT,
      'benchmarks/__tests__/plugin-prefix-identity.lock.test.ts',
    ),
  );
  const block = src.match(/const DEPRECATED_ALIASES[^=]*=\s*\{([\s\S]*?)\};/);
  if (!block)
    throw new Error('DEPRECATED_ALIASES not found in the prefix-identity lock');
  const map = new Map<string, string>();
  for (const m of block[1].matchAll(
    /['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g,
  )) {
    map.set(m[1], m[2]);
  }
  return map;
}

/** The vendor mark each plugin carries in slot 2 of its logo row. */
function loadEcosystemLogos(): Map<string, string> {
  const src = read(
    path.join(REPO_ROOT, 'tools/scripts/check-readme-structure.ts'),
  );
  const block = src.match(/const ECOSYSTEM_LOGO:[^=]*=\s*\{([\s\S]*?)\};/);
  if (!block)
    throw new Error('ECOSYSTEM_LOGO not found in check-readme-structure.ts');
  const map = new Map<string, string>();
  for (const m of block[1].matchAll(
    /['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/g,
  )) {
    map.set(m[1], m[2]);
  }
  return map;
}

/** Component ids codecov scopes per package. */
function loadCodecovComponents(): Set<string> {
  const src = read(path.join(REPO_ROOT, 'codecov.yml'));
  return new Set([...src.matchAll(/component_id:\s*(\S+)/g)].map((m) => m[1]));
}

// --- rendering --------------------------------------------------------------

const ok = (present: boolean) => (present ? '✅' : '❌');

function render(): string {
  const registry = loadRegistry();
  const aliases = loadDeprecatedAliases();
  const logos = loadEcosystemLogos();
  const components = loadCodecovComponents();

  const dirs = fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('eslint-plugin-'))
    .map((e) => e.name)
    .sort();

  const rows = registry
    .toSorted((a, b) => a.pkg.localeCompare(b.pkg))
    .map((e) => {
      const prefix = e.pkg.replace(/^eslint-plugin-/, '');
      const alias = aliases.get(prefix);
      const docsDir = path.join(DOCS_CONTENT, e.pillar, `plugin-${e.slug}`);
      const version = JSON.parse(
        read(path.join(PACKAGES_DIR, e.pkg, 'package.json')),
      ).version as string;
      return {
        ...e,
        prefix,
        alias,
        version,
        onDisk: dirs.includes(e.pkg),
        docsOk: fs.existsSync(docsDir),
        ogOk: fs.existsSync(path.join(IMAGES_DIR, `og-${e.slug}.png`)),
        logo: logos.get(e.pkg) ?? '—',
        codecovOk: components.has(e.pkg),
      };
    });

  const orphanDirs = dirs.filter((d) => !registry.some((e) => e.pkg === d));

  const L: string[] = [];
  L.push('# Link & name map');
  L.push('');
  L.push(
    '> **Generated — do not hand-edit.** `npm run map:names` rewrites this file;',
  );
  L.push(
    '> `npm run map:names:check` fails when it is stale. Every hand-maintained',
  );
  L.push(
    '> plugin list in this repo has drifted at least once; this one is derived so',
  );
  L.push(
    '> that when it disagrees with a source file, the source file is what changes.',
  );
  L.push('');
  L.push(`Covers ${rows.length} plugins.`);
  L.push('');

  L.push('## The eight identifiers a plugin has');
  L.push('');
  L.push('| # | Identifier | Shape | Owned by |');
  L.push('| :- | :--- | :--- | :--- |');
  L.push(
    '| 1 | Workspace directory | `packages/eslint-plugin-<name>/` | the filesystem |',
  );
  L.push(
    "| 2 | npm package | `eslint-plugin-<name>` | that package's `package.json#name` |",
  );
  L.push(
    '| 3 | Rule-id prefix | `<name>/<rule>` | the presets in `src/index.ts` |',
  );
  L.push(
    '| 4 | Deprecated alias | a retired prefix, still registered | `DEPRECATED_ALIASES` in `benchmarks/__tests__/plugin-prefix-identity.lock.test.ts` |',
  );
  L.push(
    '| 5 | Docs slug + pillar | `docs/<pillar>/plugin-<slug>` | `apps/docs/src/lib/plugins.ts` |',
  );
  L.push(
    '| 6 | OG banner | `/images/og-<slug>.png` | `apps/docs/scripts/generate-og-images.mjs` |',
  );
  L.push(
    '| 7 | Ecosystem logo | `/logos/<mark>.svg` | `ECOSYSTEM_LOGO` in `tools/scripts/check-readme-structure.ts` |',
  );
  L.push(
    '| 8 | Codecov component | `component_id` + `paths` | `codecov.yml` |',
  );
  L.push('');
  L.push(
    'Directory (1), package (2) and prefix (3) must agree letter for letter — the',
  );
  L.push(
    'rule id an adopter copies out of a preset names the plugin key they register.',
  );
  L.push('');

  L.push('## Per-plugin');
  L.push('');
  L.push(
    '| npm package | v | prefix | alias | docs slug | pillar | logo | docs | OG | codecov |',
  );
  L.push(
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :-: | :-: | :-: |',
  );
  for (const r of rows) {
    L.push(
      `| \`${r.pkg}\` | ${r.version} | \`${r.prefix}/\` | ${r.alias ? `\`${r.alias}/\`` : '—'} ` +
        `| \`plugin-${r.slug}\` | ${r.pillar} | \`${r.logo}\` ` +
        `| ${ok(r.docsOk)} | ${ok(r.ogOk)} | ${ok(r.codecovOk)} |`,
    );
  }
  L.push('');
  if (orphanDirs.length > 0) {
    L.push(
      `**Unregistered directories:** ${orphanDirs.map((d) => `\`${d}\``).join(', ')}`,
    );
    L.push('');
  }
  const noCodecov = rows.filter((r) => !r.codecovOk).map((r) => r.pkg);
  if (noCodecov.length > 0) {
    L.push(
      `**No codecov component:** ${noCodecov.map((d) => `\`${d}\``).join(', ')}`,
    );
    L.push('');
  }

  L.push('## URL shapes');
  L.push('');
  L.push(
    '`<slug>` is column 5 above, `<pkg>` column 2. Every docs link from a README or',
  );
  L.push(
    'an article carries `?utm_source=github&utm_medium=referral&utm_campaign=<pkg>`,',
  );
  L.push('stamped by `scripts/stamp-utm-links.ts` — see `UTM_PHILOSOPHY.md`.');
  L.push('');
  L.push('| What | Shape |');
  L.push('| :--- | :--- |');
  L.push(
    `| Plugin docs page | \`${DOCS_ORIGIN}/docs/<pillar>/plugin-<slug>\` |`,
  );
  L.push(
    `| Rule docs page | \`${DOCS_ORIGIN}/docs/<pillar>/plugin-<slug>/rules/<rule>\` |`,
  );
  L.push(
    `| Plugin changelog | \`${DOCS_ORIGIN}/docs/<pillar>/plugin-<slug>/changelog\` |`,
  );
  L.push('| npm package | `https://www.npmjs.com/package/<pkg>` |');
  L.push(
    '| Downloads badge | `https://img.shields.io/npm/dt/<pkg>.svg?style=flat-square` |',
  );
  L.push('| Version badge | `https://img.shields.io/npm/v/<pkg>.svg` |');
  L.push(
    `| Codecov badge | \`https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=<pkg>\` |`,
  );
  L.push(`| OG banner | \`${DOCS_ORIGIN}/images/og-<slug>.png\` |`);
  L.push(`| Source on GitHub | \`${REPO_URL}/tree/main/packages/<pkg>\` |`);
  L.push(
    `| Rule source doc | \`${REPO_URL}/blob/main/packages/<pkg>/docs/rules/<rule>.md\` |`,
  );
  L.push('');
  L.push(
    '**Renamed slugs redirect, never 404.** `apps/docs/next.config.mjs` keeps',
  );
  L.push(
    '`/docs/security/plugin-jwt/*` → `plugin-jwt-security/*` and `plugin-pg/*` →',
  );
  L.push(
    '`plugin-postgresql-security/*`. A redirect is a safety net, not an address —',
  );
  L.push('links we author use the canonical slug.');
  L.push('');

  L.push('## Brand marks');
  L.push('');
  L.push(
    'Named by **surface**, not by ink: `-light` is for light surfaces (dark ink, npm',
  );
  L.push(
    "and GitHub light), `-dark` is for dark surfaces (light ink, GitHub dark). oxc's",
  );
  L.push('own files use the opposite convention, which has already caused one');
  L.push('wrong-variant commit.');
  L.push('');
  L.push('| Mark | Light surface | Dark surface | Base |');
  L.push('| :--- | :--- | :--- | :--- |');
  for (const m of ['interlace', 'eslint', 'oxlint']) {
    const has = (f: string) => ok(fs.existsSync(path.join(LOGOS_DIR, f)));
    L.push(
      `| ${m} | \`/logos/${m}-light.svg\` ${has(`${m}-light.svg`)} ` +
        `| \`/logos/${m}-dark.svg\` ${has(`${m}-dark.svg`)} ` +
        `| \`/logos/${m}.svg\` ${has(`${m}.svg`)} |`,
    );
  }
  L.push('');
  L.push(
    'Generated by `tools/scripts/make-theme-variants.mjs`. In a README the three are',
  );
  L.push(
    'written as `<picture>` with the `-light` file as the `<img>` fallback; the ~20',
  );
  L.push(
    'vendor ecosystem marks stay plain `<img>`. The base file is for single-file',
  );
  L.push('consumers and must not appear in a README.');
  L.push('');

  L.push('## What enforces each column');
  L.push('');
  L.push('| Gate | Holds |');
  L.push('| :--- | :--- |');
  L.push(
    '| `scripts/__tests__/plugin-name-metadata-drift.lock.test.ts` | every plugin name in a machine-read surface resolves to a real directory; registry ↔ `packages/` agree exactly |',
  );
  L.push(
    '| `benchmarks/__tests__/plugin-prefix-identity.lock.test.ts` | prefix (3) equals package suffix (2), and each preset registers the key its rule ids name |',
  );
  L.push(
    '| `apps/docs/src/__tests__/readme-og-banner-lock.test.ts` | every published README banner (6) exists on disk |',
  );
  L.push(
    '| `apps/docs/src/__tests__/remote-markdown-slug-lock.test.ts` | every docs slug (5) resolves to a real package |',
  );
  L.push(
    '| `scripts/__tests__/readme-structure-gate.lock.test.ts` | logo row, section order and the closing mark (7) |',
  );
  L.push(
    '| `packages/eslint-devkit/src/tests/documentation-standards.test.ts` | rule docs reference their own plugin prefix (3) |',
  );
  L.push('| `npm run map:names:check` | this file still matches its sources |');
  L.push('');

  return L.join('\n') + '\n';
}

const next = render();
const check = process.argv.includes('--check');
/**
 * Read the current output, or `null` if it does not exist yet.
 *
 * Not `existsSync(OUT) ? read(OUT) : null`: that checks and then acts on the
 * result of the check, and the file can be replaced or removed in between
 * (CodeQL `js/file-system-race`). Attempting the read and handling ENOENT has
 * no such window — the syscall either returns the contents or tells us it is
 * gone. Every other error still throws, so a permissions problem or a
 * directory in the way is not silently reported as "missing" and then
 * overwritten.
 */
function readCurrent(): string | null {
  try {
    return read(OUT);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

const current = readCurrent();

if (current === next) {
  console.log(`✅ ${path.relative(REPO_ROOT, OUT)} is in sync.`);
} else if (check) {
  console.error(
    `❌ ${path.relative(REPO_ROOT, OUT)} is ${current === null ? 'missing' : 'out of date'} — ` +
      'run `npm run map:names` and commit the result.',
  );
  process.exit(1);
} else {
  fs.writeFileSync(OUT, next);
  console.log(`✅ ${path.relative(REPO_ROOT, OUT)} updated.`);
}
