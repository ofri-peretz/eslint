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

/** `const x_1 = require("./rules/y");` at module scope — the thing we removed. */
const EAGER_RULE_REQUIRE = /^const \w+ = require\("\.\/rules\/[^"]+"\);$/m;

describe('lazy rule barrel (built artifact)', () => {
  it('defers every rule in a plugin with no rule re-exports', () => {
    const code = built(FULLY_LAZY);
    if (code === null) return; // dist not built in this job — nothing to lock
    expect(code).not.toMatch(EAGER_RULE_REQUIRE);
    expect(code).toMatch(/get '[\w-]+'\(\) \{ return require\("\.\/rules\//);
  });

  it('keeps the eager require a public rule re-export depends on', () => {
    const code = built(RE_EXPORTING);
    if (code === null) return;
    // Both shapes coexist: deferred inside `rules`, eager for `export { … }`.
    expect(code).toMatch(EAGER_RULE_REQUIRE);
    expect(code).toMatch(/get '[\w-]+'\(\) \{ return require\("\.\/rules\//);
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
