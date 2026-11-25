/**
 * A claim passed through a type conversion is still the claim (#1755).
 *
 * The decode-then-verify exemption lets a decoded claim reach the verify's key
 * through a call, because that call is a per-user key lookup
 * (`getKey(claims.kid)`). `String(claims.secret)` is also a call, so it got the
 * same pass, although its result is the attacker's own claim: the forged
 * token is then checked against a key the attacker chose.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDecodeWithoutVerify } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const jsonwebtoken = `import jwt from 'jsonwebtoken';`;

ruleTester.run(
  'no-decode-without-verify — a converted claim is still the claim',
  noDecodeWithoutVerify,
  {
    valid: [
      {
        name: 'a per-user key lookup on a claim still picks the key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, getKey(claims.kid), { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'a lookup result converted to a string is still the looked-up key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, String(getKey(claims.kid)), { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'a table indexed by a claim is a lookup, like getKey(claims.kid)',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, keys[claims.kid], { algorithms: ['HS256'] });
}`,
      },
      {
        name: 'an awaited fetch keyed by a claim is a lookup',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, await fetchKey(claims.iss), { algorithms: ['HS256'] });
}`,
      },
    ],
    invalid: [
      {
        name: 'String() of a claim used as the key is the claim used as the key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, String(claims.secret), { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'Buffer.from() of a claim used as the key is the claim used as the key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, Buffer.from(claims.secret), { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a template literal of a claim used as the key is the claim used as the key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, \`\${claims.secret}\`, { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: '.toString() of a claim used as the key is the claim used as the key',
        code: `${jsonwebtoken}
function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, claims.secret.toString(), { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: '.trim() of a claim used as the key is the claim used as the key',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, claims.secret.trim(), { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'Number() of a claim used as the key is the claim used as the key',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, Number(claims.secret), { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'BigInt() of a claim used as the key is the claim used as the key',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, BigInt(claims.secret), { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'new String() of a claim used as the key is the claim used as the key',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, new String(claims.secret), { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'Buffer.alloc() sized by a claim is not a lookup of it',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, Buffer.alloc(claims.size), { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        name: 'a claim read from a table entry is still a claim: claims[name]',
        code: `${jsonwebtoken}
async function check(token) {
  const claims = jwt.decode(token);
  jwt.verify(token, claims[name], { algorithms: ['HS256'] });
}`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
    ],
  },
);
