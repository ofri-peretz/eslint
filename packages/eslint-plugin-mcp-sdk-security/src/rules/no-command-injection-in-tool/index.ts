/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow an MCP tool argument reaching a shell or process sink
 * @description A tool handler's parameter is attacker-influenced by
 * construction. It is filled from the model's tool call, and the model can be
 * steered by any content it has read — a web page, a file, another tool's
 * output. Treating it as trusted input is the MCP equivalent of trusting
 * `req.body`.
 *
 * ## Why this is not `node-security/no-shell-injection`
 *
 * That rule is deliberately shape-based and says so in its own header:
 *
 *     Does NOT fire on:
 *       - exec(variable) — indirect; data-flow analysis required, out of scope
 *
 * It reports `exec(`git ${cmd}`)` because the concatenation is visible, and
 * stays silent on `exec(cmd)` because proving what `cmd` holds needs data-flow
 * analysis it does not do.
 *
 * Inside an MCP tool handler that analysis is not needed. The taint source is
 * the handler's own parameter, declared in the same expression:
 *
 *     server.registerTool('run', { inputSchema: { cmd: z.string() } },
 *       async ({ cmd }) => {
 *         await execSync(cmd);           // ← nothing reports this today
 *         await execSync(`ls ${cmd}`);   // ← no-shell-injection already reports
 *       });
 *
 * So this rule takes the half its sibling declines: a sink whose command comes
 * *directly* from a tool argument. The concatenated shape is left to
 * `node-security`, which keeps the two from reporting the same line — the
 * taxonomy contract's hard rule.
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

type MessageIds = 'toolArgToShell';

const REGISTER_TOOL = 'registerTool';
const LEGACY_TOOL = 'tool';

/**
 * `child_process` entry points whose first argument names what gets run.
 *
 * `spawn`/`execFile` are included even though their *arguments* are passed
 * safely as an array: the first parameter is still the executable, and a tool
 * argument landing there means the caller chooses the binary.
 */
const PROCESS_SINKS = new Set([
  'exec',
  'execSync',
  'execFile',
  'execFileSync',
  'spawn',
  'spawnSync',
  'fork',
]);

/**
 * Is this expression built by concatenation or interpolation?
 *
 * Those shapes belong to `node-security/no-shell-injection`, which already
 * reports them. Skipping them here is what keeps one line from carrying a
 * finding from two plugins.
 */
export function isBuiltString(node: TSESTree.Node): boolean {
  if (node.type === 'TemplateLiteral') return node.expressions.length > 0;
  if (node.type === 'BinaryExpression' && node.operator === '+') return true;
  return false;
}

/**
 * The names a tool handler's first parameter binds.
 *
 * Two shapes, because both are idiomatic:
 *
 *   - `async ({ cmd, path }) => …` — destructured; each property is a name.
 *   - `async (args) => …` — whole object; `args.cmd` counts, `args` alone does
 *     not, since passing the object itself to a sink is not a command.
 *
 * A nested or defaulted pattern (`{ cmd = 'ls' }`, `{ a: { b } }`) yields the
 * names it binds; anything else contributes nothing rather than guessing.
 */
export function handlerArgNames(handler: TSESTree.Node): {
  direct: Set<string>;
  objects: Set<string>;
} {
  const direct = new Set<string>();
  const objects = new Set<string>();

  if (
    handler.type !== 'ArrowFunctionExpression' &&
    handler.type !== 'FunctionExpression' &&
    handler.type !== 'FunctionDeclaration'
  ) {
    return { direct, objects };
  }

  const first = handler.params[0];
  if (first === undefined) return { direct, objects };

  if (first.type === 'Identifier') {
    objects.add(first.name);
    return { direct, objects };
  }

  if (first.type === 'ObjectPattern') {
    collectPatternNames(first, direct, objects);
  }
  return { direct, objects };
}

/**
 * Every identifier an object pattern binds, following nesting and defaults.
 *
 * A rest element is sorted into `objects`, not `direct`: `{ ...rest }` binds an
 * *object*, so `rest` is never itself a command, while `rest.cmd` is exactly as
 * attacker-controlled as `args.cmd`.
 */
function collectPatternNames(
  pattern: TSESTree.ObjectPattern,
  into: Set<string>,
  objects: Set<string>,
): void {
  for (const prop of pattern.properties) {
    if (prop.type === 'RestElement') {
      // In a parameter position the grammar only permits `{ ...name }`, so the
      // argument is always a plain Identifier. No guard, because there is no
      // input that reaches its other arm.
      objects.add((prop.argument as TSESTree.Identifier).name);
      continue;
    }
    let value: TSESTree.Node = prop.value;
    if (value.type === 'AssignmentPattern') value = value.left;
    if (value.type === 'Identifier') into.add(value.name);
    else if (value.type === 'ObjectPattern')
      collectPatternNames(value, into, objects);
  }
}

