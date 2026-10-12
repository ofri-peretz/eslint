/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow two MCP tools with the same name on one server
 * @description A tool name is the identifier a client calls. Two tools with
 * one name do not both exist:
 *
 *   - `McpServer` throws `Tool X is already registered` at startup. The
 *     duplicate either crashes the server, or — behind a `try`/`catch` or a
 *     conditional factory — silently keeps the FIRST handler while the author
 *     believes the second one runs.
 *   - The low-level `Server` has no such check. Its `tools/list` response
 *     shows clients two tools with one name, and which one a `tools/call`
 *     reaches is decided by the call handler alone, not by the description
 *     the model chose from.
 *
 * ## What is reported
 *
 * Two `registerTool` / legacy `tool` calls in one file that give the same
 * static name (a literal, or a const resolved here or in a relative module) to
 * the same server variable, when both run: on the path from either call up to
 * their lowest common ancestor there is no `if` / `else` branch, ternary
 * branch, `switch` case, `&&` / `||` right operand, loop body, `catch` block
 * or function boundary. And, in a `setRequestHandler(ListToolsRequestSchema |
 * 'tools/list', …)` handler, an array of tool objects (inline or in a
 * same-file const) in which two elements have the same static `name`.
 *
 * A `switch` with duplicate case labels is core ESLint's `no-duplicate-case`,
 * and is out of scope.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/server/tools
 */
