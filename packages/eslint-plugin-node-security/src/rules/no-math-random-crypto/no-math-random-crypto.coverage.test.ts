/**
 * Coverage-gap tests for no-math-random-crypto.
 * Layer 1: every isCryptoContext ancestor branch — crypto-named function
 * declarations, property assignments, computed keys, destructuring, arrow
 * and named-function-expression returns.
 * Layer 2: a ReturnStatement with no containing function (parser-unreachable)
 * via createWithMockContext from @interlace/eslint-devkit.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noMathRandomCrypto } from './index';

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

describe('no-math-random-crypto coverage gaps', () => {
  ruleTester.run('no-math-random-crypto', noMathRandomCrypto, {
    valid: [
      // The secure sibling stays silent.
      'import crypto from "crypto"; export const t = () => crypto.randomBytes(16);',
      'import { randomBytes } from "crypto"; export const t = () => randomBytes(16);',

      // Assignment with a plain identifier LHS → member check false
      { code: 'result = Math.random();' },
      // Assignment to a computed (Literal) property → property-type operand false
      { code: "obj['count'] = Math.random();" },
      // Assignment to a non-crypto property name → pattern test false
      { code: 'obj.count = Math.random();' },
      // Computed object key → Property key is not an Identifier
      { code: "const cfg = { ['x']: Math.random() };" },
      // Non-crypto object key → pattern test false
      { code: 'const cfg = { count: Math.random() };' },
      // Destructuring declarator ancestor → declarator id is not an Identifier
      { code: 'const { a } = { a: Math.random() };' },
      // Return inside an arrow function → not a (named) declaration/expression
      { code: 'const f = () => { return Math.random(); };' },
      // Return inside a NAMED function expression with a non-crypto name
      { code: 'const v = function plain() { return Math.random(); };' },
    ],
    invalid: [
      // crypto.pseudoRandomBytes — eslint-plugin-security has detected this since
      // 2016 and nothing here did. Unconditional: unlike Math.random, which has
      // legitimate uses and so gates on surrounding names, this API has exactly
      // one meaning and was deprecated in Node 4 for being mistaken for the
      // secure one.
      {
        code: 'import crypto from "crypto"; export const t = () => crypto.pseudoRandomBytes(16);',
        errors: [{ messageId: 'pseudoRandomBytes' }],
      },

      // Crypto-named FunctionDeclaration ancestor → reported
      {
        code: 'function generateToken() { const x = Math.random(); }',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      // Assignment to a crypto-named property → reported
      {
        code: 'session.token = Math.random();',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      // Return inside a crypto-named function expression → reported
      {
        code: 'const gen = function generateToken() { return Math.random(); };',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
    ],
  });

  /**
   * Regression locks from the CWE-338 rule corpus
   * (benchmarks/rule-corpus/node-security__no-math-random-crypto).
   *
   * Every case below FAILS on the rule as it stood before that corpus ran:
   * the corpus scored 72.7% F1 with six false negatives and three false
   * positives, all of them in this block.
   */
  describe('rule-corpus regressions', () => {
    ruleTester.run('no-math-random-crypto', noMathRandomCrypto, {
      valid: [
        // FP: a value measured in time is a schedule, not a credential.
        { code: 'const authRetryDelay = 200 + Math.random() * 200;' },
        { code: 'const tokenRefreshDelay = BASE + Math.random() * 300000;' },
        // FP: a quantity is not a credential.
        { code: 'const tokenCount = Math.floor(200 + Math.random() * 1800);' },
        // FP: `code` and `key` in their ordinary English sense.
        {
          code: 'const httpCode = CODES[Math.floor(Math.random() * CODES.length)];',
        },
        { code: 'const cacheKey = `_=${Math.floor(Math.random() * 1e9)}`;' },
        // …but the qualifier must be present to neutralise them.
        { code: 'const shard = Math.floor(Math.random() * 8);' },
        // The forward binding hop must fire on what the value BECOMES, not on
        // the fact that it was relayed.
        {
          code: `function scheduleCompaction(run) {
  const raw = Math.random();
  const scaled = raw * 300000;
  return setTimeout(run, 60000 + scaled);
}`,
        },
        // Bindings resolve through the scope chain, not a file-wide name map:
        // the `raw` that becomes a token is a different variable.
        {
          code: `function mintToken() {
  const raw = randomBytes(24).toString('base64url');
  const sessionToken = raw;
  return sessionToken;
}
function pickShard(shards) {
  const raw = Math.random();
  return Math.floor(raw * shards);
}`,
        },
        // A reassigned alias proves nothing about the value at the call site.
        {
          code: `let rand = Math.random;
rand = injectedRng;
const apiKey = rand().toString(36);`,
        },
        // Aliasing shapes that are NOT Math.random.
        { code: 'const { floor } = Math; const token = floor(1.5);' },
        { code: 'const { random } = Chance; const token = random();' },
        { code: 'const { ["random"]: r } = Math; const token = r();' },
        { code: 'const { random: r } = Math; const token = other();' },
        { code: 'const { "floor": f } = Math; const token = f(1);' },
        { code: 'const { random: { z } } = Math; const token = z();' },
        { code: 'const [first] = Math.things; const token = first();' },
        {
          code: 'const rng = { next: crypto.randomInt }; const token = rng.next();',
        },
        { code: 'const rng = makeRng(); const token = rng.next();' },
        {
          code: 'const rng = { next: Math.random }; const token = rng.other();',
        },
        {
          code: 'const rng = { ["next"]: Math.random }; const token = rng.next();',
        },
        {
          code: 'const rng = { next: Math.random }; const token = rng["next"]();',
        },
        { code: 'const token = Math["floor"](1.5);' },
        { code: 'const token = Math[keyName]();' },
        { code: 'const token = Maths.random();' },
        { code: 'const token = obj.thing.random();' },
        { code: 'function random() {} const token = random();' },
        { code: 'const token = unresolvedRandom();' },
        // Past the two-hop budget on the forward walk.
        {
          code: `function far() {
  const a = Math.random();
  const b = a;
  const c = b;
  const d = c;
  const sessionToken = d;
  return sessionToken;
}`,
        },
      ],
      invalid: [
        // FN: the credential reaches the sink through one intermediate const.
        {
          code: `const raw = Math.random().toString(36).slice(2);
const apiKey = \`sk_live_\${raw}\`;`,
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // FN: the FunctionDeclaration arm only tested CRYPTO_FUNCTION_PATTERNS,
        // so a crypto-NAMED helper was silent unless the draw sat directly
        // under its `return`.
        {
          code: `function makeSessionToken() {
  const raw = Math.random().toString(36).slice(2);
  return raw;
}`,
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // FN: three named locals between the draw and the word "token".
        {
          code: `function newDownloadGrant(fileId) {
  const draw = Math.random();
  const encoded = draw.toString(36).slice(2);
  const grantToken = \`\${fileId}.\${encoded}\`;
  return grantToken;
}`,
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // FN: `Math['random']()` — same PRNG, different callee node type.
        {
          code: "const deviceToken = Math['random']().toString(36).slice(2);",
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // FN: `const { random } = Math`, with a sibling binding declared first
        // so the pattern scan has to skip a non-matching property.
        {
          code: 'const { floor, random } = Math; const csrfToken = floor(random() * 1e9);',
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // …and its string-keyed spelling.
        {
          code: 'const { "random": draw } = Math; const csrfToken = draw().toString(36);',
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // FN: a local binding wearing a trusted name.
        {
          code: 'const secureRandom = Math.random; const apiKey = secureRandom().toString(36);',
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // …and the `var` spelling, which is stable for the same reason.
        {
          code: 'var secureRandom = Math.random; var apiKey = secureRandom().toString(36);',
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // FN: the "pluggable RNG" object with exactly one implementation.
        {
          code: `const rng = { next: Math.random };
const recoveryCode = rng.next().toString(36).slice(2, 10);`,
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // The long-substring path of the base name test survives the
        // qualifier subtraction (no whole crypto word is present here).
        {
          code: 'const passwordish = Math.random().toString(36);',
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // A strong word alongside a neutralisable one still reports.
        {
          code: 'const authCode = Math.floor(Math.random() * 1e6);',
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
      ],
    });
  });

  describe('Layer 2: return statement with no containing function', () => {
    it('treats a floating ReturnStatement ancestor as non-crypto context', () => {
      const { listeners, reports } = createWithMockContext(
        noMathRandomCrypto as never,
      );
      const ret: { type: string; parent?: unknown; argument?: unknown } = {
        type: 'ReturnStatement',
        parent: undefined,
      };
      const node = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'Math' },
          property: { type: 'Identifier', name: 'random' },
        },
        arguments: [],
        parent: ret,
      };
      ret.argument = node;

      (listeners.CallExpression as (n: unknown) => void)(node);
      expect(reports).toHaveLength(0);
    });

    it('treats an unresolvable declarator binding as non-crypto context', () => {
      // The forward binding walk asks the scope analyser what `raw` is. With
      // no scope to answer — the mock context's stub — the answer must be
      // "no evidence", not a crash and not a report.
      const { listeners, reports } = createWithMockContext(
        noMathRandomCrypto as never,
      );
      const declarator: Record<string, unknown> = {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'raw' },
        parent: undefined,
      };
      const node = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          computed: false,
          object: { type: 'Identifier', name: 'Math' },
          property: { type: 'Identifier', name: 'random' },
        },
        arguments: [],
        parent: declarator,
      };
      declarator.init = node;

      (listeners.CallExpression as (n: unknown) => void)(node);
      expect(reports).toHaveLength(0);
    });
  });
});
