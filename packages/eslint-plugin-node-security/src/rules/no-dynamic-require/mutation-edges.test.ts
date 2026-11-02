/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Edges pinned by mutation testing: each case below is an input on which a
 * surviving Stryker mutant and the rule disagreed. Cases named `BUG:` were
 * wrong verdicts the survivors led to.
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
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const error = { messageId: 'dynamicRequire' as const };

ruleTester.run('mutation-guided edges', noDynamicRequire, {
  valid: [
    {
      name: 'a call to an unbound function is not the loader',
      code: 'loadPlugin(pluginName);',
    },
    {
      name: 'a CLI entry calling its own export is not a module load',
      code: 'if (require.main === module) module.exports(process.argv[2]);',
    },
    {
      name: 'a call to a function returned by node:module other than createRequire is not the loader',
      code: "import Module from 'node:module';\nconst plugin = Module._load('./plugin');\nplugin(userInput);",
    },
  ],
  invalid: [
    {
      name: 'a const alias of require is the loader',
      code: 'const load = require;\nload(pluginName);',
      errors: [error],
    },
    {
      name: 'BUG: a second argument does not hide the dynamic specifier the loader reads',
      code: "const plugin = require(path.join(dir, name), 'utf8');",
      errors: [error],
    },
    {
      name: 'the test context does not allow a file whose path does not mark it as a test',
      code: 'const plugin = require(pluginName);',
      filename: '/proj/src/loader.js',
      options: [{ allowContexts: ['test'] }],
      errors: [error],
    },
    {
      name: 'a build path is not allowed when the build context is not enabled',
      code: 'const plugin = require(pluginName);',
      filename: '/proj/scripts/build.js',
      errors: [error],
    },
    {
      name: 'the build context does not allow a file whose path does not mark it as a build',
      code: 'const plugin = require(pluginName);',
      filename: '/proj/src/loader.js',
      options: [{ allowContexts: ['build'] }],
      errors: [error],
    },
    {
      name: 'a runtime path is not allowed when the runtime context is not enabled',
      code: 'const plugin = require(pluginName);',
      filename: '/proj/src/runtime/dynamic-loader.js',
      errors: [error],
    },
    {
      name: 'the runtime context does not allow a file whose path does not mark it as runtime',
      code: 'const plugin = require(pluginName);',
      filename: '/proj/src/loader.js',
      options: [{ allowContexts: ['runtime'] }],
      errors: [error],
    },
  ],
});
