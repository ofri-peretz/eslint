/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-host-header-in-links
 *
 * Detects Host-header poisoning (CWE-640): building absolute URLs — most
 * critically password-reset and account-verification links — from
 * `req.headers.host`, `req.headers['x-forwarded-host']`, or
 * `req.get('host')`. Both headers are attacker-controlled on any request
 * that reaches the app directly, so a mailed link built from them can point
 * the recovery token at an attacker-owned host.
 *
 * CWE-640: Weak Password Recovery Mechanism for Forgotten Password
 * OWASP A07:2021 – Identification and Authentication Failures
 *
 * ## Detection method: structural-api + single-hop flow
 *
 * The rule fires when a host-header read (or a variable assigned from one in
 * the same file) participates in URL-building string concatenation or a
 * template literal. "URL-building" means a static part of the string
 * contains `://` or starts with `//`, OR the string is an argument of a
 * mail-send call (`sendMail` / `send` by default, configurable via
 * `checkMailCallees`).
 *
 * It deliberately does NOT flag:
 * - URLs built from config/env constants (`process.env.PUBLIC_ORIGIN + ...`)
 * - host values used only for logging (`console.log('host ' + req.headers.host)`)
 * - host reads validated inside an if-guard against `allowedHosts`
 *
 * @see https://cwe.mitre.org/data/definitions/640.html
 * @see https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/02-Configuration_and_Deployment_Management_Testing/06-Test_HTTP_Methods
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'hostHeaderInLink' | 'useConfiguredOrigin';

export interface Options {
  /**
   * Literal host values considered trusted. If an enclosing `if` statement
   * validates the host against one of these literals, the use is not
   * reported. Default: []
   */
  allowedHosts?: string[];
  /**
   * Callee names treated as mail-send sinks — a host header flowing into any
   * argument of these calls is flagged even without a `://` marker.
   * Default: ['sendMail', 'send']
   */
  checkMailCallees?: string[];
}

type RuleOptions = [Options?];

/** Header names whose value the client fully controls. */
const HOST_HEADER_NAMES = new Set(['host', 'x-forwarded-host']);

/** Express request methods that read a header by name. */
const HOST_GETTER_METHODS = new Set(['get', 'header']);

