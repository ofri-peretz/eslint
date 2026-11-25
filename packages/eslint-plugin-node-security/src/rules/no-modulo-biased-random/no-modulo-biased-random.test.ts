/**
 * no-modulo-biased-random: a random byte reduced with `%` by a divisor that
 * does not divide 256 picks some characters more often than others.
 *
 * The invalid half starts from ToolJet's generateTJDBPasswordForRole before
 * ToolJet/ToolJet#19245; the valid half from pkce-challenge, which rejects
 * bytes at or above the cutoff before taking `%`.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noModuloBiasedRandom } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const biased = [{ messageId: 'moduloBiasedRandom' as const }];
const CRYPTO = `import crypto from 'node:crypto';\n`;
const CHARS = `const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';\n`;

ruleTester.run('no-modulo-biased-random', noModuloBiasedRandom, {
  valid: [
    // ToolJet after #19245: crypto.randomInt has no bias.
    `${CRYPTO}${CHARS}const pick = (chars) => chars[crypto.randomInt(chars.length)];`,
    // pkce-challenge: bytes at or above the cutoff are rejected first.
    `const mask = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
    function random(size) {
      const cutoff = 256 - (256 % mask.length);
      let result = '';
      while (result.length < size) {
        const bytes = crypto.getRandomValues(new Uint8Array(size - result.length));
        for (const b of bytes) {
          if (b < cutoff) result += mask[b % mask.length];
        }
      }
      return result;
    }`,
    // A hex pick: 16 divides 256.
    `${CRYPTO}const hex = '0123456789abcdef'; const out = Array.from(crypto.randomBytes(8), (b) => hex[b % hex.length]);`,
    // A base64url alphabet of 64 divides 256.
    `${CRYPTO}const out = [...crypto.randomBytes(8)].map((b) => alphabet64[b % 64]);`,
    // A divisor at least the range: no wrap-around, so no skew from %.
    `${CRYPTO}const out = crypto.randomBytes(4).map((b) => table[b % 256]);`,
    // A random value not used as a position: jitter.
    `${CRYPTO}const delay = crypto.randomBytes(1)[0] % 7;`,
    // Math.random is another rule's concern.
    `const c = chars[Math.floor(Math.random() * 100) % chars.length];`,
    // A byte from somewhere other than a random source.
    `const buf = Buffer.from('abc'); const c = chars[buf[0] % 10];`,
    // A local named randomBytes is not crypto's.
    `function randomBytes(n) { return new Uint8Array(n); } const c = chars[randomBytes(4)[0] % 10];`,
    // A local named crypto is not the global one.
    `const crypto = { getRandomValues: (a) => a }; const a = crypto.getRandomValues(new Uint8Array(4)); const c = chars[a[0] % 10];`,
    // A Uint16Array word with 1024 slots: 1024 divides 65536.
    `const words = crypto.getRandomValues(new Uint16Array(4)); const c = table[words[0] % 1024];`,
    // A signed typed array has no unsigned range to reason about.
    `const a = crypto.getRandomValues(new Int8Array(4)); const c = chars[a[0] % 10];`,
    // A typed array never filled with random values.
    `const a = new Uint8Array(4); const c = chars[a[0] % 10];`,
    // Rejection sampling written on the indexed element.
    `${CRYPTO}const bytes = crypto.randomBytes(32); let s = ''; for (let i = 0; i < 32; i++) { if (bytes[i] >= 250) continue; s += chars[bytes[i] % 50]; }`,
    // A local String is not the global.
    `${CRYPTO}const String = (x) => x; const v = String(crypto.randomBytes(1)[0] % 10);`,
    // .toString of something else.
    `${CRYPTO}const v = (crypto.randomBytes(1)[0] % 10).toString;`,
    // The result is summed, not used as a position.
    `${CRYPTO}const bytes = crypto.randomBytes(4); const shard = (bytes[0] % 10) + 1;`,
  ],
  invalid: [
    // ToolJet generateTJDBPasswordForRole before #19245.
    {
      code: `${CRYPTO}${CHARS}const remaining = Array.from(crypto.randomBytes(26)).map((b) => allChars[b % allChars.length]);`,
      errors: [
        {
          messageId: 'moduloBiasedRandom',
          data: {
            range: '256',
            divisor: '70',
            skew: 'The first 46 of 70 results each come up 4 times in 256, the other 24 only 3 times, so the pick is biased.',
          },
        },
      ],
    },
    // Named import, for…of.
    {
      code: `import { randomBytes } from 'crypto';
      let s = ''; for (const b of randomBytes(16)) s += chars[b % 62];`,
      errors: biased,
    },
    // require, an index loop over a variable.
    {
      code: `const { randomBytes } = require('node:crypto');
      const bytes = randomBytes(16); let s = '';
      for (let i = 0; i < bytes.length; i++) s += chars[bytes[i] % 36];`,
      errors: biased,
    },
    // A variable holding the element.
    {
      code: `${CRYPTO}const bytes = crypto.randomBytes(4); const b = bytes[0]; const c = chars[b % 10];`,
      errors: biased,
    },
    // Web Crypto with a typed array filled in place.
    {
      code: `const buf = new Uint8Array(12); crypto.getRandomValues(buf); const id = Array.from(buf, (b) => digits[b % 10]).join('');`,
      errors: biased,
    },
    // globalThis.crypto and charAt.
    {
      code: `const a = globalThis.crypto.getRandomValues(new Uint8Array(8)); const c = 'abcdefghij'.charAt(a[0] % 10);`,
      errors: biased,
    },
    // node:crypto webcrypto.
    {
      code: `import { webcrypto } from 'node:crypto'; const a = webcrypto.getRandomValues(new Uint32Array(4)); const c = chars[a[0] % 3];`,
      errors: biased,
    },
    // A Buffer read.
    {
      code: `${CRYPTO}const n = crypto.randomBytes(4).readUInt32BE(0); const c = words[n % 7776];`,
      errors: biased,
    },
    // A slice and a spread keep the bytes.
    {
      code: `${CRYPTO}const out = [...crypto.randomBytes(8).subarray(2)].map((b) => chars[b % 52]);`,
      errors: biased,
    },
    // String.fromCharCode(base + b % n).
    {
      code: `${CRYPTO}const s = crypto.randomBytes(8).map((b) => String.fromCharCode(97 + (b % 26)));`,
      errors: biased,
    },
    // An unknown divisor: reported, the message says it depends on n.
    {
      code: `${CRYPTO}function pick(chars) { return Array.from(crypto.randomBytes(8), (b) => chars[b % chars.length]); }`,
      errors: [
        {
          messageId: 'moduloBiasedRandom',
          data: {
            range: '256',
            divisor: 'chars.length',
            skew: 'Unless that divisor divides 256, some results come up more often than others.',
          },
        },
      ],
    },
    // A const divisor.
    {
      code: `${CRYPTO}const N = 10; const c = chars[crypto.randomBytes(1)[0] % N];`,
      errors: biased,
    },
    // Awaited promisified bytes stay random.
    {
      code: `${CRYPTO}async function f() { const bytes = await crypto.randomBytes(4); return chars[bytes[0] % 10]; }`,
      errors: biased,
    },
    // A comparison on another value is not rejection sampling.
    {
      code: `${CRYPTO}const bytes = crypto.randomBytes(8); let s = ''; for (const b of bytes) { if (s.length < 5) s += chars[b % 10]; }`,
      errors: biased,
    },
    // A digit written into text: an OTP.
    {
      code: `const buf = new Uint8Array(6); crypto.getRandomValues(buf); const otp = Array.from(buf, (b) => String(b % 10)).join('');`,
      errors: biased,
    },
    {
      code: `${CRYPTO}let otp = ''; for (const b of crypto.randomBytes(6)) otp += \`\${b % 10}\`;`,
      errors: biased,
    },
    {
      code: `${CRYPTO}const otp = [...crypto.randomBytes(6)].map((b) => (b % 10).toString()).join('');`,
      errors: biased,
    },
  ],
});
