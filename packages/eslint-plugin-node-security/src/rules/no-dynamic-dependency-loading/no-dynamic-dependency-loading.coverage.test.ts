/**
 * Coverage-gap tests for no-dynamic-dependency-loading (Layer 1).
 * Targets: dynamic import() with a static string literal (allowed path).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicDependencyLoading } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-dynamic-dependency-loading coverage gaps', () => {
  ruleTester.run('no-dynamic-dependency-loading', noDynamicDependencyLoading, {
    valid: [
      // import() with a literal source → Literal check suppresses report
      { code: 'import("node:fs");' },
    ],
    invalid: [],
  });
});

/**
 * Regression lock — the loader surface the benchmark corpus proved was open.
 *
 * The rule tested `callee.name === 'require'` and nothing else, so three
 * loaders Node itself documents were invisible to it, each carrying an
 * attacker-supplied specifier:
 *
 *   - `module.require(x)` and `require.main.require(x)` — real entry points
 *     that resolve against a different module's paths, which is exactly why
 *     plugin hosts reach for them.
 *   - a binding from `module.createRequire()` — the sanctioned way an ESM file
 *     loads CommonJS, so it is the spelling a modern codebase actually uses.
 *   - `(0, require)(x)` — the standard idiom for hiding a specifier from a
 *     bundler's static analysis, reached for *because* it defeats exactly the
 *     analysis this rule performs.
 *
 * Every valid case below is a call that merely LOOKS like one of those. They
 * fail on a rule that matches the property name `require` on any receiver, or
 * that trusts a local variable's spelling instead of resolving its binding.
 */
describe('no-dynamic-dependency-loading — corpus regressions', () => {
  ruleTester.run('no-dynamic-dependency-loading', noDynamicDependencyLoading, {
    valid: [
      // A `.require` method on something that is not the CommonJS module.
      { code: 'const m = loader.require(name);' },
      { code: 'const m = makeLoader().require(name);' },
      { code: 'const m = registry[key].require(name);' },
      { code: 'const m = module.main.require(name);' },
      { code: 'const m = require.cache.require(name);' },
      { code: 'const m = deps.main.require(name);' },
      // A computed member names nothing statically.
      { code: 'const m = module[verb](name);' },
      // A private method is not an export of anything.
      { code: 'class A { #require(n) { return n; } m(n) { return this.#require(n); } }' },
      { code: 'class A { #cjs; m(n) { return this.#cjs.require(n); } }' },
      // `module.exports` is not a loader.
      { code: 'const m = module.exports(name);' },
      // A local binding that is not, and was not built from, a loader.
      { code: 'const load = 5; load(name);' },
      { code: 'const load = makeLoader(); load(name);' },
      { code: 'undeclaredLoader(name);' },
      { code: 'const m = getLoader()(name);' },
      // The loader forms below, with a specifier nothing can steer.
      { code: "const m = module.require('node:fs');" },
      { code: "import { createRequire } from 'node:module'; const req = createRequire(import.meta.url); const m = req('node:fs');" },
    ],
    invalid: [
      {
        code: 'const hook = module.require(req.body.hook);',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: 'const legacy = require.main.require(req.body.hook);',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: 'const m = (0, require)(process.argv[2]);',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: 'const load = (0, require); const m = load(process.argv[2]);',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: "import { createRequire } from 'node:module'; const req = createRequire(import.meta.url); const m = req(process.argv[2]);",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: 'const m = (require as any)(process.argv[2]);',
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  });
});
