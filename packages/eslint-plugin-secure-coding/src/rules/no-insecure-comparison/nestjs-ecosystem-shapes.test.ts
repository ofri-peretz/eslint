/**
 * no-insecure-comparison: two shapes from the NestJS ecosystem scan where
 * neither side is something a caller can vary.
 *
 * - nestjs/webhooks `secrets.util.ts`: `secret.trim() !== secret` rejects a
 *   configured secret with stray whitespace. Both sides are the same secret.
 * - nestjs/authentication `mfa.service.ts:161`: the stored-read-vs-re-read check
 *   was already exempt, but a guard `if (!record || !candidate) return false`
 *   between the reads made `!record` count as the record escaping, so its
 *   fields stopped being trusted. A `!`, `typeof` or comparison only tests the
 *   binding; it hands the object to nothing.
 *
 * The invalid half keeps a second value out: an argument, a different
 * receiver, an alias through `||`, and a reassigned receiver all still report.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureComparison } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/** One finding per `left op right`, with the timingSafeEqual suggestion. */
const timing = (code: string, ...pairs: [string, string, string][]) => ({
  code,
  errors: pairs.map(([left, op, right]) => ({
    messageId: 'timingUnsafeComparison' as const,
    suggestions: [
      {
        messageId: 'useTimingSafeEqual' as const,
        output: code.replace(
          `${left} ${op} ${right}`,
          `crypto.timingSafeEqual(Buffer.from(${left}), Buffer.from(${right}))`,
        ),
      },
    ],
  })),
});
const mfa = (guard: string) => `
  class MfaService {
    async confirm(userId, code) {
      const record = await this.store.getTotp(userId);
      const candidate = record?.confirmed ? record.pendingSecret : record?.secret;
      ${guard}
      const latest = await this.store.getTotp(userId);
      const stillPending = !!latest && (record.confirmed ? latest.pendingSecret === candidate : latest.secret === candidate);
      return stillPending;
    }
  }
`;

ruleTester.run('nestjs-ecosystem-shapes', noInsecureComparison, {
  valid: [
    {
      // @source nestjs/webhooks lib/signing/secrets.util.ts:22
      // @found real-source scan
      name: 'FP: a secret against its own trim',
      code: `function standardSecretKey(secret: string) { if (secret.trim() !== secret) throw new TypeError('whitespace'); }`,
    },
    {
      // @found synthetic
      name: 'FP: the self-transform on the right, through optional chaining',
      code: `function k(secret) { return secret === secret?.normalize('NFC'); }`,
    },
    {
      // @source nestjs/authentication lib/mfa/mfa.service.ts:161
      // @found real-source scan
      name: 'FP: a guard on the record between the two reads',
      code: mfa(`if (!record || !candidate) return false;
      const opened = this.open(userId, candidate);
      if (!opened || !(await this.check(userId, opened, code))) return false;`),
    },
    {
      // @found synthetic
      name: 'FP: typeof and a null comparison only test the record',
      code: mfa(
        `if (typeof record !== 'object' || record === null) return false;`,
      ),
    },
  ],
  invalid: [
    {
      name: 'a transform that takes a second value still reports',
      ...timing(
        `function k(secret, presented) { return secret.replace(presented, '') === secret; }`,
        ["secret.replace(presented, '')", '===', 'secret'],
      ),
    },
    {
      name: 'a transform of a different value still reports',
      ...timing(
        `function k(secret, presented) { return presented.trim() === secret; }`,
        ['presented.trim()', '===', 'secret'],
      ),
    },
    {
      name: 'a reassigned receiver still reports',
      ...timing(
        `function k(secret, presented) { secret = presented; return secret.trim() === secret; }`,
        ['secret.trim()', '===', 'secret'],
      ),
    },
    {
      name: 'a record passed on as a value is still an escape',
      ...timing(
        mfa(
          `if (!record) return false; const alias = fallback || record; alias.secret = code;`,
        ),
        ['latest.pendingSecret', '===', 'candidate'],
        ['latest.secret', '===', 'candidate'],
      ),
    },
    {
      name: 'a non-member call is not a self-transform',
      ...timing(`function k(secret) { return trim(secret) === secret; }`, [
        'trim(secret)',
        '===',
        'secret',
      ]),
    },
  ],
});
