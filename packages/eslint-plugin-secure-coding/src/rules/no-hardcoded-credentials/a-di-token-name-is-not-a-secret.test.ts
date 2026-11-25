/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A dependency-injection token NAME is not a credential, however its slot is
 * spelled.
 *
 * Found linting popular NestJS middleware, reported at CWE-798 / CVSS 9.8:
 *
 *   export const BULL_CONFIG_DEFAULT_TOKEN = 'BULLMQ_CONFIG(default)';
 *
 * The slot ends in `TOKEN`, so the credential-context gate opened, and the
 * value mixes upper case with punctuation, so the shape gate passed. It is the
 * string a container uses to look a provider up. The shape that gives it away
 * is a call: SCREAMING_SNAKE, then a parenthesised plain-word qualifier.
 * Random values in the same slot keep reporting.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, expect, it } from 'vitest';

import { isInjectionTokenName, noHardcodedCredentials } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('a DI token name is not a secret', noHardcodedCredentials, {
  valid: [
    {
      name: 'the exact constant that reported in nestjs/bull',
      code: `
        export const BULL_CONFIG_DEFAULT_TOKEN = 'BULLMQ_CONFIG(default)';
        export function getSharedConfigToken(configKey) {
          return configKey ? \`BULLMQ_CONFIG(\${configKey})\` : BULL_CONFIG_DEFAULT_TOKEN;
        }
      `,
    },
    {
      name: 'a provide: token written the same way',
      code: "const providers = [{ provide: 'token', useValue: 1 }, { token: 'QUEUE_OPTIONS(primary)' }];",
    },
  ],
  invalid: [
    {
      name: 'a random token in the same slot',
      code: "export const BULL_CONFIG_DEFAULT_TOKEN = 'Xk9mP2vQ8zL4nR7wT1yB5cD3';",
      errors: 1,
    },
    {
      name: 'a secret hidden inside a call-shaped value',
      code: "export const API_TOKEN = 'STRIPE_KEY(Xk9mP2vQ8zL4nR7w)';",
      errors: 1,
    },
    {
      name: 'a vowel-less qualifier is entropy, not a word',
      code: "export const API_TOKEN = 'APP_SECRET(xqzvbkthr)';",
      errors: 1,
    },
    {
      name: 'a password with punctuation in a password slot',
      code: "const password = 'aaAA@123';",
      errors: 1,
    },
    {
      name: 'a DI-token-shaped value in a password slot is still a credential (#1686)',
      code: "const password = 'BULLMQ_CONFIG(default)';",
      errors: 1,
    },
  ],
});

describe('isInjectionTokenName', () => {
  it('reads the SCREAMING_SNAKE(word) shape and nothing wider', () => {
    expect(isInjectionTokenName('BULLMQ_CONFIG(default)')).toBe(true);
    expect(isInjectionTokenName('BULLMQ_CONFIG(default')).toBe(false);
    expect(isInjectionTokenName('BULLMQCONFIG(default)')).toBe(false);
    expect(isInjectionTokenName('bullmq_config(default)')).toBe(false);
    expect(isInjectionTokenName('APP_SECRET(xqzvbkthr)')).toBe(false);
  });
});
