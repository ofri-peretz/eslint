/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `process.env.X || 'value'` — the literal is a development default, read only
 * when the environment does not supply the real value. The rule's own
 * suggestion rewrites a finding into exactly this shape, so reporting it would
 * make the suggested fix a finding of its own.
 *
 * `??` is the same fallback written for an unset variable rather than an empty
 * one, and it used to be reported: only `||` was recognised. The exemption is
 * about WHERE the literal sits — the default branch of an environment read —
 * not which of the two default operators spells it.
 *
 * Every quiet case has a control: the exemption is for `process.env`, and for
 * the default branch only.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const AWS = 'AKIAIOSFODNN7EXAMPLE';
const REPORTED = [
  { messageId: 'useEnvironmentVariable' as const, suggestions: 2 },
];

ruleTester.run(
  'no-hardcoded-credentials — a fallback is not the secret',
  noHardcodedCredentials,
  {
    valid: [
      {
        name: 'a `||` default after process.env is a development default',
        code: `const key = process.env.AWS_KEY || '${AWS}';`,
      },
      {
        name: 'a `??` default after process.env is the same development default',
        code: `const key = process.env.AWS_KEY ?? '${AWS}';`,
      },
      {
        name: 'a `||` default after process.env is quiet for a named-slot value too',
        code: `const password = process.env.DB_PASSWORD || 'Tr0ub4dor&3x';`,
      },
      {
        name: 'a computed process.env read is still an environment read',
        code: `const key = process.env['AWS_KEY'] || '${AWS}';`,
      },
    ],
    invalid: [
      {
        name: 'only process.env is the environment: a config object named env is not',
        code: `const key = config.env.AWS_KEY || '${AWS}';`,
        errors: REPORTED,
      },
      {
        name: 'process.argv is not the environment',
        code: `const key = process.argv[2] || '${AWS}';`,
        errors: REPORTED,
      },
      {
        name: 'an `&&` after process.env uses the literal when the variable IS set',
        code: `const key = process.env.USE_AWS && '${AWS}';`,
        errors: REPORTED,
      },
      {
        name: 'a fallback after a plain identifier is not an environment read',
        code: `const key = settings || '${AWS}';`,
        errors: REPORTED,
      },
      {
        name: 'a fallback after a one-level member read is not an environment read',
        code: `const key = settings.awsKey || '${AWS}';`,
        errors: REPORTED,
      },
      {
        name: 'a literal on the LEFT of the fallback is the value used, and reports',
        code: `const key = '${AWS}' || process.env.AWS_KEY;`,
        errors: REPORTED,
      },
    ],
  },
);
