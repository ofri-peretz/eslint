import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDynamicAlgorithmSelection } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-dynamic-algorithm-selection', () => {
  ruleTester.run('no-dynamic-algorithm-selection', noDynamicAlgorithmSelection, {
    valid: [
      { code: 'crypto.createHash("sha256")' },
      { code: 'crypto.createHmac("sha512", secret)' },
      { code: 'crypto.createCipheriv("aes-256-gcm", key, iv)' },
      { code: 'crypto.createSign("RSA-SHA256")' },
      { code: 'crypto.createHash(`sha256`)' },  // static template literal
      // Not 'crypto' object — not checked
      { code: 'customCrypto.createHash(algo)' },
      // Different method — not checked
      { code: 'crypto.randomBytes(32)' },
    ],
    invalid: [
      {
        code: 'crypto.createHash(userAlgorithm)',
        errors: [{ messageId: 'dynamicAlgorithm', data: { method: 'createHash' } }],
      },
      {
        code: 'crypto.createHash(req.query.algo)',
        errors: [{ messageId: 'dynamicAlgorithm', data: { method: 'createHash' } }],
      },
      {
        code: 'crypto.createCipheriv(config.algorithm, key, iv)',
        errors: [{ messageId: 'dynamicAlgorithm', data: { method: 'createCipheriv' } }],
      },
      {
        code: 'crypto.createHmac(`${userChoice}`, secret)',
        errors: [{ messageId: 'dynamicAlgorithm', data: { method: 'createHmac' } }],
      },
      {
        code: 'crypto.createSign(req.body.signAlgo)',
        errors: [{ messageId: 'dynamicAlgorithm', data: { method: 'createSign' } }],
      },
    ],
  });

  // ── FP lock: a parameter default nobody overrides ──────────────────────
  //
  // Corpus: Shopify/cli `packages/eslint-plugin-cli/rules/no-inline-graphql.js:44`
  //   function hashFileSync(filePath, algorithm = 'sha256') {
  //     const hash = crypto.createHash(algorithm)
  //   }
  //   … hashFileSync(filePath)   ← the only call site, one argument
  //
  // Reported at HIGH as an algorithm-downgrade attack on a value no caller
  // supplies. The old predicate was "is the first argument spelled as a string
  // literal", so every case below reported.
  describe('Constant Folding', () => {
    ruleTester.run('resolved algorithm names', noDynamicAlgorithmSelection, {
      valid: [
        // The corpus shape.
        `function hashFileSync(filePath, algorithm = 'sha256') {
           const hash = crypto.createHash(algorithm)
           return hash.digest('hex')
         }
         function check(p) { return hashFileSync(p) }`,
        // A folded `const` reaches the same conclusion by the other route.
        "const ALGO = 'sha256'; crypto.createHash(ALGO);",
        "const ALGO = cond ? 'sha256' : 'sha512'; crypto.createHash(ALGO);",
        // Never called at all: no call site can override the default.
        "function h(a = 'sha256') { return crypto.createHash(a) }",
      ],
      invalid: [
        // A call site DOES pass the argument — the parameter is now the
        // caller's choice, and this is exactly the FN the fix must not create.
        {
          code:
            "function h(p, a = 'sha256') { return crypto.createHash(a) }\n" +
            'h(p, req.query.algo);',
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        // An exported helper: the callers are in other files.
        {
          code: "export function h(a = 'sha256') { return crypto.createHash(a) }",
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        {
          code: "export default function h(a = 'sha256') { return crypto.createHash(a) }",
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        // The name escapes as a value, so the argument list is not knowable.
        {
          code: "function h(a = 'sha256') { return crypto.createHash(a) }\nregister(h);",
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        // A parameter with no default at all.
        {
          code: 'function h(a) { return crypto.createHash(a) }\nh();',
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        // A default that is not a constant.
        {
          code: 'function h(a = readAlgo()) { return crypto.createHash(a) }\nh();',
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        // Not a function declaration: an arrow has no binding whose references
        // enumerate its call sites.
        {
          code: "const h = (a = 'sha256') => crypto.createHash(a);\nh();",
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        {
          code: "const o = { h(a = 'sha256') { return crypto.createHash(a) } };\no.h();",
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        // A destructured parameter has no plain identifier to match.
        {
          code: "function h({a} = {a: 'sha256'}) { return crypto.createHash(a) }\nh();",
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        // A spread argument is not a name to resolve.
        {
          code: 'crypto.createHash(...algos);',
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
        // A `let` binding is not a parameter and not a constant — the default
        // resolver has to say so rather than throw.
        {
          code: "let algo = 'sha256'; crypto.createHash(algo);",
          errors: [{ messageId: 'dynamicAlgorithm' }],
        },
      ],
    });
  });
});
