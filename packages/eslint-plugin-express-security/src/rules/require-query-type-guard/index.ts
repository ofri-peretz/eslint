/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: require-query-type-guard
 *
 * Detects string methods called on `req.query` values without a preceding
 * type guard. Express's qs parser yields `string | string[] | ParsedQs`:
 * `?name=a&name=b` produces an array and `?name[$ne]=` produces an object,
 * so `req.query.name.replace(...)` throws (DoS) or silently bypasses
 * sanitization when an attacker shapes the query string.
 *
 * CWE-843: Access of Resource Using Incompatible Type ('Type Confusion')
 * OWASP A03:2021 – Injection
 *
 * ## Detection method: structural-api
 *
 * Two shapes are flagged:
 *
 *   1. Direct member calls — `req.query.name.replace(...)`,
 *      `req.query['x'].trim()`.
 *   2. Calls on identifiers whose most recent assignment was a raw
 *      `req.query` member — `const term = req.query.name; term.trim()`.
 *
 * A value is considered guarded (NOT flagged) after any of:
 *   - `typeof v === 'string'` (any of === / == / !== / !=, either operand order)
 *   - `Array.isArray(v)`
 *   - coercion at the source: `const v = String(req.query.name)` (never
 *     tracked — the coercer call is the init, not the raw member)
 *   - re-assignment through a coercer/validator: `v = String(v)`,
 *     `v = schema.parse(v)` (configurable via `coercers` / `validators`)
 *
 * Guards are scoped per enclosing function (nested closures see outer
 * guards). The rule does no cross-function data-flow: query values passed
 * as call arguments are a documented false negative.
 *
 * @see https://cwe.mitre.org/data/definitions/843.html
 * @see https://owasp.org/Top10/A03_2021-Injection/
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds =
  'unguardedQueryStringMethod' | 'wrapString' | 'coerceAtAssignment';

export interface Options {
  /** Callee names whose result is a safe string coercion. Default: ['String'] */
  coercers?: string[];
  /** Callee / method names treated as type-safe sources. Default: ['parse', 'safeParse'] */
  validators?: string[];
}

type RuleOptions = [Options?];

/** String.prototype methods that throw or misbehave on string[] / ParsedQs. */
const STRING_METHODS = new Set([
  'replace',
  'toLowerCase',
  'toUpperCase',
  'trim',
  'split',
  'substring',
  'slice',
  'startsWith',
  'endsWith',
  'includes',
  'match',
]);

const EQUALITY_OPS = new Set(['===', '==', '!==', '!=']);

interface ScopeFrame {
  /** Identifier name → the raw req.query member expression it was assigned from. */
  tracked: Map<string, TSESTree.MemberExpression>;
  /** Identifier names proven string (typeof / Array.isArray / coercer). */
  guardedVars: Set<string>;
  /** req.query property keys (source text) proven string. */
  guardedProps: Set<string>;
}

