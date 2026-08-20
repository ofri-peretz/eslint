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
        'const fs = require(\'fs\');',
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
          code: 'const mod = require(`./plugins/${name}`);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // Concatenation in require
        {
          code: 'const mod = require("./handlers/" + handler);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // Function call in require
        {
          code: 'const mod = require(getModulePath());',
          errors: [{ messageId: 'dynamicRequire' }],
        },
        // Member expression in require
        {
          code: 'const mod = require(config.pluginPath);',
          errors: [{ messageId: 'dynamicRequire' }],
        },
      ],
    });
  });
});

