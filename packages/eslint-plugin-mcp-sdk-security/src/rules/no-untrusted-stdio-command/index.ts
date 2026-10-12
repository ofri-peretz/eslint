/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow an MCP client spawning a stdio server whose command
 * comes from data an attacker controls
 * @description `new StdioClientTransport({ command, args })` starts a process
 * on the client's host. This is the client side of the CVE-2025-6514 class and
 * of project-config attacks such as "MCPoison": the command, or the package a
 * runner fetches, comes from somewhere the person running the client does not
 * own.
 *
 *     // a tool that launches other servers from model input
 *     server.registerTool('launch', cfg, async (args) =>
 *       new StdioClientTransport({ command: args.command }));
 *
 *     // a config file inside whatever repository the user opened
 *     const cfg = JSON.parse(readFileSync('.mcp.json', 'utf8'));
 *     for (const [, s] of Object.entries(cfg.mcpServers))
 *       new StdioClientTransport({ command: s.command, args: s.args });
 *
 *     // a registry entry fetched over the network
 *     const entry = await (await fetch(REGISTRY)).json();
 *     new StdioClientTransport({ command: entry.command });
 *
 * ## Positions
 *
 * The `command`; every `args` element after `-c` / `/c` / `-Command` when the
 * command is a static shell; and the first non-flag `args` element (the one
 * after `pipx run`) when the command is a static package runner (`npx`, `uvx`,
 * `bunx`, `pnpx`, `pipx`), because that element names the package that runs.
 * An options object held in a same-file `const` is read. Options that cannot
 * be read are abstained on, unless the options value is itself untrusted.
 *
 * ## Sources
 *
 *   - **tool argument**: an MCP tool handler's arguments (`utils/tool-handlers`);
 *   - **network response**: the result of an outbound HTTP request
 *     (`utils/http-clients`), its `.json()` / `.text()`, and its axios / got
 *     `.data` / `.body`;
 *   - **project config file**: an `fs` read of a project-relative path (a
 *     static relative string, or one built from `process.cwd()`), and
 *     `JSON.parse` of it. Such a path lives in the repository the user opened,
 *     so the repository's author controls it. A path under `os.homedir()` or
 *     an absolute path is the user's own configuration, and is not a source.
 *
 * Values are followed with `utils/value-flow`, plus `for…of` and `.map` /
 * `.forEach` over an untrusted value, and `Object.entries` / `values` /
 * `keys` of one. A lookup into a static allowlist (`ALLOWED[name]`) is the
 * fix and is not followed.
 *
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices
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
import { httpRequestOf } from '../../utils/http-clients';
import { createInstanceResolver } from '../../utils/instances';
import { fileUsesMcpSdk } from '../../utils/mcp-evidence';
import { valueResolverFor } from '../../utils/module-resolver';
import { createHandlerCollector, mcpExport } from '../../utils/tool-handlers';
import {
  lookupVariable,
  propertyKey,
  resolveFunction,
  type FunctionNode,
} from '../../utils/tool-registration';
import {
  createFlow,
  memberStep,
  returnedExpressions,
  throughPattern,
  type HandlerRoot,
  type Taint,
} from '../../utils/value-flow';

type MessageIds = 'untrustedStdioCommand';

/** Shells whose arguments after {@link SHELL_SCRIPT_FLAGS} are a command line. */
const SHELLS = new Set([
  'sh',
  'bash',
  'zsh',
  'cmd',
  'cmd.exe',
  'powershell',
  'pwsh',
]);

/** The flag after which a shell's arguments are a command line. */
const SHELL_SCRIPT_FLAGS = new Set([
  '-c',
  '-lc',
  '/c',
  '/C',
  '-Command',
  '-command',
]);

/** Package runners: the first non-flag argument names the package that runs. */
const RUNNERS = new Set(['npx', 'uvx', 'bunx', 'pnpx', 'pipx']);

/** `fs` exports whose result is a file's contents. */
const FILE_READS = new Set(['readFile', 'readFileSync']);

/** `path` exports whose result stays under their first argument. */
const PATH_BUILDERS = new Set(['join', 'resolve']);

/** `Object` statics whose result is drawn from their argument. */
const OBJECT_VIEWS = new Set(['entries', 'values', 'keys']);

