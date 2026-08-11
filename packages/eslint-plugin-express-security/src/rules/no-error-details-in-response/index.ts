/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-error-details-in-response
 *
 * Detects information exposure through error messages (CWE-209): sending a
 * caught error — the raw error object, `err.stack`, a spread `{ ...err }`,
 * or (optionally) `err.message` — to the HTTP client via
 * `res.send()` / `res.json()` / `res.end()`. Stack traces reveal absolute
 * paths, dependency versions and internal module layout; driver errors leak
 * query text, connection strings and hostnames.
 *
 * CWE-209: Generation of Error Message Containing Sensitive Information
 * OWASP A04:2021 – Insecure Design
 *
 * ## Detection method: structural-api + scoped error binding
 *
 * The rule tracks error identifiers introduced by:
 * - `catch (err)` clause parameters (within the catch block), and
 * - error-first callbacks / error middleware — functions whose FIRST
 *   parameter is named `err` or `error` (within the function body).
 *
 * A response-send call (`res` / `response` / `reply`, including chained
 * `res.status(500).json(...)`) whose first argument is such an identifier,
 * a `.stack` / `.message` member on it, or an object literal embedding or
 * spreading it, is reported.
 *
 * It deliberately does NOT flag:
 * - generic literal responses (`res.json({ error: 'Internal error' })`)
 * - server-side logging (`logger.error(err)`)
 * - `err.message` under the default `allowMessage: true`
 * - responses inside a NODE_ENV guard when `allowInDev: true`
 *
 * @see https://cwe.mitre.org/data/definitions/209.html
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileUsesExpress } from '../../utils/express-evidence';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'errorDetailsExposed';

export interface Options {
  /**
   * Allow `err.message` in responses. Messages are usually intended for
   * humans, but set to false for a strict policy. Default: true
   */
  allowMessage?: boolean;
  /**
   * Allow error details inside an if-guard that checks NODE_ENV
   * (development-only debugging). Default: false
   */
  allowInDev?: boolean;
}

type RuleOptions = [Options?];

/** Response methods that write a body to the client. */
const SEND_METHODS = new Set(['send', 'json', 'end']);

/** First-parameter names that mark an error-first callback / middleware. */
const ERROR_PARAM_NAME = /^(err|error)$/i;

interface Frame {
  node: TSESTree.Node;
  name: string;
}

