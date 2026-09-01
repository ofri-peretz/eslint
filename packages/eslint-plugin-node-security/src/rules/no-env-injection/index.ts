/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-env-injection
 * CWE-99: Improper Control of Resource Identifiers (Resource Injection)
 *
 * `process.env[key] = value` where the *key* comes from the request lets the
 * caller pick which environment variable is written. The value is almost never
 * the interesting part:
 *
 *   - `PATH`        → decides which binary every later `spawn`/`exec` resolves.
 *   - `NODE_OPTIONS`→ `--require ./payload.js` runs in every child Node process.
 *   - `LD_PRELOAD`  → injects a shared object into every child process.
 *
 * None of those need a second request to pay off; the next child process the
 * app spawns executes attacker-chosen code. This is why the rule judges the
 * KEY, not the value.
 *
 * Detection: taint on the key expression. A key that traces back to the request
 * object reports; a key that traces back to a lookup in a local allowlist does
 * not, because the set of names it can produce is closed and written in the
 * source. That distinction is the whole rule — a "the key is not a literal"
 * check would report the allowlist pattern, which is the accepted fix.
 *
 * Relationship to the neighbouring rules:
 *   - `no-dynamic-command-string` (CWE-77) covers the command string itself.
 *   - `detect-child-process` / `no-shell-injection` (CWE-78) cover the call.
 *   This rule covers the environment those calls inherit, which none of them
 *   look at.
 *
 * @see https://cwe.mitre.org/data/definitions/99.html
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons, propertyName } from '@interlace/eslint-devkit';

type MessageIds = 'envKeyInjection' | 'envBulkInjection';

export interface Options {
  /** Extra identifiers to treat as roots of request-controlled data. */
  extraRequestRoots?: string[];

  /**
   * Identifiers that name the request at the top of a handler. REPLACES the
   * default.
   *
   * `extraRequestRoots` can only GROW the list, and growth cannot undo a word
   * we guessed wrong: a local `const event = loadFixture()` is matched by the
   * default and no amount of adding fixes it. Express, Koa and Lambda all take
   * the request POSITIONALLY, so these words are the consumer's.
   *
   * The two compose — `extraRequestRoots` is appended to whatever this is — so
   * `{ requestRootNames: [], extraRequestRoots: ['inbound'] }` means exactly
   * `inbound`.
   */
  requestRootNames?: string[];
}

type RuleOptions = [Options?];

/**
 * Identifiers that name the request at the top of a handler.
 *
 * Deliberately roots-only: the check walks a member chain down to its base and
 * asks what that base is. `req.body.key` and `request.query.name` resolve here;
 * `ALLOWED[req.body.setting]` resolves to `ALLOWED` and does not, which is the
 * only reason the allowlist pattern stays silent.
 */
const DEFAULT_REQUEST_ROOTS = ['req', 'request', 'ctx', 'event'];

/** How many binding hops the key is traced through before giving up. */
const MAX_TRACE_DEPTH = 3;

/** `process.env`, written out in full. */
function isProcessEnv(node: TSESTree.Node): boolean {
  return (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    node.object.name === 'process' &&
    propertyName(node) === 'env'
  );
}

/** The identifier a member chain bottoms out at: `req.body.key` → `req`. */
function memberChainRoot(node: TSESTree.Node): TSESTree.Identifier | null {
  let current: TSESTree.Node = node;
  while (current.type === 'MemberExpression') {
    current = current.object;
  }
  return current.type === 'Identifier' ? current : null;
}

