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
 * those. A key the input schema restricts to `z.enum` / `z.literal` /
 * `z.nativeEnum` is the allowlist, and is not reported.
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
import {
  constInitializer,
  isClosedSetSchema,
  propertyKey,
  readRegistration,
  resolveFunction,
  schemaFields,
  type FunctionNode,
} from '../../utils/tool-registration';

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
 * The tool-argument bindings in scope inside one handler.
 *
 *   - `direct`: local name → the top-level argument key it was read from.
 *   - `roots`: local name → the property path from it to the arguments
 *     object. `[]` means the name IS the arguments object (`args`, a rest
 *     element); `['params', 'arguments']` is a call-tool request.
 */
interface ArgBindings {
  direct: Map<string, string>;
  roots: Map<string, string[]>;
}

/**
 * Bind the names `pattern` introduces, given the path from the value it
 * destructures to the arguments object.
 */
function bindPattern(
  pattern: TSESTree.Node,
  toArgs: readonly string[],
  into: ArgBindings,
  topKey?: string,
): void {
  if (pattern.type === 'AssignmentPattern') pattern = pattern.left;
  if (pattern.type === 'Identifier') {
    if (topKey !== undefined && toArgs.length === 0)
      into.direct.set(pattern.name, topKey);
    else into.roots.set(pattern.name, [...toArgs]);
    return;
  }
  if (pattern.type !== 'ObjectPattern') return;
  for (const prop of pattern.properties) {
    if (prop.type === 'RestElement') {
      // `{ ...rest }` of the arguments is still the arguments; `rest.cmd` is
      // as model-controlled as `args.cmd`. A rest of the request is not.
      if (toArgs.length === 0) bindPattern(prop.argument, [], into);
      continue;
    }
    const key = propertyKey(prop);
    if (key === undefined) continue;
    if (toArgs.length === 0) bindPattern(prop.value, [], into, topKey ?? key);
    else if (key === toArgs[0]) bindPattern(prop.value, toArgs.slice(1), into);
  }
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
  const bindings: ArgBindings = { direct: new Map(), roots: new Map() };
  if (
    (handler.type === 'ArrowFunctionExpression' ||
      handler.type === 'FunctionExpression' ||
      handler.type === 'FunctionDeclaration') &&
    handler.params[0] !== undefined
  ) {
    bindPattern(handler.params[0], [], bindings);
  }
  return {
    direct: new Set(bindings.direct.keys()),
    objects: new Set(bindings.roots.keys()),
  };
}

/** `x as T`, `x!`, `<T>x`, `a?.b` and `String(x)` — the same value. */
function unwrap(node: TSESTree.Node): TSESTree.Node {
  for (;;) {
    if (
      node.type === 'TSAsExpression' ||
      node.type === 'TSNonNullExpression' ||
      node.type === 'TSTypeAssertion' ||
      node.type === 'ChainExpression'
    ) {
      node = node.expression;
    } else if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      node.callee.name === 'String' &&
      node.arguments.length === 1
    ) {
      node = node.arguments[0]!;
    } else {
      return node;
    }
  }
}

/** `a.b.c` → `{ root: 'a', path: ['b', 'c'] }`; `undefined` if not a plain chain. */
function memberChain(
  node: TSESTree.Node,
): { root: string; path: string[] } | undefined {
  const path: string[] = [];
  let current = unwrap(node);
  while (current.type === 'MemberExpression') {
    const key = propertyName(current);
    if (key === null) return undefined;
    path.unshift(key);
    current = unwrap(current.object);
  }
  return current.type === 'Identifier'
    ? { root: current.name, path }
    : undefined;
}

const startsWith = (path: readonly string[], prefix: readonly string[]) =>
  prefix.every((segment, i) => path[i] === segment);

/**
 * Extend `bindings` with a body declaration destructured or read straight off
 * a binding — `const { name, arguments: args } = request.params`,
 * `const { cmd } = args`, `const c = args.cmd`. The initializer has to be a
 * plain property path from a parameter-bound name; a call (`args.cmd.trim()`)
 * is a new value and is not followed.
 */
