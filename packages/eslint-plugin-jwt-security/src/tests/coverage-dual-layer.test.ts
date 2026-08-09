/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage tests — closes the remaining uncovered branches.
 *
 * Layer 1: RuleTester fixtures through the real parser.
 * Layer 2: raw unit tests — helpers called as plain functions, plus
 *          createWithMockContext (from @interlace/eslint-devkit) invoking
 *          rule listeners directly with synthetic AST nodes for
 *          parser-unreachable branches.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESTree } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noAlgorithmConfusion } from '../rules/no-algorithm-confusion';
import { noAlgorithmNone } from '../rules/no-algorithm-none';
import { noDecodeWithoutVerify } from '../rules/no-decode-without-verify';
import { noHardcodedSecret } from '../rules/no-hardcoded-secret';
import { noSensitivePayload } from '../rules/no-sensitive-payload';
import { noWeakSecret } from '../rules/no-weak-secret';
import { extractAlgorithms } from '../utils';

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

// ---------------------------------------------------------------------------
// Layer 1 — no-algorithm-confusion: property-loop guards (spread + computed
// key before the `algorithms` entry) still land the report on the right node.
// ---------------------------------------------------------------------------
describe('coverage: no-algorithm-confusion property-loop guards', () => {
  ruleTester.run('spread and computed props before algorithms', noAlgorithmConfusion, {
    valid: [],
    invalid: [
      {
        // SpreadElement (prop.type !== 'Property') and computed key
        // (prop.key.type !== 'Identifier') are skipped; the report fires on
        // the `algorithms` property value.
        code: `jwt.verify(token, publicKey, { ...baseOpts, ['audit']: true, algorithms: ['HS256'] });`,
        errors: [{ messageId: 'algorithmConfusion' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Layer 1 — no-algorithm-none: the isDecodeCall() detector.
// ---------------------------------------------------------------------------
describe('coverage: no-algorithm-none decode detection', () => {
  ruleTester.run('isDecodeCall branches', noAlgorithmNone, {
    valid: [
      // object name is neither `jwt` nor `jsonwebtoken` -> not a decode call
      { code: `myParser.decode(data);` },
      // callee object is itself a MemberExpression -> returns false
      { code: `api.jwt.decode(token);` },
      // computed property (Literal, not Identifier) -> returns false
      { code: `jwt["decode"](token);` },
    ],
    invalid: [
      // jwt.decode() is flagged as equivalent to algorithm:"none"
      {
        code: `jwt.decode(token);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      // jsonwebtoken.decode() — second operand of the name check
      {
        code: `jsonwebtoken.decode(token);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Layer 1 — no-decode-without-verify: safe-annotation suppression (previously
// hidden behind c8-ignore; a plain leading comment through the real parser
// exercises hasSafeAnnotation for both the jwt.decode and jwt_decode paths).
// ---------------------------------------------------------------------------
describe('coverage: no-decode-without-verify safe annotations', () => {
  ruleTester.run('trusted annotations suppress the report', noDecodeWithoutVerify, {
    valid: [
      {
        // custom trustedAnnotations option suppresses the jwt.decode report
        code: `// @decoded-header-only
const header = jwt.decode(token);`,
        options: [{ trustedAnnotations: ['@decoded-header-only'] }],
      },
      {
        // built-in devkit SAFE_ANNOTATIONS ('@verified') suppresses jwt_decode
        code: `/* @verified-separately */
const payload = jwt_decode(token);`,
      },
    ],
    invalid: [
      // Unrelated leading comment does NOT suppress — annotation walk runs
      // and falls through to the report.
      {
        code: `// TODO: refactor later
const payload = jwt.decode(token);`,
        errors: [{ messageId: 'decodeWithoutVerify' }],
      },
      {
        code: `// just a note
const payload = jwt_decode(token);`,
        errors: [{ messageId: 'jwtDecodeLibrary' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Layer 1 — no-hardcoded-secret: resolveConstLiteralValue() through the real
// scope manager.
// ---------------------------------------------------------------------------
describe('coverage: no-hardcoded-secret const-literal resolution', () => {
  ruleTester.run('single-frame const indirection', noHardcodedSecret, {
    valid: [
      // `let` binding is never resolved (kind !== 'const') -> treated safe
      { code: `let MUTABLE_SECRET = 'abc'; jwt.sign(payload, MUTABLE_SECRET);` },
      // function parameter: def.type is 'Parameter', not 'Variable' -> safe
      { code: `function issue(SECRET) { return jwt.sign(payload, SECRET); }` },
      // unresolved global identifier: no def at all -> safe
      { code: `jwt.sign(payload, GLOBAL_SECRET);` },
      // for-of const has no initializer: `def.node.init ?? null` -> null -> safe
      { code: `for (const SECRET of secretList) { jwt.sign(payload, SECRET); }` },
      // const resolved to a non-literal initializer (call) -> safe
      { code: `const KEY = loadKey(); jwt.sign(payload, KEY);` },
      // non-identifier, non-literal secret arg: resolveConstLiteralValue()
      // gets a non-Identifier node via isHardcodedStringOrResolvedConst -> null
      { code: `jwt.sign(payload, [42]);` },
    ],
    invalid: [
      // const-hidden string literal is resolved and flagged
      {
        code: `const SECRET = 'my-hardcoded-secret'; jwt.sign(payload, SECRET);`,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      // const-hidden expressionless template literal is resolved and flagged
      {
        code: 'const SECRET = `template-secret`; jwt.sign(payload, SECRET);',
        errors: [{ messageId: 'hardcodedSecret' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Layer 1 — no-sensitive-payload: property-loop guards.
// ---------------------------------------------------------------------------
describe('coverage: no-sensitive-payload property-loop guards', () => {
  ruleTester.run('spread and non-identifier keys are skipped', noSensitivePayload, {
    valid: [
      // SpreadElement (prop.type !== 'Property') and string-literal key
      // (prop.key.type !== 'Identifier') are both skipped without reporting.
      {
        code: `jwt.sign({ ...claims, 'display-name': name, role: 'admin' }, process.env.JWT_SECRET);`,
      },
    ],
    invalid: [],
  });
});

// ---------------------------------------------------------------------------
// Layer 1 — no-weak-secret: template-literal arms + missing-secret guard.
// ---------------------------------------------------------------------------
describe('coverage: no-weak-secret template literals and arg guard', () => {
  ruleTester.run('template secret arms', noWeakSecret, {
    valid: [
      // sign() with a single argument: secret check is skipped entirely
      { code: `jwt.sign(payload);` },
      // strong 34-char template literal: neither weak pattern nor short
      { code: 'jwt.sign(payload, `ThisIsAVeryStrongSecretThatIs32Ch+`);' },
    ],
    invalid: [
      // known weak pattern in a template literal (left arm true)
      {
        code: 'jwt.sign(payload, `secret`);',
        errors: [{ messageId: 'weakSecret' }],
      },
      // short but not a known pattern (left arm false, right arm true)
      {
        code: 'jwt.sign(payload, `xy9z`);',
        errors: [{ messageId: 'weakSecret' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Layer 2 — utils.extractAlgorithms: sparse-array holes and non-string
// elements inside the algorithms array are skipped.
// ---------------------------------------------------------------------------
describe('coverage (unit): extractAlgorithms skips holes and non-strings', () => {
  it('ignores null elements and non-string literals', () => {
    const optionsNode = {
      type: 'ObjectExpression',
      properties: [
        {
          type: 'Property',
          key: { type: 'Identifier', name: 'algorithms' },
          value: {
            type: 'ArrayExpression',
            elements: [
              null, // sparse-array hole
              { type: 'Literal', value: 42 }, // non-string literal
              { type: 'Literal', value: 'RS256' },
            ],
          },
        },
      ],
    } as unknown as TSESTree.ObjectExpression;

    expect(extractAlgorithms(optionsNode)).toEqual(['RS256']);
  });
});

// ---------------------------------------------------------------------------
// Layer 2 — no-hardcoded-secret: parser-unreachable guards inside
// resolveConstLiteralValue(). A real ESLint context always exposes
// sourceCode.getScope, and a scope-manager 'Variable' def always hangs off a
// VariableDeclaration parent — these defensive branches need a mock context
// and synthetic scope objects.
// ---------------------------------------------------------------------------
describe('coverage (unit): no-hardcoded-secret defensive scope guards', () => {
  const makeSignCall = (
    secretArg: Record<string, unknown>,
  ): TSESTree.CallExpression =>
    ({
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'jwt' },
        property: { type: 'Identifier', name: 'sign' },
        computed: false,
      },
      arguments: [{ type: 'ObjectExpression', properties: [] }, secretArg],
    }) as unknown as TSESTree.CallExpression;

  it('treats the secret as unresolvable when sourceCode.getScope is absent', () => {
    const { listeners, reports, context } = createWithMockContext(noHardcodedSecret);
    (context.sourceCode as { getScope?: unknown }).getScope = undefined;

    const secretId = { type: 'Identifier', name: 'SECRET' };
    (listeners.CallExpression as (n: TSESTree.CallExpression) => void)(
      makeSignCall(secretId),
    );

    // getScope?.() -> undefined -> ?? null -> early null: identifier cannot
    // be resolved to a literal, so it is treated as a safe key source.
    expect(reports).toHaveLength(0);
  });

  it('returns null when the resolved def has no parent declaration', () => {
    const { listeners, reports, context } = createWithMockContext(noHardcodedSecret);
    const secretId = { type: 'Identifier', name: 'SECRET' };
    const scope = {
      variables: [],
      childScopes: [],
      references: [
        {
          identifier: secretId,
          resolved: {
            defs: [{ type: 'Variable', parent: undefined, node: {} }],
          },
        },
      ],
    };
    (context.sourceCode as { getScope?: unknown }).getScope = () => scope;

    (listeners.CallExpression as (n: TSESTree.CallExpression) => void)(
      makeSignCall(secretId),
    );

    // decl?.type is undefined -> not a VariableDeclaration -> null -> safe.
    expect(reports).toHaveLength(0);
  });

  it('returns null when the def parent is not a VariableDeclaration', () => {
    const { listeners, reports, context } = createWithMockContext(noHardcodedSecret);
    const secretId = { type: 'Identifier', name: 'SECRET' };
    const scope = {
      variables: [],
      childScopes: [],
      references: [
        {
          identifier: secretId,
          resolved: {
            defs: [
              {
                type: 'Variable',
                parent: { type: 'ExpressionStatement' },
                node: { init: { type: 'Literal', value: 'x' } },
              },
            ],
          },
        },
      ],
    };
    (context.sourceCode as { getScope?: unknown }).getScope = () => scope;

    (listeners.CallExpression as (n: TSESTree.CallExpression) => void)(
      makeSignCall(secretId),
    );

    // parent.type mismatch -> null -> identifier treated as safe key source.
    expect(reports).toHaveLength(0);
  });
});