export const noEnvInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-env-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-env-injection.md',
      description:
        'Disallow writing process.env under a key the caller controls, which can overwrite PATH, NODE_OPTIONS or LD_PRELOAD (CWE-99)',
      cwe: 'CWE-99',
      cvss: 8.8,
      confidence: 'high',
    },
    messages: {
      envKeyInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Environment Variable Injection (CWE-99)',
        cwe: 'CWE-99',
        cvss: 8.8,
        description:
          'process.env[…] is written under a key that traces back to the request, so the caller decides WHICH variable is set. PATH changes which binary every later spawn/exec resolves; NODE_OPTIONS="--require ./x.js" and LD_PRELOAD run attacker code in every child process. The value being validated does not help — the name is the vulnerability.',
        severity: 'HIGH',
        fix: 'Map the caller\'s input through a fixed allowlist before it reaches the key: `const ALLOWED = { locale: "APP_LOCALE" }; const name = ALLOWED[input]; if (!name) return; process.env[name] = value;`. Better still, keep request-scoped settings out of the process environment entirely.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/99.html',
      }),
      envBulkInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Bulk Environment Overwrite (CWE-99)',
        cwe: 'CWE-99',
        cvss: 8.8,
        description:
          'Object.assign(process.env, …) copies every key of a request-derived object into the environment, so the caller chooses the names AND the values wholesale — PATH, NODE_OPTIONS and LD_PRELOAD included.',
        severity: 'HIGH',
        fix: 'Copy only the keys you name yourself, from a fixed allowlist, instead of spreading the request object into the environment.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/99.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          requestRootNames: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_REQUEST_ROOTS],
            description:
              'Identifiers that name the request at the top of a handler. Replaces the default.',
          },
          extraRequestRoots: {
            type: 'array',
            items: { type: 'string' },
            // `[]`, matching `...(extraRequestRoots ?? [])` in `create()`. The
            // rule's built-in roots live in DEFAULT_REQUEST_ROOTS and are always
            // added; this option EXTENDS that set, it does not replace it, so
            // the default here is the empty extension rather than the built-ins.
            default: [],
            description:
              'Extra identifiers to treat as roots of request-controlled data. Added to the built-in roots, not a replacement for them.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    const { extraRequestRoots, requestRootNames } = options as Options;
    // The two COMPOSE: `requestRootNames` replaces the default list and
    // `extraRequestRoots` is appended to whatever that ends up being, so
    // `{ requestRootNames: [], extraRequestRoots: ['inbound'] }` means
    // exactly `inbound`.
    const requestRoots = new Set([
      ...(requestRootNames ?? DEFAULT_REQUEST_ROOTS),
      ...(extraRequestRoots ?? []),
    ]);

    /** The nearest binding for an identifier, walking outward through scopes. */
    function findVariable(node: TSESTree.Identifier) {
      let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(node);
      while (scope) {
        const found = scope.variables.find((v) => v.name === node.name);
        if (found) return found;
        scope = scope.upper;
      }
      return null;
    }

    /**
     * Does this expression carry a value the caller chose?
     *
     * Two shapes resolve to `true` and everything else to `false`:
     *   1. a member chain rooted at the request (`req.body.key`);
     *   2. a binding written exactly once whose initializer is one of those —
     *      which is what `const { key } = req.body` produces.
     *
     * `ALLOWED[req.body.setting]` is a member chain rooted at `ALLOWED`, so it
     * resolves to `false` even though a request value appears inside it. That
     * is correct: the *result* can only ever be one of the strings written in
     * the allowlist, and it is the result that reaches the key.
     */
    function isRequestDerived(node: TSESTree.Node, depth: number): boolean {
      if (depth > MAX_TRACE_DEPTH) return false;

      if (node.type === 'MemberExpression') {
        const root = memberChainRoot(node);
        return root !== null && requestRoots.has(root.name);
      }

      if (node.type !== 'Identifier') return false;
      if (requestRoots.has(node.name)) return true;

      const variable = findVariable(node);
      if (!variable) return false;
      // Written more than once: what it holds at the assignment cannot be
      // traced, so there is nothing to prove either way.
      if (variable.references.filter((ref) => ref.isWrite()).length !== 1) {
        return false;
      }
      const [def] = variable.defs;
      if (!def || def.node.type !== 'VariableDeclarator') return false;
      const init = def.node.init;
      return init != null && isRequestDerived(init, depth + 1);
    }

    return {
      // process.env[key] = value
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const { left } = node;
        if (left.type !== 'MemberExpression' || !left.computed) return;
        if (!isProcessEnv(left.object)) return;
        if (!isRequestDerived(left.property, 0)) return;
        context.report({ node: left.property, messageId: 'envKeyInjection' });
      },

      // Object.assign(process.env, req.body)
      CallExpression(node: TSESTree.CallExpression) {
        const { callee } = node;
        if (callee.type !== 'MemberExpression' || callee.computed) return;
        if (callee.property.type !== 'Identifier') return;
        if (callee.property.name !== 'assign') return;
        if (callee.object.type !== 'Identifier') return;
        if (callee.object.name !== 'Object') return;
        const [target, ...sources] = node.arguments;
        if (!target || !isProcessEnv(target)) return;
        for (const source of sources) {
          if (isRequestDerived(source, 0)) {
            context.report({ node: source, messageId: 'envBulkInjection' });
            return;
          }
        }
      },
    };
  },
});