function bindDeclarator(
  declarator: TSESTree.VariableDeclarator,
  bindings: ArgBindings,
): void {
  const chain =
    declarator.init === null ? undefined : memberChain(declarator.init);
  const toArgs = chain && bindings.roots.get(chain.root);
  if (toArgs === undefined) return;
  if (startsWith(toArgs, chain!.path)) {
    bindPattern(declarator.id, toArgs.slice(chain!.path.length), bindings);
  } else if (startsWith(chain!.path, toArgs)) {
    const inside = chain!.path.slice(toArgs.length);
    // `const c = args.cmd` is `const { cmd: c } = args`.
    bindPattern(declarator.id, [], bindings, inside[0]);
  }
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

    /** Handler functions, how their first parameter maps to the arguments. */
    const handlers: Array<{
      fn: FunctionNode;
      toArgs: string[];
      /** Argument keys the schema restricts to a closed set of values. */
      closed: Set<string>;
      bindings?: ArgBindings;
    }> = [];
    const declarators: TSESTree.VariableDeclarator[] = [];
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

    /** The positions in a sink call that name what runs. */
    function commandPositions(
      node: TSESTree.CallExpression,
      sink: string,
    ): TSESTree.Node[] {
      const positions: TSESTree.Node[] = [];
      const [file, argv] = node.arguments;
      if (file === undefined) return positions;
      positions.push(file);
      // `spawn('sh', ['-c', x])` — `x` is a shell script.
      const shell = staticString(file)?.split(/[\\/]/).pop();
      if (
        ARGV_SINKS.has(sink) &&
        shell !== undefined &&
        SHELLS.has(shell) &&
        argv?.type === 'ArrayExpression'
      ) {
        const flag = argv.elements.findIndex(
          (el) => el !== null && SHELL_SCRIPT_FLAGS.has(staticString(el) ?? ''),
        );
        const script = flag === -1 ? undefined : argv.elements[flag + 1];
        if (script && script.type !== 'SpreadElement') positions.push(script);
      }
      return positions;
    }

    /** The narrowest handler whose function encloses `node`. */
    function enclosingHandler(node: TSESTree.Node) {
      let innermost: (typeof handlers)[number] | undefined;
      for (const h of handlers) {
        const [start, end] = h.fn.range;
        if (node.range[0] < start || node.range[1] > end) continue;
        if (
          innermost === undefined ||
          end - start < innermost.fn.range[1] - innermost.fn.range[0]
        )
          innermost = h;
      }
      return innermost;
    }

    function bindingsOf(handler: (typeof handlers)[number]): ArgBindings {
      if (handler.bindings) return handler.bindings;
      const bindings: ArgBindings = { direct: new Map(), roots: new Map() };
      const first = handler.fn.params[0];
      if (first !== undefined) bindPattern(first, handler.toArgs, bindings);
      // Declarations are visited in source order, so a binding a later one
      // depends on is already in place.
      for (const declarator of declarators) {
        if (enclosingHandler(declarator) === handler)
          bindDeclarator(declarator, bindings);
      }
      handler.bindings = bindings;
      return bindings;
    }

    /** `cmd` / `args.cmd` / `request.params.arguments.cmd`, or `undefined`. */
    function argumentRead(
      expression: TSESTree.Node,
      bindings: ArgBindings,
    ): { text: string; key: string } | undefined {
      const node = unwrap(expression);
      if (node.type === 'Identifier') {
        const key = bindings.direct.get(node.name);
        return key === undefined ? undefined : { text: node.name, key };
      }
      const chain = memberChain(node);
      const toArgs = chain && bindings.roots.get(chain.root);
      if (
        toArgs === undefined ||
        chain!.path.length !== toArgs.length + 1 ||
        !startsWith(chain!.path, toArgs)
      )
        return undefined;
      return {
        text: [chain!.root, ...chain!.path].join('.'),
        key: chain!.path[toArgs.length]!,
      };
    }

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        declarators.push(node);
      },

      CallExpression(node: TSESTree.CallExpression) {
        const scope = context.sourceCode.getScope(node);

        // Tool handlers.
        const registration = readRegistration(node);
        if (registration !== undefined) {
          const fn = resolveFunction(registration.handler, scope);
          if (fn !== undefined) {
            const closed = new Set<string>();
            const fields =
              registration.schema.kind === 'schema'
                ? schemaFields(registration.schema.node)
                : undefined;
            for (const [key, value] of fields?.fields ?? []) {
              if (isClosedSetSchema(value)) closed.add(key);
            }
            handlers.push({ fn, toArgs: [], closed });
          }
        } else if (
          node.callee.type === 'MemberExpression' &&
          propertyName(node.callee) === 'setRequestHandler' &&
          isCallToolMethod(node.arguments[0], scope)
        ) {
          const fn = resolveFunction(node.arguments[1], scope);
          if (fn !== undefined)
            handlers.push({
              fn,
              toArgs: CALL_TOOL_ARGS_PATH,
              closed: new Set(),
            });
        }

        // Process sinks. Judged at Program:exit, because the handler that
        // encloses a sink may be registered further down the file.
        const sink = sinkOf(node.callee, scope);
        if (sink === undefined) return;
        for (const position of commandPositions(node, sink)) {
          // Concatenated / interpolated commands belong to
          // node-security/no-shell-injection. See isBuiltString.
          if (!isBuiltString(position))
            candidates.push({ node: position, sink });
        }
      },

      'Program:exit'() {
        for (const candidate of candidates) {
          const handler = enclosingHandler(candidate.node);
          if (handler === undefined) continue;
          const read = argumentRead(candidate.node, bindingsOf(handler));
          if (read === undefined || handler.closed.has(read.key)) continue;
          context.report({
            node: candidate.node,
            messageId: 'toolArgToShell',
            data: { arg: read.text, sink: candidate.sink },
          });
        }
      },
    };
  },
});
