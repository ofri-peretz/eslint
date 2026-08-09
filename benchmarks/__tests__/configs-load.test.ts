/**
 * Every benchmark ESLint config must import successfully.
 *
 * This is not a tidiness check — it is the guard for a silent-zero defect.
 *
 * The configs under `suites/ilb-arena/configs/` are shared by three suites
 * (ilb-arena, ilb-cwe-corpus, ilb-juliet) and `suites/ilb-ai/eslint.config.js`
 * drives a fourth. Each of them used to catch a config-load failure per
 * fixture and carry on: cwe-corpus and juliet returned `{error}` whose missing
 * `findings` field scored as zero, and arena printed a warning and returned
 * `[]`. In all of them, **a config that cannot load is scored identically to a
 * plugin that detects nothing.**
 *
 * That is not hypothetical. #414 (2026-08-07) renamed `eslint-plugin-pg` and
 * `eslint-plugin-jwt` to `-postgresql-security` / `-jwt-security`;
 * `interlace.config.js` still imported the old names, so the entire config
 * threw and ilb-cwe-corpus published `Interlace: TP=0 FP=0 FN=69, F1=0%` —
 * dead last behind every competitor — while the real numbers were TP=51 FN=18,
 * F1=75%, first place. Nobody noticed for two days, and the weekly badge
 * generator (#449) was one cron away from rendering the 0% onto the site.
 *
 * The runners now exit non-zero on a load failure. This test is the earlier
 * gate: it fails on the PR that renames a package, not on the next benchmark
 * run. It deliberately covers the *competitor* configs too — the first thing
 * it caught was `vue.config.js` failing on a missing `vue-eslint-parser`,
 * meaning the arena had been publishing eslint-plugin-vue as detecting
 * nothing. Scoring a competitor at zero because we broke their config is the
 * same defect pointed the other way, and a far worse look.
 *
 * Each config is loaded in a real `node` subprocess rather than with a bare
 * `await import()`. Vitest's SSR transform resolves these packages through its
 * own interop, where `plugin.configs` reads back `undefined` for a plugin that
 * loads perfectly under node — so an in-process import reports failures the
 * benchmark will never hit and misses the resolution differences it will.
 * The runners use plain node; so does this test.
 *
 * WHY THIS FILE IS NOT IN THE DEFAULT `vitest run`
 * ------------------------------------------------
 * The configs import our plugins by package name, and those packages resolve
 * through `exports` to `dist/`. So this suite only means anything on a tree
 * where the plugins are BUILT, and it is excluded from `test` (which the
 * unsharded lock jobs and the test shards run without building) and pinned to
 * its own `test:configs-load` script, run by the `Benchmark configs load` job
 * after `turbo run build`.
 *
 * A resolve-only check needing no build was considered and rejected: it cannot
 * see the failure mode that actually mattered here. `vue.config.js` imports
 * exactly one specifier, `eslint-plugin-vue`, which resolves fine — the parser
 * blew up *inside* `vue.configs['flat/recommended']`. Only executing the
 * config finds that.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const SUITES = join(import.meta.dirname, '../suites');
const ARENA_CONFIG_DIR = join(SUITES, 'ilb-arena/configs');

/** Every scored config, as absolute paths. */
const CONFIGS: string[] = [
  ...readdirSync(ARENA_CONFIG_DIR)
    .filter((f) => f.endsWith('.config.js'))
    .sort()
    .map((f) => join(ARENA_CONFIG_DIR, f)),
  // Not in the arena directory, same defect exposure: ilb-ai scores whatever
  // this config loads, and it imported the two renamed packages until now.
  join(SUITES, 'ilb-ai/eslint.config.js'),
];

/** Import one config in a real node process; returns '' on success. */
function loadFailure(absPath: string): string {
  const probe = `
    import(${JSON.stringify(absPath)})
      .then((m) => {
        const c = m.default;
        if (!Array.isArray(c)) throw new Error('default export is not an array');
        if (c.length === 0) throw new Error('exports an empty config — lints nothing');
      })
      .catch((e) => { console.error(e.message); process.exit(1); });
  `;
  try {
    execFileSync(process.execPath, ['--input-type=module', '-e', probe], {
      stdio: ['ignore', 'ignore', 'pipe'],
      encoding: 'utf-8',
    });
    return '';
  } catch (error) {
    const e = error as { stderr?: string };
    return (e.stderr ?? 'unknown failure').split('\n')[0]!.slice(0, 200);
  }
}

describe('benchmark configs', () => {
  it('finds the configs', () => {
    // A moved or renamed directory would otherwise turn this whole suite into
    // zero passing assertions, which reports green.
    expect(CONFIGS.length).toBeGreaterThan(10);
  });

  it.each(CONFIGS.map((p) => [p.slice(SUITES.length + 1), p] as const))(
    '%s loads under node',
    { timeout: 30_000 },
    (label, absPath) => {
      expect(loadFailure(absPath), `${label} does not load`).toBe('');
    },
  );
});
