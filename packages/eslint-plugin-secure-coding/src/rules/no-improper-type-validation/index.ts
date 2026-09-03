/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-improper-type-validation
 * Detects improper type validation in user input handling (CWE-1287)
 *
 * Improper type validation can lead to security vulnerabilities when
 * user input is not properly validated, allowing attackers to bypass
 * security checks or cause unexpected behavior.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe type checking patterns
 * - TypeScript type guards
 * - Proper validation functions
 * - JSDoc annotations (@validated, @type-checked)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, propertyName } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

/**
 * `improperTypeValidation` and `missingNullCheck` used to be declared here too.
 *
 * `improperTypeValidation` had two emitters. One fired on `if (userInput)` when the
 * identifier's spelling contained `req`/`body`/`data`/`input`/`query`/`params` — so
 * `if (metadata)` reported, because "metadata" contains "data", and a truthiness
 * check on anything else did not. The other required a CallExpression whose callee is
 * an Identifier named `typeof`, which no JavaScript program can produce: `typeof` is a
 * keyword and `typeof(x)` parses as a UnaryExpression. That branch was unreachable by
 * construction.
 *
 * `missingNullCheck` fired on `if (x != null)` — the idiomatic nullish test, and the
 * remediation this rule's own `unsafeTypeofCheck` message prescribes.
 */
type MessageIds =
  | 'unsafeTypeofCheck'
  | 'unsafeInstanceofUsage'
  | 'looseEqualityTypeCheck'
  | 'unreliableConstructorCheck';

/**
 * `safeTypeCheckFunctions` (default `['isArray', 'isString', 'isNumber',
 * 'isObject', 'validateType', 'checkType']`) used to be declared here and in
 * `meta.schema`, and was never read by `create()`. It looked like the
 * allowlist a consumer would use to teach the rule about their own type
 * guards; it did nothing.
 */
/**
 * `userInputVariables` (default `['req','request','body','query','params','input',
 * 'data','userInput']`) used to be declared here and in `meta.schema`. It was the sole
 * input to `isUserInput`, which asked `userInputVariables.some(w => varName.includes(w))`
 * — a substring match on a spelling, in a REPORTING path, which CLAUDE.md forbids.
 * It decided the verdict for every message this rule emits: `metadata` was user input
 * (it contains "data"), `req.body.profile` was not (its object is a MemberExpression,
 * not a bare identifier), and renaming a variable turned a real finding off. Nothing
 * replaced it, because the hazards this rule reports are properties of the OPERATOR,
 * not of where the value came from: `typeof x === 'object'` admits null whoever wrote
 * x, and `a == b` coerces whoever wrote a.
 */
export interface Options extends SecurityRuleOptions {
  /** Whether to allow instanceof in same-realm contexts */
  allowInstanceofSameRealm?: boolean;
  /**
   * Report `==`/`!=` whose operands are not provably the same primitive type.
   *
   * On by default; set false to keep the three structural arms
   * (`unsafeTypeofCheck`, `unsafeInstanceofUsage`, `unreliableConstructorCheck`)
   * without this one.
   *
   * The type juggling this targets is real — `'0e0' == 0` is true, so
   * `req.body.otp == storedOtp` is an authentication bypass. But telling it apart
   * from `config.port != 636` requires knowing where the value came from, and this
   * plugin does not do data-flow: statically only literals have a provable type. So
   * the arm fires on loose equality broadly — 126 findings across 78 KLOC of
   * well-maintained repositories, the single largest source of findings in the
   * `strict` preset.
   *
   * That volume is why the rule does not belong in `owasp-top-10`, for the same
   * reason its sibling `no-insecure-comparison` was removed from it. In `strict`,
   * where breadth is the contract, it stays.
   */
  checkLooseEquality?: boolean;
}

type RuleOptions = [Options?];

