/**
 * Every benchmark arena config must import successfully.
 *
 * This is not a tidiness check — it is the guard for a silent-zero defect.
 *
 * `benchmarks/suites/ilb-arena/configs/*.config.js` are shared by three
 * suites: ilb-arena, ilb-cwe-corpus and ilb-juliet. Each of them used to catch
 * a config-load failure per fixture and carry on: cwe-corpus and juliet
 * returned `{error}` whose missing `findings` field scored as zero, and arena
 * printed a warning and returned `[]`. In all three, **a config that cannot
 * load is scored identically to a plugin that detects nothing.**
 *
 * That is not hypothetical. #414 (2026-08-07) deleted the renamed
 * `eslint-plugin-pg` and `eslint-plugin-jwt` sources; `interlace.config.js`
 * still imported both, so the entire config threw and ilb-cwe-corpus published
 * `Interlace: TP=0 FP=0 FN=69, F1=0%` — dead last behind every competitor —
 * while the real numbers were TP=51 FN=18, F1=75%, first place. Nobody noticed
 * for two days, and the weekly badge generator (#449) was one cron away from
 * rendering the 0% onto the site.
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
 */
import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const CONFIG_DIR = join(import.meta.dirname, '../../benchmarks/suites/ilb-arena/configs');

const CONFIGS = readdirSync(CONFIG_DIR)
  .filter((f) => f.endsWith('.config.js'))
  .sort();

/** Import one config in a real node process; returns '' on success. */
function loadFailure(name: string): string {
  const probe = `
    import(${JSON.stringify(join(CONFIG_DIR, name))})
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

describe('benchmark arena configs', () => {
  it('finds the config directory', () => {
    // A moved or renamed directory would otherwise turn this whole suite into
    // zero passing assertions, which reports green.
    expect(CONFIGS.length).toBeGreaterThan(10);
  });

  it.each(CONFIGS)('%s loads under node', { timeout: 30_000 }, (name) => {
    expect(loadFailure(name), `${name} does not load`).toBe('');
  });
});
