/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found linting open-source Node apps: values that sit in a credential-named
 * slot but are labels, not secrets. A namespaced translation key
 * (`password: 'apostrophe:enterPassword'`), a translated label
 * (`'Contraseña'`, `'Lösenord'`), a schema type tag (`enableAuth: 'boolean?'`),
 * a masked display value (`apiKey: '••••••••••••••••7f2a'`) and the password
 * fixture of a suite entry module named `tests.js`.
 *
 * Every exemption has an invalid lookalike with the same slot and a value that
 * lacks the evidence.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noHardcodedCredentials } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

const TYPE_TAGS = [
  'string',
  'number',
  'boolean',
  'bigint',
  'object',
  'array',
  'date',
];
const MASKS = ['•', '●'];
const err = [{ messageId: 'useEnvironmentVariable' as const, suggestions: 2 }];

ruleTester.run('a label or a mask is not a secret', noHardcodedCredentials, {
  valid: [
    {
      name: 'a namespaced translation key',
      code: `const field = { password: 'apostrophe:enterPassword' };`,
    },
    {
      name: 'a translated label (Spanish)',
      code: `const dict = { 'share.security.password': 'Contraseña' };`,
    },
    {
      name: 'a translated label (Swedish)',
      code: `const dict = { 'share.security.password': 'Lösenord' };`,
    },
    ...TYPE_TAGS.flatMap((tag) => [
      {
        name: `type tag ${tag}`,
        code: `const schema = { enableAuth: '${tag}' };`,
      },
      {
        name: `optional type tag ${tag}?`,
        code: `const schema = { enableAuth: '${tag}?' };`,
      },
    ]),
    ...MASKS.map((glyph) => ({
      name: `a masked key display with ${glyph}`,
      code: `const row = { apiKey: '${glyph.repeat(16)}7f2a' };`,
    })),
    {
      name: 'a password fixture in a suite entry module named tests.js',
      filename: 'plugins/reports/tests.js',
      code: `const user = { password: 'p4ssw0rD!' };`,
    },
    {
      name: 'the same for a nested path and a .ts extension',
      filename: 'a/b/tests.ts',
      code: `const user = { password: 'p4ssw0rD!' };`,
    },
  ],
  invalid: [
    {
      name: 'a pair with a digit after the colon is a credential',
      code: `const f = { password: 'admin:hunter2' };`,
      errors: err,
    },
    {
      name: 'a namespace with no camelCase key is a pair',
      code: `const f = { password: 'user:secretvalue' };`,
      errors: err,
    },
    {
      name: 'a foreign word with a digit and a symbol',
      code: `const dict = { password: 'Contraseña1x!' };`,
      errors: err,
    },
    {
      name: 'a plain ASCII word plus symbols is not a label',
      code: `const dict = { password: 'Pass#9wd!' };`,
      errors: err,
    },
    {
      name: 'a type-tag lookalike that is not a type',
      code: `const schema = { password: 'Tr0ub4dor?' };`,
      errors: err,
    },
    {
      name: 'three bullets are not a mask',
      code: `const row = { apiKey: '•••Xk29QpLz7vWn' };`,
      errors: err,
    },
    {
      name: 'a bullet-free key ending in a mask look',
      code: `const row = { apiKey: 'Zk29QpLz7vWnXr4TqM8d' };`,
      errors: err,
    },
    {
      name: 'the same fixture in a file merely ending in tests.js',
      filename: 'plugins/reports/attests.js',
      code: `const user = { password: 'p4ssw0rD!' };`,
      errors: err,
    },
    {
      name: 'the same fixture in a directory named tests.js-like helpers',
      filename: 'plugins/reports/helpers.js',
      code: `const user = { password: 'p4ssw0rD!' };`,
      errors: err,
    },
  ],
});
