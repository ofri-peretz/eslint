/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Edges pinned by mutation testing: each case below is an input on which a
 * surviving Stryker mutant and the rule disagreed, written against the rule as
 * it stands. Cases marked `Rule fix` were wrong verdicts the survivors led to.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMathRandomCrypto } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const error = { messageId: 'mathRandomCrypto' as const };

/** Builds a value from Math.random() inside a loop, never returning a draw directly. */
const loopBody = `  const out = [];
  for (let i = 0; i < 16; i++) out.push(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
  return out.join('');`;

ruleTester.run('mutation-guided edges', noMathRandomCrypto, {
  valid: [
    // Rule fix (FP): a block-bodied arrow does not hand its statements' values
    // to the binding it is assigned to; only a concise body or a `return` does.
    {
      name: 'a draw inside a block-bodied arrow callback does not name the variable holding the timer',
      code: 'const authRetry = setInterval(() => { delay = Math.random() * 1000; }, 60000);',
    },
    // Rule fix (FP): the same, for the commonest shape — a request handler.
    {
      name: 'a jitter draw inside an arrow request handler named after auth is not a credential',
      code: `const handleAuth = async (req, res) => {
  await sleep(Math.random() * 100);
  res.end();
};`,
    },
    // Rule fix (FP): the inner `return` hands the draw to `next`, not to the
    // block-bodied arrow around it, so `tokenStore` is not its name.
    {
      name: 'a return inside an inner function does not carry the draw out of the enclosing arrow',
      code: `const tokenStore = (() => {
  const next = function () { return Math.random(); };
  register(next);
})();`,
    },
    {
      name: 'only a return statement consults the name of its function, not every node inside it',
      code: `function sessionCleanup() {
  setTimeout(purgeExpired, Math.random() * 1000);
}`,
    },
    {
      name: 'a return inside an arrow callback belongs to the arrow, not the named outer function',
      code: `function sessionCleanup() {
  items.forEach((item) => { return touch(item, Math.random()); });
}`,
    },
    {
      name: 'an assignment to a computed member has no name to judge',
      code: 'weights[i] = Math.random();',
    },
  ],
  invalid: [
    {
      name: 'a draw returned from a block-bodied IIFE names the variable it initialises',
      code: 'const sessionToken = (() => { return Math.random().toString(36); })();',
      errors: [error],
    },
    // CRYPTO_FUNCTION_PATTERNS: words may sit between the verb and the noun
    {
      name: 'generateSessionKey matches generate…key across an intervening word',
      code: `function generateSessionKey() {\n${loopBody}\n}`,
      errors: [error],
    },
    {
      name: 'createClientSecret matches create…secret across an intervening word',
      code: `function createClientSecret() {\n${loopBody}\n}`,
      errors: [error],
    },
    {
      name: 'createResetToken matches create…token across an intervening word',
      code: `function createResetToken() {\n${loopBody}\n}`,
      errors: [error],
    },
    {
      name: 'getRandomBytes matches get…random…bytes with nothing between the words',
      code: `function getRandomBytes() {\n${loopBody}\n}`,
      errors: [error],
    },
    {
      name: 'makeUserSalt matches make…salt across an intervening word',
      code: `function makeUserSalt() {\n${loopBody}\n}`,
      errors: [error],
    },
    {
      name: 'generatePassword matches gen…password across the rest of the verb',
      code: `function generatePassword() {\n${loopBody}\n}`,
      errors: [error],
    },
    // isCsprngFallback: only an earlier CSPRNG call in the SAME function counts
    {
      name: 'a CSPRNG call in another function declaration is not a fallback for this one',
      code: "function nonce() { return crypto.randomBytes(16).toString('hex'); }\nfunction generateToken() { return Math.random().toString(36); }",
      errors: [error],
    },
    {
      name: 'a CSPRNG call outside a function expression is not a fallback inside it',
      code: "const nonce = () => crypto.randomBytes(16).toString('hex');\nconst makeToken = function () { const token = Math.random().toString(36); return token; };",
      errors: [error],
    },
    {
      name: 'a CSPRNG call outside an arrow function is not a fallback inside it',
      code: "const nonce = () => crypto.randomBytes(16).toString('hex');\nconst makeToken = () => { const token = Math.random().toString(36); return token; };",
      errors: [error],
    },
    {
      name: 'a CSPRNG call that runs after the draw is not a fallback for it',
      code: `function createSession() {
  const sessionToken = Math.random().toString(36).slice(2);
  const csrfSecret = crypto.randomBytes(32).toString('hex');
  return { sessionToken, csrfSecret };
}`,
      errors: [error],
    },
    // Math.random aliased through an object literal
    {
      name: 'an object literal aliases Math.random even when it has other properties',
      code: 'const rng = { seed: 1, next: Math.random };\nconst token = rng.next().toString(36);',
      errors: [error],
    },
    {
      name: 'an object literal with a spread still aliases Math.random through its own key',
      code: 'const rng = { ...defaults, next: Math.random };\nconst token = rng.next().toString(36);',
      errors: [error],
    },
    // Qualified words
    {
      name: 'a secret word outranks a key word that a qualifier marks as non-secret',
      code: 'const cacheKeySecret = Math.random().toString(36);',
      errors: [error],
    },
  ],
});
