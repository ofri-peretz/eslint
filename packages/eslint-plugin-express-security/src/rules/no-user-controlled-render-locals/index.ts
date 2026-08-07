/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-user-controlled-render-locals
 *
 * Detects template-object injection where res.render() receives locals that
 * are wholly user-controlled (req.body / req.query / req.params) — directly,
 * via an object spread ({ ...req.query }), or through an identifier that was
 * assigned a whole request source without field-picking. Also flags render
 * calls whose VIEW argument derives from request input (path traversal into
 * the template directory).
 *
 * Express merges the locals object into the view-engine options, so a request
 * key such as "layout", "settings", "cache" or "filename" reconfigures the
 * engine and can point it at an attacker-chosen file.
 *
 * CWE-73: External Control of File Name or Path
 * OWASP A03:2021 – Injection
 *
 * ## Detection method: structural-api
 *
 * This rule passes the litmus test: it fires on the AST shape of
 * `<res>.render(view, <req>.<userSourceProp>)` and its spread / single-
 * assignment variants — not on variable names alone. Field-picked object
 * literals (`{ title: req.body.title }`) are the safe pattern and are never
 * flagged. The rule does not perform full taint analysis: reassignments,
 * cross-function flow, and deep aliasing are documented false negatives.
 *
 * @see https://cwe.mitre.org/data/definitions/73.html
 * @see https://expressjs.com/en/4x/api.html#res.render
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds =
  'unsafeRenderLocals' | 'userControlledView' | 'pickFieldsExplicitly';

export interface Options {
  /**
   * Callee names that make a locals expression safe when they wrap it,
   * e.g. ['pick', 'sanitizeLocals']. Matches plain calls (pick(...)) and
   * member calls (_.pick(...)). Default: []
   */
  allowSanitizers?: string[];
}

type RuleOptions = [Options?];

/** Request properties that carry whole user-controlled objects. */
const USER_SOURCE_PROPS = new Set(['body', 'query', 'params']);

/** Response object names (matched case-insensitively). */
const RESPONSE_NAMES = new Set(['res', 'response', 'reply']);

/** Request object names (matched case-insensitively). */
const REQUEST_NAMES = new Set(['req', 'request', 'ctx']);

interface TrackedSource {
  /** Human-readable origin, e.g. "req.body". */
  source: string;
  /** True when the variable holds the WHOLE user-controlled object. */
  whole: boolean;
}

