/**
 * Locks for the lazy rule-barrel transform in scripts/build-package.ts.
 *
 * The transform rewrites the EMITTED `dist/src/index.js` — not the TypeScript —
 * so nothing in the normal test suite exercises it. These assertions read the
 * built artifact directly, which is the only place the optimisation exists.
 *
 * What each case defends:
 *
 *   - "no eager rule requires" is the whole point. A plugin barrel that loads
 *     all of its rules at require() time costs ~180 ms across a 7-plugin config
 *     for rules the user never enabled.
 *   - "only touched rules load" is the behavioural claim. `Object.keys` must
 *     stay cheap (configs.strict enumerates it) while property ACCESS is what
 *     pulls the module in. A getter that eagerly resolved, or a transform that
 *     emitted plain values again, fails here and not in typecheck.
 *   - "identity is stable" guards the pass-through contract the oxlint
 *     sub-export tests assert: `require()` memoises, so two reads of the same
 *     rule must be the same object, not two copies.
 *   - the public re-export carve-out is deliberate, not an oversight — see the
 *     step 3d comment in build-package.ts.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

/** A plugin with no per-rule value re-exports, so every rule can be deferred. */
const FULLY_LAZY = 'eslint-plugin-node-security';
/** Re-exports all 13 rule objects as public API — those requires must survive. */
const RE_EXPORTING = 'eslint-plugin-jwt';

const entryFor = (pkg: string): string =>
  join(REPO_ROOT, 'packages', pkg, 'dist', 'src', 'index.js');

const built = (pkg: string): string | null => {
  const entry = entryFor(pkg);
  return existsSync(entry) ? readFileSync(entry, 'utf8') : null;
};

/**
 * How many rule modules a plugin pulls in purely by being `require`d.
 *
 * Asserted as BEHAVIOUR, not text. The first version of this lock matched
 * tsc's emitted shape (`^const x_1 = require("./rules/y");$`), and the
 * whitespace-strip pass — which runs after the barrel transform and puts the
 * module on one line without spaces — silently made every one of those
 * patterns unmatchable. The lock kept passing while testing nothing. What
 * actually matters is how many modules load, and that survives any formatting.
 */
const rulesLoadedOnRequire = (pkg: string): number => {
  const probe = `
    const path = ${JSON.stringify(entryFor(pkg))};
    require(path);
    console.log(
      Object.keys(require.cache).filter((f) => f.includes('/dist/src/rules/')).length,
    );
  `;
  return Number(
    execFileSync(process.execPath, ['-e', probe], { encoding: 'utf8' }).trim(),
  );
};

describe('lazy rule barrel (built artifact)', () => {
  it('loads no rule module when a fully-lazy plugin is required', () => {
    if (built(FULLY_LAZY) === null) return; // dist not built here — nothing to lock
    expect(rulesLoadedOnRequire(FULLY_LAZY)).toBe(0);
  });

  it('still loads eagerly where a public re-export forces it', () => {
    if (built(RE_EXPORTING) === null) return;
    // `export { noAlgorithmNone } from './rules/...'` cannot be deferred, so
    // this plugin is expected to load its rules at require time. Pinning it
    // documents the carve-out rather than leaving it to look like a bug — and
    // fails if someone "fixes" it by dropping the public exports.
    expect(rulesLoadedOnRequire(RE_EXPORTING)).toBeGreaterThan(0);
  });

  it('loads only the rules that are actually read', () => {
    if (built(FULLY_LAZY) === null) return;
    // A child process is the only honest measurement: vitest resolves modules
    // itself, so require.cache here would not reflect the artifact's behaviour.
    const probe = `
      const path = ${JSON.stringify(entryFor(FULLY_LAZY))};
      const plugin = require(path);
      const ruleModules = () =>
        Object.keys(require.cache).filter((f) => f.includes('/dist/src/rules/')).length;
      const afterLoad = ruleModules();
      const names = Object.keys(plugin.rules);
      const afterEnumerate = ruleModules();
      const first = plugin.rules[names[0]];
      const again = plugin.rules[names[0]];
      console.log(JSON.stringify({
        total: names.length,
        afterLoad,
        afterEnumerate,
        afterAccess: ruleModules(),
        isRule: typeof first?.create === 'function',
        stableIdentity: first === again,
      }));
    `;
    const result = JSON.parse(
      execFileSync(process.execPath, ['-e', probe], { encoding: 'utf8' }),
    );

    expect(result.total).toBeGreaterThan(10);
    expect(result.afterLoad).toBe(0);
    expect(result.afterEnumerate).toBe(0); // Object.keys must not resolve anything
    expect(result.afterAccess).toBe(1); // reading one rule loads exactly one
    expect(result.isRule).toBe(true);
    expect(result.stableIdentity).toBe(true);
  });
});
