/**
 * Tests for no-cryptojs-weak-random rule
 * CVE-2020-36732: crypto-js weak PRNG
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCryptojsWeakRandom } from './index';

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

describe('no-cryptojs-weak-random', () => {
  ruleTester.run('no-cryptojs-weak-random', noCryptojsWeakRandom, {
    valid: [
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
      { code: 'crypto.randomBytes(32);' },
      { code: 'crypto.getRandomValues(new Uint8Array(32));' },
      { code: 'SomeLib.random();' },
    ],
    invalid: [
      // The script-tag case: `CryptoJS` is an undeclared global and the full
      // three-segment API path is the evidence.
      {
        code: 'CryptoJS.lib.WordArray.random(16);',
        errors: [{ messageId: 'weakRandom' }],
      },
      {
        code: 'import CryptoJS from "crypto-js"; CryptoJS.lib.WordArray.random(16);',
        errors: [{ messageId: 'weakRandom' }],
      },
    ],
  });

  /**
   * ⚠️ RETIRED LOCK TESTS — these two used to sit in `invalid` above and
   * asserted the defect as correct behaviour:
   *
   * ```js
   * 'WordArray.random(16);'   // any identifier spelled WordArray
   * 'CryptoJS.random(16);'    // any identifier spelled CryptoJS, and `random`
   *                           // is not even a top-level crypto-js export
   * ```
   *
   * Neither carries a single piece of evidence that crypto-js is involved —
   * they are name matches, the defect class CLAUDE.md opens with. The corpus at
   * `benchmarks/rule-corpus/node-security__no-cryptojs-weak-random` found the
   * three shapes they made unfixable, all of them ordinary code in a repo that
   * is REMOVING crypto-js: a local `class WordArray` shim over
   * `crypto.randomBytes`, a local `const CryptoJS = { random: … }` facade, and
   * an unrelated `WordArray` imported from a passphrase wordlist.
   *
   * They are now `valid`, and each one fails on the pre-fix rule.
   */
  ruleTester.run('no-cryptojs-weak-random — evidence, not spelling', noCryptojsWeakRandom, {
    valid: [
      // Bare `WordArray.random()` with no crypto-js anywhere: a name and nothing else.
      { code: 'WordArray.random(16);' },
      // `random` is not a top-level crypto-js export in any version.
      { code: 'CryptoJS.random(16);' },
      // A local class wearing the library's name, backed by the platform CSPRNG.
      {
        code: [
          'import { randomBytes } from "node:crypto";',
          'class WordArray { static random(n) { return randomBytes(n); } }',
          'export const salt = () => WordArray.random(16);',
        ].join('\n'),
      },
      // A local facade with the EXACT lib.WordArray.random shape.
      {
        code: [
          'import { randomBytes } from "node:crypto";',
          'const CryptoJS = { lib: { WordArray: { random: (n) => randomBytes(n) } } };',
          'export const salt = () => CryptoJS.lib.WordArray.random(16);',
        ].join('\n'),
      },
      // A WordArray that is somebody else's module.
      {
        code: 'import { WordArray } from "./eff-wordlist";\nexport const w = () => WordArray.random();',
      },
      // The real crypto-js WordArray, but `create` — not the generator CVE-2020-36732 is about.
      {
        code: 'import CryptoJS from "crypto-js";\nexport const w = (b) => CryptoJS.lib.WordArray.create(b);',
      },
      // A computed key that cannot be resolved proves nothing either way.
      {
        code: 'import CryptoJS from "crypto-js";\nlet m = pick();\nexport const w = () => CryptoJS.lib.WordArray[m](8);',
      },
      // A member chain through a private field names no module export.
      {
        code: 'export class F { #rng; constructor(r) { this.#rng = r; } id() { return this.#rng.random(16); } }',
      },
      // The root of the chain is a call, not a name we can resolve.
      { code: 'getCrypto().lib.WordArray.random(16);' },
    ],
    invalid: [
      // FN lock: the generator extracted to a local name — one `const` between
      // the crypto-js API and the call. Quiet on the pre-fix rule.
      {
        code: [
          'import CryptoJS from "crypto-js";',
          'const randomWords = CryptoJS.lib.WordArray.random;',
          'export const seed = () => randomWords(20);',
        ].join('\n'),
        errors: [{ messageId: 'weakRandom' }],
      },
      // FN lock: `random` destructured straight off WordArray.
      {
        code: [
          'const { lib } = require("crypto-js");',
          'const { random } = lib.WordArray;',
          'export const nonce = () => random(12);',
        ].join('\n'),
        errors: [{ messageId: 'weakRandom' }],
      },
      // FN lock: a computed hop with a resolvable constant key.
      {
        code: [
          'import CryptoJS from "crypto-js";',
          'const METHOD = "random";',
          'export const c = () => CryptoJS.lib.WordArray[METHOD](8);',
        ].join('\n'),
        errors: [{ messageId: 'weakRandom' }],
      },
      // Inline computed key.
      {
        code: 'import CryptoJS from "crypto-js";\nexport const c = () => CryptoJS.lib["WordArray"].random(24);',
        errors: [{ messageId: 'weakRandom' }],
      },
      // The package's own subpath entry is the same package.
      {
        code: 'import { lib } from "crypto-js/core";\nexport const c = () => lib.WordArray.random(9);',
        errors: [{ messageId: 'weakRandom' }],
      },
      // Aliased namespace import — nothing in the chain is spelled CryptoJS.
      {
        code: 'import { lib as cjs } from "crypto-js";\nexport const k = () => cjs.WordArray.random(48);',
        errors: [{ messageId: 'weakRandom' }],
      },
      // Two `const` hops between the require and the call.
      {
        code: [
          'const cjs = require("crypto-js");',
          'const wa = cjs.lib.WordArray;',
          'exports.salt = () => wa.random(16);',
        ].join('\n'),
        errors: [{ messageId: 'weakRandom' }],
      },
      // The whole chain inline off the require call.
      {
        code: 'const salt = require("crypto-js").lib.WordArray.random(16);',
        errors: [{ messageId: 'weakRandom' }],
      },
    ],
  });
});