/** Array methods whose callback's first parameter is an element of the receiver. */
const ELEMENT_CALLBACKS = new Set(['forEach', 'map', 'flatMap']);

/**
 * Response-body readers: `.json()` is the parsed object, `.text()` the body
 * string.
 *
 * @vocabulary Fetch API Body / undici / got response methods
 */
const BODY_READERS: ReadonlyMap<string, Taint['kind']> = new Map([
  ['json', 'object'],
  ['text', 'value'],
]);

/** Where an untrusted value came from, as the message names it. */
type Source = 'tool argument' | 'network response' | 'project config file';

const SOURCES: readonly Source[] = [
  'tool argument',
  'network response',
  'project config file',
];

/** Is this an absolute path spelling: POSIX, home-relative, UNC or a drive? */
function isAbsoluteSpelling(text: string): boolean {
  return /^(?:[/~\\]|[A-Za-z]:)/.test(text);
}

/** Does this taint carry attacker-written data (not a request ancestor)? */
function untrusted(t: Taint | null): t is Taint {
  return t !== null && (t.kind === 'value' || t.toArgs.length === 0);
}

/** Is the node the global `name`, not a local binding of that name? */
function isGlobal(
  node: TSESTree.Node,
  name: string,
  scope: TSESLint.Scope.Scope,
): boolean {
  return (
    node.type === 'Identifier' &&
    node.name === name &&
    !lookupVariable(name, scope)?.defs.length
  );
}

/** One field of the options: an expression, or a key read off one (a spread). */
interface Field {
  node: TSESTree.Node;
  via?: string;
}

/** The value `key` takes in an options object. The last writer wins. */
function fieldOf(
  options: TSESTree.ObjectExpression,
  key: string,
): Field | undefined {
  let found: Field | undefined;
  for (const prop of options.properties) {
    if (prop.type === 'SpreadElement')
      found = { node: prop.argument, via: key };
    else if (propertyKey(prop) === key) found = { node: prop.value };
  }
  return found;
}

