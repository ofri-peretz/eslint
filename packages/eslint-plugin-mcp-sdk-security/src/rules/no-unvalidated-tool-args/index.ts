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

import {
  TSESTree,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import { fileUsesMcpSdk } from '../../utils/mcp-evidence';
import { valueResolverFor } from '../../utils/module-resolver';
import {
  configSchema,
  propertyKey,
  readRegistration,
  resolveFunction,
  schemaFields,
  toolNameOf,
} from '../../utils/tool-registration';

export { propertyKey };

type MessageIds = 'undeclaredArg' | 'undeclaredArgPassthrough';

/**
 * The keys an inline `registerTool` config's `inputSchema` declares, or
 * `undefined` if it cannot be read.
 *
 * `undefined` means "do not judge this registration". A schema whose key set
 * is not written at the call — `buildSchema()`, `SharedSchema`, a spread, a
 * spread after `inputSchema` that can replace it — may declare anything, and
 * reporting against a shape this file cannot see would flag correct code. A
 * raw shape and an object schema written in place (`z.object({ … })`) are both
 * read.
 */
export function declaredSchemaKeys(
  config: TSESTree.ObjectExpression,
): Set<string> | undefined {
  const schema = configSchema(config);
  if (schema.kind !== 'schema') return undefined;
  const read = schemaFields(schema.node);
  return read === undefined ? undefined : new Set(read.fields.keys());
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
        documentationLink:
          'https://modelcontextprotocol.io/docs/concepts/tools',
      }),
      undeclaredArgPassthrough: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP Tool Argument Passed Through Unvalidated',
        cwe: 'CWE-20',
        owasp: 'A03:2021',
        cvss: 7.5,
        description:
          'Tool "{{tool}}" reads `{{arg}}`, which its inputSchema does not declare, and the schema is loose (passthrough) — so the value reaches the handler exactly as the model sent it',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Declare `{{arg}}` in the inputSchema with the type and constraints it needs. A loose schema validates the declared keys and waves every other key through.',
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
    // Names in a legacy params shape resolve through consts and relative
    // imports, so `{ path: PathSchema }` reads as the schema it is.
    const resolve = valueResolverFor(context);
    const candidates: Array<{
      node: TSESTree.Node;
      tool: string;
      arg: string;
      messageId: MessageIds;
    }> = [];

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const registration = readRegistration(node, resolve);
        // No readable schema means no contract to check against. That is
        // require-tool-input-schema's question, not this rule's.
        if (registration?.schema.kind !== 'schema') return;
        const declared = schemaFields(registration.schema.node);
        if (declared === undefined) return;

        const handler = resolveFunction(
          registration.handler,
          context.sourceCode.getScope(node),
        );
        if (handler === undefined) return;

        for (const read of destructuredArgNames(handler)) {
          if (declared.fields.has(read.name)) continue;
          candidates.push({
            node: read.node,
            tool: toolNameOf(node),
            arg: read.name,
            messageId: declared.loose
              ? 'undeclaredArgPassthrough'
              : 'undeclaredArg',
          });
        }
      },

      'Program:exit'() {
        for (const { node, tool, arg, messageId } of candidates) {
          context.report({ node, messageId, data: { tool, arg } });
        }
      },
    };
  },
});
