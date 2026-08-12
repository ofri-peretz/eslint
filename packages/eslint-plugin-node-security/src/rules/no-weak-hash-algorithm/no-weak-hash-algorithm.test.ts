/**
 * Tests for no-weak-hash-algorithm rule
 * CWE-327: Use of a Broken or Risky Cryptographic Algorithm
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWeakHashAlgorithm } from './index';

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

describe('no-weak-hash-algorithm', () => {
  ruleTester.run('no-weak-hash-algorithm', noWeakHashAlgorithm, {
    valid: [
      // Valid: SHA-256 (strong)
      { code: 'crypto.createHash("sha256").update(data);' },
      { code: 'crypto.createHash("sha512").update(data);' },
      { code: 'crypto.createHash("sha3-256").update(data);' },
      // Valid: Non-crypto context
      { code: 'const message = "md5 is weak";' },
      // Valid: Test file with allowInTests
      {
        code: 'crypto.createHash("md5").update(data);',
        filename: 'crypto.test.ts',
        options: [{ allowInTests: true }],
      },
      // Valid: Non-hash function with weak name
      { code: 'console.log("sha1");' },
      // Valid: sha256 function (strong)
      { code: 'sha256(data);' },

      // ---- Non-cryptographic use: the hash is an identifier ----------------
      // redis/ioredis lib/Script.ts:15, verbatim. SHA-1 IS used and the
      // detection is correct, but this is the EVALSHA script identifier the
      // Redis wire protocol mandates — a cache key, not a security control.
      { code: 'this.sha = createHash("sha1").update(lua).digest("hex");' },
      // The same shape through each supported assignment form.
      { code: 'const etag = crypto.createHash("md5").update(body).digest("hex");' },
      { code: 'cacheKey = crypto.createHash("md5").update(input).digest("hex");' },
      { code: 'const meta = { cache_key: createHash("sha1").update(x).digest("hex") };' },
      // Separators and case are normalised, so cache-key is the same name.
      { code: 'const res = { "x": 1 }; res.cacheBuster = createHash("md5").update(v).digest("hex");' },
      // A user-supplied name list replaces the default.
      {
        code: 'const scriptDigest = createHash("sha1").update(lua).digest("hex");',
        options: [{ nonCryptographicNames: ['scriptDigest'] }],
      },
      // The bare `sha1(x)` helper form takes the same exemption — the test
      // is where the value LANDS, not which API produced it. `sha1(lua)`
      // stored as `sha` is the ioredis pattern written with a wrapper.
      { code: 'const sha = sha1(lua);' },
      // A quoted key names the same property as a bare one; the exemption
      // must not depend on quoting style.
      { code: `const meta = { 'cache-key': createHash("sha1").update(x).digest("hex") };` },
    ],
    invalid: [
      // Invalid: MD5
      {
        code: 'crypto.createHash("md5").update(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'crypto.createHash("sha256").update(data);' },
            { messageId: 'useSha512', output: 'crypto.createHash("sha512").update(data);' },
            { messageId: 'useSha3', output: 'crypto.createHash("sha3-256").update(data);' },
          ],
        }],
      },
      // Invalid: SHA-1
      {
        code: 'crypto.createHash("sha1").update(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'crypto.createHash("sha256").update(data);' },
            { messageId: 'useSha512', output: 'crypto.createHash("sha512").update(data);' },
            { messageId: 'useSha3', output: 'crypto.createHash("sha3-256").update(data);' },
          ],
        }],
      },
      // Invalid: MD4
      {
        code: 'crypto.createHash("md4").update(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'crypto.createHash("sha256").update(data);' },
            { messageId: 'useSha512', output: 'crypto.createHash("sha512").update(data);' },
            { messageId: 'useSha3', output: 'crypto.createHash("sha3-256").update(data);' },
          ],
        }],
      },
      // Invalid: Case insensitive
      {
        code: 'crypto.createHash("MD5").update(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'crypto.createHash("sha256").update(data);' },
            { messageId: 'useSha512', output: 'crypto.createHash("sha512").update(data);' },
            { messageId: 'useSha3', output: 'crypto.createHash("sha3-256").update(data);' },
          ],
        }],
      },
      // Invalid: Standalone createHash function
      {
        code: 'createHash("md5");',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'createHash("sha256");' },
            { messageId: 'useSha512', output: 'createHash("sha512");' },
            { messageId: 'useSha3', output: 'createHash("sha3-256");' },
          ],
        }],
      },
      // Invalid: RIPEMD
      {
        code: 'crypto.createHash("ripemd").update(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'crypto.createHash("sha256").update(data);' },
            { messageId: 'useSha512', output: 'crypto.createHash("sha512").update(data);' },
            { messageId: 'useSha3', output: 'crypto.createHash("sha3-256").update(data);' },
          ],
        }],
      },
      // Invalid: Direct sha1() function call (lines 205-221)
      {
        code: 'sha1(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'sha256(data);' },
          ],
        }],
      },
      // Invalid: Direct md5() function call (lines 83-85, 205-221)
      {
        code: 'md5(password);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'sha256(password);' },
          ],
        }],
      },
      // Invalid: Direct md4() function call
      {
        code: 'md4(data);',
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'sha256(data);' },
          ],
        }],
      },
      // Invalid: Additional weak algorithms option
      {
        code: 'crypto.createHash("whirlpool").update(data);',
        options: [{ additionalWeakAlgorithms: ['whirlpool'] }],
        errors: [{ 
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'crypto.createHash("sha256").update(data);' },
            { messageId: 'useSha512', output: 'crypto.createHash("sha512").update(data);' },
            { messageId: 'useSha3', output: 'crypto.createHash("sha3-256").update(data);' },
          ],
        }],
      },

      // ---- The non-cryptographic exemption is narrow ----------------------
      // Only a hash STORED under a recognised name qualifies. Everything below
      // is the same `createHash` call in a position the exemption must not
      // reach, so that "call it `sha`" can never become a way to silence the
      // rule on a real security control.

      // A security-flavoured assignment target is not exempt.
      {
        code: 'const signature = createHash("sha1").update(data).digest("hex");',
        errors: [{
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'const signature = createHash("sha256").update(data).digest("hex");' },
            { messageId: 'useSha512', output: 'const signature = createHash("sha512").update(data).digest("hex");' },
            { messageId: 'useSha3', output: 'const signature = createHash("sha3-256").update(data).digest("hex");' },
          ],
        }],
      },
      // Returned, never stored — the walk finds no assignment target.
      {
        code: 'function f() { return createHash("md5").update(pw).digest("hex"); }',
        errors: [{
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'function f() { return createHash("sha256").update(pw).digest("hex"); }' },
            { messageId: 'useSha512', output: 'function f() { return createHash("sha512").update(pw).digest("hex"); }' },
            { messageId: 'useSha3', output: 'function f() { return createHash("sha3-256").update(pw).digest("hex"); }' },
          ],
        }],
      },
      // Passed straight to another call. The chain walk only climbs receivers,
      // so an argument position stops it.
      {
        code: 'verify(createHash("sha1").update(x).digest("hex"));',
        errors: [{
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'verify(createHash("sha256").update(x).digest("hex"));' },
            { messageId: 'useSha512', output: 'verify(createHash("sha512").update(x).digest("hex"));' },
            { messageId: 'useSha3', output: 'verify(createHash("sha3-256").update(x).digest("hex"));' },
          ],
        }],
      },
      // A computed member target hides the name, so it cannot be trusted.
      {
        code: 'obj[key] = createHash("sha1").update(x).digest("hex");',
        errors: [{
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'obj[key] = createHash("sha256").update(x).digest("hex");' },
            { messageId: 'useSha512', output: 'obj[key] = createHash("sha512").update(x).digest("hex");' },
            { messageId: 'useSha3', output: 'obj[key] = createHash("sha3-256").update(x).digest("hex");' },
          ],
        }],
      },
      // Destructuring target: not an Identifier, so no name to check.
      {
        code: 'const [a] = createHash("md5").update(x).digest("hex");',
        errors: [{
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'const [a] = createHash("sha256").update(x).digest("hex");' },
            { messageId: 'useSha512', output: 'const [a] = createHash("sha512").update(x).digest("hex");' },
            { messageId: 'useSha3', output: 'const [a] = createHash("sha3-256").update(x).digest("hex");' },
          ],
        }],
      },
      // A numeric key has no name to match.
      {
        code: 'const meta = { 1: createHash("md5").update(x).digest("hex") };',
        errors: [{
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'const meta = { 1: createHash("sha256").update(x).digest("hex") };' },
            { messageId: 'useSha512', output: 'const meta = { 1: createHash("sha512").update(x).digest("hex") };' },
            { messageId: 'useSha3', output: 'const meta = { 1: createHash("sha3-256").update(x).digest("hex") };' },
          ],
        }],
      },
      // A computed object key is likewise unreadable.
      {
        code: 'const meta = { [k]: createHash("sha1").update(x).digest("hex") };',
        errors: [{
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'const meta = { [k]: createHash("sha256").update(x).digest("hex") };' },
            { messageId: 'useSha512', output: 'const meta = { [k]: createHash("sha512").update(x).digest("hex") };' },
            { messageId: 'useSha3', output: 'const meta = { [k]: createHash("sha3-256").update(x).digest("hex") };' },
          ],
        }],
      },
      // An empty name list switches the exemption off entirely, restoring the
      // pre-change behaviour on the ioredis shape.
      {
        code: 'this.sha = createHash("sha1").update(lua).digest("hex");',
        options: [{ nonCryptographicNames: [] }],
        errors: [{
          messageId: 'weakHashAlgorithm',
          suggestions: [
            { messageId: 'useSha256', output: 'this.sha = createHash("sha256").update(lua).digest("hex");' },
            { messageId: 'useSha512', output: 'this.sha = createHash("sha512").update(lua).digest("hex");' },
            { messageId: 'useSha3', output: 'this.sha = createHash("sha3-256").update(lua).digest("hex");' },
          ],
        }],
      },
    ],
  });
});
