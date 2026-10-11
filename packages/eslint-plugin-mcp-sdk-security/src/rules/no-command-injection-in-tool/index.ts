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
 * ## Built commands are reported too
 *
 * `node-security/no-shell-injection` reports a command built by interpolation
 * when the concatenation is visible, and declines `exec(cmd)` because proving
 * what `cmd` holds needs value following. Inside an MCP tool handler the
 * source is known — the handler's own parameter — so this rule follows the
 * argument and reports every shape that lets it choose what runs:
 *
 *     server.registerTool('run', { inputSchema: { cmd: z.string() } },
 *       async ({ cmd }) => {
 *         execSync(cmd);                       // the argument IS the command
 *         execSync(`ls ${cmd}`);               // built from it
 *         const c = cmd.trim(); execSync(c);   // derived from it
 *       });
 *
 * In an MCP server both plugins may report the interpolated line; that
 * overlap is the plugin owner's decision (2026-10): tool handlers are this
 * plugin's scope.
 *
 * ## What counts as a sink, and as a tool argument
 *
 * A sink is resolved to its module, never matched by name: `exec` imported
 * (or required, or namespaced) from `child_process`, the same through
 * `util.promisify`, and `execa` / `execaCommand`. `ISSUE_KEY.exec(key)` is a
 * RegExp and `db.exec(sql)` is a database; neither runs a process.
 *
 * A tool argument is a binding the SDK fills from the model's call: the
 * handler's first parameter (destructured or whole) for `registerTool` /
 * `tool`, `request.params.arguments` for `setRequestHandler(CallToolRequestSchema)`
 * / `'tools/call'`, and a body declaration destructured straight off one of
 * those. Its value is then followed within the file (see `utils/value-flow`):
 * through `const`/`let` bindings and reassignments, destructuring, member
 * reads, `await`, string derivations (`.trim()`, `.split()`, `String()`,
 * templates, `+`) and the return of a same-file helper. A key the input
 * schema restricts to `z.enum` / `z.literal` / `z.nativeEnum` is the
 * allowlist, and is not reported, however it is derived.
 *
 * zx and execa `$` templates quote each interpolation, so only a tool argument
 * as the template's first token (the binary), after `sh -c`, or under
 * `{ shell: true }` is reported.
 *
 * @see https://modelcontextprotocol.io/docs/concepts/tools
 */

import {
  TSESTree,
  TSESLint,
  createRule,
  formatLLMMessage,
  MessageIcons,
  propertyName,
  resolveModuleBinding,
  staticString,
} from '@interlace/eslint-devkit';
import { fileUsesMcpSdk } from '../../utils/mcp-evidence';
import { valueResolverFor } from '../../utils/module-resolver';
import {
  constInitializer,
  isClosedSetSchema,
  propertyKey,
  readRegistration,
  resolveFunction,
  schemaFields,
} from '../../utils/tool-registration';
import { createFlow, type HandlerRoot } from '../../utils/value-flow';

type MessageIds = 'toolArgToShell';

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

/** `execa` exports; the default export is `execa` itself. */
const EXECA_SINKS = new Set([
  'execa',
  'execaSync',
  'execaCommand',
  'execaCommandSync',
  'execaNode',
]);

/** Sinks taking `(file, argv)` — where `('sh', ['-c', x])` makes `x` a script. */
const ARGV_SINKS = new Set([
  'spawn',
  'spawnSync',
  'execFile',
  'execFileSync',
  'execa',
  'execaSync',
]);

const SHELLS = new Set([
  'sh',
  'bash',
  'zsh',
  'dash',
  'ksh',
  'fish',
  'cmd',
  'cmd.exe',
  'powershell',
  'powershell.exe',
  'pwsh',
  'pwsh.exe',
]);

/** The flag after which a shell's next argument is a script to run. */
const SHELL_SCRIPT_FLAGS = new Set([
  '-c',
  '-lc',
  '-ic',
  '/c',
  '/C',
  '-Command',
  '-command',
]);

/** The request path, from a call-tool handler's parameter, to the arguments. */
const CALL_TOOL_ARGS_PATH = ['params', 'arguments'];

/** zx / execa template tags, as `module` → export → sink name. */
const TEMPLATE_SINKS: Readonly<Record<string, ReadonlySet<string>>> = {
  zx: new Set(['$']),
  execa: new Set(['$', '$sync', 'execa', 'execaSync']),
};

/** `sh -c `, `/bin/bash -lc ` … as the literal text before an interpolation. */
const SHELL_PREFIX = new RegExp(String.raw`^(?:\S*[\\/])?(\S+)\s+(\S+)\s*$`);

