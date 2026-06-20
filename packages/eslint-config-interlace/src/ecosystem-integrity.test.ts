/**
 * Ecosystem integrity locks — barrel, configs, and rules for EVERY published
 * Interlace plugin must load without throwing.
 *
 * Why this exists (the bug that motivated it): `eslint-plugin-maintainability`
 * and `eslint-plugin-react-features` once shipped a `recommended` preset whose
 * plugin KEY (`@interlace/maintainability`) didn't match its rule PREFIX
 * (`@interlace/maintainability/maintainability/…`). ESLint can't resolve that,
 * so the config throws "could not find plugin" the moment a consumer lints a
 * file. The per-plugin structural tests checked key/name strings but never
 * loaded the config into a real ESLint, so the breakage sailed through to npm.
 *
 * This suite closes that gap: it spreads every exported config into a real
 * ESLint flat-config and calls `calculateConfigForFile`, which normalizes the
 * config (validating every rule → plugin reference) WITHOUT executing any rule
 * — so it catches resolution bugs with no false positives from type-aware
 * rules that would need `parserOptions.project`.
 *
 * Runs against workspace source, so it locks the SOURCE against regression.
 * The release pipeline should run it against built `dist/` before `npm publish`
 * to also catch a stale-artifact publish (the original failure mode).
 */

import { readFile, readdir } from 'node:fs/promises';
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

// ---------------------------------------------------------------------------
// The ecosystem under test.
//
// `eslint-plugin-crypto` is intentionally excluded: its package has no local
// package.json (build-artifact-only dir), so it is not workspace-importable.
// Track restoring it; once it has a manifest, add it here.
// ---------------------------------------------------------------------------
const PLUGIN_NAMES = [
  // security (10 of 11 — crypto excluded)
  'eslint-plugin-secure-coding',
  'eslint-plugin-node-security',
  'eslint-plugin-browser-security',
  'eslint-plugin-jwt',
  'eslint-plugin-pg',
  'eslint-plugin-mongodb-security',
  'eslint-plugin-express-security',
  'eslint-plugin-nestjs-security',
  'eslint-plugin-lambda-security',
  'eslint-plugin-vercel-ai-security',
  // quality (7)
  'eslint-plugin-conventions',
  'eslint-plugin-import-next',
  'eslint-plugin-maintainability',
  'eslint-plugin-reliability',
  'eslint-plugin-modularity',
  'eslint-plugin-operability',
  'eslint-plugin-modernization',
  // react (2)
  'eslint-plugin-react-a11y',
  'eslint-plugin-react-features',
] as const;

interface Loaded {
  readonly name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly mod: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly plugin: any;
  readonly configs: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly rules: Record<string, any>;
}

const loaded: readonly Loaded[] = await Promise.all(
  PLUGIN_NAMES.map(async (name): Promise<Loaded> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(name);
    const plugin = mod.default ?? mod.plugin;
    return {
      name,
      mod,
      plugin,
      configs: (mod.configs ?? {}) as Record<string, unknown>,
      rules: (plugin?.rules ?? mod.rules ?? {}) as Record<string, never>,
    };
  }),
);

// Flatten to per-config and per-rule cases so each gets its own `it`.
const configCases = loaded.flatMap(({ name, configs }) =>
  Object.entries(configs).map(([preset, config]) => ({ name, preset, config })),
);

const ruleCases = loaded.flatMap(({ name, plugin }) =>
  Object.entries<Record<string, unknown>>(plugin?.rules ?? {}).map(
    ([ruleId, rule]) => ({
      name,
      ruleId,
      rule,
    }),
  ),
);

// ---------------------------------------------------------------------------
// Barrel — every plugin's public entry has the expected shape.
// ---------------------------------------------------------------------------

