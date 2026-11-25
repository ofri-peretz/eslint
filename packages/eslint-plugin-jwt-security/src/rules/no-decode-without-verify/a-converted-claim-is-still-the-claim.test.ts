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
    ],
  },
);
