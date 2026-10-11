/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Report a schema-less MCP tool whose handler reads arguments
 * @description A tool registered without an input schema is called by the SDK
 * as `handler(extra)` — v1's `executeToolHandler`, v2's `createToolExecutor`.
 * No client argument reaches it. That makes a schema-less *zero-argument* tool
 * (`get_time`, `list_projects`) perfectly correct, and this rule silent on it.
 *
 * What is wrong is a schema-less handler that *expects* arguments:
 *
 *     server.registerTool('read_file', { description: 'Read a file' },
 *       async ({ path }) => readFile(path));   // `path` is read off `extra`
 *
 * The arguments it reads were never declared, so nothing validated them, and
 * the SDK never delivers them — the handler is reading the request context.
 * The fix is the same in both readings: declare the schema.
 *
 * The test is structural: the handler destructures a key, or reads a named
 * property off its first parameter, that is not one of the context's own keys
 * — or it declares a second parameter, which without a schema is always
 * `undefined`.
 * @see https://modelcontextprotocol.io/docs/concepts/tools
 */

import {
  TSESTree,
  TSESLint,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';
import { fileUsesMcpSdk } from '../../utils/mcp-evidence';
import {
  HANDLER_CONTEXT_KEYS,
  readRegistration,
  resolveFunction,
  propertyKey,
  toolNameOf,
  type FunctionNode,
} from '../../utils/tool-registration';

type MessageIds = 'missingInputSchema';

/**
 * The first argument the handler reads that the request context does not
 * carry, or `undefined` when it reads none.
 */
export function argumentRead(
  fn: FunctionNode,
  declaredVariables: (
    node: TSESTree.Node,
  ) => readonly TSESLint.Scope.Variable[],
): string | undefined {
  let first = fn.params[0];
  if (first?.type === 'AssignmentPattern') first = first.left;
  if (fn.params.length >= 2) {
    // `(args, extra)` — with no schema the SDK passes one value, so the second
    // parameter is always undefined and the first is not the arguments.
    return first?.type === 'Identifier' ? first.name : 'args';
  }
  if (first?.type === 'ObjectPattern') {
    for (const prop of first.properties) {
      const key = propertyKey(prop);
      if (key !== undefined && !HANDLER_CONTEXT_KEYS.has(key)) return key;
    }
    return undefined;
  }
  if (first?.type !== 'Identifier') return undefined;
  // A parameter always declares its own variable on the function.
  const variable = declaredVariables(fn).find((v) => v.name === first.name)!;
  for (const ref of variable.references) {
    const parent = ref.identifier.parent;
    if (parent?.type !== 'MemberExpression' || parent.object !== ref.identifier)
      continue;
    const key = propertyName(parent);
    if (key !== null && !HANDLER_CONTEXT_KEYS.has(key))
      return `${first.name}.${key}`;
  }
  return undefined;
}

export const requireToolInputSchema = createRule<[], MessageIds>({
  name: 'require-tool-input-schema',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/require-tool-input-schema.md',
      description:
        'Require an input schema when an MCP tool handler reads arguments',
      cwe: 'CWE-20',
      cvss: 5.3,
    },
    messages: {
      missingInputSchema: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP Tool Handler Reads Arguments No Schema Declares',
        cwe: 'CWE-20',
        owasp: 'A03:2021',
        cvss: 5.3,
        description:
          'Tool "{{tool}}" declares no inputSchema, yet its handler reads `{{arg}}`. Without a schema the SDK passes the request context there, not the client\'s arguments — nothing declared or validated what the handler expects',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Declare the arguments the handler reads: registerTool("{{tool}}", { inputSchema: { path: z.string() } }, handler)',
        documentationLink:
          'https://modelcontextprotocol.io/docs/concepts/tools',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Asked once, up front, over the whole AST. The two-visitor gate this
    // replaces saw ESM and `require()` only, so import-equals and dynamic
    // `import()` files ran no rule at all.
    if (!fileUsesMcpSdk(context.sourceCode.ast)) return {};
    // Registrations are collected and judged at Program:exit so the rule does
    // not depend on the import appearing above them.
    const candidates: Array<{
      node: TSESTree.CallExpression;
      tool: string;
      arg: string;
    }> = [];

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const registration = readRegistration(node);
        if (registration?.schema.kind !== 'none') return;
        // A handler this file cannot see cannot be judged.
        const fn = resolveFunction(
          registration.handler,
          context.sourceCode.getScope(node),
        );
        if (fn === undefined) return;
        const arg = argumentRead(fn, (n) =>
          context.sourceCode.getDeclaredVariables(n),
        );
        if (arg !== undefined)
          candidates.push({ node, tool: toolNameOf(node), arg });
      },

      'Program:exit'() {
        for (const { node, tool, arg } of candidates) {
          context.report({
            node,
            messageId: 'missingInputSchema',
            data: { tool, arg },
          });
        }
      },
    };
  },
});
