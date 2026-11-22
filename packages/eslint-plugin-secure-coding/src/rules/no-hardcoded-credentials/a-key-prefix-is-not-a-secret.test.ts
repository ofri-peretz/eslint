/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A word identifier with one trailing colon is a key prefix, not a secret.
 *
 * Found in an adopter's code (Platform-Collective/platform, and its fork
 * TraceX), which silenced it with an inline disable:
 *
 *   export const TABLE_METADATA_TOKEN = 'huly-table-metadata:'
 *
 * The name ends in `TOKEN`, so the name gate opens, and the value then fails
 * `isNaturalWordString` only because of the `:`. A trailing colon is how a
 * clipboard marker, a cache namespace or a storage key prefix is written.
 *
 * The allowance is one trailing colon on an otherwise all-words value. A
 * colon BETWEEN a label and a dense payload (`user:Zk9f...`, `admin:...`) is
 * a basic-auth pair or a prefixed key, and must keep reporting.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noHardcodedCredentials } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('a key prefix is not a secret', noHardcodedCredentials, {
  valid: [
    {
      name: 'the exact clipboard marker an adopter had to disable',
      code: `export const TABLE_METADATA_TOKEN = 'huly-table-metadata:';`,
    },
    {
      name: 'a cache namespace prefix under a secret-shaped name',
      code: `const SESSION_TOKEN_PREFIX = 'session-token-cache:';`,
    },
    {
      name: 'a camelCase storage prefix under a key name',
      code: `const apiKey = 'userPreferenceStore:';`,
    },
  ],
  invalid: [
    {
      name: 'a basic-auth pair with a dense password still reports',
      code: `const authToken = 'user:Zk9fQ2xLmN7pRtV4wYb8HcJ3';`,
      errors: 1,
    },
    {
      name: 'a label colon payload still reports',
      code: `const secret = 'admin:Xq7vT2mKp9wRzB4nHc6LdF8s';`,
      errors: 1,
    },
    {
      name: 'a prefixed key with a colon separator still reports',
      code: `const apiKey = 'vnd_live:Xq7vT2mKp9wRzB4nHc6LdF8sJ3yA5eU1';`,
      errors: 1,
    },
    {
      name: 'a dense value that merely ends in a colon still reports',
      code: `const apiKey = 'Xq7vT2mKp9wRzB4nHc6LdF8sJ3yA5eU1:';`,
      errors: 1,
    },
  ],
});
