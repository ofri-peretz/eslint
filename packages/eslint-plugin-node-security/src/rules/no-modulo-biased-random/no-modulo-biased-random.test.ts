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
    {
      name: 'crypto.randomInt picks without bias, so indexing by it is not a modulo pick (ToolJet after #19245)',
      code: `${CRYPTO}${CHARS}const pick = (chars) => chars[crypto.randomInt(chars.length)];`,
    },
    // pkce-challenge: bytes at or above the cutoff are rejected first.
    {
      name: 'rejecting bytes at or above the cutoff before taking % leaves every character equally likely (pkce-challenge)',
      code: `const mask = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~';
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
    },
    // A hex pick: 16 divides 256.
    {
      name: 'a 16-character hex alphabet divides 256, so b % hex.length is uniform',
      code: `${CRYPTO}const hex = '0123456789abcdef'; const out = Array.from(crypto.randomBytes(8), (b) => hex[b % hex.length]);`,
    },
    // A base64url alphabet of 64 divides 256.
    {
      name: 'a 64-character alphabet divides 256, so b % 64 is uniform',
      code: `${CRYPTO}const out = [...crypto.randomBytes(8)].map((b) => alphabet64[b % 64]);`,
    },
    // A divisor at least the range: no wrap-around, so no skew from %.
    {
      name: 'a divisor equal to the byte range never wraps, so % adds no skew',
      code: `${CRYPTO}const out = crypto.randomBytes(4).map((b) => table[b % 256]);`,
    },
    // A random value not used as a position: jitter.
    {
      name: 'a random byte reduced with % for jitter is not a position in a secret',
      code: `${CRYPTO}const delay = crypto.randomBytes(1)[0] % 7;`,
    },
    // Math.random is another rule's concern.
    {
      name: "Math.random is another rule's concern, not a cryptographic byte source",
      code: `const c = chars[Math.floor(Math.random() * 100) % chars.length];`,
    },
    // A byte from somewhere other than a random source.
    {
      name: 'a byte from Buffer.from of a literal is not random',
      code: `const buf = Buffer.from('abc'); const c = chars[buf[0] % 10];`,
    },
    // A local named randomBytes is not crypto's.
    {
      name: 'a local function named randomBytes is not the crypto one',
      code: `function randomBytes(n) { return new Uint8Array(n); } const c = chars[randomBytes(4)[0] % 10];`,
    },
    // A local named crypto is not the global one.
    {
      name: 'a local object named crypto is not the global crypto',
      code: `const crypto = { getRandomValues: (a) => a }; const a = crypto.getRandomValues(new Uint8Array(4)); const c = chars[a[0] % 10];`,
    },
    // A Uint16Array word with 1024 slots: 1024 divides 65536.
    {
      name: 'a 1024-slot table divides the 65536 range of a Uint16Array word',
      code: `const words = crypto.getRandomValues(new Uint16Array(4)); const c = table[words[0] % 1024];`,
    },
    // A signed typed array has no unsigned range to reason about.
    {
      name: 'a signed typed array has no unsigned range to reason about, so the pick is left alone',
      code: `const a = crypto.getRandomValues(new Int8Array(4)); const c = chars[a[0] % 10];`,
    },
    // A typed array never filled with random values.
    {
      name: 'a typed array never passed to getRandomValues holds no random bytes',
      code: `const a = new Uint8Array(4); const c = chars[a[0] % 10];`,
    },
    // Rejection sampling written on the indexed element.
    {
      name: 'rejection sampling written on the indexed element (bytes[i] >= 250 skipped) removes the bias',
      code: `${CRYPTO}const bytes = crypto.randomBytes(32); let s = ''; for (let i = 0; i < 32; i++) { if (bytes[i] >= 250) continue; s += chars[bytes[i] % 50]; }`,
    },
    // A local String is not the global.
    {
      name: 'a local String shadowing the global does not turn the % result into text',
      code: `${CRYPTO}const String = (x) => x; const v = String(crypto.randomBytes(1)[0] % 10);`,
    },
    // .toString of something else.
    {
      name: '.toString referenced but not called does not turn the % result into text',
      code: `${CRYPTO}const v = (crypto.randomBytes(1)[0] % 10).toString;`,
    },
    // The result is summed, not used as a position.
    {
      name: 'a % result that is summed into a number is not a position or text',
      code: `${CRYPTO}const bytes = crypto.randomBytes(4); const shard = (bytes[0] % 10) + 1;`,
    },
    // Cyclic bindings end the walk instead of overflowing the stack.
    {
      name: 'cyclic variable bindings end the walk instead of overflowing the stack',
      code: `let a = b; let b = a; const c = chars[a[0] % 10];`,
    },
  ],
  invalid: [
    // ToolJet generateTJDBPasswordForRole before #19245.
    {
      name: 'ToolJet generateTJDBPasswordForRole before #19245: allChars indexed by b % 70 skews the password, and the message names the 46/24 split',
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
      name: 'a named randomBytes import from crypto, iterated with for-of, is a random source',
      code: `import { randomBytes } from 'crypto';
      let s = ''; for (const b of randomBytes(16)) s += chars[b % 62];`,
      errors: biased,
    },
    // require, an index loop over a variable.
    {
      name: 'a require-destructured randomBytes, read through an index loop over a variable, is a random source',
      code: `const { randomBytes } = require('node:crypto');
      const bytes = randomBytes(16); let s = '';
      for (let i = 0; i < bytes.length; i++) s += chars[bytes[i] % 36];`,
      errors: biased,
    },
    // A variable holding the element.
    {
      name: "a variable holding one element of the random bytes still carries the byte's range",
      code: `${CRYPTO}const bytes = crypto.randomBytes(4); const b = bytes[0]; const c = chars[b % 10];`,
      errors: biased,
    },
    // Web Crypto with a typed array filled in place.
    {
      name: 'Web Crypto getRandomValues filling a typed array in place makes that array random',
      code: `const buf = new Uint8Array(12); crypto.getRandomValues(buf); const id = Array.from(buf, (b) => digits[b % 10]).join('');`,
      errors: biased,
    },
    // globalThis.crypto and charAt.
    {
      name: 'globalThis.crypto and a charAt position read are followed',
      code: `const a = globalThis.crypto.getRandomValues(new Uint8Array(8)); const c = 'abcdefghij'.charAt(a[0] % 10);`,
      errors: biased,
    },
    // node:crypto webcrypto.
    {
      name: 'webcrypto from node:crypto filling a Uint32Array is a source, and a 3-slot pick of it is biased',
      code: `import { webcrypto } from 'node:crypto'; const a = webcrypto.getRandomValues(new Uint32Array(4)); const c = chars[a[0] % 3];`,
      errors: biased,
    },
    // A Buffer read.
    {
      name: 'a Buffer readUInt32BE read of random bytes is an element of the random collection',
      code: `${CRYPTO}const n = crypto.randomBytes(4).readUInt32BE(0); const c = words[n % 7776];`,
      errors: biased,
    },
    // A slice and a spread keep the bytes.
    {
      name: 'a subarray spread into an array keeps the random bytes',
      code: `${CRYPTO}const out = [...crypto.randomBytes(8).subarray(2)].map((b) => chars[b % 52]);`,
      errors: biased,
    },
    // String.fromCharCode(base + b % n).
    {
      name: 'String.fromCharCode(97 + b % 26) builds text from a biased pick (26 does not divide 256)',
      code: `${CRYPTO}const s = crypto.randomBytes(8).map((b) => String.fromCharCode(97 + (b % 26)));`,
      errors: biased,
    },
    // An unknown divisor: reported, the message says it depends on n.
    {
      name: 'an unknown divisor (chars.length) is reported and the message says the bias depends on it',
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
      name: 'a const divisor of 10 is known not to divide 256',
      code: `${CRYPTO}const N = 10; const c = chars[crypto.randomBytes(1)[0] % N];`,
      errors: biased,
    },
    // Awaited promisified bytes stay random.
    {
      name: 'awaiting the bytes keeps them random',
      code: `${CRYPTO}async function f() { const bytes = await crypto.randomBytes(4); return chars[bytes[0] % 10]; }`,
      errors: biased,
    },
    // A comparison on another value is not rejection sampling.
    {
      name: 'a length check on another value is not rejection sampling of the byte',
      code: `${CRYPTO}const bytes = crypto.randomBytes(8); let s = ''; for (const b of bytes) { if (s.length < 5) s += chars[b % 10]; }`,
      errors: biased,
    },
    // A digit written into text: an OTP.
    {
      name: 'a digit written into text through String(b % 10) is a biased OTP',
      code: `const buf = new Uint8Array(6); crypto.getRandomValues(buf); const otp = Array.from(buf, (b) => String(b % 10)).join('');`,
      errors: biased,
    },
    {
      name: 'a digit written into a template literal is a biased OTP',
      code: `${CRYPTO}let otp = ''; for (const b of crypto.randomBytes(6)) otp += \`\${b % 10}\`;`,
      errors: biased,
    },
    {
      name: 'a digit written through (b % 10).toString() is a biased OTP',
      code: `${CRYPTO}const otp = [...crypto.randomBytes(6)].map((b) => (b % 10).toString()).join('');`,
      errors: biased,
    },
    // A cyclic divisor binding is unknown, so it is reported, not looped on.
    {
      name: 'a cyclic divisor binding is unknown, so it is reported rather than looped on',
      code: `${CRYPTO}const n = m; const m = n; const c = chars[crypto.randomBytes(1)[0] % n];`,
      errors: biased,
    },
  ],
});