export const noHostHeaderInLinks = createRule<RuleOptions, MessageIds>({
  name: 'no-host-header-in-links',
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-express-security/docs/rules/no-host-header-in-links.md',
      description:
        'Disallow building absolute URLs (reset/verification links) from the Host or X-Forwarded-Host request header',
      cwe: 'CWE-640',
      cvss: 8.1,
    },
    messages: {
      hostHeaderInLink: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Host-Header Poisoning (CWE-640)',
        cwe: 'CWE-640',
        description:
          'A URL is built from {{source}}, which the client controls. Reset/verification links built this way can be redirected to an attacker-owned host, leaking the token.',
        severity: 'HIGH',
        fix: 'Build absolute links from a server-side constant (e.g. process.env.PUBLIC_ORIGIN), never from request headers.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/640.html',
      }),
      useConfiguredOrigin: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use a configured origin',
        description:
          'Replace the header-derived host with a deployment constant such as process.env.PUBLIC_ORIGIN',
        severity: 'LOW',
        fix: "const origin = process.env.PUBLIC_ORIGIN; // 'https://app.example.com'",
        documentationLink: 'https://cwe.mitre.org/data/definitions/640.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedHosts: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Trusted literal hosts — an if-guard comparing against one of these suppresses the report',
          },
          checkMailCallees: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Callee names treated as mail-send sinks (default: ["sendMail", "send"])',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    const { allowedHosts, checkMailCallees } = options as Options;
    const allowed = allowedHosts ?? [];
    const mailCallees = new Set(checkMailCallees ?? ['sendMail', 'send']);
    const sourceCode = context.sourceCode;

    /** Variables assigned from a host-header read → source description. */
    const hostVars = new Map<string, string>();

    function isRequestIdent(name: string): boolean {
      const lower = name.toLowerCase();
      return lower === 'req' || lower === 'request' || lower === 'ctx';
    }

    /** Static property name of a member expression, or null. */
    function propName(node: TSESTree.MemberExpression): string | null {
      if (node.property.type === AST_NODE_TYPES.Identifier && !node.computed) {
        return node.property.name;
      }
      if (
        node.property.type === AST_NODE_TYPES.Literal &&
        typeof node.property.value === 'string'
      ) {
        return node.property.value;
      }
      return null;
    }

    /**
     * Returns a description when `node` reads a client-controlled host
     * header, else null. Handles:
     *   req.headers.host / req.headers['x-forwarded-host']
     *   req.get('host') / req.header('X-Forwarded-Host')
     *   a || b / a ?? b  (either side tainted taints the result)
     */
    function getHostHeaderSource(node: TSESTree.Node): string | null {
      if (node.type === AST_NODE_TYPES.LogicalExpression) {
        return (
          getHostHeaderSource(node.left) ?? getHostHeaderSource(node.right)
        );
      }

      if (node.type === AST_NODE_TYPES.CallExpression) {
        const callee = node.callee;
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.property.type === AST_NODE_TYPES.Identifier &&
          HOST_GETTER_METHODS.has(callee.property.name) &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          isRequestIdent(callee.object.name)
        ) {
          const arg = node.arguments[0];
          if (
            arg !== undefined &&
            arg.type === AST_NODE_TYPES.Literal &&
            typeof arg.value === 'string' &&
            HOST_HEADER_NAMES.has(arg.value.toLowerCase())
          ) {
            return `req.${callee.property.name}('${arg.value}')`;
          }
        }
        return null;
      }

      if (node.type === AST_NODE_TYPES.MemberExpression) {
        const obj = node.object;
        if (
          obj.type === AST_NODE_TYPES.MemberExpression &&
          obj.property.type === AST_NODE_TYPES.Identifier &&
          obj.property.name === 'headers' &&
          obj.object.type === AST_NODE_TYPES.Identifier &&
          isRequestIdent(obj.object.name)
        ) {
          const name = propName(node);
          if (name !== null && HOST_HEADER_NAMES.has(name.toLowerCase())) {
            return `req.headers['${name}']`;
          }
        }
      }

      return null;
    }

    /** Direct host read, or an identifier tracked from one. */
    function resolveHostSource(node: TSESTree.Node): string | null {
      if (node.type === AST_NODE_TYPES.Identifier) {
        return hostVars.get(node.name) ?? null;
      }
      return getHostHeaderSource(node);
    }

    /** True when a static string fragment looks like URL building. */
    function isUrlish(text: string): boolean {
      return text.includes('://') || text.startsWith('//');
    }

    /** True when `node` sits (at any depth) inside a mail-send call. */
    function isInMailCall(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | null | undefined = node.parent;
      while (current != null) {
        if (current.type === AST_NODE_TYPES.CallExpression) {
          const callee = current.callee;
          if (
            callee.type === AST_NODE_TYPES.Identifier &&
            mailCallees.has(callee.name)
          ) {
            return true;
          }
          if (
            callee.type === AST_NODE_TYPES.MemberExpression &&
            callee.property.type === AST_NODE_TYPES.Identifier &&
            mailCallees.has(callee.property.name)
          ) {
            return true;
          }
        }
        current = current.parent;
      }
      return false;
    }

    /**
     * True when an enclosing if-statement's test mentions one of the
     * configured `allowedHosts` literals — the host was validated.
     */
    function isValidatedByAllowlist(node: TSESTree.Node): boolean {
      if (allowed.length === 0) return false;
      let current: TSESTree.Node | null | undefined = node.parent;
      while (current != null) {
        if (current.type === AST_NODE_TYPES.IfStatement) {
          const testText = sourceCode.getText(current.test);
          if (allowed.some((host) => testText.includes(host))) return true;
        }
        current = current.parent;
      }
      return false;
    }

    function reportHostUse(node: TSESTree.Node, source: string): void {
      if (isValidatedByAllowlist(node)) return;
      context.report({
        node,
        messageId: 'hostHeaderInLink',
        data: { source },
        suggest: [{ messageId: 'useConfiguredOrigin', fix: () => null }],
      });
    }

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== AST_NODE_TYPES.Identifier || node.init == null) {
          return;
        }
        const source = getHostHeaderSource(node.init);
        if (source !== null) hostVars.set(node.id.name, source);
      },

      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        const urlish = node.quasis.some((q) => isUrlish(q.value.raw));
        for (const expr of node.expressions) {
          const source = resolveHostSource(expr);
          if (source !== null && (urlish || isInMailCall(node))) {
            reportHostUse(expr, source);
          }
        }
      },

      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (node.operator !== '+') return;
        // Only handle the top of a concat chain — inner `+` nodes are
        // flattened below.
        if (
          node.parent.type === AST_NODE_TYPES.BinaryExpression &&
          node.parent.operator === '+'
        ) {
          return;
        }

        const operands: TSESTree.Node[] = [];
        const stack: TSESTree.Node[] = [node];
        while (stack.length > 0) {
          const current = stack.pop() as TSESTree.Node;
          if (
            current.type === AST_NODE_TYPES.BinaryExpression &&
            current.operator === '+'
          ) {
            stack.push(current.left, current.right);
          } else {
            operands.push(current);
          }
        }

        let urlish = false;
        let hostNode: TSESTree.Node | null = null;
        let hostSource: string | null = null;
        for (const operand of operands) {
          if (
            operand.type === AST_NODE_TYPES.Literal &&
            typeof operand.value === 'string' &&
            isUrlish(operand.value)
          ) {
            urlish = true;
          }
          if (hostSource === null) {
            const source = resolveHostSource(operand);
            if (source !== null) {
              hostSource = source;
              hostNode = operand;
            }
          }
        }

        if (hostNode !== null && (urlish || isInMailCall(node))) {
          reportHostUse(hostNode, hostSource as string);
        }
      },
    };
  },
});
