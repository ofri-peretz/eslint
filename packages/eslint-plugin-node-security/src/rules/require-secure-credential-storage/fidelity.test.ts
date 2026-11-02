/**
 * require-secure-credential-storage — the contract the Quint fidelity model
 * settled (benchmarks/suites/fidelity/models/node-security/require_secure_credential_storage.qnt):
 * the doc's "Encrypted on the way in" rows hold for an `encrypt` that provably
 * encrypts; an `encrypt` whose body the file cannot see is unproven and
 * reports. The doc used to state the row unqualified while the rule (and its
 * locks) required proof; the doc now states the proof, and this locks both.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireSecureCredentialStorage } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const SEAL = `import { publicEncrypt } from 'node:crypto';
declare const PUBLIC_KEY: string;
function encrypt(v: string) { return publicEncrypt(PUBLIC_KEY, Buffer.from(v)); }`;

describe('require-secure-credential-storage fidelity', () => {
  ruleTester.run('provable encryption', requireSecureCredentialStorage, {
    valid: [
      {
        name: 'localStorage with a provably encrypted token is fine',
        code: `${SEAL}
export function a(token: string) { localStorage.setItem('authToken', encrypt(token)); }`,
      },
      {
        name: 'process.env with a provably encrypted token is fine',
        code: `${SEAL}
export function b(raw: string) { process.env.API_TOKEN = encrypt(raw); }`,
      },
    ],
    invalid: [
      {
        name: 'an ambient-declared encrypt is unproven and reports',
        code: `declare function encrypt(v: string): string;
export function a(token: string) { localStorage.setItem('authToken', encrypt(token)); }`,
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'an encrypt imported from a project module is unproven and reports',
        code: `import { encrypt } from './crypto';
export function b(raw: string) { process.env.API_TOKEN = encrypt(raw); }`,
        errors: [{ messageId: 'credentialInEnvironment' }],
      },
    ],
  });
});
