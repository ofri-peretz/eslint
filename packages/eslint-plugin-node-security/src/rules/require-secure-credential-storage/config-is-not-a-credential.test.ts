/**
 * Lock: a name that DESCRIBES a credential is not a credential.
 *
 * `namesACredential` matched by substring, so `TOKEN_SIGNING_ALG = 'RS256'`
 * read as storing a token in the environment. Clustering 26,434 findings from
 * 158 repositories made it the single largest false-positive shape this rule
 * produces — 110 instances of that one line.
 *
 * The guard tests only the LAST word segment, so a real credential still
 * matches on its own tail. Deleting CONFIG_ABOUT_A_CREDENTIAL makes the first
 * three cases below report again.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { requireSecureCredentialStorage } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('require-secure-credential-storage — configuration is not a credential', () => {
  ruleTester.run('config-tails', requireSecureCredentialStorage, {
    valid: [
      {
        name: 'an algorithm name — 110 findings in the wild came from this shape',
        code: `process.env.TOKEN_SIGNING_ALG = 'RS256';`,
      },
      { name: 'a lifetime', code: `process.env.TOKEN_EXPIRY = '3600';` },
      { name: 'the NAME of a secret, not the secret', code: `process.env.SECRET_NAME = 'db-creds';` },
      { name: 'a header name', code: `process.env.AUTH_TOKEN_HEADER = 'x-auth';` },
    ],
    invalid: [
      {
        name: 'the credential itself still reports',
        code: `process.env.API_TOKEN = 'sk-live-abc';`,
        errors: [{ messageId: 'credentialInEnvironment' }],
      },
      {
        name: 'a client secret still reports',
        code: `process.env.CLIENT_SECRET = 'shh';`,
        errors: [{ messageId: 'credentialInEnvironment' }],
      },
      {
        name: 'a database password still reports',
        code: `process.env.DB_PASSWORD = 'hunter2';`,
        errors: [{ messageId: 'credentialInEnvironment' }],
      },
    ],
  });
});