/**
 * The names a tool handler's first parameter binds.
 *
 *   - `async ({ cmd, path }) => …` — destructured; each property is a name.
 *   - `async (args) => …` — whole object; `args.cmd` counts, `args` alone does
 *     not, since passing the object itself to a sink is not a command.
 *
 * Kept as a summary for callers and tests; the rule itself resolves each
 * reference through the scope manager (`utils/value-flow`).
 */
export function handlerArgNames(handler: TSESTree.Node): {
  direct: Set<string>;
  objects: Set<string>;
} {
  const direct = new Set<string>();
  const objects = new Set<string>();
  const visit = (pattern: TSESTree.Node, inside: boolean): void => {
    if (pattern.type === 'AssignmentPattern') pattern = pattern.left;
    if (pattern.type === 'Identifier') {
      (inside ? direct : objects).add(pattern.name);
      return;
    }
    if (pattern.type !== 'ObjectPattern') return;
    for (const prop of pattern.properties) {
      if (prop.type === 'RestElement') visit(prop.argument, false);
      else if (propertyKey(prop) !== undefined) visit(prop.value, true);
    }
  };
  if (
    (handler.type === 'ArrowFunctionExpression' ||
      handler.type === 'FunctionExpression' ||
      handler.type === 'FunctionDeclaration') &&
    handler.params[0] !== undefined
  ) {
    visit(handler.params[0], false);
  }
  return { direct, objects };
}

/** Is `node` the SDK's call-tool request schema, or v2's `'tools/call'`? */
function isCallToolMethod(
  node: TSESTree.Node | undefined,
  scope: TSESLint.Scope.Scope,
): boolean {
  if (node === undefined) return false;
  if (staticString(node) === 'tools/call') return true;
  const binding = resolveModuleBinding(node, scope);
  return (
    binding !== undefined &&
    binding.module.startsWith('@modelcontextprotocol/') &&
    binding.path[binding.path.length - 1] === 'CallToolRequestSchema'
  );
}

/** Does this options object turn the shell on (`shell: true` / a path)? */
function enablesShell(node: TSESTree.Node | undefined): boolean {
  if (node?.type !== 'ObjectExpression') return false;
  return node.properties.some(
    (prop) =>
      prop.type === 'Property' &&
      propertyKey(prop) === 'shell' &&
      !(prop.value.type === 'Literal' && !prop.value.value),
  );
}

