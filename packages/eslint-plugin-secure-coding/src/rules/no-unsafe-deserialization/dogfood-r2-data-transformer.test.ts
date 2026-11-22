/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `opts.router._def._config.transformer.input.deserialize(raw)` (trpc contentType.ts:142,
 * dogfood round 1 and 2). A data transformer is the codec the application chose for
 * its own wire format. Other `.deserialize(untrusted)` receivers are still reported.
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
        name: 'trpc config path',
        code: 'function f(opts, raw) { return opts.router._def._config.transformer.input.deserialize(raw); }',
      },
      {
        name: 'transformer directly',
        code: 'function f(config, raw) { return config.transformer.deserialize(raw); }',
      },
    ],
    invalid: [
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
