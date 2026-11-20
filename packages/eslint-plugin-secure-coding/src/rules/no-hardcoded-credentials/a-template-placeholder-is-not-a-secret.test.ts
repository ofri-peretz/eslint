/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A template placeholder name is not a credential, even under a key called
 * `token`.
 *
 * Reported by an adopter, stamhoofd/stamhoofd (77 stars), who silenced the rule
 * ten times; four of those are this one pattern. An email builder keeps its
 * template variables as `Replacement` records, whose `token` field is the name
 * of the `{{unsubscribeUrl}}` placeholder to substitute:
 *
 *   backend/app/api/src/helpers/EmailBuilder.ts:503, :786, :847
 *   shared/structures/src/email/exampleReplacements.ts:219
 *     Replacement.create({ token: 'unsubscribeUrl', value: unsubscribeUrl })
 *
 * `token` here is "the token the template parser looks for", and the value is
 * a camelCase identifier. A secret is not spelled as an identifier: the value
 * is a word list joined by case, with no digit and no separator, which is
 * what a placeholder name is. Values that look like a secret still report
 * under the same key.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noHardcodedCredentials } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run(
  'a template placeholder name is not a secret',
  noHardcodedCredentials,
  {
    valid: [
      {
        name: 'EmailBuilder.ts:503, the replacement key beside its generated URL',
        code: `
          recipient.replacements.push(
            Replacement.create({
              token: 'unsubscribeUrl',
              value: unsubscribeUrl,
            }),
          );
        `,
      },
      {
        name: 'EmailBuilder.ts:786 and :847, the same key beside a dummy URL',
        code: `
          recipient.replacements.push(
            Replacement.create({
              token: 'unsubscribeUrl',
              value: dummyUnsubscribeUrl,
            }),
          );
        `,
      },
      {
        name: 'exampleReplacements.ts:219, the key beside an example URL',
        code: `
          const example = {
            unsubscribeUrl: Replacement.create({
              token: 'unsubscribeUrl',
              value: 'https://www.example.com/unsubscribe',
            }),
          };
        `,
      },
      {
        name: 'a longer camelCase placeholder name',
        code: `const r = { token: 'organizationRegistrationUrl', value: u };`,
      },
      {
        name: 'a snake_case placeholder name',
        code: `const r = { token: 'unsubscribe_url_for_member', value: u };`,
      },
    ],
    invalid: [
      {
        name: 'a real token in the same Replacement shape still reports',
        code: `Replacement.create({ token: 'q8Zr4nT1xW7vK2mP9bL5cD3f', value: u });`,
        errors: 1,
      },
      {
        name: 'a camelCase-looking value with digits still reports',
        code: `const r = { token: 'aB3dE5fG7hJ9kL2mN4pQ6rS8' };`,
        errors: 1,
      },
    ],
  },
);
