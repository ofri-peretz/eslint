/**
 * no-self-signed-certs — divergences the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/no_self_signed_certs.qnt):
 * `NODE_TLS_REJECT_UNAUTHORIZED = 0 as any` (the only way a .ts file writes
 * the number) and `rejectUnauthorized: verifyPeer` with `const verifyPeer =
 * false` in scope were both silent.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSelfSignedCerts } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-self-signed-certs fidelity', () => {
  ruleTester.run('casts and const hops', noSelfSignedCerts, {
    valid: [
      {
        name: 'a const true for rejectUnauthorized is fine',
        code: `import https from 'node:https';
const verifyPeer = true;
export const agent = new https.Agent({ rejectUnauthorized: verifyPeer });`,
      },
      {
        name: 'a let that may be reassigned is not a provable false',
        code: `import https from 'node:https';
let verifyPeer = false;
verifyPeer = true;
export const agent = new https.Agent({ rejectUnauthorized: verifyPeer });`,
      },
      {
        name: 'NODE_TLS_REJECT_UNAUTHORIZED set to 1 as any is fine',
        code: `process.env.NODE_TLS_REJECT_UNAUTHORIZED = 1 as any;`,
      },
    ],
    invalid: [
      {
        name: 'NODE_TLS_REJECT_UNAUTHORIZED set to 0 as any is reported',
        code: `process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0 as any;`,
        errors: [{ messageId: 'insecureTls' }],
      },
      {
        name: 'NODE_TLS_REJECT_UNAUTHORIZED set to 0 as unknown as string is reported',
        code: `process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0 as unknown as string;`,
        errors: [{ messageId: 'insecureTls' }],
      },
      {
        name: 'rejectUnauthorized through a const false is reported',
        code: `import https from 'node:https';
const verifyPeer = false;
export const agent = new https.Agent({ rejectUnauthorized: verifyPeer });`,
        errors: [
          {
            messageId: 'insecureTls',
            suggestions: [
              {
                messageId: 'enableValidation',
                output: `import https from 'node:https';
const verifyPeer = false;
export const agent = new https.Agent({ rejectUnauthorized: true });`,
              },
            ],
          },
        ],
      },
      {
        name: 'rejectUnauthorized false as boolean is reported',
        code: `export const opts = { rejectUnauthorized: false as boolean };`,
        errors: [
          {
            messageId: 'insecureTls',
            suggestions: [
              {
                messageId: 'enableValidation',
                output: `export const opts = { rejectUnauthorized: true };`,
              },
            ],
          },
        ],
      },
    ],
  });
});
