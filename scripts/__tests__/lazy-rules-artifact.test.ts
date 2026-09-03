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
const RE_EXPORTING = 'eslint-plugin-jwt-security';

const entryFor = (pkg: string): string =>
  join(REPO_ROOT, 'packages', pkg, 'dist', 'src', 'index.js');

const built = (pkg: string): string | null => {
  const entry = entryFor(pkg);
  return existsSync(entry) ? readFileSync(entry, 'utf8') : null;
};

/** Counts the rule modules a plugin pulls into require.cache on load. */
const countProbe = (pkg: string): string => `
  const path = ${JSON.stringify(entryFor(pkg))};
  require(path);
  process.stdout.write(String(
    Object.keys(require.cache).filter((f) => f.includes('/dist/src/rules/')).length,
  ));
`;

/**
 * Runs a probe in a child node and returns its raw stdout.
 *
 * Both halves of this are load-bearing, and both defend the same failure.
 * Node colourises `console.log(<number>)` when FORCE_COLOR is set — which
 * modern terminals and some CI runners set globally — even with stdout piped,
 * so the child emitted `\x1b[33m0\x1b[39m` and `Number()` gave NaN. The
 * numeric locks below then failed for a reason that had nothing to do with
 * the built artifact. `process.stdout.write` never colourises, and the pinned
 * env stops an inherited FORCE_COLOR from reaching the child at all.
 */
const runProbe = (source: string): string =>
  execFileSync(process.execPath, ['-e', source], {
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
  }).trim();

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
const rulesLoadedOnRequire = (pkg: string): number =>
  Number(runProbe(countProbe(pkg)));

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
      process.stdout.write(JSON.stringify({
        total: names.length,
        afterLoad,
        afterEnumerate,
        afterAccess: ruleModules(),
        isRule: typeof first?.create === 'function',
        stableIdentity: first === again,
      }));
    `;
    const result = JSON.parse(runProbe(probe));

    expect(result.total).toBeGreaterThan(10);
    expect(result.afterLoad).toBe(0);
    expect(result.afterEnumerate).toBe(0); // Object.keys must not resolve anything
    expect(result.afterAccess).toBe(1); // reading one rule loads exactly one
    expect(result.isRule).toBe(true);
    expect(result.stableIdentity).toBe(true);
  });

  it('reads a number back even when the environment forces colour', () => {
    if (built(FULLY_LAZY) === null) return;
    // Deliberately does NOT pass the FORCE_COLOR=0 guard from runProbe: this
    // pins the other half of the fix, that the probe writes with
    // `process.stdout.write` rather than `console.log`. On the unfixed probe
    // the child emits ANSI codes here and this parses to NaN.
    //
    // NO_COLOR is DELETED rather than left to the spread. Current Node lets
    // FORCE_COLOR win and warns that it ignored NO_COLOR, so an inherited
    // NO_COLOR would only add stderr noise — but the precedence has not always
    // run that way, and on a Node where NO_COLOR wins this case would go quiet
    // and pass against the unfixed probe. Deleting the key means the child is
    // forced to colourise on every version, so the guard cannot self-disable.
    const { NO_COLOR: _inherited, ...envWithoutNoColor } = process.env;
    const raw = execFileSync(process.execPath, ['-e', countProbe(FULLY_LAZY)], {
      encoding: 'utf8',
      env: { ...envWithoutNoColor, FORCE_COLOR: '1' },
    }).trim();

    expect(raw).toMatch(/^\d+$/);
  });
});