import {
  TSESTree,
  TSESLint,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';
import { fileUsesMcpSdk } from '../../utils/mcp-evidence';
import { valueResolverFor } from '../../utils/module-resolver';
import { mcpExport } from '../../utils/tool-handlers';
import {
  constInitializer,
  isFunctionNode,
  lookupVariable,
  propertyKey,
  readRegistration,
  resolveFunction,
} from '../../utils/tool-registration';
import { returnedExpressions } from '../../utils/value-flow';

type MessageIds = 'duplicateToolRegistration' | 'duplicateListedTool';

/** Loop statements: their body may run any number of times, including zero. */
const LOOPS = new Set([
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
]);

/** Does control reach `child` only on some runs of `parent`? */
function isBranch(child: TSESTree.Node, parent: TSESTree.Node): boolean {
  switch (parent.type) {
    case 'IfStatement':
    case 'ConditionalExpression':
      return child !== parent.test;
    case 'LogicalExpression':
      return child === parent.right;
    case 'SwitchCase':
    case 'CatchClause':
      return true;
    default:
      if (LOOPS.has(parent.type))
        return child === (parent as TSESTree.ForStatement).body;
      return isFunctionNode(parent);
  }
}

/** The node and its ancestors, nearest first. */
function ancestry(node: TSESTree.Node): TSESTree.Node[] {
  const chain: TSESTree.Node[] = [];
  for (let n: TSESTree.Node | undefined = node; n; n = n.parent) chain.push(n);
  return chain;
}

/** Do both calls run whenever their lowest common ancestor does? */
export function bothRun(a: TSESTree.Node, b: TSESTree.Node): boolean {
  const above = new Set(ancestry(b));
  const lca = ancestry(a).find((n) => above.has(n));
  const straight = (from: TSESTree.Node): boolean => {
    for (let n = from; n !== lca && n.parent; n = n.parent)
      if (isBranch(n, n.parent)) return false;
    return true;
  };
  return straight(a) && straight(b);
}

/** Peel `as const`, `satisfies` and `!` off an expression. */
function unwrap(node: TSESTree.Node): TSESTree.Node {
  while (
    node.type === 'TSAsExpression' ||
    node.type === 'TSSatisfiesExpression' ||
    node.type === 'TSNonNullExpression'
  )
    node = node.expression;
  return node;
}

export const noDuplicateToolName = createRule<[], MessageIds>({
  name: 'no-duplicate-tool-name',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/no-duplicate-tool-name.md',
      description:
        'Disallow registering or listing two MCP tools with the same name on one server',
      cwe: 'CWE-694',
      cvss: 5.3,
    },
    messages: {
      duplicateToolRegistration: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Duplicate MCP Tool Registration',
        cwe: 'CWE-694',
        owasp: 'A04:2021',
        cvss: 5.3,
        description:
          'Tool `{{name}}` is already registered on this server at line {{line}}. McpServer throws on the second registration, so the server crashes at startup, or (behind a try/catch) keeps the first handler while this one never runs',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Give each tool a unique name, or register only one of them (choose with if/else when they are alternatives).',
        documentationLink:
          'https://modelcontextprotocol.io/specification/2025-06-18/server/tools',
      }),
      duplicateListedTool: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Duplicate Tool in tools/list',
        cwe: 'CWE-694',
        owasp: 'A04:2021',
        cvss: 5.3,
        description:
          'Tool `{{name}}` is already listed at line {{line}}. Clients see two tools with one name, and which one a call reaches is decided by the call handler alone, not by the description the model chose from',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Give each listed tool a unique name, and keep the tools/list response and the tools/call dispatch built from one table.',
        documentationLink:
          'https://modelcontextprotocol.io/specification/2025-06-18/server/tools',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!fileUsesMcpSdk(context.sourceCode.ast)) return {};
    const sourceCode = context.sourceCode;
    const resolve = valueResolverFor(context);
    /** Server variable → tool name → the registrations seen so far. */
    const registered = new Map<
      TSESLint.Scope.Variable,
      Map<string, TSESTree.CallExpression[]>
    >();
    const listed = new Set<TSESTree.ArrayExpression>();

    /** A static name: a literal, or a const it resolves to. */
    function nameOf(node: TSESTree.Node): string | null {
      const direct = staticString(node);
      if (direct !== null) return direct;
      const value =
        node.type === 'Identifier' || node.type === 'MemberExpression'
          ? resolve(node)
          : undefined;
      return value === undefined ? null : staticString(value);
    }

    /** A same-file const's initializer for an identifier, else the node. */
    function inFile(
      node: TSESTree.Node,
      scope: TSESLint.Scope.Scope,
    ): TSESTree.Node | undefined {
      node = unwrap(node);
      return node.type === 'Identifier' ? constInitializer(node, scope) : node;
    }

    function checkRegistration(node: TSESTree.CallExpression): void {
      const registration = readRegistration(node, resolve);
      if (registration?.handler === undefined) return;
      const receiver = (node.callee as TSESTree.MemberExpression).object;
      if (receiver.type !== 'Identifier') return;
      const variable = lookupVariable(receiver.name, sourceCode.getScope(node));
      // A registration with a handler has at least a name and a callback.
      const name = nameOf(node.arguments[0]!);
      if (variable === undefined || name === null) return;
      let names = registered.get(variable);
      if (names === undefined) registered.set(variable, (names = new Map()));
      const earlier = names.get(name) ?? [];
      names.set(name, [...earlier, node]);
      const first = earlier.find((prev) => bothRun(prev, node));
      if (first === undefined) return;
      context.report({
        node: node.arguments[0]!,
        messageId: 'duplicateToolRegistration',
        data: { name, line: String(first.loc.start.line) },
      });
    }

    function checkList(node: TSESTree.CallExpression): void {
      const scope = sourceCode.getScope(node);
      const [method, handler] = node.arguments;
      if (
        method === undefined ||
        (staticString(method) !== 'tools/list' &&
          mcpExport(method, scope) !== 'ListToolsRequestSchema')
      )
        return;
      const fn = resolveFunction(handler, scope);
      if (fn === undefined) return;
      for (const returned of returnedExpressions(fn)) {
        const result = unwrap(returned);
        if (result.type !== 'ObjectExpression') continue;
        for (const prop of result.properties) {
          if (prop.type !== 'Property' || propertyKey(prop) !== 'tools')
            continue;
          const array = inFile(prop.value, scope);
          if (array?.type === 'ArrayExpression') checkArray(array, scope);
        }
      }
    }

    function checkArray(
      array: TSESTree.ArrayExpression,
      scope: TSESLint.Scope.Scope,
    ): void {
      if (listed.has(array)) return;
      listed.add(array);
      const seen = new Map<string, TSESTree.Node>();
      for (const element of array.elements) {
        if (element === null || element.type === 'SpreadElement') continue;
        const tool = inFile(element, scope);
        if (tool?.type !== 'ObjectExpression') continue;
        let name: string | null = null;
        for (const prop of tool.properties)
          if (prop.type === 'Property' && propertyKey(prop) === 'name')
            name = nameOf(prop.value);
        if (name === null) continue;
        const first = seen.get(name);
        if (first === undefined) {
          seen.set(name, element);
          continue;
        }
        context.report({
          node: element,
          messageId: 'duplicateListedTool',
          data: { name, line: String(first.loc.start.line) },
        });
      }
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'MemberExpression') return;
        if (propertyName(node.callee) === 'setRequestHandler') checkList(node);
        else checkRegistration(node);
      },
    };
  },
});
