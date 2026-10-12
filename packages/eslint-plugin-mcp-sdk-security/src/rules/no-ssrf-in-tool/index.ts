/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow an MCP tool argument choosing the host an outbound
 * HTTP request goes to
 * @description An MCP server usually runs next to things the model must not
 * reach — a cloud metadata endpoint (`169.254.169.254`), an admin port on
 * localhost, a VPC-internal service. A tool that fetches a URL the model
 * supplied lets whatever steers the model make the server request any of them
 * and read the answer back (CWE-918).
 *
 * ## What is reported
 *
 * A tool argument (or resource-template variable) that decides the ORIGIN of a
 * request sent with `fetch`, `node-fetch`, `undici`, `axios`, `got` or
 * `http(s).get/request`:
 *
 *     fetch(url)                          // the argument is the URL
 *     fetch(`https://${host}/status`)     // it is the host
 *     fetch(`${BASE}${path}`)             // `@evil.example` still lands in the authority
 *     axios.get(new URL(target, BASE))    // an absolute URL overrides the base
 *
 * An argument interpolated AFTER a fixed origin — `` `https://api.github.com/repos/${owner}` ``
 * or `new URL(`/v1/${id}`, BASE)` — does not choose the host and is not
 * reported. The cut is the first `/`, `?` or `#` that follows a host
 * character in the fixed text before the argument.
 *
 * ## What is an allowlist check
 *
 * An `if` that checks the URL — `ALLOWED_HOSTS.has(url.hostname)`,
 * `url.origin !== API_ORIGIN`, `target.startsWith('https://api.example.com/')`,
 * a validator call — and exits before the request or wraps it. A same-file
 * helper that checks its parameter before returning sanitises its result.
 *
 * ## Overlap
 *
 * `secure-coding` / `node-security` SSRF checks are source-agnostic. Inside an
 * MCP tool handler the source is the handler's own parameter, so this rule
 * owns the finding there (owner decision, 2026-10: tool handlers are this
 * plugin's scope); both may report one line.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices
 */
import {
  TSESTree,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';
import { createGuards } from '../../utils/guards';
import { httpRequestOf } from '../../utils/http-clients';
import { createInstanceResolver } from '../../utils/instances';
import { fileUsesMcpSdk } from '../../utils/mcp-evidence';
import { valueResolverFor } from '../../utils/module-resolver';
import { createHandlerCollector } from '../../utils/tool-handlers';
import {
  constInitializer,
  lookupVariable,
  resolveFunction,
} from '../../utils/tool-registration';
import {
  createFlow,
  STRING_DERIVING,
  type Taint,
} from '../../utils/value-flow';

type MessageIds = 'toolArgToRequestHost';

/**
 * WHATWG URL members that name where a request goes.
 *
 * @vocabulary WHATWG URL Standard
 */
const ORIGIN_MEMBERS = new Set(['hostname', 'host', 'origin']);

const COMPARISONS = new Set(['===', '!==', '==', '!=']);

/** A URL scheme at the start of the fixed text, `https:` / `file:`. */
const SCHEME = /^[a-z][a-z\d+.-]*:/i;

/**
 * Is the authority still open after `prefix`? Once a host character is
 * followed by `/`, `?`, `#` or `\`, the origin is fixed; until then, what
 * comes next is still part of the host (`https://api.x.com` + `.evil.io`,
 * `${BASE}` + `@evil.io`, or a lone `/` + `/evil.io`).
 */
export function authorityOpen(prefix: string): boolean {
  const rest = prefix.replace(SCHEME, '').replace(/^\/\//, '');
  return !/[^/?#\\][/?#\\]/.test(rest);
}

/** A placeholder for fixed text this file cannot read — never a delimiter. */
const OPAQUE = 'x';

export const noSsrfInTool = createRule<[], MessageIds>({
  name: 'no-ssrf-in-tool',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/no-ssrf-in-tool.md',
      description:
        'Disallow an MCP tool argument choosing the host an outbound HTTP request is sent to',
      cwe: 'CWE-918',
      cvss: 8.6,
    },
    messages: {
      toolArgToRequestHost: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP Tool Argument Chooses a Request Host',
        cwe: 'CWE-918',
        owasp: 'A10:2021',
        cvss: 8.6,
        description:
          'Tool argument `{{arg}}` decides where `{{client}}()` connects, so whatever steers the model can make this server request internal services or the cloud metadata endpoint and read the answer',
        severity: 'HIGH',
        compliance: ['SOC2', 'NIST-CSF'],
        fix: 'Keep the origin fixed in code and let the argument fill only a path or query segment (`new URL("/v1/" + encodeURIComponent(id), API_ORIGIN)`), or parse it with `new URL()` and reject it unless `url.hostname` is in an allowlist — before the request.',
        documentationLink:
          'https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!fileUsesMcpSdk(context.sourceCode.ast)) return {};
    const sourceCode = context.sourceCode;
    const resolve = valueResolverFor(context);
    const builtBy = createInstanceResolver(context);
    const handlers = createHandlerCollector(context, resolve, 'arguments');
    const candidates: Array<{
      call: TSESTree.CallExpression;
      target: TSESTree.Node;
      client: string;
    }> = [];

    /** `new URL(...)` — the WHATWG global, not a local class. */
    const isUrlConstructor = (
      node: TSESTree.Node,
    ): node is TSESTree.NewExpression =>
      node.type === 'NewExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'URL' &&
      !lookupVariable('URL', sourceCode.getScope(node))?.defs.length;

    return {
      CallExpression(node: TSESTree.CallExpression) {
        handlers.visit(node);
        const request = httpRequestOf(node, sourceCode.getScope(node), builtBy);
        for (const target of request?.targets ?? [])
          candidates.push({ call: node, target, client: request!.client });
      },

      'Program:exit'() {
        const carries = createFlow(
          sourceCode,
          (fn) => handlers.roots.get(fn),
          (node, follow) => {
            // A URL object points wherever its input does.
            if (isUrlConstructor(node)) {
              for (const arg of node.arguments) {
                const t = follow(arg);
                if (t?.kind === 'value') return t;
              }
              return null;
            }
            if (node.type !== 'CallExpression') return undefined;
            const helper = resolveFunction(
              node.callee,
              sourceCode.getScope(node),
            );
            return helper !== undefined && guards.sanitizes(helper)
              ? null
              : undefined;
          },
        );

        const value = (node: TSESTree.Node): Taint | null => {
          const t = carries(node);
          return t?.kind === 'value' ? t : null;
        };

        /**
         * The argument that decides the origin of `node`, or null when the
         * origin is fixed in code (or nothing here is an argument).
         */
        const originOf = (node: TSESTree.Node, depth: number): Taint | null => {
          if (depth > 8) return null;
          const parts = textParts(node);
          if (parts !== undefined) {
            let prefix = '';
            for (const part of parts) {
              if (typeof part === 'string') {
                prefix += part;
                continue;
              }
              const t = value(part);
              if (t) return authorityOpen(prefix) ? t : null;
              const fixed = resolve(part);
              prefix += (fixed && staticString(fixed)) ?? OPAQUE;
            }
            return null;
          }
          if (isUrlConstructor(node)) {
            const [input, base] = node.arguments;
            if (input === undefined) return null;
            const t = originOf(input, depth + 1);
            if (t) return t;
            // A relative input leaves the origin to the base.
            return staticString(input) !== null && base !== undefined
              ? originOf(base, depth + 1)
              : null;
          }
          if (node.type === 'Identifier') {
            const init = constInitializer(node, sourceCode.getScope(node));
            if (init !== undefined) return originOf(init, depth + 1);
          }
          return value(node);
        };

        const guards = createGuards(
          sourceCode,
          (variable) => {
            const name = variable.defs[0]?.name;
            return name !== undefined && carries(name) !== null;
          },
          (node, involves) => {
            if (node.type === 'BinaryExpression') {
              if (!COMPARISONS.has(node.operator)) return false;
              return [node.left, node.right].some(
                (side) =>
                  side.type === 'MemberExpression' &&
                  ORIGIN_MEMBERS.has(propertyName(side) ?? '') &&
                  involves(side.object),
              );
            }
            if (node.type !== 'CallExpression') return false;
            // Sending the request is not checking where it goes.
            if (httpRequestOf(node, sourceCode.getScope(node), builtBy))
              return false;
            if (node.callee.type === 'MemberExpression') {
              const method = propertyName(node.callee);
              if (method !== null && STRING_DERIVING.has(method)) return false;
              if (involves(node.callee.object)) return true;
            }
            return node.arguments.some(involves);
          },
        );

        for (const { call, target, client } of candidates) {
          const taint = originOf(target, 0);
          if (taint === null || guards.guarded(call, target)) continue;
          context.report({
            node: target,
            messageId: 'toolArgToRequestHost',
            data: { arg: taint.text, client },
          });
        }
      },
    };
  },
});

/**
 * A template or `+` chain as its fixed text and its interpolations, in order,
 * or `undefined` for any other expression.
 */
function textParts(
  node: TSESTree.Node,
): Array<string | TSESTree.Node> | undefined {
  if (node.type === 'TemplateLiteral') {
    const parts: Array<string | TSESTree.Node> = [];
    node.quasis.forEach((quasi, i) => {
      // Raw text: only delimiters are looked for, and an escape cannot hide one.
      parts.push(quasi.value.raw);
      const expression = node.expressions[i];
      if (expression) parts.push(expression);
    });
    return parts;
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const side = (n: TSESTree.Node): Array<string | TSESTree.Node> => {
      const text = staticString(n);
      if (text !== null) return [text];
      return textParts(n) ?? [n];
    };
    return [...side(node.left), ...side(node.right)];
  }
  return undefined;
}
