/**
 * A name that ends in what a secret is CALLED, where it LIVES or how MUCH of
 * it there is does not hold the secret. Seen on the adoption scan:
 *
 *   LibreChat  `Memory set for key "${key}" (${tokenCount} tokens)`
 *   Infisical  `logger.info({ environment, secretPath, projectId }, 'Secret webhook job started')`
 *   Budibase   `Secret ${secretName} is not set`
 *
 * The comparison is against the whole final segment of the name, so the
 * secret itself (`secret`, `accessToken`, `tokenValue`) keeps being reported.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSensitiveDataExposure } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const exposure = [{ messageId: 'sensitiveDataExposure' as const }];

describe('no-sensitive-data-exposure: a handle, a place and a count are not the secret', () => {
  ruleTester.run('final segment', noSensitiveDataExposure, {
    valid: [
      {
        name: 'LibreChat: a token count in a log message',
        code: 'logger.info(`Memory set for key "${key}" (${tokenCount} tokens)`);',
      },
      {
        name: 'Infisical: the folder path of a secret in a log object',
        code: 'logger.info({ environment, secretPath, projectId }, "Secret webhook job started");',
      },
      {
        name: 'Budibase: the name of the variable that holds the secret',
        code: 'throw new Error(`Secret ${secretName} is not set`);',
      },
      {
        name: 'a token id is the lookup handle',
        code: 'console.log(`revoked ${tokenId}`);',
      },
      {
        name: 'a list of token ids is a list of lookup handles',
        code: 'console.log("revoked", tokenIds);',
      },
      {
        name: 'a token type is the scheme, not the credential',
        code: 'console.log("auth", tokenType);',
      },
      {
        name: 'snake case reads the same final segment',
        code: 'console.log("auth", api_key_id);',
      },
      {
        name: 'a password length is a number',
        code: 'console.log("policy", passwordLength);',
      },
    ],
    invalid: [
      {
        name: 'the token itself still reports',
        code: 'logger.info(`Memory set ${token}`);',
        errors: exposure,
      },
      {
        name: 'an access token still reports',
        code: 'console.log("auth", accessToken);',
        errors: exposure,
      },
      {
        name: 'a segment in the middle of the name is not the final segment',
        code: 'console.log("auth", tokenIdValue);',
        errors: exposure,
      },
      {
        name: 'a password hash property still reports',
        code: 'console.log("user", user.passwordHash);',
        errors: exposure,
      },
      {
        name: 'a descriptor segment opted out of keeps reporting',
        code: 'console.log("auth", tokenId);',
        options: [{ descriptorSegments: ['msg'] }],
        errors: exposure,
      },
    ],
  });
});