export const noImproperTypeValidation = createRule<RuleOptions, MessageIds>({
  name: 'no-improper-type-validation',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-improper-type-validation.md',
      description: 'Detects improper type validation in user input handling',
      cwe: 'CWE-1287',
    },
    messages: {
      unsafeTypeofCheck: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unsafe typeof Check',
        cwe: 'CWE-1287',
        description: "typeof x === 'object' also matches null and arrays",
        severity: 'MEDIUM',
        fix: 'Use value != null && typeof value === "object" && !Array.isArray(value) — Not a finding if the value is already known non-null on this path',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof',
      }),
      unsafeInstanceofUsage: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unsafe instanceof Usage',
        cwe: 'CWE-1287',
        description: 'instanceof may fail across contexts',
        severity: 'LOW',
        fix: 'Use Array.isArray() or typeof checks — Not a finding if the value never crosses a realm boundary (no vm, iframe, or worker)',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof',
      }),
      looseEqualityTypeCheck: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Loose Equality Type Check',
        cwe: 'CWE-1287',
        description: 'Loose equality may cause type confusion',
        severity: 'LOW',
        fix: 'Use strict equality (===) for type checking — Not a finding if both operands are already the same primitive type',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Equality',
      }),
      unreliableConstructorCheck: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unreliable Constructor Check',
        cwe: 'CWE-1287',
        description: 'constructor.name can be spoofed',
        severity: 'MEDIUM',
        fix: 'Use Object.prototype.toString.call() or duck typing — Not a finding if the value never came from parsed input',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/constructor',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInstanceofSameRealm: {
            type: 'boolean',
            default: true,
            description: 'Allow instanceof for same-realm objects',
          },
          checkLooseEquality: {
            type: 'boolean',
            default: true,
            description:
              'Report loose == / != between operands of unprovable type. Set false to keep only the structural typeof/instanceof/constructor arms.',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional function names to consider as type validators',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional JSDoc annotations to consider as safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  // §B1 — a fixture's deliberately-wrong comparison is the fixture's point.
  skipTestFiles: true,
  defaultOptions: [
    {
      allowInstanceofSameRealm: true,
      checkLooseEquality: true,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      allowInstanceofSameRealm = true,
      checkLooseEquality = true,
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode;
    const filename = context.filename;

    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /** `null` or `undefined`, as written. */
    // oxlint-disable-next-line consistent-function-scoping
    const isNullish = (node: TSESTree.Node): boolean =>
      (node.type === 'Literal' && node.raw === 'null') ||
      (node.type === 'Identifier' && node.name === 'undefined');

    /**
     * Are these two expressions the same read?
     *
     * A STRUCTURAL comparison, so that `value != null && typeof value === 'object'`
     * recognises its own guard. The predecessor asked whether the printed text of the
     * left operand CONTAINED the substring `${varName} !== null`, which meant the
     * guard had to be spelled a particular way and that any identifier whose name
     * merely contained "null" — `annulled`, `nullable`, `annullment` — satisfied the
     * neighbouring null test on the operand's spelling alone.
     */
    const sameExpression = (a: TSESTree.Node, b: TSESTree.Node): boolean => {
      if (a.type !== b.type) return false;
      if (a.type === 'Identifier' && b.type === 'Identifier')
        return a.name === b.name;
      if (a.type === 'ThisExpression') return true;
      if (a.type === 'MemberExpression' && b.type === 'MemberExpression') {
        if (a.computed !== b.computed) return false;
        return (
          sameExpression(a.object, b.object) &&
          sameExpression(a.property, b.property)
        );
      }
      if (a.type === 'Literal' && b.type === 'Literal') return a.raw === b.raw;
      return false;
    };

    /**
     * Is `operand` proven non-null by another test in the same chain?
     *
     * Two chains, because `typeof x === 'object'` and `typeof x !== 'object'`
     * are guarded by opposite operators. De Morgan, not a special case:
     *
     *   x !== null && typeof x === 'object'      accept, then narrow
     *   x === null || typeof x !== 'object'      reject, then bail
     *
     * The second is the more common of the two in real code — it is the early
     * return at the top of a normaliser — and only the first was recognised.
     * Measured on 20 repositories: of 60 sampled findings, 47 were
     * `unsafeTypeofCheck`, and the majority of those were guarded shapes:
     *
     *   if (typeof arg !== 'object' || arg === null || Array.isArray(arg))
     *       mongoose lib/aggregate.js:207 — the textbook check, reported
     *   if (value === null || typeof value !== 'object') return value;
     *       axios lib/core/AxiosError.js:34, n8n observation-log-observer.ts:303
     *   if (value && typeof value === 'object')
     *       serverless config-schema-handler/index.js:437, knex lib/client.js:57
     *   if (arg && typeof arg === 'object' && 'message' in arg)
     *       strapi packages/admin-test-utils/src/setup.ts:56
     *
     * A bare truthiness test counts. `x && …` excludes `null`, `undefined`, and
     * `0`, `''` and `false` besides — it is strictly stronger than `x !== null`,
     * and it is how the guard is actually written.
     */
    const hasNullGuard = (
      node: TSESTree.BinaryExpression,
      operand: TSESTree.Node,
    ): boolean => {
      /** `x !== null`, `x != undefined`, or a bare truthy `x`. */
      const excludesNullish = (
        expression: TSESTree.Node,
        negated: boolean,
      ): boolean => {
        if (sameExpression(expression, operand)) return !negated;
        if (
          expression.type === 'UnaryExpression' &&
          expression.operator === '!'
        ) {
          return sameExpression(expression.argument, operand) && negated;
        }
        if (expression.type !== 'BinaryExpression') return false;
        const wanted = negated ? ['===', '=='] : ['!==', '!='];
        if (!wanted.includes(expression.operator)) return false;
        if (isNullish(expression.right))
          return sameExpression(expression.left, operand);
        if (isNullish(expression.left))
          return sameExpression(expression.right, operand);
        return false;
      };

      // `typeof x === 'object'` narrows on the TRUE branch, so its guard sits in
      // an `&&` chain and asserts non-null. `typeof x !== 'object'` bails on the
      // true branch, so its guard sits in an `||` chain and asserts the
      // negation. Anything else is not a guard at all.
      const negated = node.operator === '!==' || node.operator === '!=';
      const combinator = negated ? '||' : '&&';

      const guards = (expression: TSESTree.Node): boolean => {
        if (
          expression.type === 'LogicalExpression' &&
          expression.operator === combinator
        ) {
          return guards(expression.left) || guards(expression.right);
        }
        return excludesNullish(expression, negated);
      };

      // Walk out to the outermost enclosing chain, then search the whole chain.
      let chain: TSESTree.Node = node;
      while (
        chain.parent?.type === 'LogicalExpression' &&
        chain.parent.operator === combinator
      ) {
        chain = chain.parent;
      }
      return chain !== node && guards(chain);
    };

    /**
     * Is this operand provably a string, or provably a number?
     *
     * `'a' == 'b'` and `n == 1` cannot coerce, so there is no type confusion to report.
     * A non-computed `.length` is a number by the language's own definition, and a
     * single-write binding is whatever its initializer is.
     */
    const primitiveTypeOf = (
      node: TSESTree.Node,
      seen = new Set<string>(),
    ): 'string' | 'number' | undefined => {
      if (node.type === 'Literal') {
        if (typeof node.value === 'string') return 'string';
        if (typeof node.value === 'number') return 'number';
        return undefined;
      }
      if (node.type === 'TemplateLiteral') return 'string';
      if (node.type === 'MemberExpression' && propertyName(node) === 'length') {
        return 'number';
      }
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
        if (node.callee.name === 'String') return 'string';
        if (node.callee.name === 'Number' || node.callee.name === 'parseInt')
          return 'number';
      }
      if (node.type !== 'Identifier') return undefined;
      if (seen.has(node.name)) return undefined;
      seen.add(node.name);
      for (
        let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.variables.find((v) => v.name === node.name);
        if (!variable) continue;
        const writes = variable.references.filter(
          (ref) => ref.isWrite() && ref.writeExpr,
        );
        if (writes.length === 0) return undefined;
        const types = writes.map((ref) =>
          primitiveTypeOf(ref.writeExpr as TSESTree.Expression, seen),
        );
        return types.every((type) => type !== undefined && type === types[0])
          ? types[0]
          : undefined;
      }
      return undefined;
    };

    /** `typeof X === 'object'`, which is true for `null` and for every array. */
    // oxlint-disable-next-line consistent-function-scoping
    const typeofObjectOperand = (
      node: TSESTree.BinaryExpression,
    ): TSESTree.Node | undefined => {
      // `==`/`!=` included deliberately. `typeof x == 'object'` has the identical
      // null-and-array hole as `===`, and excluding it did not make the rule quieter:
      // the comparison fell through to the loose-equality arm below, so the CORRECT
      // `typeof x == 'object' && x !== null` was reported as type juggling while its
      // `===` spelling passed. Same hole, same guard, same answer.
      if (!['===', '!==', '==', '!='].includes(node.operator)) return undefined;
      const { left, right } = node;
      if (
        left.type === 'UnaryExpression' &&
        left.operator === 'typeof' &&
        right.type === 'Literal' &&
        right.value === 'object'
      ) {
        return left.argument;
      }
      return undefined;
    };

    const report = (node: TSESTree.Node, messageId: MessageIds): void => {
      if (safetyChecker.isSafe(node, context)) return;
      context.report({
        node,
        messageId,
        data: { filePath: filename, line: String(node.loc.start.line) },
      });
    };

    return {
      BinaryExpression(node: TSESTree.BinaryExpression) {
        // `typeof x === 'object'` admits `null` and admits an array. That is a
        // property of the OPERATOR, not of the variable's name — the predecessor only
        // looked when the operand was spelled `req`, `body`, `data`, `input`, `query`
        // or `params`, so the identical hole one property deeper
        // (`typeof req.body.profile`), behind optional chaining, or on a renamed local
        // went unreported, while `metadata` matched because it contains "data".
        const operand = typeofObjectOperand(node);
        if (operand) {
          // Return either way: a guarded `typeof x == 'object' && x !== null` is
          // correct code, and falling through would re-report it as type juggling.
          if (!hasNullGuard(node, operand))
            report(node.left, 'unsafeTypeofCheck');
          return;
        }

        if (node.operator === 'instanceof' && !allowInstanceofSameRealm) {
          report(node, 'unsafeInstanceofUsage');
          return;
        }

        if (
          checkLooseEquality &&
          (node.operator === '==' || node.operator === '!=')
        ) {
          // `x == null` is the idiomatic nullish test — null AND undefined in one
          // comparison. Core `eqeqeq` exempts it under `smart`/`allow-null` and this
          // plugin's own `no-insecure-comparison` exempts it in as many words. The
          // predecessor reported ONLY this shape, and never the type juggling the
          // message describes: `isLooseEqualityTypeCheck` required the printed text
          // of an operand to contain "null" or "undefined", so `req.body.otp ==
          // storedOtp` — the authentication bypass — was silent, and
          // `value != null && …`, the fix the rule's own message prescribes, was not.
          if (isNullish(node.left) || isNullish(node.right)) return;

          // Two values of the same primitive type cannot coerce.
          const leftType = primitiveTypeOf(node.left);
          if (
            leftType !== undefined &&
            leftType === primitiveTypeOf(node.right)
          )
            return;

          report(node, 'looseEqualityTypeCheck');
        }
      },

      /**
       * `x.constructor.name === 'Object'` is spoofable — `constructor` is an ordinary
       * readable property, so `{"constructor":{"name":"Object"}}` passes.
       *
       * Only when the value is COMPARED. It used to fire on any declaration too, which
       * made `const errorKind = error.constructor.name` — every structured logger's
       * exception tag — a security finding, though nothing branches on it.
       */
      MemberExpression(node: TSESTree.MemberExpression) {
        // `data.constructor['name']` reads the same brittle type tag
        // `data.constructor.name` reads, at both levels of the chain.
        if (propertyName(node) !== 'name') return;
        const inner = node.object;
        if (
          inner.type !== 'MemberExpression' ||
          propertyName(inner) !== 'constructor'
        ) {
          return;
        }
        // Only when the value is COMPARED. A node whose parent is a BinaryExpression
        // is necessarily one of its two operands, so there is nothing further to test.
        if (node.parent?.type !== 'BinaryExpression') return;
        report(node, 'unreliableConstructorCheck');
      },
    };
  },
});
