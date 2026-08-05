/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow reading a tool argument the input schema does not declare
 * @description `require-tool-input-schema` makes sure a schema exists. This
 * rule makes that schema *mean* something, by checking the handler only reads
 * keys the schema declares.
 *
 * A schema is a contract with two sides, and only one of them is enforced at
 * runtime. The SDK validates what arrives against the declared shape; nothing
 * checks that the handler confines itself to the same shape. When it does not,
 * one of two things is true, and neither is fine:
 *
 *   - The value was stripped, so the handler reads `undefined` and the tool is
 *     quietly broken in a way no test with a well-formed call will catch.
 *   - The value was *not* stripped — a passthrough schema, a hand-rolled
 *     validator, a server that skips validation — in which case the handler is
 *     reading raw model-controlled input that passed no check at all, while
 *     every reviewer assumes the schema covered it.
 *
 * The second is the security case, and it is invisible precisely because the
 * schema *looks* like it covers the handler.
 *
 *     server.registerTool('read', { inputSchema: { path: z.string() } },
 *       async ({ path, encoding }) => {          // `encoding` is not declared
 *         return readFile(path, encoding);
 *       });
 *
 * Both sides are statically visible in the same expression, so this needs no
 * inference: the declared keys and the read keys are right there.
 *
 * @see https://modelcontextprotocol.io/docs/concepts/tools
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'undeclaredArg';

const MCP_MODULE_PREFIX = '@modelcontextprotocol/sdk';

const REGISTER_TOOL = 'registerTool';
const LEGACY_TOOL = 'tool';

/** The statically-readable key name of a property, or `undefined`. */
export function propertyKey(prop: TSESTree.ObjectLiteralElement): string | undefined {
  if (prop.type !== 'Property' || prop.computed) return undefined;
  if (prop.key.type === 'Identifier') return prop.key.name;
  if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') return prop.key.value;
  return undefined;
}

/**
 * The keys an `inputSchema` declares, or `undefined` if it cannot be read.
 *
 * `undefined` means "do not judge this registration". A schema built by a call
 * (`z.object({...})`, `buildSchema()`) or spread from elsewhere may declare
 * anything, and reporting against a shape this file cannot see would flag
 * correct code.
 */
export function declaredSchemaKeys(
  config: TSESTree.ObjectExpression,
): Set<string> | undefined {
  for (const prop of config.properties) {
    if (propertyKey(prop) !== 'inputSchema') continue;
    const value = (prop as TSESTree.Property).value;
    if (value.type !== 'ObjectExpression') return undefined;

    const keys = new Set<string>();
    for (const entry of value.properties) {
      // A spread could contribute any key, so the whole schema becomes
      // unreadable rather than partially known.
      if (entry.type === 'SpreadElement') return undefined;
      const key = propertyKey(entry);
      if (key === undefined) return undefined;
      keys.add(key);
    }
    return keys;
  }
  return undefined;
}

/**
 * Argument names a handler reads out of its first parameter.
 *
 * Only the destructured form is read. `async (args) => …` hands the whole
 * object around, and following every `args.x` through the body is the
 * data-flow analysis this rule is built to avoid — the destructured shape is
 * where the mismatch is visible in one place, and it is also the shape the SDK
 * documentation uses.
 */
export function destructuredArgNames(
  handler: TSESTree.Node,
): Array<{ name: string; node: TSESTree.Node }> {
  if (
    handler.type !== 'ArrowFunctionExpression' &&
    handler.type !== 'FunctionExpression' &&
    handler.type !== 'FunctionDeclaration'
  ) {
    return [];
  }
  const first = handler.params[0];
  if (first === undefined || first.type !== 'ObjectPattern') return [];

  const found: Array<{ name: string; node: TSESTree.Node }> = [];
  for (const prop of first.properties) {
    // A rest element collects whatever is left; it names no specific key.
    if (prop.type === 'RestElement') continue;
    const key = propertyKey(prop);
    if (key === undefined) continue;
    found.push({ name: key, node: prop });
  }
  return found;
}

export const noUnvalidatedToolArgs = createRule<[], MessageIds>({
  name: 'no-unvalidated-tool-args',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/no-unvalidated-tool-args.md',
      description:
        'Disallow a tool handler reading an argument its declared input schema does not include',
      cwe: 'CWE-20',
      cvss: 7.5,
    },
    messages: {
      undeclaredArg: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP Tool Argument Outside the Declared Schema',
        cwe: 'CWE-20',
        owasp: 'A03:2021',
        cvss: 7.5,
        description:
          'Tool "{{tool}}" reads `{{arg}}`, which its inputSchema does not declare — so the value either arrives unvalidated or never arrives at all',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Declare `{{arg}}` in the inputSchema with the type and constraints it needs, or stop reading it. A key the schema does not mention is one nothing validated.',
        documentationLink: 'https://modelcontextprotocol.io/docs/concepts/tools',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    let importsMcpSdk = false;
    const candidates: Array<{ node: TSESTree.Node; tool: string; arg: string }> = [];

    function toolNameOf(node: TSESTree.CallExpression): string {
      const first = node.arguments[0];
      if (first?.type === 'Literal' && typeof first.value === 'string') return first.value;
      return 'unknown';
    }

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.source.value.startsWith(MCP_MODULE_PREFIX)) importsMcpSdk = true;
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments[0]?.type === 'Literal' &&
          typeof node.arguments[0].value === 'string' &&
          node.arguments[0].value.startsWith(MCP_MODULE_PREFIX)
        ) {
          importsMcpSdk = true;
          return;
        }

        if (node.callee.type !== 'MemberExpression' || node.callee.computed) return;
        if (node.callee.property.type !== 'Identifier') return;
        const method = node.callee.property.name;
        if (method !== REGISTER_TOOL && method !== LEGACY_TOOL) return;

        const config = node.arguments[1];
        if (config?.type !== 'ObjectExpression') return;

        const declared = declaredSchemaKeys(config);
        // No readable schema means no contract to check against. That is
        // require-tool-input-schema's question, not this rule's.
        if (declared === undefined) return;

        const handler = node.arguments[node.arguments.length - 1];
        if (handler === undefined) return;

        for (const read of destructuredArgNames(handler)) {
          if (declared.has(read.name)) continue;
          candidates.push({ node: read.node, tool: toolNameOf(node), arg: read.name });
        }
      },

      'Program:exit'() {
        if (!importsMcpSdk) return;
        for (const { node, tool, arg } of candidates) {
          context.report({ node, messageId: 'undeclaredArg', data: { tool, arg } });
        }
      },
    };
  },
});
