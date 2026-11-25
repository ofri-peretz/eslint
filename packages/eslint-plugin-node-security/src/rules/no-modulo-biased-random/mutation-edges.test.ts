/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
// Edge cases that pin each branch of the rule, so a change to one shows up.
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
const C = `import crypto from 'node:crypto';\n`;

ruleTester.run('no-modulo-biased-random edges', noModuloBiasedRandom, {
  valid: [
    {
      name: 'a typed array behind a long alias chain is not followed',
      code: `const a = new Uint16Array(4); const b = a; const c = b; const d = c; const e = d; const f = e; const out = crypto.getRandomValues(f); chars[out[0] % 10];`,
    },
    {
      name: 'an undeclared array passed to getRandomValues has no known range',
      code: `const out = crypto.getRandomValues(globalBuffer); chars[out[0] % 10];`,
    },
    {
      name: 'a random byte behind a long alias chain is not followed',
      code: `${C}const a = crypto.randomBytes(1)[0]; const b = a; const c = b; const d = c; const e = d; const f = e; chars[f % 10];`,
    },
    {
      name: 'a plain template whose length divides 256 is unbiased',
      code: `${C}chars[crypto.randomBytes(1)[0] % \`abcd\`.length];`,
    },
    {
      name: 'a byte passed to a method that is not a position read is not a position',
      code: `${C}obj.foo(crypto.randomBytes(1)[0] % 10);`,
    },
    {
      name: 'a byte passed to a computed method is not a position',
      code: `${C}obj[m](crypto.randomBytes(1)[0] % 10);`,
    },
    {
      name: 'a typed array not built with new has no known range',
      code: `const out = crypto.getRandomValues(makeBuffer()); chars[out[0] % 10];`,
    },
    {
      name: 'getRandomValues with no argument has no known range',
      code: `const out = crypto.getRandomValues(); chars[out[0] % 10];`,
    },
    {
      name: 'an undeclared buffer has no known range',
      code: `crypto.getRandomValues(globalBuffer); chars[globalBuffer[0] % 10];`,
    },
    {
      name: 'a buffer filled from a parameter has no known range',
      code: `function f(buf) { crypto.getRandomValues(buf); return chars[buf[0] % 10]; }`,
    },
    {
      name: 'a destructured buffer has no known range',
      code: `const [buf] = [new Uint8Array(4)]; crypto.getRandomValues(buf); chars[buf[0] % 10];`,
    },
    {
      name: 'a buffer assigned after its declaration has no known range',
      code: `let buf; buf = new Uint8Array(4); crypto.getRandomValues(buf); chars[buf[0] % 10];`,
    },
    {
      name: 'a filled buffer from a factory has no known range',
      code: `const buf = makeBuffer(); crypto.getRandomValues(buf); chars[buf[0] % 10];`,
    },
    {
      name: 'an undeclared element is not a random byte',
      code: `chars[x % 10];`,
    },
    {
      name: 'a length read from random bytes is not a random byte',
      code: `${C}const { length } = crypto.randomBytes(1); chars[length % 10];`,
    },
    {
      name: 'a for-in key over random bytes is not a random byte',
      code: `${C}const bytes = crypto.randomBytes(4); for (const i in bytes) chars[i % 10];`,
    },
    {
      name: 'an imported binding is not a random byte',
      code: `import b from 'x'; chars[b % 10];`,
    },
    {
      name: 'a callback index is not a random byte',
      code: `${C}crypto.randomBytes(4).map((x, i) => chars[i % 10]);`,
    },
    {
      name: 'a function not passed to a call has no known collection',
      code: `const f = (b) => chars[b % 10];`,
    },
    {
      name: 'a callback to an unknown function has no known collection',
      code: `${C}foo(crypto.randomBytes(4), (b) => chars[b % 10]);`,
    },
    {
      name: 'a callback passed through a computed method has no known collection',
      code: `${C}const bytes = crypto.randomBytes(4); bytes[m]((b) => chars[b % 10]);`,
    },
    {
      name: 'a computed method call on random bytes is not a known element',
      code: `${C}const bytes = crypto.randomBytes(4); chars[bytes[m]() % 10];`,
    },
    {
      name: 'a computed copy of random bytes is not a known collection',
      code: `${C}chars[crypto.randomBytes(4)[m]()[0] % 10];`,
    },
    {
      name: 'an offset added to a byte that is not a char code is not a position',
      code: `${C}foo(65 + crypto.randomBytes(1)[0] % 26);`,
    },
    {
      name: 'an offset passed to a method other than fromCharCode is not a position',
      code: `${C}obj.foo(65 + crypto.randomBytes(1)[0] % 26);`,
    },
    {
      name: 'an offset that is not passed to a call is not a position',
      code: `${C}const n = 65 + crypto.randomBytes(1)[0] % 26;`,
    },
    {
      name: 'a concatenated const string whose length divides 256 is unbiased',
      code: `${C}const s = 'abcd' + 'efgh'; chars[crypto.randomBytes(1)[0] % s.length];`,
    },
  ],
  invalid: [
    {
      name: 'fromCharCode over a byte is a position',
      code: `${C}String.fromCharCode(crypto.randomBytes(1)[0] % 26);`,
      errors: biased,
    },
    {
      name: 'a typed array bound to a name keeps its range',
      code: `const buf = new Uint16Array(4); const out = crypto.getRandomValues(buf); chars[out[0] % 10];`,
      errors: biased,
    },
    {
      name: 'a default-namespace randomBytes is still crypto',
      code: `const c = require('crypto'); chars[c.default.randomBytes(1)[0] % 10];`,
      errors: biased,
    },
    {
      name: 'an undeclared divisor is unknown and reported',
      code: `${C}chars[crypto.randomBytes(1)[0] % N];`,
      errors: biased,
    },
    {
      name: 'a let divisor is unknown and reported',
      code: `${C}let n = 16; chars[crypto.randomBytes(1)[0] % n];`,
      errors: biased,
    },
    {
      name: 'a for-of const divisor is unknown and reported',
      code: `${C}for (const n of [16]) chars[crypto.randomBytes(1)[0] % n];`,
      errors: biased,
    },
    {
      name: 'a divisor read from a property other than length is unknown',
      code: `${C}chars[crypto.randomBytes(1)[0] % chars.size];`,
      errors: biased,
    },
    {
      name: 'a template with an expression has no known length',
      code: `${C}const s = \`\${x}abcd\`; chars[crypto.randomBytes(1)[0] % s.length];`,
      errors: biased,
    },
    {
      name: 'a concatenation with an unknown left side has no known length',
      code: `${C}const s = x + 'abcd'; chars[crypto.randomBytes(1)[0] % s.length];`,
      errors: biased,
    },
    {
      name: 'a concatenation with an unknown right side has no known length',
      code: `${C}const s = 'abcd' + x; chars[crypto.randomBytes(1)[0] % s.length];`,
      errors: biased,
    },
    {
      name: 'an array literal has no known string length',
      code: `${C}chars[crypto.randomBytes(1)[0] % [1, 2, 3, 4].length];`,
      errors: biased,
    },
    {
      name: 'an undeclared string has no known length',
      code: `${C}chars[crypto.randomBytes(1)[0] % S.length];`,
      errors: biased,
    },
    {
      name: 'a for-of const string has no known length',
      code: `${C}for (const s of ['abcd']) chars[crypto.randomBytes(1)[0] % s.length];`,
      errors: biased,
    },
    {
      name: 'a very long concatenation is not evaluated',
      code: `${C}const s = 'a' + 'b' + 'c' + 'd' + 'e' + 'f' + 'g' + 'h' + 'i' + 'j' + 'k' + 'l' + 'm' + 'n' + 'o' + 'p'; chars[crypto.randomBytes(1)[0] % s.length];`,
      errors: biased,
    },
    {
      name: 'fromCharCode over an offset byte is a position',
      code: `${C}String.fromCharCode(65 + crypto.randomBytes(1)[0] % 26);`,
      errors: biased,
    },
  ],
});