export const noUntrustedStdioCommand = createRule<[], MessageIds>({
  name: 'no-untrusted-stdio-command',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/no-untrusted-stdio-command.md',
      description:
        'Disallow an MCP client spawning a stdio server whose command comes from a tool argument, a network response or a project config file',
      cwe: 'CWE-78',
      cvss: 8.8,
    },
    messages: {
      untrustedStdioCommand: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Untrusted MCP Stdio Server Command',
        cwe: 'CWE-78',
        owasp: 'A03:2021',
        cvss: 8.8,
        description:
          'The {{position}} of this StdioClientTransport comes from a {{source}} (`{{value}}`), so whoever writes that data chooses the process this client starts on the host',
        severity: 'HIGH',
        compliance: ['SOC2', 'NIST-CSF'],
        fix: 'Map the untrusted value to a server through a fixed allowlist the code owns (`ALLOWED[name]`); never pass it as the command, a shell script or a runner package. Read server definitions from the user’s own config (under `os.homedir()`), or ask the user to approve each new or changed server before spawning it.',
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
    const transports: TSESTree.NewExpression[] = [];

    /** `node` resolved to an expression in THIS file, or `undefined`. */
    function local(node: TSESTree.Node): TSESTree.Node | undefined {
      if (node.type !== 'Identifier' && node.type !== 'MemberExpression')
        return node;
      const value = resolve(node);
      let root: TSESTree.Node | undefined = value;
      while (root?.parent) root = root.parent;
      return root === sourceCode.ast ? value : undefined;
    }

    /** `process.cwd()`, with `process` the global. */
    function isCwd(node: TSESTree.Node | undefined): boolean {
      return (
        node?.type === 'CallExpression' &&
        node.arguments.length === 0 &&
        node.callee.type === 'MemberExpression' &&
        propertyName(node.callee) === 'cwd' &&
        isGlobal(node.callee.object, 'process', sourceCode.getScope(node))
      );
    }

    /** A static path that does not leave the working directory. */
    function isStaticRelative(node: TSESTree.Node): boolean {
      const text = staticString(node);
      return text !== null && !isAbsoluteSpelling(text);
    }

    /** Does this path live in the repository the user opened? */
    function isProjectPath(node: TSESTree.Node | undefined): boolean {
      if (node === undefined) return false;
      if (isStaticRelative(node)) return true;
      if (node.type === 'TemplateLiteral')
        return node.quasis[0]!.value.raw === '' && isCwd(node.expressions[0]);
      if (node.type === 'CallExpression') {
        const binding = resolveModuleBinding(
          node.callee,
          sourceCode.getScope(node),
        );
        const [first, ...rest] = node.arguments;
        return (
          binding?.module === 'path' &&
          PATH_BUILDERS.has(binding.path[binding.path.length - 1] ?? '') &&
          first !== undefined &&
          (isCwd(first) || isStaticRelative(first)) &&
          rest.every(isStaticRelative)
        );
      }
      const value = local(node);
      return value !== undefined && value !== node && isProjectPath(value);
    }

    /** The `fs` export a callee is, through `fs`, `fs.promises` and `fs/promises`. */
    function fsExport(callee: TSESTree.Node): string | undefined {
      const binding = resolveModuleBinding(callee, sourceCode.getScope(callee));
      if (binding?.module !== 'fs' && binding?.module !== 'fs/promises')
        return undefined;
      const path =
        binding.path[0] === 'promises' ? binding.path.slice(1) : binding.path;
      return path.length === 1 ? path[0] : undefined;
    }

    /**
     * A `for…of` binding, or the first parameter of a `.map` / `.forEach`
     * callback: an element of the iterated value.
     */
    function ofElement(
      node: TSESTree.Identifier,
      follow: (next: TSESTree.Node) => Taint | null,
    ): Taint | null | undefined {
      const def = lookupVariable(node.name, sourceCode.getScope(node))?.defs[0];
      let pattern: TSESTree.Node;
      let iterated: TSESTree.Node;
      if (
        def?.type === 'Variable' &&
        def.parent.parent.type === 'ForOfStatement' &&
        def.parent.parent.left === def.parent
      ) {
        pattern = def.node.id;
        iterated = def.parent.parent.right;
      } else if (def?.type === 'Parameter') {
        const fn = def.node as FunctionNode;
        const call = fn.parent;
        if (
          call?.type !== 'CallExpression' ||
          call.arguments[0] !== fn ||
          call.callee.type !== 'MemberExpression' ||
          !ELEMENT_CALLBACKS.has(propertyName(call.callee) ?? '')
        )
          return undefined;
        pattern = fn.params[0]!;
        iterated = call.callee.object;
      } else {
        return undefined;
      }
      const element = follow(iterated);
      const t = throughPattern(
        pattern,
        def.name,
        untrusted(element) ? element : null,
      );
      return t ? { ...t, text: node.name } : null;
    }

    /** Pass-throughs every source shares, and the seeds of one source. */
    function interceptFor(source: Source) {
      return (
        node: TSESTree.Node,
        follow: (next: TSESTree.Node) => Taint | null,
      ): Taint | null | undefined => {
        if (node.type === 'Identifier') return ofElement(node, follow);
        if (node.type !== 'CallExpression') return undefined;
        const scope = sourceCode.getScope(node);
        const { callee } = node;
        const arg = node.arguments[0];

        if (callee.type === 'MemberExpression') {
          const method = propertyName(callee) ?? '';
          // `JSON.parse(text)`: the parsed object carries the text's taint.
          if (method === 'parse' && isGlobal(callee.object, 'JSON', scope)) {
            const t = arg ? follow(arg) : null;
            return untrusted(t)
              ? { kind: 'object', text: `JSON.parse(${t.text})`, toArgs: [] }
              : null;
          }
          // `Object.entries(x)` / `values` / `keys`.
          if (
            OBJECT_VIEWS.has(method) &&
            isGlobal(callee.object, 'Object', scope)
          ) {
            const t = arg ? follow(arg) : null;
            return untrusted(t)
              ? {
                  kind: 'value',
                  text: `Object.${method}(${t.text})`,
                  key: undefined,
                }
              : null;
          }
          // `res.json()` / `res.text()` on an untrusted response.
          const kind = BODY_READERS.get(method);
          if (kind !== undefined) {
            const t = follow(callee.object);
            if (!untrusted(t)) return null;
            const text = `${t.text}.${method}()`;
            return kind === 'object'
              ? { kind, text, toArgs: [] }
              : { kind, text, key: undefined };
          }
        }

        if (source === 'network response') {
          const request = httpRequestOf(node, scope, builtBy);
          if (request !== undefined)
            return { kind: 'object', text: `${request.client}()`, toArgs: [] };
        }
        if (source === 'project config file') {
          const name = fsExport(callee);
          if (name !== undefined)
            return FILE_READS.has(name) && isProjectPath(arg)
              ? { kind: 'value', text: `${name}()`, key: undefined }
              : null;
        }
        // A same-file helper returning an untrusted object: value-flow follows
        // a helper's return only when it is a value.
        const helper = resolveFunction(callee, scope);
        if (helper === undefined) return undefined;
        for (const expression of returnedExpressions(helper)) {
          const t = follow(expression);
          if (t?.kind === 'object' && untrusted(t)) return t;
        }
        return undefined;
      };
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        handlers.visit(node);
      },

      NewExpression(node: TSESTree.NewExpression) {
        if (
          mcpExport(node.callee, sourceCode.getScope(node)) ===
          'StdioClientTransport'
        )
          transports.push(node);
      },

      'Program:exit'() {
        const roots = (fn: TSESTree.Node): HandlerRoot | undefined =>
          handlers.roots.get(fn);
        const flows = SOURCES.map((source) => ({
          source,
          carries: createFlow(
            sourceCode,
            source === 'tool argument' ? roots : () => undefined,
            interceptFor(source),
          ),
        }));

        /** Report a field whose value comes from the first matching source. */
        function check(field: Field, position: string): void {
          for (const { source, carries } of flows) {
            let t = carries(field.node);
            if (t && field.via !== undefined) t = memberStep(t, field.via);
            if (t?.kind !== 'value') continue;
            context.report({
              node: field.node,
              messageId: 'untrustedStdioCommand',
              data: { source, value: t.text, position },
            });
            return;
          }
        }

        /** The script or package positions of a static shell / runner's args. */
        function checkArgs(field: Field, name: string, isShell: boolean): void {
          const array = field.via === undefined ? local(field.node) : undefined;
          if (array?.type !== 'ArrayExpression') {
            // The whole argv is untrusted: it can hold `-c`, or the package.
            check(
              field,
              isShell ? `\`${name}\` script` : `\`${name}\` package`,
            );
            return;
          }
          const elements = array.elements.map((el) =>
            el?.type === 'SpreadElement' ? el.argument : el,
          );
          if (isShell) {
            const flag = elements.findIndex((el) =>
              SHELL_SCRIPT_FLAGS.has(staticString(el) ?? ''),
            );
            if (flag === -1) return;
            const label = `\`${name} ${staticString(elements[flag])}\` script`;
            for (const el of elements.slice(flag + 1))
              if (el) check({ node: el }, label);
            return;
          }
          let rest = elements.filter((el) => el !== null);
          if (name === 'pipx' && staticString(rest[0]) === 'run')
            rest = rest.slice(1);
          const pkg = rest.find((el) => !staticString(el)?.startsWith('-'));
          if (pkg) check({ node: pkg }, `\`${name}\` package`);
        }

        for (const transport of transports) {
          const options = transport.arguments[0];
          if (options === undefined) continue;
          const object = local(options);
          if (object?.type !== 'ObjectExpression') {
            // Unreadable options are abstained on, unless they ARE the
            // untrusted entry: `new StdioClientTransport(server)`.
            check({ node: options, via: 'command' }, 'command');
            continue;
          }
          const command = fieldOf(object, 'command');
          if (command === undefined) continue;
          check(command, 'command');
          const bin =
            command.via === undefined ? local(command.node) : undefined;
          const text = bin && staticString(bin);
          if (!text) continue;
          const name = text.split(/[\\/]/).pop()!;
          const isShell = SHELLS.has(name);
          const args = fieldOf(object, 'args');
          if ((isShell || RUNNERS.has(name)) && args !== undefined)
            checkArgs(args, name, isShell);
        }
      },
    };
  },
});
