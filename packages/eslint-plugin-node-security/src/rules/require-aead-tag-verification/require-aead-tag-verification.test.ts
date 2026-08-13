/**
 * Tests for require-aead-tag-verification
 * CWE-327: AEAD decryption that never verifies the authentication tag
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
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('require-aead-tag-verification', () => {
  ruleTester.run('require-aead-tag-verification', requireAeadTagVerification, {
    valid: [
      // benchmarks/corpus/CWE-327/safe/gcm-decrypt-verified.js — setAuthTag
      // AND final(): final() is what compares the tag and throws on mismatch.
      {
        code: `
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          decipher.setAuthTag(authTag);
          let out = decipher.update(ciphertext, 'hex', 'utf8');
          out += decipher.final('utf8');
        `,
      },
      // benchmarks/corpus/CWE-327/safe/gcm-encrypt-authtag.js — the ENCRYPT
      // side has no tag to verify; getAuthTag() produces one.
      {
        code: `
          const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
          let ct = cipher.update(plaintext, 'utf8', 'hex');
          ct += cipher.final('hex');
          const authTag = cipher.getAuthTag();
        `,
      },
      // Non-AEAD mode — there is no tag, so there is nothing to verify.
      {
        code: `
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          decipher.update(ct);
        `,
      },
      // Streamed: pipe()/end() run _flush, which performs the tag check and
      // emits 'error'. Demanding a literal .final() here reports correct code.
      {
        code: `
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          decipher.setAuthTag(tag);
          input.pipe(decipher).pipe(output);
        `,
      },
      {
        code: `
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          decipher.setAuthTag(tag);
          decipher.write(chunk);
          decipher.end();
        `,
      },
      {
        code: `
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          decipher.setAuthTag(tag);
          decipher.setEncoding('utf8');
        `,
      },
      // Escapes: the decipher leaves this rule's sight, so its verification
      // cannot be judged here. Absence of evidence is not evidence.
      {
        code: `
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          pipeline(input, decipher, output, done);
        `,
      },
      {
        code: `
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          return decipher[method]();
        `,
      },
      {
        code: `
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          registry[decipher] = 1;
        `,
      },
      {
        code: `
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          decipher[0];
        `,
      },
      // A computed algorithm belongs to no-dynamic-algorithm-selection.
      { code: `const d = crypto.createDecipheriv(algorithm, key, iv); d.update(ct);` },
      { code: `const d = crypto.createDecipheriv(256, key, iv); d.update(ct);` },
      { code: `const d = crypto.createDecipheriv();` },
      // Not a decipher factory at all.
      { code: `const d = crypto.createHash('sha256');` },
      { code: `const d = makeThing('aes-256-gcm');` },
      { code: `const d = crypto['createDecipheriv']('aes-256-gcm', key, iv);` },
      // Not a plain `const x = call()` binding.
      { code: `const { d } = crypto.createDecipheriv('aes-256-gcm', key, iv);` },
      { code: `let d;` },
      { code: `const d = 42;` },
      // allowInTests bypass.
      {
        code: `const d = crypto.createDecipheriv('aes-256-gcm', key, iv); d.update(ct);`,
        options: [{ allowInTests: true }],
        filename: 'crypto.test.ts',
      },
    ],
    invalid: [
      // LOCK: benchmarks/corpus/CWE-327/vulnerable/gcm-decrypt-no-authtag.js
      // setAuthTag() is never called, so the tag is never checked at all.
      {
        code: `
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          let out = decipher.update(ciphertext, 'hex', 'utf8');
          out += decipher.final('utf8');
        `,
        errors: [{ messageId: 'missingAuthTag' }],
      },
      // LOCK: benchmarks/corpus/CWE-327/vulnerable/gcm-decipher-no-final.js
      // setAuthTag() loads the tag, but without final() nothing compares it.
      {
        code: `
          const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          decipher.setAuthTag(authTag);
          const out = decipher.update(ciphertext, 'hex', 'utf8');
        `,
        errors: [{ messageId: 'missingFinal' }],
      },
      // ChaCha20-Poly1305 is AEAD too, and spells its tag mode differently.
      {
        code: `
          const decipher = crypto.createDecipheriv('chacha20-poly1305', key, iv);
          const out = decipher.update(ct);
        `,
        errors: [{ messageId: 'missingAuthTag' }],
      },
      // CCM, via a bare named import.
      {
        code: `
          const decipher = createDecipheriv('aes-128-ccm', key, iv);
          decipher.setAuthTag(tag);
          const out = decipher.update(ct);
        `,
        errors: [{ messageId: 'missingFinal' }],
      },
      // allowInTests: true but NOT a test file — the bypass must not leak.
      {
        code: `const d = crypto.createDecipheriv('aes-256-gcm', key, iv); d.update(ct);`,
        options: [{ allowInTests: true }],
        filename: 'crypto.ts',
        errors: [{ messageId: 'missingAuthTag' }],
      },
    ],
  });
});