export const noUserControlledRenderLocals = createRule<RuleOptions, MessageIds>(
  {
    name: 'no-user-controlled-render-locals',
    meta: {
      type: 'problem',
      hasSuggestions: true,
      docs: {
        url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-user-controlled-render-locals.md',
        description:
          'Disallow res.render() with locals or view names sourced wholesale from req.body / req.query / req.params',
        cwe: 'CWE-73',
        cvss: 7.3,
      },
      messages: {
        unsafeRenderLocals: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'Template Object Injection (CWE-73)',
          cwe: 'CWE-73',
          description:
            'res.render() receives locals wholly controlled by {{source}}. Express merges locals into the view-engine options, so keys like "layout", "settings" or "cache" can point the engine at an attacker-chosen file.',
          severity: 'HIGH',
          fix: 'Pick only the fields the template needs into an explicit object literal ({ title: req.body.title }) instead of forwarding the whole request object.',
          documentationLink: 'https://cwe.mitre.org/data/definitions/73.html',
        }),
        userControlledView: formatLLMMessage({
          icon: MessageIcons.SECURITY,
          issueName: 'User-Controlled View Path (CWE-73)',
          cwe: 'CWE-73',
          description:
            'The view name passed to res.render() derives from {{source}}. An attacker can traverse into unintended templates or files within the views directory.',
          severity: 'HIGH',
          fix: 'Map user input to a fixed set of view names via an allowlist; never build the template path from request data.',
          documentationLink: 'https://cwe.mitre.org/data/definitions/73.html',
        }),
        pickFieldsExplicitly:
          'Remove the request-object spread and pick the required fields explicitly',
      },
      schema: [
        {
          type: 'object',
          properties: {
            allowSanitizers: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Callee names that sanitize locals (e.g. ["pick", "sanitizeLocals"]); calls to them are not flagged',
            },
          },
          additionalProperties: false,
        },
      ],
    },
    defaultOptions: [{}],
    create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
      const { allowSanitizers } = options as Options;
      const sanitizers = new Set(allowSanitizers ?? []);

      /**
       * Single-assignment tracking keyed by the RESOLVED scope variable, not by
       * name — two handlers in the same file can each declare `locals`, and a
       * name-keyed map would leak the first one's origin into the second.
       */
      const trackedVars = new Map<TSESLint.Scope.Variable, TrackedSource>();

      /** The scope variable an identifier resolves to, or null if unresolved. */
      function resolveVariable(
        node: TSESTree.Identifier,
      ): TSESLint.Scope.Variable | null {
        let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(
          node,
        );
        while (scope) {
          const found = scope.variables.find((v) => v.name === node.name);
          if (found) return found;
          scope = scope.upper;
        }
        return null;
      }

      /** Tracked origin for an identifier, resolved through scope. */
      function getTracked(node: TSESTree.Identifier): TrackedSource | undefined {
        const variable = resolveVariable(node);
        return variable ? trackedVars.get(variable) : undefined;
      }

      function isRequestName(name: string): boolean {
        return REQUEST_NAMES.has(name.toLowerCase());
      }

      /**
       * Returns "req.<prop>" when `node` is a WHOLE user-source object access —
       * exactly `<req>.body`, `<req>.query` or `<req>.params` (two levels).
       * Field accesses like req.body.title are NOT whole objects.
       */
      function getWholeSource(node: TSESTree.Node): string | null {
        if (node.type !== AST_NODE_TYPES.MemberExpression) return null;
        const { object, property } = node;
        if (object.type !== AST_NODE_TYPES.Identifier) return null;
        if (property.type !== AST_NODE_TYPES.Identifier) return null;
        // req[body] reads whatever `body` holds — not the request body.
        if (node.computed) return null;
        if (!USER_SOURCE_PROPS.has(property.name)) return null;
        if (!isRequestName(object.name)) return null;
        return `req.${property.name}`;
      }

      /** True when the call's callee name is in the allowSanitizers option. */
      function isSanitizerCall(node: TSESTree.CallExpression): boolean {
        const callee = node.callee;
        if (callee.type === AST_NODE_TYPES.Identifier) {
          return sanitizers.has(callee.name);
        }
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.property.type === AST_NODE_TYPES.Identifier
        ) {
          return sanitizers.has(callee.property.name);
        }
        return false;
      }

      /**
       * Returns the origin when `node` would flow a WHOLE user-controlled
       * object into render locals: a direct req.body/query/params access, an
       * identifier tracked as whole, or a non-sanitizer call that forwards a
       * whole source (transform(req.body)).
       */
      function getUnsafeLocalsSource(node: TSESTree.Node): string | null {
        const direct = getWholeSource(node);
        if (direct) return direct;
        if (node.type === AST_NODE_TYPES.Identifier) {
          const tracked = getTracked(node);
          if (tracked && tracked.whole) return tracked.source;
          return null;
        }
        if (node.type === AST_NODE_TYPES.CallExpression) {
          if (isSanitizerCall(node)) return null;
          for (const arg of node.arguments) {
            const argSource = getWholeSource(arg);
            if (argSource) return argSource;
          }
        }
        return null;
      }

      /**
       * Returns the origin when `node` DERIVES from user input in any way —
       * used for the view-name argument, where even a single field
       * (req.params.page) enables path traversal.
       */
      function getDerivedSource(node: TSESTree.Node): string | null {
        const whole = getWholeSource(node);
        if (whole) return whole;
        if (node.type === AST_NODE_TYPES.MemberExpression) {
          return getDerivedSource(node.object);
        }
        if (node.type === AST_NODE_TYPES.TemplateLiteral) {
          for (const expr of node.expressions) {
            const inner = getDerivedSource(expr);
            if (inner) return inner;
          }
          return null;
        }
        if (node.type === AST_NODE_TYPES.BinaryExpression) {
          if (node.operator !== '+') return null;
          const left = getDerivedSource(node.left);
          if (left) return left;
          return getDerivedSource(node.right);
        }
        if (node.type === AST_NODE_TYPES.Identifier) {
          const tracked = getTracked(node);
          if (tracked) return tracked.source;
          return null;
        }
        return null;
      }

      /** True when `<res>.render(...)` — response ident + literal .render. */
      function isRenderCall(node: TSESTree.CallExpression): boolean {
        const callee = node.callee;
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
        if (callee.property.type !== AST_NODE_TYPES.Identifier) return false;
        if (callee.property.name !== 'render') return false;
        const obj = callee.object;
        if (obj.type !== AST_NODE_TYPES.Identifier) return false;
        return RESPONSE_NAMES.has(obj.name.toLowerCase());
      }

      /**
       * Suggestion fix: delete a `...req.x` spread element (and its adjoining
       * comma) from an object literal.
       */
      function buildRemoveSpreadFix(spread: TSESTree.SpreadElement) {
        return (fixer: TSESLint.RuleFixer): TSESLint.RuleFix => {
          const sourceCode = context.sourceCode;
          // Inside an ObjectExpression a spread always has a token on each side
          // ('{' or ',' before; ',' or '}' after), so these casts are safe.
          const tokenAfter = sourceCode.getTokenAfter(spread) as TSESTree.Token;
          const tokenBefore = sourceCode.getTokenBefore(
            spread,
          ) as TSESTree.Token;
          if (tokenAfter.value === ',') {
            return fixer.removeRange([spread.range[0], tokenAfter.range[1]]);
          }
          if (tokenBefore.value === ',') {
            return fixer.removeRange([tokenBefore.range[0], spread.range[1]]);
          }
          return fixer.remove(spread);
        };
      }

      function checkLocalsArg(node: TSESTree.Node): void {
        const source = getUnsafeLocalsSource(node);
        if (source) {
          context.report({
            node,
            messageId: 'unsafeRenderLocals',
            data: { source },
          });
          return;
        }
        if (node.type !== AST_NODE_TYPES.ObjectExpression) return;
        for (const prop of node.properties) {
          if (prop.type !== AST_NODE_TYPES.SpreadElement) continue;
          const spreadSource = getUnsafeLocalsSource(prop.argument);
          if (!spreadSource) continue;
          context.report({
            node: prop,
            messageId: 'unsafeRenderLocals',
            data: { source: spreadSource },
            suggest: [
              {
                messageId: 'pickFieldsExplicitly',
                fix: buildRemoveSpreadFix(prop),
              },
            ],
          });
        }
      }

      /** Records the origin of a single-assignment declaration. */
      function trackDeclarator(
        declared: TSESLint.Scope.Variable,
        init: TSESTree.Expression,
      ): void {
        const unsafe = getUnsafeLocalsSource(init);
        if (unsafe) {
          trackedVars.set(declared, { source: unsafe, whole: true });
          return;
        }
        // const locals = { ...req.body } still carries the whole object
        if (init.type === AST_NODE_TYPES.ObjectExpression) {
          for (const prop of init.properties) {
            if (prop.type !== AST_NODE_TYPES.SpreadElement) continue;
            const spreadSource = getUnsafeLocalsSource(prop.argument);
            if (spreadSource) {
              trackedVars.set(declared, { source: spreadSource, whole: true });
              return;
            }
          }
          return;
        }
        const derived = getDerivedSource(init);
        if (derived) {
          trackedVars.set(declared, { source: derived, whole: false });
        }
      }

      return {
        VariableDeclarator(node: TSESTree.VariableDeclarator) {
          // Destructuring (const { title } = req.body) IS field-picking — safe.
          if (node.id.type !== AST_NODE_TYPES.Identifier) return;
          const init = node.init;
          if (!init) return;
          // Exactly one variable for an Identifier id — the loop keeps the
          // lookup total, with no unreachable null-guard to cover.
          for (const declared of context.sourceCode.getDeclaredVariables(
            node,
          )) {
            trackDeclarator(declared, init);
          }
        },

        CallExpression(node: TSESTree.CallExpression) {
          if (!isRenderCall(node)) return;

          const viewArg = node.arguments[0];
          if (!viewArg) return;
          const viewSource = getDerivedSource(viewArg);
          if (viewSource) {
            context.report({
              node: viewArg,
              messageId: 'userControlledView',
              data: { source: viewSource },
            });
          }

          const localsArg = node.arguments[1];
          if (!localsArg) return;
          checkLocalsArg(localsArg);
        },
      };
    },
  },
);
