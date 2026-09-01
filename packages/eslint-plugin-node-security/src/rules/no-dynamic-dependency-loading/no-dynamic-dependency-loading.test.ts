/**
 * @fileoverview Tests for no-dynamic-dependency-loading
 * 
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDynamicDependencyLoading } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-dynamic-dependency-loading', noDynamicDependencyLoading, {
  valid: [
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
        'const items = [];',
        'const obj = {};',
    { name: 'a static import', code: "import module from './module'" },
    { code: "const lib = require('known-lib')" }
  ],

  invalid: [
    { name: 'require of a computed module name', code: "require(moduleName)", errors: [{ messageId: 'violationDetected' }] },
    { code: "import(userInput)", errors: [{ messageId: 'violationDetected' }] }
  ],
});

/**
 * The suite above was 7 cases — under the floor, and none of them drawn from
 * what the rule DESCRIBES. Its docs say it exists for "dependency confusion"
 * and "supply chain attacks": a specifier assembled at runtime bypasses both
 * static analysis and the lock file, so the package that loads is decided after
 * the integrity check that was supposed to decide it.
 *
 * These cases are that description, written as code. They are NOT variations on
 * `require(moduleName)` — restating an existing case in new letters explores
 * nothing.
 *
 * The valid half matters at least as much. The rule judges whether a specifier
 * CAN CHANGE, not whether it is spelled as a literal, and every shape below is
 * fixed at build time. All four are cases eslint-plugin-security's own corpus
 * marks valid and that this rule used to report.
 */
ruleTester.run('no-dynamic-dependency-loading — supply chain shapes', noDynamicDependencyLoading, {
  valid: [
    // A backtick literal is a literal.
    'const b = require(`b`);',
    // A template whose only interpolation is a const — one possible value.
    "const d = 'debounce'; const fn = require(`lodash/${d}`);",
    // Concatenation onto __dirname: fixed at build time.
    "const utils = require(__dirname + '/utils');",
    // A const alias for the specifier.
    "const PKG = 'left-pad'; const pad = require(PKG);",
    // The plugin-loading idiom done SAFELY: an allowlist table, indexed. Every
    // module that can load is written in this file.
    "const LOADERS = { json: () => import('./json'), yaml: () => import('./yaml') }; const load = LOADERS[kind];",
    // Static ESM import of a scoped package.
    "import zip from '@my-org/zipkit';",
  ],
  invalid: [
    // Dependency confusion: the scope is fixed, the package name is not. This
    // is the shape the rule's own docs open with.
    {
      code: "const plugin = require('@my-org/' + pluginName);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A version or channel chosen at runtime — the lock file pinned neither.
    {
      code: "const sdk = await import(`@vendor/sdk-${channel}`);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Config-driven plugin loading, the commonest real form.
    {
      code: "for (const name of config.plugins) { require(name); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A specifier read straight out of the environment.
    {
      code: "const adapter = require(process.env.DB_ADAPTER);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Reached through a `let`, which can be reassigned between the declaration
    // and the call — so its initializer proves nothing.
    {
      code: "let mod = './default'; mod = resolveMod(); const m = require(mod);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // The dynamic-import form of the same fact.
    {
      code: "const mod = await import('./locales/' + locale + '.js');",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