export const requireQueryTypeGuard = createRule<RuleOptions, MessageIds>({
  name: 'require-query-type-guard',
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/require-query-type-guard.md',
      description:
        'Require a type guard or String() coercion before calling string methods on req.query values',
      cwe: 'CWE-843',
      cvss: 7.5,
    },
    messages: {
      unguardedQueryStringMethod: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'req.query Type Confusion (CWE-843)',
        cwe: 'CWE-843',
        description:
          '.{{method}}() is called on {{target}}, but req.query values are string | string[] | ParsedQs — ?x=a&x=b yields an array, so this throws (DoS) or bypasses sanitization.',
        severity: 'HIGH',
        fix: "Coerce with String(...) or guard with typeof value === 'string' / Array.isArray(value) before treating the query value as a string.",
        documentationLink: 'https://cwe.mitre.org/data/definitions/843.html',
      }),
      wrapString:
        'Coerce the query value with String(...) before calling .{{method}}()',
      coerceAtAssignment:
        'Coerce at the assignment: wrap the req.query access in String(...)',
    },
    schema: [
      {
        type: 'object',
        properties: {
          coercers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Callee names whose result is a safe string coercion',
          },
          validators: {
            type: 'array',
            items: { type: 'string' },
            description: 'Callee / method names treated as type-safe sources',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    const { coercers, validators } = options as Options;
    const coercerNames = new Set(coercers ?? ['String']);
    const validatorNames = new Set(validators ?? ['parse', 'safeParse']);
    const sourceCode = context.sourceCode;

    function newFrame(): ScopeFrame {
      return {
        tracked: new Map(),
        guardedVars: new Set(),
        guardedProps: new Set(),
      };
    }
    const frames: ScopeFrame[] = [newFrame()];
    const current = (): ScopeFrame => frames[frames.length - 1];

    function isRequestIdent(name: string): boolean {
      const lower = name.toLowerCase();
      return lower === 'req' || lower === 'request';
    }

    /** `req.query` / `request.query` — non-computed. */
    function isReqQuery(node: TSESTree.Node): boolean {
      return (
        node.type === AST_NODE_TYPES.MemberExpression &&
        node.object.type === AST_NODE_TYPES.Identifier &&
        isRequestIdent(node.object.name) &&
        node.property.type === AST_NODE_TYPES.Identifier &&
        node.property.name === 'query'
      );
    }

    /** `req.query.name` or `req.query['x']` — a member on the query object. */
    function isQueryMember(
      node: TSESTree.Node,
    ): node is TSESTree.MemberExpression {
      return (
        node.type === AST_NODE_TYPES.MemberExpression && isReqQuery(node.object)
      );
    }

    /** Stable key for a query member: source text of its property node. */
    function propKey(node: TSESTree.MemberExpression): string {
      return sourceCode.getText(node.property);
    }

    /** Mark an identifier as proven-string, in the frame that tracks it. */
    function guardVar(name: string): void {
      for (let i = frames.length - 1; i >= 0; i--) {
        if (frames[i].tracked.has(name)) {
          frames[i].guardedVars.add(name);
          return;
        }
      }
      current().guardedVars.add(name);
    }

    /** Mark a typeof / Array.isArray guard target (identifier or query member). */
    function markGuard(target: TSESTree.Node): void {
      if (target.type === AST_NODE_TYPES.Identifier) {
        guardVar(target.name);
      } else if (isQueryMember(target)) {
        current().guardedProps.add(propKey(target));
      }
    }

    function isVarGuarded(name: string): boolean {
      return frames.some((f) => f.guardedVars.has(name));
    }

    function isPropGuarded(key: string): boolean {
      return frames.some((f) => f.guardedProps.has(key));
    }

    function lookupTracked(name: string): TSESTree.MemberExpression | null {
      for (let i = frames.length - 1; i >= 0; i--) {
        const init = frames[i].tracked.get(name);
        if (init) return init;
      }
      return null;
    }

    /** `typeof X === 'string'` (either operand order) → X, else null. */
    function extractTypeofTarget(
      a: TSESTree.Node,
      b: TSESTree.Node,
    ): TSESTree.Node | null {
      if (
        a.type === AST_NODE_TYPES.UnaryExpression &&
        a.operator === 'typeof' &&
        b.type === AST_NODE_TYPES.Literal &&
        b.value === 'string'
      ) {
        return a.argument;
      }
      return null;
    }

    /** `Array.isArray(...)` call. */
    function isArrayIsArrayCall(node: TSESTree.CallExpression): boolean {
      const callee = node.callee;
      return (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.object.type === AST_NODE_TYPES.Identifier &&
        callee.object.name === 'Array' &&
        callee.property.type === AST_NODE_TYPES.Identifier &&
        callee.property.name === 'isArray'
      );
    }

    /** Call whose result is a proven-safe string source (coercer / validator). */
    function isSafeCall(node: TSESTree.Node): boolean {
      if (node.type !== AST_NODE_TYPES.CallExpression) return false;
      const callee = node.callee;
      if (callee.type === AST_NODE_TYPES.Identifier) {
        return coercerNames.has(callee.name) || validatorNames.has(callee.name);
      }
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.property.type === AST_NODE_TYPES.Identifier
      ) {
        return validatorNames.has(callee.property.name);
      }
      return false;
    }

    function wrapWithString(
      fixer: TSESLint.RuleFixer,
      target: TSESTree.Node,
    ): TSESLint.RuleFix[] {
      return [
        fixer.insertTextBefore(target, 'String('),
        fixer.insertTextAfter(target, ')'),
      ];
    }

    function enterFunction(): void {
      frames.push(newFrame());
    }
    function exitFunction(): void {
      frames.pop();
    }

    return {
      'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression':
        enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      'FunctionExpression:exit': exitFunction,
      'ArrowFunctionExpression:exit': exitFunction,

      VariableDeclarator(node: TSESTree.VariableDeclarator): void {
        if (node.id.type !== AST_NODE_TYPES.Identifier) return;
        const init = node.init;
        if (!init) return;
        // Only a RAW query member taints; String(req.query.x), schema.parse(...)
        // and every other init shape is left untracked.
        if (isQueryMember(init)) {
          current().tracked.set(node.id.name, init);
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression): void {
        if (node.operator !== '=') return;
        if (node.left.type !== AST_NODE_TYPES.Identifier) return;
        if (isQueryMember(node.right)) {
          current().tracked.set(node.left.name, node.right);
          return;
        }
        // v = String(v) / v = schema.parse(v) — proven safe from here on.
        if (isSafeCall(node.right)) {
          guardVar(node.left.name);
        }
      },

      BinaryExpression(node: TSESTree.BinaryExpression): void {
        if (!EQUALITY_OPS.has(node.operator)) return;
        const target =
          extractTypeofTarget(node.left, node.right) ??
          extractTypeofTarget(node.right, node.left);
        if (target) markGuard(target);
      },

      CallExpression(node: TSESTree.CallExpression): void {
        // Array.isArray(v) is a guard, not a violation.
        if (isArrayIsArrayCall(node)) {
          const arg = node.arguments[0];
          if (arg) markGuard(arg);
          return;
        }

        const callee = node.callee;
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
        if (callee.property.type !== AST_NODE_TYPES.Identifier) return;
        const method = callee.property.name;
        if (!STRING_METHODS.has(method)) return;
        const obj = callee.object;

        // Shape 1: direct member call — req.query.name.replace(...)
        if (isQueryMember(obj)) {
          if (isPropGuarded(propKey(obj))) return;
          context.report({
            node: callee,
            messageId: 'unguardedQueryStringMethod',
            data: { target: sourceCode.getText(obj), method },
            suggest: [
              {
                messageId: 'wrapString',
                data: { method },
                fix: (fixer) => wrapWithString(fixer, obj),
              },
            ],
          });
          return;
        }

        // Shape 2: call on an identifier assigned from a raw query member.
        if (obj.type !== AST_NODE_TYPES.Identifier) return;
        const trackedInit = lookupTracked(obj.name);
        if (!trackedInit) return;
        if (isVarGuarded(obj.name)) return;
        context.report({
          node: callee,
          messageId: 'unguardedQueryStringMethod',
          data: { target: obj.name, method },
          suggest: [
            {
              messageId: 'coerceAtAssignment',
              fix: (fixer) => wrapWithString(fixer, trackedInit),
            },
          ],
        });
      },
    };
  },
});