describe('barrel exports', () => {
  it('loaded every published plugin', () => {
    expect(loaded).toHaveLength(PLUGIN_NAMES.length);
  });

  it('PLUGIN_NAMES covers every published (non-private) eslint-plugin-* on disk', async () => {
    // Drift guard: the integrity suite is only a real publish-lock if it
    // enumerates EVERY published plugin. Derive the published set from the
    // workspace itself — any `packages/eslint-plugin-*` with a package.json
    // whose `private` !== true — and fail if PLUGIN_NAMES falls behind. This
    // stops a newly-added plugin from shipping configs/rules that no test ever
    // loads into a real ESLint.
    const packagesDir = new URL('../../', import.meta.url);
    const entries = await readdir(packagesDir, { withFileTypes: true });
    const pluginDirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith('eslint-plugin-'))
      .map((e) => e.name);

    const published: string[] = [];
    const noManifest: string[] = [];
    for (const dir of pluginDirs) {
      const pkgUrl = new URL(`../../${dir}/package.json`, import.meta.url);
      let manifest: { private?: boolean } | null = null;
      try {
        manifest = JSON.parse(await readFile(pkgUrl, 'utf8')) as {
          private?: boolean;
        };
      } catch {
        // No local package.json => not workspace-importable. `eslint-plugin-crypto`
        // is the known build-artifact-only dir; it is intentionally out of scope
        // until it gains a manifest. Track but don't require it.
        noManifest.push(dir);
        continue;
      }
      if (manifest.private !== true) published.push(dir);
    }

    // crypto (or any future manifest-less plugin dir) must not silently become
    // "covered". Assert it stays the documented exception, nothing more.
    expect(
      noManifest,
      'unexpected manifest-less plugin dir (only crypto is known)',
    ).toEqual(noManifest.filter((d) => d === 'eslint-plugin-crypto'));

    const covered = new Set<string>(PLUGIN_NAMES);
    const missing = published.filter((name) => !covered.has(name));
    expect(
      missing,
      `published plugins missing from PLUGIN_NAMES: ${missing.join(', ')}`,
    ).toEqual([]);

    // And the inverse — no stale names that no longer exist / went private.
    const onDisk = new Set(published);
    const stale = PLUGIN_NAMES.filter((name) => !onDisk.has(name));
    expect(
      stale,
      `PLUGIN_NAMES entries no longer published: ${stale.join(', ')}`,
    ).toEqual([]);
  });

  it.each(loaded)(
    '$name exports a plugin (meta + rules), `configs`, and `rules`',
    ({ plugin, configs, rules }) => {
      expect(plugin?.meta?.name, 'plugin.meta.name').toBeTruthy();
      expect(
        Object.keys(plugin?.rules ?? {}).length,
        'plugin.rules',
      ).toBeGreaterThan(0);
      expect(
        Object.keys(configs).length,
        'named `configs` export',
      ).toBeGreaterThan(0);
      expect(Object.keys(rules).length, 'named `rules` export').toBeGreaterThan(
        0,
      );
      // Every plugin ships `recommended` (the dogfooding floor).
      expect(configs['recommended'], 'configs.recommended').toBeDefined();
    },
  );

  it.each(loaded)(
    '$name declares an `./oxlint` export (oxlint port — both linters dogfood the same rules)',
    async ({ name }) => {
      // Consumers wiring oxlint import `<plugin>/oxlint`; that subpath must be in
      // the published `exports` map. (Workspace subpath imports don't resolve
      // under vitest, so assert the manifest the published package ships.)
      const pkgUrl = new URL(`../../${name}/package.json`, import.meta.url);
      const pkg = JSON.parse(await readFile(pkgUrl, 'utf8')) as {
        exports?: Record<string, unknown>;
      };
      expect(
        pkg.exports?.['./oxlint'],
        `${name} is missing its "./oxlint" export`,
      ).toBeDefined();
    },
  );
});

// ---------------------------------------------------------------------------
// Configs — every exported preset resolves in a real ESLint without throwing.
// This is the lock that catches plugin-key ↔ rule-prefix mismatches.
// ---------------------------------------------------------------------------

describe('config presets load into ESLint without throwing', () => {
  it.each(configCases)(
    '$name → configs.$preset resolves every rule→plugin reference',
    async ({ config }) => {
      // Build the probe config:
      //
      //   1. PREPEND a bare `files` matcher. This is load-bearing, not cosmetic.
      //      Every Interlace preset is a bare `{ plugins, rules }` object with NO
      //      `files` key of its own. In ESLint flat-config a config block only
      //      *activates* (and therefore only resolves its `rules` → `plugins`
      //      references) for a file that some block POSITIVELY matches via
      //      `files`. With no matcher anywhere in the array, ESLint reports
      //      "File ignored because no matching configuration was supplied" and
      //      NEVER resolves the rules — so a plugin-key ↔ rule-prefix mismatch
      //      (the maintainability/operability bug) sails straight through. The
      //      explicit matcher forces `probe.tsx` to match, which forces full
      //      rule→plugin resolution. (Verified: under both eslint@9 and
      //      eslint@10, the original bug shape — plugin key `@interlace/<x>` but
      //      rule prefix `<x>` — throws `Could not find plugin "<x>"` only when a
      //      matcher is present; without one it is silently ignored.)
      //
      //   2. STRIP `files`/`ignores` from the preset's own blocks so a
      //      preset-internal narrowing (e.g. `files: ['**/*.ts']`) can't exclude
      //      our `.tsx` probe and re-introduce the "ignored" no-op.
      const presetBlocks = (Array.isArray(config) ? config : [config]).map(
        (c) => {
          const {
            files: _files,
            ignores: _ignores,
            ...rest
          } = c as Record<string, unknown>;
          return rest;
        },
      );
      const overrideConfig = [
        { files: ['**/*.{js,jsx,ts,tsx,cjs,mjs}'] },
        ...presetBlocks,
      ];
      const eslint = new ESLint({ overrideConfigFile: true, overrideConfig });
      const results = await eslint.lintText('const _x = 1;\n', {
        filePath: 'probe.tsx',
      });
      expect(results).toHaveLength(1);

      // Guard against the silent no-op: if ESLint ignored the probe file, the
      // rule→plugin resolution above never ran and this whole assertion is
      // hollow. Fail loudly so a future refactor that drops the matcher can't
      // quietly turn this lock back into a pass-everything stub.
      const ignored = results[0].messages.some((m) =>
        /File ignored because no matching configuration/.test(m.message),
      );
      expect(
        ignored,
        `${'probe.tsx'} was ignored — rule→plugin resolution did not run`,
      ).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// Rules — every rule is a well-formed RuleModule (shape only; the config
// load above exercises the recommended ones end-to-end).
// ---------------------------------------------------------------------------

describe('rule modules are well-formed', () => {
  it.each(ruleCases)('$name → $ruleId has meta + create()', ({ rule }) => {
    expect(typeof rule['create'], 'rule.create').toBe('function');
    expect(rule['meta'], 'rule.meta').toBeDefined();
    expect(
      (rule['meta'] as { type?: string }).type,
      'rule.meta.type',
    ).toBeDefined();
  });
});
