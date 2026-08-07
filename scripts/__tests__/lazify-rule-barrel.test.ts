/**
 * Locks for the lazy rule-barrel transform.
 *
 * The dangerous case is the eager-require pruning. Deleting a `const x_1 =
 * require("./rules/x")` line that something still references produces a
 * ReferenceError at plugin load — in the ARTIFACT, which no source-level test
 * would ever see. Every case below is written so the obvious "tidy-up" fails it:
 *
 *   - scoping the reference scan to exclude the rewritten `rules` block — the
 *     shape the first version of this code appeared to have, via a replace that
 *     turned out to be a no-op — deletes the require for a binding that one
 *     entry defers and a NON-converting entry still uses. Only that overlap is
 *     at risk: the pruning loop considers deferred bindings only, so a binding
 *     no entry converted is never a deletion candidate to begin with.
 *   - scoping it to exclude re-exports drops the requires eslint-plugin-jwt and
 *     eslint-plugin-vercel-ai-security publish as named exports
 */
import { describe, it, expect } from 'vitest';
import { lazifyRuleBarrel } from '../lib/lazify-rule-barrel';

const barrel = (imports: string, entries: string, tail = ''): string =>
  `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configs = exports.plugin = exports.rules = void 0;
${imports}
exports.rules = {
${entries}
};
exports.plugin = { meta: { name: "p", version: "1.0.0" }, rules: exports.rules };
${tail}`;

describe('lazifyRuleBarrel', () => {
  it('defers every entry and drops the eager requires nothing else needs', () => {
    const result = lazifyRuleBarrel(
      barrel(
        `const a_1 = require("./rules/a");\nconst b_1 = require("./rules/b");\n`,
        `    'rule-a': a_1.ruleA,\n    'rule-b': b_1.ruleB,`,
      ),
    );

    expect(result).not.toBeNull();
    expect(result?.deferred).toBe(2);
    expect(result?.code).not.toMatch(/^const \w+ = require\("\.\/rules\//m);
    expect(result?.code).toContain(
      `get 'rule-a'() { return require("./rules/a").ruleA; },`,
    );
  });

  it('keeps a require whose binding is ALSO used by a non-converting entry', () => {
    // The one case where scoping the scan away from the rewritten block does
    // real damage. `a_1` is deferred by the first entry, so it becomes a
    // deletion candidate — but the second entry is assigned from a call, which
    // the entry regex cannot match, so it stays `a_1.build(...)` INSIDE the
    // block. Exclude the block from the scan and `a_1` reads as unused, its
    // require is deleted, and the artifact throws ReferenceError the moment
    // ESLint loads the plugin.
    const result = lazifyRuleBarrel(
      barrel(
        `const a_1 = require("./rules/a");\n`,
        `    'rule-a': a_1.ruleA,\n    'rule-a-strict': a_1.build({ strict: true }),`,
      ),
    );

    expect(result?.deferred).toBe(1);
    expect(result?.code).toContain(`a_1.build({ strict: true })`);
    expect(result?.code).toContain(`const a_1 = require("./rules/a");`);
  });

  it('drops the require when the only other mention is a deferred getter', () => {
    // The mirror of the case above, so the two together pin the boundary: with
    // every entry converted there is no surviving `a_1`, and keeping the
    // require would be dead weight in the artifact.
    const result = lazifyRuleBarrel(
      barrel(
        `const a_1 = require("./rules/a");\n`,
        `    'rule-a': a_1.ruleA,\n    'rule-a2': a_1.ruleA2,`,
      ),
    );

    expect(result?.deferred).toBe(2);
    expect(result?.code).not.toContain(`const a_1 =`);
  });

  it('keeps the eager require a public named re-export depends on', () => {
    const result = lazifyRuleBarrel(
      barrel(
        `const a_1 = require("./rules/a");\n`,
        `    'rule-a': a_1.ruleA,`,
        `Object.defineProperty(exports, "ruleA", { enumerable: true, get: function () { return a_1.ruleA; } });`,
      ),
    );

    expect(result?.deferred).toBe(1);
    expect(result?.code).toContain(`const a_1 = require("./rules/a");`);
  });

  it('returns null when there is nothing to defer', () => {
    expect(lazifyRuleBarrel('"use strict";\nexports.rules = {};\n')).toBeNull();
    // Imports but no recognisable barrel.
    expect(
      lazifyRuleBarrel(
        `const a_1 = require("./rules/a");\nmodule.exports = a_1;`,
      ),
    ).toBeNull();
    // A barrel whose entries reference something that is not a rules import.
    expect(
      lazifyRuleBarrel(
        barrel(`const a_1 = require("./rules/a");\n`, `    'x': other_1.x,`),
      ),
    ).toBeNull();
  });

  it('handles both quote styles and unquoted keys', () => {
    const result = lazifyRuleBarrel(
      barrel(
        `const a_1 = require("./rules/a");\nconst b_1 = require("./rules/b");\nconst c_1 = require("./rules/c");\n`,
        `    'quoted': a_1.x,\n    "double": b_1.y,\n    bare: c_1.z,`,
      ),
    );

    expect(result?.deferred).toBe(3);
    expect(result?.code).toContain(
      `get bare() { return require("./rules/c").z; },`,
    );
  });

  it('defers an aliased rule without dropping the shared module', () => {
    // `order` is an alias of the same rule module — two entries, one binding.
    const result = lazifyRuleBarrel(
      barrel(
        `const o_1 = require("./rules/order");\n`,
        `    'enforce-order': o_1.enforceOrder,\n    order: o_1.enforceOrder,`,
      ),
    );

    expect(result?.deferred).toBe(2);
    expect(result?.code).not.toContain(`const o_1 =`);
    expect(
      (result?.code.match(/require\("\.\/rules\/order"\)/g) ?? []).length,
    ).toBe(2);
  });
});
