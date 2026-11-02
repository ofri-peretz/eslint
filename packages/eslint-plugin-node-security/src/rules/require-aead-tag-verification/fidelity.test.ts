/**
 * require-aead-tag-verification — divergence the Quint fidelity model found
 * (benchmarks/suites/fidelity/models/node-security/require_aead_tag_verification.qnt):
 * a renamed `createDecipheriv` import was matched by its local spelling and
 * went silent.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireAeadTagVerification } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('require-aead-tag-verification fidelity', () => {
  ruleTester.run('renamed crypto imports', requireAeadTagVerification, {
    valid: [
      {
        name: 'a renamed createDecipheriv with setAuthTag and final is fine',
        code: `import { createDecipheriv as openBox } from 'crypto';
export function open(key: Buffer, iv: Buffer, ct: string, tag: Buffer) {
  const d = openBox('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  let out = d.update(ct, 'hex', 'utf8');
  out += d.final('utf8');
  return out;
}`,
      },
    ],
    invalid: [
      {
        name: 'a renamed createDecipheriv without setAuthTag is reported',
        code: `import { createDecipheriv as openBox } from 'crypto';
export function open(key: Buffer, iv: Buffer, ct: string) {
  const d = openBox('aes-256-gcm', key, iv);
  let out = d.update(ct, 'hex', 'utf8');
  out += d.final('utf8');
  return out;
}`,
        errors: [{ messageId: 'missingAuthTag' }],
      },
      {
        name: 'a renamed createDecipheriv with setAuthTag but no final is reported',
        code: `import { createDecipheriv as openBox } from 'crypto';
export function open(key: Buffer, iv: Buffer, ct: string, tag: Buffer) {
  const d = openBox('aes-256-gcm', key, iv);
  d.setAuthTag(tag);
  return d.update(ct, 'hex', 'utf8');
}`,
        errors: [{ messageId: 'missingFinal' }],
      },
    ],
  });
});