export const noCommandInjectionInTool = createRule<[], MessageIds>({
  name: 'no-command-injection-in-tool',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/no-command-injection-in-tool.md',
      description:
        'Disallow an MCP tool argument being used directly as the command in a child_process call',
      cwe: 'CWE-78',
      cvss: 9.8,
    },
    messages: {
      toolArgToShell: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP Tool Argument Reaches a Process Sink',
        cwe: 'CWE-78',
        owasp: 'A03:2021',
        cvss: 9.8,
        description:
          'Tool argument `{{arg}}` is passed straight to `{{sink}}()`, so whatever steers the model chooses what runs on this host',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'NIST-CSF'],
        fix: 'Do not let the argument name the command. Map it through a fixed allowlist of permitted operations, and pass user data as an argv array element — `execFile(ALLOWED[op], [value])` — never as the executable.',
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
    /** Handler bodies, with the argument names each one binds. */
    const handlers: Array<{
      range: readonly [number, number];
      direct: Set<string>;
      objects: Set<string>;
    }> = [];
    const candidates: Array<{
      node: TSESTree.Node;
      arg: string;
      sink: string;
    }> = [];

    /**
     * The *innermost* handler enclosing this node, if any.
     *
     * `handlers` is filled in traversal order, so an outer registration is
     * pushed before an inner one. Taking the first match would pick the outer
     * handler, whose parameter names are not the ones in scope at the sink —
     * so an inner handler's argument reaching a sink would be silently
     * skipped. Narrowest range wins.
     */
    function enclosingHandler(node: TSESTree.Node) {
      // ESLint visits CallExpression top-down, so `handlers` is ordered
      // outermost-first. The *last* enclosing match is therefore the innermost
      // one, and no size comparison is needed — a comparison here would carry
      // an arm no traversal order can reach.
      let innermost: (typeof handlers)[number] | undefined;
      for (const h of handlers) {
        if (node.range[0] >= h.range[0] && node.range[1] <= h.range[1])
          innermost = h;
      }
      return innermost;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Collect tool handlers.
        if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier' &&
          (node.callee.property.name === REGISTER_TOOL ||
            node.callee.property.name === LEGACY_TOOL)
        ) {
          const handler = node.arguments[node.arguments.length - 1];
          if (handler !== undefined) {
            const { direct, objects } = handlerArgNames(handler);
            if (direct.size > 0 || objects.size > 0) {
              handlers.push({ range: handler.range, direct, objects });
            }
          }
        }

        // Collect process sinks. Judged at Program:exit, because the handler
        // that encloses a sink may be registered further down the file.
        const sinkName =
          node.callee.type === 'Identifier'
            ? node.callee.name
            : node.callee.type === 'MemberExpression' &&
                !node.callee.computed &&
                node.callee.property.type === 'Identifier'
              ? node.callee.property.name
              : undefined;
        if (sinkName === undefined || !PROCESS_SINKS.has(sinkName)) return;

        const commandArg = node.arguments[0];
        if (commandArg === undefined) return;
        // Concatenated / interpolated commands belong to
        // node-security/no-shell-injection. See isBuiltString.
        if (isBuiltString(commandArg)) return;

        candidates.push({ node: commandArg, arg: '', sink: sinkName });
      },

      'Program:exit'() {
        for (const candidate of candidates) {
          const handler = enclosingHandler(candidate.node);
          if (handler === undefined) continue;

          const command = candidate.node;
          let argName: string | undefined;

          // `execSync(cmd)` where `cmd` was destructured from the tool args.
          if (
            command.type === 'Identifier' &&
            handler.direct.has(command.name)
          ) {
            argName = command.name;
          }
          // `execSync(args.cmd)` where `args` is the whole tool-args object.
          if (
            command.type === 'MemberExpression' &&
            !command.computed &&
            command.object.type === 'Identifier' &&
            handler.objects.has(command.object.name) &&
            command.property.type === 'Identifier'
          ) {
            argName = `${command.object.name}.${command.property.name}`;
          }

          if (argName === undefined) continue;
          context.report({
            node: command,
            messageId: 'toolArgToShell',
            data: { arg: argName, sink: candidate.sink },
          });
        }
      },
    };
  },
});
