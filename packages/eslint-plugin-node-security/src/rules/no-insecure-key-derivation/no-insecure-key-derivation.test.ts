/**
 * Tests for no-insecure-key-derivation rule
 * CWE-916: PBKDF2 with insufficient iterations
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureKeyDerivation } from './index';

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

describe('no-insecure-key-derivation', () => {
  ruleTester.run('no-insecure-key-derivation', noInsecureKeyDerivation, {
    valid: [
      { name: '100,000', code: 'crypto.pbkdf2(password, salt, 100000, 32, "sha256", callback);' },
      { code: 'crypto.pbkdf2Sync(password, salt, 600000, 32, "sha256");' },
      { code: 'crypto.pbkdf2(password, salt, iterations, 32, "sha256", callback);' },
      { code: 'pbkdf2(password, salt, 100000, 32, "sha256", callback);' },
      { code: 'scrypt(password, salt, 64);' },
    ],
    invalid: [
      {
        name: '1,000 PBKDF2 iterations',
        code: 'crypto.pbkdf2(password, salt, 1000, 32, "sha256", callback);',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'crypto.pbkdf2(password, salt, 100000, 32, "sha256", callback);' },
        ] }],
      },
      {
        code: 'crypto.pbkdf2(password, salt, 10000, 32, "sha256", callback);',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'crypto.pbkdf2(password, salt, 100000, 32, "sha256", callback);' },
        ] }],
      },
      {
        code: 'crypto.pbkdf2Sync(password, salt, 5000, 32, "sha256");',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");' },
        ] }],
      },
      {
        code: 'pbkdf2(password, salt, 1000, 32, "sha256", callback);',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'pbkdf2(password, salt, 100000, 32, "sha256", callback);' },
        ] }],
      },
    ],
  });

  /**
   * FN lock — the iteration count held in a `const`.
   *
   * `const PBKDF2_ROUNDS = 1000` beside the function that uses it is the usual
   * spelling, and it was invisible: the check read `iterationsArg.type ===
   * 'Literal'`. Both invalid cases below are QUIET on the pre-fix rule.
   */
  ruleTester.run('no-insecure-key-derivation — iterations held in a const', noInsecureKeyDerivation, {
    valid: [
      // A const carrying a sufficient count must not start reporting.
      { code: 'const ROUNDS = 600000; crypto.pbkdf2(password, salt, ROUNDS, 32, "sha256", cb);' },
      // A `let` can be raised (or lowered) before the call.
      { code: 'let rounds = 1000; rounds = tune(); crypto.pbkdf2(password, salt, rounds, 32, "sha256", cb);' },
      // Fewer than three arguments — nothing in the iterations position.
      { code: 'crypto.pbkdf2Sync(password, salt);' },
    ],
    invalid: [
      {
        code: 'const PBKDF2_ROUNDS = 1000;\ncrypto.pbkdf2(password, salt, PBKDF2_ROUNDS, 32, "sha256", cb);',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'const PBKDF2_ROUNDS = 100000;\ncrypto.pbkdf2(password, salt, PBKDF2_ROUNDS, 32, "sha256", cb);' },
        ] }],
      },
      {
        code: 'const ROUNDS = 10000;\nconst key = pbkdf2Sync(password, salt, ROUNDS, 32, "sha512");',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'const ROUNDS = 100000;\nconst key = pbkdf2Sync(password, salt, ROUNDS, 32, "sha512");' },
        ] }],
      },
    ],
  });

  /**
   * Regression lock — the shapes the corpus at
   * `benchmarks/rule-corpus/node-security__no-insecure-key-derivation` proved
   * invisible. Before this the rule scored 5 TP / 10 FN on 15 vulnerable
   * fixtures: it saw only a literal (or a `const` literal) sitting at argument
   * index 2 of something spelled `pbkdf2`. Every `invalid` case below is QUIET
   * on the pre-fix rule.
   */
  ruleTester.run('no-insecure-key-derivation — the other spellings', noInsecureKeyDerivation, {
    valid: [
      // A promisified KDF that is not pbkdf2 — `64` is a key length.
      {
        code: [
          'import crypto from "node:crypto";',
          'import { promisify } from "node:util";',
          'const scryptAsync = promisify(crypto.scrypt);',
          'export const d = (p, s) => scryptAsync(p, s, 64);',
        ].join('\n'),
      },
      // deriveBits with a different algorithm: HKDF has no iteration count.
      {
        code: 'export const k = (m, salt, info) => subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, m, 256);',
      },
      // deriveBits whose parameter object is not one we can read.
      { code: 'export const k = (params, m) => subtle.deriveBits(params, m, 256);' },
      // deriveBits with no arguments at all.
      { code: 'subtle.deriveBits();' },
      // deriveBits whose algorithm name is not resolvable.
      { code: 'const n = pick();\nsubtle.deriveBits({ name: n, iterations: 1 }, m, 256);' },
      // PBKDF2 (crypto-js) at the floor, and with no options object.
      {
        code: 'import CryptoJS from "crypto-js";\nexport const d = (p, s) => CryptoJS.PBKDF2(p, s, { keySize: 8, iterations: 600000 });',
      },
      { code: 'import CryptoJS from "crypto-js";\nexport const d = (p, s) => CryptoJS.PBKDF2(p, s);' },
      { code: 'PBKDF2(p, s, { iterations: 600000 });' },
      // The config object carries both a small number and a large one; the rule
      // must read the key it was asked for.
      {
        code: [
          'import { pbkdf2Sync } from "node:crypto";',
          'const KDF = { iterations: 600000, keylen: 32, digest: "sha256" } as const;',
          'export const d = (p, s) => pbkdf2Sync(p, s, KDF.iterations, KDF.keylen, KDF.digest);',
        ].join('\n'),
      },
      // An object property that does not exist, and an object that is not a literal.
      {
        code: 'import { pbkdf2Sync } from "node:crypto";\nconst KDF = { keylen: 32 };\npbkdf2Sync(p, s, KDF.rounds, 32, "sha256");',
      },
      { code: 'import { pbkdf2Sync } from "node:crypto";\npbkdf2Sync(p, s, cfg.iterations, 32, "sha256");' },
      // A computed key that cannot be resolved.
      {
        code: 'import { pbkdf2Sync } from "node:crypto";\nconst KDF = { iterations: 1000 };\nlet k = pick();\npbkdf2Sync(p, s, KDF[k], 32, "sha256");',
      },
      // Arithmetic that folds ABOVE the floor, and an operator we do not fold.
      { code: 'const R = 600 * 1000;\ncrypto.pbkdf2Sync(p, s, R, 32, "sha256");' },
      { code: 'const R = 1000 % 7;\ncrypto.pbkdf2Sync(p, s, R, 32, "sha256");' },
      { code: 'const R = 700000 - 100000;\ncrypto.pbkdf2Sync(p, s, R, 32, "sha256");' },
      { code: 'const R = 2 ** 20;\ncrypto.pbkdf2Sync(p, s, R, 32, "sha256");' },
      { code: 'const R = 600000 + 1;\ncrypto.pbkdf2Sync(p, s, R, 32, "sha256");' },
      // A string in the iterations position is not a number.
      { code: 'crypto.pbkdf2Sync(p, s, "1000", 32, "sha256");' },
      // A `let` raised before the call — abstaining is the only defensible answer.
      {
        code: 'let rounds = 1000;\nrounds = 600000;\ncrypto.pbkdf2Sync(p, s, rounds, 32, "sha256");',
      },
      // Self-referential bindings must terminate rather than recurse forever.
      {
        code: 'import { promisify } from "node:util";\nconst kdf = promisify(kdf);\nkdf(p, s, 1000, 32, "sha256");',
      },
      { code: 'const R = R + 1;\ncrypto.pbkdf2Sync(p, s, R, 32, "sha256");' },
      // Arithmetic nested past the fold budget stays unresolved.
      { code: 'crypto.pbkdf2Sync(p, s, 1+1+1+1+1+1+1+1, 32, "sha256");' },
      // Expressions foldNumber has no arm for: a call, a `+` unary, a template.
      { code: 'crypto.pbkdf2Sync(p, s, computeRounds(), 32, "sha256");' },
      { code: 'crypto.pbkdf2Sync(p, s, +1000, 32, "sha256");' },
      // A member read off a const that is not an object.
      { code: 'const KDF = 5;\ncrypto.pbkdf2Sync(p, s, KDF.iterations, 32, "sha256");' },
      // A spread in the config object is not a key we can read.
      {
        code: 'const base = { iterations: 1000 };\nconst KDF = { ...base };\ncrypto.pbkdf2Sync(p, s, KDF.iterations, 32, "sha256");',
      },
      // A private field names no object key.
      {
        code: 'class V { #it = 1000; d(p, s) { return crypto.pbkdf2Sync(p, s, this.#it, 32, "sha256"); } }',
      },
      // A resolvable binding whose export is a different node:crypto function,
      // and one whose export path is empty (the module root called directly).
      { code: 'import { scryptSync } from "node:crypto";\nexport const d = (p, s) => scryptSync(p, s, 64);' },
      { code: 'import crypto from "node:crypto";\nexport const d = (p, s) => crypto(p, s, 1000, 32, "sha256");' },
      // A unary minus over something that does not fold.
      { code: 'crypto.pbkdf2Sync(p, s, -rounds, 32, "sha256");' },
      // promisify of something that is not a call, and with no arguments.
      { code: 'const f = notACall;\nf(p, s, 1000, 32, "sha256");' },
      { code: 'import { promisify } from "node:util";\nconst f = promisify();\nf(p, s, 1000, 32, "sha256");' },
    ],
    invalid: [
      // Promisified, aliased and inline.
      {
        code: [
          'import { pbkdf2 } from "node:crypto";',
          'import { promisify } from "node:util";',
          'const pbkdf2Async = promisify(pbkdf2);',
          'export const d = (p, s) => pbkdf2Async(p, s, 2048, 64, "sha512");',
        ].join('\n'),
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: [
            'import { pbkdf2 } from "node:crypto";',
            'import { promisify } from "node:util";',
            'const pbkdf2Async = promisify(pbkdf2);',
            'export const d = (p, s) => pbkdf2Async(p, s, 100000, 64, "sha512");',
          ].join('\n') },
        ] }],
      },
      {
        code: [
          'import crypto from "node:crypto";',
          'import util from "node:util";',
          'export const d = (p, s) => util.promisify(crypto.pbkdf2)(p, s, 4096, 32, "sha256");',
        ].join('\n'),
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: [
            'import crypto from "node:crypto";',
            'import util from "node:util";',
            'export const d = (p, s) => util.promisify(crypto.pbkdf2)(p, s, 100000, 32, "sha256");',
          ].join('\n') },
        ] }],
      },
      // Renamed at the import boundary.
      {
        code: [
          'import { pbkdf2Sync as deriveKeyMaterial } from "node:crypto";',
          'export const d = (p, s) => deriveKeyMaterial(p, s, 1200, 32, "sha256");',
        ].join('\n'),
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: [
            'import { pbkdf2Sync as deriveKeyMaterial } from "node:crypto";',
            'export const d = (p, s) => deriveKeyMaterial(p, s, 100000, 32, "sha256");',
          ].join('\n') },
        ] }],
      },
      // Bound to a local const.
      {
        code: [
          'import crypto from "node:crypto";',
          'const kdf = crypto.pbkdf2Sync;',
          'export const d = (p, s) => kdf(p, s, 8192, 64, "sha512");',
        ].join('\n'),
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: [
            'import crypto from "node:crypto";',
            'const kdf = crypto.pbkdf2Sync;',
            'export const d = (p, s) => kdf(p, s, 100000, 64, "sha512");',
          ].join('\n') },
        ] }],
      },
      // Arithmetic, and the fixer rewriting the expression rather than the use site.
      {
        code: 'const R = 10 * 1000;\ncrypto.pbkdf2Sync(p, s, R, 32, "sha256");',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'const R = 100000;\ncrypto.pbkdf2Sync(p, s, R, 32, "sha256");' },
        ] }],
      },
      {
        code: 'const R = 2 ** 12;\ncrypto.pbkdf2Sync(p, s, R, 32, "sha256");',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'const R = 100000;\ncrypto.pbkdf2Sync(p, s, R, 32, "sha256");' },
        ] }],
      },
      {
        code: 'crypto.pbkdf2Sync(p, s, 200 - 100, 32, "sha256");',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'crypto.pbkdf2Sync(p, s, 100000, 32, "sha256");' },
        ] }],
      },
      {
        code: 'crypto.pbkdf2Sync(p, s, 500 + 500, 32, "sha256");',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'crypto.pbkdf2Sync(p, s, 100000, 32, "sha256");' },
        ] }],
      },
      // A TypeScript cast in the iterations position is erased at compile time.
      {
        code: 'crypto.pbkdf2Sync(p, s, 1000 as number, 32, "sha256");',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'crypto.pbkdf2Sync(p, s, 100000 as number, 32, "sha256");' },
        ] }],
      },
      {
        code: 'crypto.pbkdf2Sync(p, s, -1, 32, "sha256");',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'crypto.pbkdf2Sync(p, s, 100000, 32, "sha256");' },
        ] }],
      },
      // The count read out of a config object, plain and `as const`.
      {
        code: [
          'import { pbkdf2Sync } from "node:crypto";',
          'const KDF = { iterations: 1000, keylen: 64 } as const;',
          'export const d = (p, s) => pbkdf2Sync(p, s, KDF.iterations, KDF.keylen, "sha512");',
        ].join('\n'),
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: [
            'import { pbkdf2Sync } from "node:crypto";',
            'const KDF = { iterations: 100000, keylen: 64 } as const;',
            'export const d = (p, s) => pbkdf2Sync(p, s, KDF.iterations, KDF.keylen, "sha512");',
          ].join('\n') },
        ] }],
      },
      {
        code: 'const KDF = { "iterations": 1000 };\ncrypto.pbkdf2Sync(p, s, KDF["iterations"], 32, "sha256");',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'const KDF = { "iterations": 100000 };\ncrypto.pbkdf2Sync(p, s, KDF["iterations"], 32, "sha256");' },
        ] }],
      },
      // Web Crypto, inline and with the parameter object hoisted.
      {
        code: 'subtle.deriveBits({ name: "PBKDF2", salt, iterations: 1000, hash: "SHA-256" }, m, 256);',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, m, 256);' },
        ] }],
      },
      {
        code: [
          'const PARAMS = { name: "PBKDF2", salt, iterations: 1000, hash: "SHA-256" };',
          'subtle.deriveKey(PARAMS, m, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);',
        ].join('\n'),
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: [
            'const PARAMS = { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" };',
            'subtle.deriveKey(PARAMS, m, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);',
          ].join('\n') },
        ] }],
      },
      // crypto-js's options-object spelling.
      {
        code: 'import CryptoJS from "crypto-js";\nexport const d = (p, s) => CryptoJS.PBKDF2(p, s, { keySize: 8, iterations: 1000 });',
        errors: [{ messageId: 'insufficientIterations', suggestions: [
          { messageId: 'useMinIterations', output: 'import CryptoJS from "crypto-js";\nexport const d = (p, s) => CryptoJS.PBKDF2(p, s, { keySize: 8, iterations: 100000 });' },
        ] }],
      },
    ],
  });

  /**
   * `minIterations` — the option the ledger flagged as never set by any test,
   * so its comparison branch shipped unexecuted.
   *
   * 310,000 is the OWASP 2023 floor for PBKDF2-SHA256 and clears the rule's own
   * 100,000 default, so the FIRST case proves the default stays quiet and the
   * second proves the option changes the verdict on the same source. A case
   * that reported either way would execute the line without proving the option
   * does anything.
   */
  ruleTester.run('no-insecure-key-derivation — minIterations', noInsecureKeyDerivation, {
    valid: [
      { code: 'crypto.pbkdf2(password, salt, 310000, 32, "sha256", cb);' },
    ],
    invalid: [
      {
        code: 'crypto.pbkdf2(password, salt, 310000, 32, "sha256", cb);',
        options: [{ minIterations: 600000 }],
        errors: [{
          messageId: 'insufficientIterations',
          suggestions: [
            { messageId: 'useMinIterations', output: 'crypto.pbkdf2(password, salt, 600000, 32, "sha256", cb);' },
          ],
        }],
      },
    ],
  });
});