export const noErrorDetailsInResponse = createRule<RuleOptions, MessageIds>({
  name: 'no-error-details-in-response',
  meta: {
    type: 'problem',
    hasSuggestions: false,
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-error-details-in-response.md',
      description:
        'Disallow sending caught error objects, stacks, or spreads of them in HTTP responses',
      cwe: 'CWE-209',
      cvss: 5.3,
    },
    messages: {
      errorDetailsExposed: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Error Details Exposed (CWE-209)',
        cwe: 'CWE-209',
        description:
          'The HTTP response includes {{detail}}. Stack traces and driver errors leak file paths, dependency versions, query text and hostnames to the caller.',
        severity: 'MEDIUM',
        fix: "Log the error server-side and respond with a generic body: logger.error(err); res.status(500).json({ error: 'Internal Server Error' })",
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowMessage: {
            type: 'boolean',
            default: true,
            description: 'Allow err.message in responses',
          },
          allowInDev: {
            type: 'boolean',
            default: false,
            description:
              'Allow error details inside an if-guard checking NODE_ENV',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    // Every rule here is Express-specific, and none of them knew it: over
    // 107,382 files, 75% of this plugin's findings were in files with no
    // Express import. Registering no visitors is both the gate and the cheap
    // path — a file with no Express in it does no work.
    if (!fileUsesExpress(context.sourceCode.ast)) return {};

    const { allowMessage, allowInDev } = options as Options;
    const messageAllowed = allowMessage ?? true;
    const devAllowed = allowInDev ?? false;
    const sourceCode = context.sourceCode;

    /** Active error bindings (catch params + error-first callback params). */
    const frames: Frame[] = [];

    function isErrorName(name: string): boolean {
      return frames.some((frame) => frame.name === name);
    }

    type FunctionLike =
      | TSESTree.FunctionDeclaration
      | TSESTree.FunctionExpression
      | TSESTree.ArrowFunctionExpression;

    function enterFunction(node: FunctionLike): void {
      const first = node.params[0];
      if (
        first !== undefined &&
        first.type === AST_NODE_TYPES.Identifier &&
        ERROR_PARAM_NAME.test(first.name)
      ) {
        frames.push({ node, name: first.name });
      }
    }

    function exitFrame(node: TSESTree.Node): void {
      if (frames.length > 0 && frames[frames.length - 1].node === node) {
        frames.pop();
      }
    }

    /**
     * True when the call is `res.send/json/end(...)` — including chained
     * builders like `res.status(500).json(...)` — on a response object
     * named res/response/reply.
     */
    function isResponseSend(node: TSESTree.CallExpression): boolean {
      const callee = node.callee;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      if (callee.property.type !== AST_NODE_TYPES.Identifier) return false;
      if (!SEND_METHODS.has(callee.property.name)) return false;

      let obj: TSESTree.Node = callee.object;
      while (
        obj.type === AST_NODE_TYPES.CallExpression &&
        obj.callee.type === AST_NODE_TYPES.MemberExpression
      ) {
        obj = obj.callee.object;
      }
      if (obj.type !== AST_NODE_TYPES.Identifier) return false;

      const lower = obj.name.toLowerCase();
      return lower === 'res' || lower === 'response' || lower === 'reply';
    }

    /**
     * Returns a description when `node` exposes error details directly:
     * the raw error identifier, `err.stack`, or `err.message` (when
     * disallowed). Returns null otherwise.
     */
    function detailOf(node: TSESTree.Node): string | null {
      if (node.type === AST_NODE_TYPES.Identifier && isErrorName(node.name)) {
        return `the raw error \`${node.name}\``;
      }
      if (
        node.type === AST_NODE_TYPES.MemberExpression &&
        !node.computed &&
        node.object.type === AST_NODE_TYPES.Identifier &&
        isErrorName(node.object.name) &&
        node.property.type === AST_NODE_TYPES.Identifier
      ) {
        if (node.property.name === 'stack') {
          return `\`${node.object.name}.stack\``;
        }
        if (node.property.name === 'message' && !messageAllowed) {
          return `\`${node.object.name}.message\``;
        }
      }
      return null;
    }

    interface Finding {
      node: TSESTree.Node;
      detail: string;
    }

    /** Findings in a response-send argument (direct or one object level). */
    function collectFindings(arg: TSESTree.Node): Finding[] {
      const direct = detailOf(arg);
      if (direct !== null) return [{ node: arg, detail: direct }];
      if (arg.type !== AST_NODE_TYPES.ObjectExpression) return [];

      const findings: Finding[] = [];
      for (const prop of arg.properties) {
        if (prop.type === AST_NODE_TYPES.SpreadElement) {
          if (
            prop.argument.type === AST_NODE_TYPES.Identifier &&
            isErrorName(prop.argument.name)
          ) {
            findings.push({
              node: prop,
              detail: `\`{ ...${prop.argument.name} }\` (spread of the raw error)`,
            });
          }
          continue;
        }
        const detail = detailOf(prop.value);
        if (detail !== null) findings.push({ node: prop.value, detail });
      }
      return findings;
    }

    /** True when an enclosing if-statement's test mentions NODE_ENV. */
    function isInDevGuard(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | null | undefined = node.parent;
      while (current != null) {
        if (
          current.type === AST_NODE_TYPES.IfStatement &&
          sourceCode.getText(current.test).includes('NODE_ENV')
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    return {
      CatchClause(node: TSESTree.CatchClause) {
        if (
          node.param !== null &&
          node.param.type === AST_NODE_TYPES.Identifier
        ) {
          frames.push({ node, name: node.param.name });
        }
      },
      'CatchClause:exit': exitFrame,
      FunctionDeclaration: enterFunction,
      'FunctionDeclaration:exit': exitFrame,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFrame,
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFrame,

      CallExpression(node: TSESTree.CallExpression) {
        // No active error binding — nothing can leak.
        if (frames.length === 0) return;
        if (!isResponseSend(node)) return;

        const arg = node.arguments[0];
        if (arg === undefined) return;
        if (devAllowed && isInDevGuard(node)) return;

        for (const finding of collectFindings(arg)) {
          context.report({
            node: finding.node,
            messageId: 'errorDetailsExposed',
            data: { detail: finding.detail },
            // No suggestion: the safe replacement depends on the app's error
            // contract (incident ids, logger, status shape), so there is
            // nothing mechanical to offer. The remedy is in the message's
            // `fix:` line. A `fix: () => null` suggestion would be stripped
            // from the output by ESLint and render as nothing at all.
          });
        }
      },
    };
  },
});
