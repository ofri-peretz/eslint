/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `opts.router._def._config.transformer.input.deserialize(raw)` (trpc contentType.ts:142,
 * dogfood round 1 and 2). A data transformer is the codec the application chose for
 * its own wire format. The exemption needs evidence in the file: an import or require of
 * `@trpc/*` or `superjson`, and only the `deserialize` method. Without it, and for every
 * other receiver, `.deserialize(untrusted)` is still reported.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noUnsafeDeserialization } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-unsafe-deserialization — data transformer',
  noUnsafeDeserialization,
  {
    valid: [
      {
        name: 'trpc config path, with an @trpc/server import in the file',
        code: "import { initTRPC } from '@trpc/server'; function f(opts, raw) { return opts.router._def._config.transformer.input.deserialize(raw); }",
      },
      {
        name: 'transformer directly, with an @trpc/ sub-package import',
        code: "import type { AnyRouter } from '@trpc/server/unstable-core-do-not-import'; function f(config, raw) { return config.transformer.deserialize(raw); }",
      },
      {
        name: 'a superjson import is the same evidence',
        code: "import superjson from 'superjson'; function f(config, raw) { return config.transformer.deserialize(raw); }",
      },
      {
        name: 'a superjson sub-path import is the same evidence',
        code: "import { stringify } from 'superjson/dist/index.js'; function f(config, raw) { return config.transformer.deserialize(raw); }",
      },
      {
        name: 'a require of @trpc/server is the same evidence',
        code: "const { initTRPC } = require('@trpc/server'); function f(config, raw) { return config.transformer.deserialize(raw); }",
      },
    ],
    invalid: [
      {
        name: 'control: the same call with no @trpc or superjson import in the file',
        code: 'function f(opts, raw) { return opts.router._def._config.transformer.input.deserialize(raw); }',
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'control: an unrelated import is not evidence',
        code: "import express from 'express'; function f(config, raw) { return config.transformer.deserialize(raw); }",
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'control: an unrelated require is not evidence',
        code: "const express = require('express'); function f(config, raw) { return config.transformer.deserialize(raw); }",
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'control: a call that is not a require is not evidence',
        code: "const x = load('@trpc/server'); function f(config, raw) { return config.transformer.deserialize(raw); }",
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'control: a statement that is not an import or a declaration is not evidence',
        code: "'use strict'; function f(config, raw) { return config.transformer.deserialize(raw); }",
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'control: only deserialize is exempt, an unserialize through transformer is not',
        code: 'function f(config, raw) { return config.transformer.unserialize(raw); }',
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'control: a codec not named transformer',
        code: 'function f(codec, raw) { return codec.deserialize(raw); }',
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
      {
        name: 'control: a path that does not pass through transformer',
        code: 'function f(opts, raw) { return opts.router.input.deserialize(raw); }',
        errors: [{ messageId: 'unsafeDeserialization' }],
      },
    ],
  },
);
