/**
 * Tests for no-dynamic-require
 * Forbid `require()` calls with expressions
 * Security: CWE-094 (Code Injection)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicRequire } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('no-dynamic-require', () => {
  describe('Valid Code - Static requires', () => {
    ruleTester.run('valid - safe patterns', noDynamicRequire, {
      valid: [
        // Static string literal — always safe
        'const fs = require("fs");',
        'const path = require("path");',
        'const lodash = require("lodash");',

        // Relative path — static string
        'const config = require("./config");',
        'const utils = require("../utils/helper");',

        // JSON require — static
        'const pkg = require("./package.json");',

        // Non-require calls
        'const data = fetch("/api/data");',
        'const result = import("./module");',

        // Static string require
        "const fs = require('fs');",
        // Unrelated code
        'const x = 1;',
        // Safe function
        'function safeHelper() { return true; }',
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Allowed contexts', () => {
    ruleTester.run('valid - test file context', noDynamicRequire, {
      valid: [
        // Test files with allowContexts
        {
          name: 'a bare variable, whose value is not visible here',
          code: 'const mod = require(moduleName);',
          filename: 'src/utils.test.ts',
          options: [{ allowContexts: ['test'] }],
        },
        {
          code: 'const fixture = require(fixturePath);',
          filename: 'src/__tests__/helper.ts',
          options: [{ allowContexts: ['test'] }],
        },
      ],
      invalid: [],
    });
  });

  /**
   * `allowPatterns` — declared in `Options`, in `meta.schema` and in
   * `defaultOptions`, and read by NOTHING. `create()` destructured
   * `allowContexts` alone, so a consumer who configured `allowPatterns` got no
   * suppression and no complaint about it either.
   *
   * The pairs below are the proof that it now does something: the SAME source
   * reports under the default and is silent with the option set. A case that
   * came out the same either way would execute the line without proving the
   * branch decides anything.
   */
  describe('Valid Code - allowPatterns', () => {
    ruleTester.run('valid - suppressed by allowPatterns', noDynamicRequire, {
      valid: [
        // The i18n loader, the archetypal deliberate dynamic require.
        {
          code: 'const messages = require(`./locales/${lang}.json`);',
          options: [{ allowPatterns: ['^`\\./locales/'] }],
        },
        // A pattern that matches an identifier argument.
        {
          code: 'const mod = require(pluginName);',
          options: [{ allowPatterns: ['pluginName'] }],
        },
        // Several patterns, second one matching.
        {
          code: 'const mod = require(config.pluginPath);',
          options: [{ allowPatterns: ['^nope$', 'pluginPath'] }],
        },
        // …and an uncompilable pattern still suppresses when its literal text
        // occurs, because the degraded form is a substring match.
        {
          code: 'const mod = require(paths["["]);',
          options: [{ allowPatterns: ['['] }],
        },
      ],
      invalid: [
        // CONTROL for case 1: the identical source, no option — reports.
        {
          name: 'a require path built by interpolation',
          code: 'const messages = require(`./locales/${lang}.json`);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // CONTROL for case 2.
        {
          code: 'const mod = require(pluginName);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // The option is set but matches nothing — the report survives, so an
        // empty-ish allowlist cannot silently disable the rule.
        {
          code: 'const mod = require(config.pluginPath);',
          options: [{ allowPatterns: ['^themes/'] }],
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // An empty array is the default and must behave like the default.
        {
          code: 'const mod = require(moduleName);',
          options: [{ allowPatterns: [] }],
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // An UNCOMPILABLE pattern must not take the lint run down with it. A
        // bare `new RegExp('[')` throws "Invalid regular expression" out of
        // create(), killing every rule on the file, not just this one.
        // `compileUserPatterns` degrades it to a substring match, so `[` here
        // simply fails to match `moduleName` and the report survives.
        {
          code: 'const mod = require(moduleName);',
          options: [{ allowPatterns: ['['] }],
          errors: [{ messageId: 'dynamicRequire' }],
        },
      ],
    });
  });

  describe('Invalid Code - Dynamic requires', () => {
    ruleTester.run('invalid - dynamic patterns', noDynamicRequire, {
      valid: [],
      invalid: [
        // Variable in require
        {
          code: 'const mod = require(moduleName);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // Template literal in require
        {
          name: 'an interpolated specifier is steerable by whatever fills the hole',
          code: 'const mod = require(`./plugins/${name}`);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // Concatenation in require
        {
          name: 'a concatenated specifier is steerable by its non-literal half',
          code: 'const mod = require("./handlers/" + handler);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // Function call in require
        {
          name: 'a call result as the specifier cannot be resolved in this file',
          code: 'const mod = require(getModulePath());',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // Member expression in require
        {
          name: 'a property read as the specifier cannot be resolved in this file',
          code: 'const mod = require(config.pluginPath);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
      ],
    });
  });

  /**
   * The loader is whatever Node hands you, not the six letters `require`.
   *
   * The callee test was `callee.name === 'require'` and nothing else, so the
   * spelling a modern ESM file actually uses — a binding from
   * `module.createRequire()` — loaded an attacker-steerable specifier in
   * silence. burgee packages/burgee/src/yargs-parser.ts:882 is exactly this:
   * a `require` hook built from `createRequire(import.meta.url)` whose path
   * comes from `--<configKey> <path>` on argv (traced at :548-560).
   *
   * The sibling `no-dynamic-dependency-loading` already resolves these; the
   * divergence was an oversight, not a division of labour. `module.require`
   * fell through BOTH rules.
   */
  describe('Loaders that are not spelled `require`', () => {
    ruleTester.run('aliased and member loaders', noDynamicRequire, {
      valid: [
        {
          name: 'a createRequire alias with a literal specifier is still static',
          code: `import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);
const pkg = nodeRequire('./package.json');`,
        },
        {
          name: 'a call that merely looks like a loader is not one',
          code: 'const load = makeLoader(); const mod = load(userPath);',
        },
        {
          name: 'a member call whose property is not require is not a loader',
          code: 'const mod = bundler.load(userPath);',
        },
        {
          name: 'require-named property on an unrelated receiver is not a loader',
          code: 'const mod = bundler.require(userPath);',
        },
        {
          name: 'a deeper member chain that is not require.main is not a loader',
          code: 'const mod = a.b.require(userPath);',
        },
        {
          name: 'a call-result receiver is not the module object',
          code: 'const mod = getModule().require(userPath);',
        },
        {
          name: 'a non-identifier callee is not a loader',
          code: 'const mod = loaders[0](userPath);',
        },
        {
          name: 'a const bound to something that is not a call is not a loader',
          code: 'const nodeRequire = notALoader; const mod = nodeRequire(userPath);',
        },
        {
          name: 'a const bound to a call that is not createRequire is not a loader',
          code: 'const nodeRequire = makeLoader(); const mod = nodeRequire(userPath);',
        },
      ],
      invalid: [
        {
          name: 'a createRequire alias loading a steerable specifier reports',
          code: `import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);
const mod = nodeRequire(process.argv[2]);`,
          errors: [{ messageId: 'dynamicRequire' }],
        },
        {
          name: 'module.require with a steerable specifier reports',
          code: 'const mod = module.require(userPath);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        {
          name: 'require.main.require with a steerable specifier reports',
          code: 'const mod = require.main.require(userPath);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        {
          name: 'the sequence-expression idiom for hiding a specifier reports',
          code: 'const mod = (0, require)(userPath);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
      ],
    });
  });
});
