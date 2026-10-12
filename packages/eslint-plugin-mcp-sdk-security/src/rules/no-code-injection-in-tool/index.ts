/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow an MCP tool argument being evaluated as code
 * @description "Calculator" and "run a snippet" tools evaluate what the model
 * sends them. The model can be steered by anything it has read, so the
 * expression it sends is attacker-chosen — and `eval` / `new Function` / `vm`
 * run it with the server's full privileges (`vm` is not a security boundary,
 * and vm2 has a history of sandbox escapes).
 *
 *     server.registerTool('calc', { inputSchema: { expr: z.string() } },
 *       async ({ expr }) => ({ content: [{ type: 'text', text: String(eval(expr)) }] }));
 *
 * ## What is reported
 *
 * A tool argument (or resource-template variable) reaching, directly or
 * through any derivation `utils/value-flow` follows:
 *
 *   - the global `eval(...)`, `Function(...)` / `new Function(...)` (every
 *     argument is code), and a string passed to the global `setTimeout` /
 *     `setInterval`;
 *   - `vm.runInNewContext`, `runInThisContext`, `runInContext`,
 *     `compileFunction`, `new vm.Script(...)` and `new vm.SourceTextModule(...)`,
 *     resolved to `node:vm`;
 *   - `run(...)` on a `VM` / `NodeVM` instance from `vm2`.
 *
 * Globals count only when nothing local shadows them; `vm` exports are
 * resolved to the module, never matched by name.
 *
 * ## Overlap
 *
 * `node-security/detect-eval-with-expression` and `browser-security/no-eval`
 * report a non-literal `eval` anywhere. Inside an MCP tool handler the source
 * is the handler's own parameter, so this rule owns the finding there (owner
 * decision, 2026-10: tool handlers are this plugin's scope). Both may report
 * one line.
 *
 * @see https://cwe.mitre.org/data/definitions/95.html
 */
import {
  TSESTree,
  TSESLint,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';
import {
  createInstanceResolver,
  type Construction,
} from '../../utils/instances';
import { fileUsesMcpSdk } from '../../utils/mcp-evidence';
import { valueResolverFor } from '../../utils/module-resolver';
import { createHandlerCollector } from '../../utils/tool-handlers';
import { lookupVariable } from '../../utils/tool-registration';
import { createFlow } from '../../utils/value-flow';

type MessageIds = 'toolArgToCode';

/** Globals whose argument is evaluated as code. `Function` evaluates them all. */
const CODE_GLOBALS = new Set(['eval', 'Function', 'setTimeout', 'setInterval']);

/** `node:vm` exports whose first argument is source text. */
const VM_SINKS = new Set([
  'runInNewContext',
  'runInThisContext',
  'runInContext',
  'compileFunction',
  'Script',
  'SourceTextModule',
]);

/** `vm2` classes whose instances `run(code)`. */
const VM2_CLASSES = new Set(['VM', 'NodeVM']);

/**
 * The sink a call or `new` is, and the argument positions holding code — or
 * undefined when it is not one.
 */
function codeSinkOf(
  node: TSESTree.CallExpression | TSESTree.NewExpression,
  scope: TSESLint.Scope.Scope,
  builtBy: (node: TSESTree.Node) => Construction | undefined,
): { sink: string; code: TSESTree.Node[] } | undefined {
  const { callee } = node;
  const first = node.arguments.slice(0, 1);
  if (
    callee.type === 'Identifier' &&
    CODE_GLOBALS.has(callee.name) &&
    !lookupVariable(callee.name, scope)?.defs.length
  ) {
    return {
      sink: callee.name,
      code: callee.name === 'Function' ? [...node.arguments] : first,
    };
  }
  const binding = resolveModuleBinding(callee, scope);
  if (binding?.module === 'vm') {
    const name = binding.path.join('.');
    return VM_SINKS.has(name) ? { sink: `vm.${name}`, code: first } : undefined;
  }
  // `new VM().run(code)`, `const vm = new NodeVM(); vm.run(code)`.
  if (callee.type !== 'MemberExpression' || propertyName(callee) !== 'run')
    return undefined;
  const instance = builtBy(callee.object);
  return instance?.module === 'vm2' && VM2_CLASSES.has(instance.path.join('.'))
    ? { sink: `vm2.${instance.path.join('.')}.run`, code: first }
    : undefined;
}

export const noCodeInjectionInTool = createRule<[], MessageIds>({
  name: 'no-code-injection-in-tool',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/no-code-injection-in-tool.md',
      description:
        'Disallow an MCP tool argument reaching eval, new Function or a vm context as code',
      cwe: 'CWE-95',
      cvss: 9.8,
    },
    messages: {
      toolArgToCode: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP Tool Argument Evaluated as Code',
        cwe: 'CWE-95',
        owasp: 'A03:2021',
        cvss: 9.8,
        description:
          'Tool argument `{{arg}}` is evaluated as code by `{{sink}}`, so whatever steers the model runs arbitrary JavaScript with this server’s privileges',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'NIST-CSF'],
        fix: 'Do not evaluate the argument. Parse it with a grammar that only accepts what the tool needs (an arithmetic expression parser such as mathjs’ `evaluate` with a restricted scope, `JSON.parse` for data), or map it to a fixed set of operations. `node:vm` is not a sandbox; untrusted code needs a separate process or isolate with no host access.',
        documentationLink:
          'https://nodejs.org/api/vm.html#vm-executing-javascript',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!fileUsesMcpSdk(context.sourceCode.ast)) return {};
    const resolve = valueResolverFor(context);
    const builtBy = createInstanceResolver(context);
    const handlers = createHandlerCollector(context, resolve, 'arguments');
    const candidates: Array<{ node: TSESTree.Node; sink: string }> = [];

    const collect = (
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ) => {
      const found = codeSinkOf(
        node,
        context.sourceCode.getScope(node),
        builtBy,
      );
      for (const code of found?.code ?? [])
        candidates.push({ node: code, sink: found!.sink });
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        handlers.visit(node);
        collect(node);
      },
      NewExpression: collect,

      'Program:exit'() {
        const carries = createFlow(context.sourceCode, (fn) =>
          handlers.roots.get(fn),
        );
        for (const { node, sink } of candidates) {
          const inner = node.type === 'SpreadElement' ? node.argument : node;
          const taint = carries(inner);
          if (taint?.kind !== 'value') continue;
          context.report({
            node,
            messageId: 'toolArgToCode',
            data: { arg: taint.text, sink },
          });
        }
      },
    };
  },
});