export const noCommandInjectionInTool = createRule<[], MessageIds>({
  name: 'no-command-injection-in-tool',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/no-command-injection-in-tool.md',
      description:
        'Disallow an MCP tool argument choosing the command a child_process call runs',
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
          'Tool argument `{{arg}}` reaches the command of `{{sink}}()`, so whatever steers the model chooses what runs on this host',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'NIST-CSF'],
        fix: 'Do not let the argument name or build the command. Map it through a fixed allowlist of permitted operations (or declare it with z.enum), and pass user data as an argv array element — `execFile(ALLOWED[op], [value])` — with no shell.',
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

    /** Tool handler functions → the argument object their first parameter gets. */
    const handlers = new Map<TSESTree.Node, HandlerRoot>();
    const candidates: Array<{ node: TSESTree.Node; sink: string }> = [];

    /** The `child_process` / `execa` export this callee resolves to. */
    function sinkOf(
      callee: TSESTree.Node,
      scope: TSESLint.Scope.Scope,
      seen: Set<TSESTree.Node> = new Set(),
    ): string | undefined {
      // `const run = promisify(run)` must not recurse forever.
      if (seen.has(callee)) return undefined;
      seen.add(callee);
      const binding = resolveModuleBinding(callee, scope);
      if (binding !== undefined) {
        const [name, extra] = binding.path;
        if (extra !== undefined) return undefined;
        if (binding.module === 'child_process')
          return name !== undefined && PROCESS_SINKS.has(name)
            ? name
            : undefined;
        if (binding.module === 'execa')
          return name === undefined
            ? 'execa'
            : EXECA_SINKS.has(name)
              ? name
              : undefined;
        return undefined;
      }
      // `const run = promisify(exec)` / `util.promisify(cp.exec)`.
      if (callee.type !== 'Identifier') return undefined;
      const init = constInitializer(callee, scope);
      if (init?.type !== 'CallExpression') return undefined;
      const wrapper = resolveModuleBinding(init.callee, scope);
      const wrapped = init.arguments[0];
      if (
        wrapper?.module !== 'util' ||
        wrapper.path.join('.') !== 'promisify' ||
        wrapped === undefined
      )
        return undefined;
      return sinkOf(wrapped, scope, seen);
    }

    /** The positions in a sink call that choose or build what runs. */
    function commandPositions(
      node: TSESTree.CallExpression,
      sink: string,
    ): TSESTree.Node[] {
      const positions: TSESTree.Node[] = [];
      const [file, argv, options] = node.arguments;
      if (file === undefined) return positions;
      positions.push(file);
      if (!ARGV_SINKS.has(sink) || argv?.type !== 'ArrayExpression')
        return positions;
      const elements = argv.elements.filter(
        (el): el is TSESTree.Expression =>
          el !== null && el.type !== 'SpreadElement',
      );
      // `{ shell: true }` joins file and argv into one command line.
      if (enablesShell(options)) return [...positions, ...elements];
      // `spawn('sh', ['-c', x])` — `x` is a shell script.
      const shell = staticString(file)?.split(/[\\/]/).pop();
      if (shell !== undefined && SHELLS.has(shell)) {
        const flag = argv.elements.findIndex(
          (el) => el !== null && SHELL_SCRIPT_FLAGS.has(staticString(el) ?? ''),
        );
        const script = flag === -1 ? undefined : argv.elements[flag + 1];
        if (script && script.type !== 'SpreadElement') positions.push(script);
      }
      return positions;
    }

    /** A zx / execa `$` template: the interpolations that choose what runs. */
    function templatePositions(
      node: TSESTree.TaggedTemplateExpression,
      scope: TSESLint.Scope.Scope,
    ): { sink: string; positions: TSESTree.Node[] } | undefined {
      const tag = node.tag;
      const base = tag.type === 'CallExpression' ? tag.callee : tag;
      const binding = resolveModuleBinding(base, scope);
      const name = binding?.path.length === 0 ? 'execa' : binding?.path[0];
      if (
        binding === undefined ||
        binding.path.length > 1 ||
        !TEMPLATE_SINKS[binding.module]?.has(name!)
      )
        return undefined;
      const { quasis, expressions } = node.quasi;
      // `$({ shell: true })`…`` hands the whole template to a shell.
      if (tag.type === 'CallExpression' && enablesShell(tag.arguments[0]))
        return { sink: name!, positions: [...expressions] };
      // Raw text: only whitespace and `sh -c` are looked for, and raw is never
      // null (cooked is, for an invalid escape in a tagged template).
      const lead = quasis[0]!.value.raw;
      const first = expressions[0];
      if (first === undefined) return undefined;
      if (lead.trim() === '') return { sink: name!, positions: [first] };
      // `$`sh -c ${x}`` — the interpolation is a script.
      const shell = SHELL_PREFIX.exec(lead);
      if (
        shell !== null &&
        SHELLS.has(shell[1]!) &&
        SHELL_SCRIPT_FLAGS.has(shell[2]!)
      )
        return { sink: name!, positions: [first] };
      return undefined;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const scope = context.sourceCode.getScope(node);

        // Tool handlers.
        const registration = readRegistration(node, resolve);
        if (registration !== undefined) {
          const fn = resolveFunction(registration.handler, scope);
          if (fn !== undefined) {
            const closed = new Set<string>();
            const fields =
              registration.schema.kind === 'schema'
                ? schemaFields(registration.schema.node)
                : undefined;
            for (const [key, value] of fields?.fields ?? []) {
              if (isClosedSetSchema(resolve(value) ?? value)) closed.add(key);
            }
            handlers.set(fn, { toArgs: [], closed });
          }
        } else if (
          node.callee.type === 'MemberExpression' &&
          propertyName(node.callee) === 'setRequestHandler' &&
          isCallToolMethod(node.arguments[0], scope)
        ) {
          const fn = resolveFunction(node.arguments[1], scope);
          if (fn !== undefined)
            handlers.set(fn, {
              toArgs: CALL_TOOL_ARGS_PATH,
              closed: new Set(),
            });
        }

        // Process sinks. Judged at Program:exit, because the handler that
        // binds an argument may be registered further down the file.
        const sink = sinkOf(node.callee, scope);
        if (sink === undefined) return;
        for (const position of commandPositions(node, sink))
          candidates.push({ node: position, sink });
      },

      TaggedTemplateExpression(node: TSESTree.TaggedTemplateExpression) {
        const found = templatePositions(
          node,
          context.sourceCode.getScope(node),
        );
        for (const position of found?.positions ?? [])
          candidates.push({ node: position, sink: found!.sink });
      },

      'Program:exit'() {
        const carries = createFlow(context.sourceCode, (fn) =>
          handlers.get(fn),
        );
        for (const candidate of candidates) {
          const taint = carries(candidate.node);
          if (taint?.kind !== 'value') continue;
          context.report({
            node: candidate.node,
            messageId: 'toolArgToShell',
            data: { arg: taint.text, sink: candidate.sink },
          });
        }
      },
    };
  },
});
