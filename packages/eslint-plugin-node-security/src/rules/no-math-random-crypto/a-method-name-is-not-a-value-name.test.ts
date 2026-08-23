/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A method's name does not name a value inside its body.
 *
 * Hand-verification run 2026-08-22. shardeum/json-rpc-server `src/api.ts`
 * reported six times — 1332, 1405, 1440, 2013, 2234, 3112 — on one idiom:
 *
 *   eth_getBlockTransactionCountByHash: async function (args, callback) {
 *     const ticket = crypto.createHash('sha1')
 *       .update(api_name + Math.random() + Date.now()).digest('hex')
 *     logEventEmitter.emit('fn_start', ticket, api_name, performance.now())
 *
 * `ticket` is a log-correlation id and is not a crypto name. The finding came
 * from the ancestor walk continuing past the function body into the enclosing
 * object PROPERTY and reading the JSON-RPC method's name — `…ByHash`,
 * `…ByBlockHash`, `eth_getCode` — as if it named the draw. Five of the six were
 * `hash`; the sixth was `code`.
 *
 * The value-naming arms (VariableDeclarator / AssignmentExpression / Property)
 * now stop at a function boundary the value does not escape. The
 * enclosing-FUNCTION arms are untouched: they ask what the surrounding function
 * is for, which is a question about the function.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noMathRandomCrypto } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-math-random-crypto — a method name is not a value name',
  noMathRandomCrypto,
  {
    valid: [
      // The corpus shape, both collision words.
      `const api = { eth_getBlockTransactionCountByHash: async function (args, cb) { const ticket = hash(api_name + Math.random() + Date.now()); emit(ticket); } };`,
      `const api = { eth_getCode: async function (args, cb) { const ticket = hash(api_name + Math.random() + Date.now()); emit(ticket); } };`,
      // The same overreach one level out: a crypto-named CONST holding an object
      // whose method draws a random number for something else entirely.
      `const sessionToken = { refresh() { const jitter = Math.random() * 100; schedule(jitter); } };`,
    ],
    invalid: [
      // Positive controls — every way the name legitimately reaches the value.
      { code: `const token = Math.random().toString(36).slice(2);`, errors: 1 },
      {
        code: `const api = { sessionToken: Math.random().toString(36) };`,
        errors: 1,
      },
      {
        code: `function generateToken() { return Math.random().toString(36); }`,
        errors: 1,
      },
      // A concise arrow's body IS the value, so the name still reaches it…
      {
        code: `const makeToken = () => Math.random().toString(36);`,
        errors: 1,
      },
      // …and so does a `return` out of a block body.
      {
        code: `const makeToken = () => { return Math.random().toString(36); };`,
        errors: 1,
      },
      // The accumulator loop: the name is on the assignment target.
      {
        code: `let token = ''; for (let i = 0; i < 32; i++) { token += CHARS[Math.floor(Math.random() * CHARS.length)]; }`,
        errors: 1,
      },
    ],
  },
);
