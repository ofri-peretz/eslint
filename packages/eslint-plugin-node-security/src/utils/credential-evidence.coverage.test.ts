/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Coverage tests for the shared credential-evidence model.
 *
 * `utils/credential-evidence.ts` is only reachable through the two rules that
 * consume it, so each branch is driven through the smaller of the two —
 * `require-secure-credential-storage` for the Web Storage sink,
 * `require-storage-encryption` for the filesystem one.
 *
 * The block that matters most here is the encryption proof. It used to be a
 * token match on the callee's SPELLING; it is now a resolution of where the
 * callee CAME FROM, which is several times more code and every arm of it has to
 * be executed by something.
 *
 * Read every `valid` case below as "this really is encrypted" and every
 * `invalid` one as "nothing here proves it is". Neither verdict is reachable by
 * reading a name: `seal` is quiet and `encrypt` reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireSecureCredentialStorage } from '../rules/require-secure-credential-storage';
import { requireStorageEncryption } from '../rules/require-storage-encryption';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const CRYPTO = "import { publicEncrypt } from 'node:crypto';";

describe('utils/credential-evidence coverage', () => {
  describe('provablyEncrypts', () => {
    ruleTester.run(
      'encryption-proof branches',
      requireSecureCredentialStorage,
      {
        valid: [
          // A wrapper that returns the encryption from inside an `if`, with an
          // `else` — the two arms of the return walk.
          `${CRYPTO} function seal(v) { if (v) { return publicEncrypt(key, v); } else { return null; } }
         localStorage.setItem('authToken', seal(token));`,
          // A bare nested block, which the walk has to descend into rather than
          // treat as a leaf.
          `${CRYPTO} function seal(v) { { return publicEncrypt(key, v); } }
         localStorage.setItem('authToken', seal(token));`,
          // `try`/`catch` — the shape a wrapper around a throwing cipher takes.
          `${CRYPTO} function seal(v) { try { return publicEncrypt(key, v); } catch (e) { return null; } }
         localStorage.setItem('authToken', seal(token));`,
          // A bare `return;` with no argument, ahead of the real one.
          `${CRYPTO} function seal(v) { if (!v) return; return publicEncrypt(key, v); }
         localStorage.setItem('authToken', seal(token));`,
          // The canonical Node wrapper: a statement the return-walk has to step
          // OVER (the declaration of the cipher) before the return it wants.
          `import { createCipheriv } from 'node:crypto';
         function seal(v) { const c = createCipheriv('aes-256-gcm', key, iv); return Buffer.concat([c.update(v), c.final()]); }
         localStorage.setItem('authToken', seal(token));`,
          // A sparse array element is skipped rather than dereferenced.
          `${CRYPTO} localStorage.setItem('authToken', Buffer.concat([, publicEncrypt(key, token)]));`,
          // A spread argument hides its contents, but must not stop the walk
          // reaching the sibling that carries the proof.
          `${CRYPTO} localStorage.setItem('authToken', concat(...parts, publicEncrypt(key, token)));`,
        ],
        invalid: [
          // `value === undefined` — a `setItem` with no value argument at all.
          {
            code: `localStorage.setItem('authToken');`,
            errors: [{ messageId: 'violationDetected' }],
          },
          // The callee resolves to a PARAMETER. A caller-side fact is not
          // evidence of anything, whatever the parameter is named.
          {
            code: `function save(encryptFn, token) { localStorage.setItem('authToken', encryptFn(token)); }`,
            errors: [{ messageId: 'violationDetected' }],
          },
          // The callee resolves to an IMPORT from a module that is not a crypto
          // package. The body is in another file; unproven is not encrypted.
          {
            code: `import { seal } from './crypto-helpers'; localStorage.setItem('authToken', seal(token));`,
            errors: [{ messageId: 'violationDetected' }],
          },
          // An ambient declaration has no body to inspect.
          {
            code: `declare function seal(v: string): string; localStorage.setItem('authToken', seal(token));`,
            errors: [{ messageId: 'violationDetected' }],
          },
          // The callee resolves to a `const` that is not a function.
          {
            code: `const seal = 3; localStorage.setItem('authToken', seal(token));`,
            errors: [{ messageId: 'violationDetected' }],
          },
          // A name bound TWICE has no single provenance.
          {
            code: `var seal = (v) => v; var seal = (v) => v; localStorage.setItem('authToken', seal(token));`,
            errors: [{ messageId: 'violationDetected' }],
          },
          // The depth cap: ten wrapper hops exhaust the walk before any answer.
          {
            code: `localStorage.setItem('authToken', a(b(c(d(e(f(g(h(i(j(token)))))))))));`,
            errors: [{ messageId: 'violationDetected' }],
          },
          // A self-referential wrapper. Without the `seen` guard this recurses
          // until the stack gives out; with it, the answer is "unproven".
          {
            code: `const encrypt = (v) => encrypt(v); localStorage.setItem('authToken', encrypt(token));`,
            errors: [{ messageId: 'violationDetected' }],
          },
          // An identifier hop that lands on a declarator with NO initializer.
          {
            code: `let sealed; localStorage.setItem('authToken', wrap(sealed));`,
            errors: [{ messageId: 'violationDetected' }],
          },
          // …and one that lands on nothing at all.
          {
            code: `localStorage.setItem('authToken', wrap(undeclaredCiphertext));`,
            errors: [{ messageId: 'violationDetected' }],
          },
          // A cipher-shaped METHOD name on a receiver that is not a cipher.
          // `update` and `final` are only ever a continuation of a proof.
          {
            code: `localStorage.setItem('authToken', db.update(token));`,
            errors: [{ messageId: 'violationDetected' }],
          },
        ],
      },
    );
  });

  describe('nameOf', () => {
    ruleTester.run(
      'credential-name evidence branches',
      requireStorageEncryption,
      {
        valid: [],
        invalid: [
          // An argument that is none of Identifier / Literal / TemplateLiteral /
          // MemberExpression carries no readable name — the evidence has to come
          // from the OTHER argument, and the walk must not throw on this one.
          {
            code: `fs.writeFileSync(resolvePath(), password);`,
            errors: [{ messageId: 'violationDetected' }],
          },
        ],
      },
    );
  });
});
