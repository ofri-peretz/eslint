/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow an MCP tool argument or resource-template variable
 * choosing the file an `fs` call reads, writes or deletes
 * @description The EscapeRoute class (CVE-2025-53109 / CVE-2025-53110) and the
 * mcp-server-git path CVEs: a tool takes a path, joins it onto a root, and
 * hands it to `fs` — so `../../.ssh/id_rsa` reads the key, and a symlink or a
 * prefix-matching sibling (`/data-evil` vs `/data`) walks out of the sandbox.
 *
 *     server.registerTool('read', { inputSchema: { p: z.string() } },
 *       async ({ p }) => readFile(path.join(ROOT, p), 'utf8'));
 *
 * ## What is reported
 *
 * A tool argument (or a `ResourceTemplate` variable, which is parsed out of a
 * URI the client chose) reaching the path of an `fs` call that reads, writes,
 * lists or removes — directly, through `path.join` / `path.resolve` /
 * `path.normalize`, `fs.realpath`, `fileURLToPath`, `new URL()`, a template, or
 * any derivation `utils/value-flow` follows — with no containment check on the
 * way.
 *
 * ## What is a containment check
 *
 * An `if` that tests the value with a call — `target.startsWith(root + sep)`,
 * `path.relative(root, target)` / `path.isAbsolute(...)`, `ALLOWED.includes(p)`,
 * a same-file or imported validator — and either exits before the `fs` call
 * or wraps it. A same-file helper that performs such a check before returning
 * sanitises its result. `path.basename(p)` strips every directory, so a path
 * built from it is not followed at all.
 *
 * An `fs` existence or metadata probe (`existsSync`, `stat`, `access`) is not
 * a containment check, and not a sink either: it reports nothing about where
 * the path points.
 *
 * ## Overlap
 *
 * `node-security/detect-non-literal-fs-filename` reports any non-literal path
 * anywhere. Inside an MCP tool handler the source is known — the handler's
 * own parameter — so this rule follows it, honours the containment idiom, and
 * owns the finding there (owner decision, 2026-10: tool handlers are this
 * plugin's scope). Both may report the same line.
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
} from '@interlace/eslint-devkit';
import { fsExport } from '../../utils/fs-module';
import { createGuards, isConversion } from '../../utils/guards';
import { fileUsesMcpSdk } from '../../utils/mcp-evidence';
import { valueResolverFor } from '../../utils/module-resolver';
import { createHandlerCollector } from '../../utils/tool-handlers';
import { lookupVariable, resolveFunction } from '../../utils/tool-registration';
import {
  createFlow,
  flowOptionsFor,
  STRING_DERIVING,
  type Taint,
} from '../../utils/value-flow';

type MessageIds = 'toolArgToPath';

/** `fs` exports whose first argument is a path they read, write, list or remove. */
const PATH_SINKS = new Set([
  'readFile',
  'readFileSync',
  'writeFile',
  'writeFileSync',
  'appendFile',
  'appendFileSync',
  'createReadStream',
  'createWriteStream',
  'open',
  'openSync',
  'opendir',
  'opendirSync',
  'readdir',
  'readdirSync',
  'mkdir',
  'mkdirSync',
  'rm',
  'rmSync',
  'rmdir',
  'rmdirSync',
  'unlink',
  'unlinkSync',
  'truncate',
  'truncateSync',
  'chmod',
  'chmodSync',
  'chown',
  'chownSync',
  'readlink',
  'readlinkSync',
]);

/** `fs` exports whose first TWO arguments are paths. */
const TWO_PATH_SINKS = new Set([
  'copyFile',
  'copyFileSync',
  'cp',
  'cpSync',
  'rename',
  'renameSync',
  'symlink',
  'symlinkSync',
  'link',
  'linkSync',
]);

/** `path` exports whose result still points wherever their input did. */
const PATH_JOINERS = new Set([
  'join',
  'resolve',
  'normalize',
  'dirname',
  'toNamespacedPath',
]);

/** `path` exports a containment check is written with. */
const PATH_CHECKS = new Set(['relative', 'isAbsolute']);

/** `fs` exports that canonicalise a path without confining it. */
const CANONICALISERS = new Set(['realpath', 'realpathSync']);

/**
 * String methods that transform a value rather than test it — `p.endsWith('.md')`
 * does not stop `../../x.md`.
 */
const NOT_A_CHECK: ReadonlySet<string> = new Set([
  ...STRING_DERIVING,
  'endsWith',
]);

/** The `path` export a callee is (`path`, `path.posix`, `path.win32`). */
function pathExport(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): string | undefined {
  const binding = resolveModuleBinding(callee, scope);
  if (binding?.module !== 'path') return undefined;
  const rest =
    binding.path[0] === 'posix' || binding.path[0] === 'win32'
      ? binding.path.slice(1)
      : binding.path;
  return rest.length === 1 ? rest[0] : undefined;
}

export const noPathTraversalInTool = createRule<[], MessageIds>({
  name: 'no-path-traversal-in-tool',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-mcp-sdk-security/docs/rules/no-path-traversal-in-tool.md',
      description:
        'Disallow an MCP tool argument choosing the file an fs call reads, writes or deletes without a containment check',
      cwe: 'CWE-22',
      cvss: 7.5,
    },
    messages: {
      toolArgToPath: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MCP Tool Argument Reaches a File Path',
        cwe: 'CWE-22',
        owasp: 'A01:2021',
        cvss: 7.5,
        description:
          'Tool argument `{{arg}}` reaches the path of `{{sink}}()` with no containment check, so `../` or an absolute path reads or writes outside the directory this tool is meant to serve',
        severity: 'HIGH',
        compliance: ['SOC2', 'NIST-CSF'],
        fix: 'Resolve the path against a fixed root, canonicalise it (`fs.realpath`), and reject it unless `path.relative(root, target)` neither starts with `..` nor is absolute — before the fs call. Comparing with `startsWith(root)` alone also needs the trailing separator, or `/data-evil` passes for `/data`.',
        documentationLink:
          'https://modelcontextprotocol.io/specification/2025-06-18/basic/security_best_practices',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    if (!fileUsesMcpSdk(context.sourceCode.ast)) return {};
    const resolve = valueResolverFor(context);
    const handlers = createHandlerCollector(context, resolve, 'arguments');
    const candidates: Array<{
      call: TSESTree.CallExpression;
      arg: TSESTree.Node;
      sink: string;
    }> = [];

    return {
      CallExpression(node: TSESTree.CallExpression) {
        handlers.visit(node);
        const sink = fsExport(node.callee, context.sourceCode.getScope(node));
        if (sink === undefined) return;
        const count = TWO_PATH_SINKS.has(sink)
          ? 2
          : PATH_SINKS.has(sink)
            ? 1
            : 0;
        for (const arg of node.arguments.slice(0, count))
          candidates.push({ call: node, arg, sink });
      },

      'Program:exit'() {
        const sourceCode = context.sourceCode;

        /** Calls whose result is still the path their argument named. */
        const intercept = (
          node: TSESTree.Node,
          follow: (next: TSESTree.Node) => Taint | null,
        ): Taint | null | undefined => {
          if (node.type === 'NewExpression') {
            // `new URL(p, base)` — fs accepts a file: URL.
            const scope = sourceCode.getScope(node);
            if (
              node.callee.type !== 'Identifier' ||
              node.callee.name !== 'URL' ||
              lookupVariable('URL', scope)?.defs.length
            )
              return undefined;
            return firstValue(node.arguments, follow);
          }
          if (node.type !== 'CallExpression') return undefined;
          const scope = sourceCode.getScope(node);
          const joiner = pathExport(node.callee, scope);
          if (joiner !== undefined)
            return PATH_JOINERS.has(joiner)
              ? firstValue(node.arguments, follow)
              : null;
          const fsName = fsExport(node.callee, scope);
          if (fsName !== undefined)
            return CANONICALISERS.has(fsName)
              ? firstValue(node.arguments.slice(0, 1), follow)
              : null;
          const binding = resolveModuleBinding(node.callee, scope);
          if (
            binding?.module === 'url' &&
            binding.path.join('.') === 'fileURLToPath'
          )
            return firstValue(node.arguments.slice(0, 1), follow);
          // A same-file helper that confines its argument before returning it.
          const helper = resolveFunction(node.callee, scope);
          if (helper !== undefined && guards.sanitizes(helper)) return null;
          return undefined;
        };

        const carries = createFlow(
          sourceCode,
          (fn) => handlers.roots.get(fn),
          intercept,
          // A caller that confined the path before passing it on hands the
          // helper a checked value.
          flowOptionsFor(context, (call, arg) => guards.guarded(call, arg)),
        );
        const guards = createGuards(
          sourceCode,
          (variable) => {
            // A lib global (`process`, `URL`) has no definition to follow.
            const name = variable.defs[0]?.name;
            return name !== undefined && carries(name) !== null;
          },
          isContainmentCheck,
        );

        /**
         * Is this call, in an `if` test, a containment check on a value
         * `involves` accepts? A same-file predicate counts only when its body
         * holds a check-shaped call itself — `pick(p)` returning `p` does not.
         */
        function isContainmentCheck(
          node: TSESTree.Node,
          involves: (n: TSESTree.Node) => boolean,
          inHelper = false,
        ): boolean {
          if (node.type !== 'CallExpression') return false;
          const scope = sourceCode.getScope(node);
          // Existence and metadata probes say nothing about where a path points.
          if (fsExport(node.callee, scope) !== undefined) return false;
          if (isConversion(node, scope)) return false;
          const pathName = pathExport(node.callee, scope);
          if (pathName !== undefined && !PATH_CHECKS.has(pathName))
            return false;
          if (node.callee.type === 'MemberExpression') {
            const method = propertyName(node.callee);
            if (method !== null && NOT_A_CHECK.has(method)) return false;
            if (involves(node.callee.object)) return true;
          }
          const helper = inHelper
            ? undefined
            : resolveFunction(node.callee, scope);
          if (helper !== undefined && !holdsCheck(helper)) return false;
          return node.arguments.some(involves);
        }

        /** Does a same-file predicate's body make a check-shaped call? */
        function holdsCheck(fn: TSESTree.Node): boolean {
          const visit = (node: TSESTree.Node): boolean => {
            if (isContainmentCheck(node, () => true, true)) return true;
            for (const [key, value] of Object.entries(node)) {
              if (key === 'parent') continue;
              for (const child of Array.isArray(value) ? value : [value])
                if (
                  child !== null &&
                  typeof child === 'object' &&
                  typeof (child as TSESTree.Node).type === 'string' &&
                  visit(child as TSESTree.Node)
                )
                  return true;
            }
            return false;
          };
          return visit(fn);
        }

        for (const { call, arg, sink } of candidates) {
          const taint = carries(arg);
          if (taint?.kind !== 'value') continue;
          if (guards.guarded(call, arg)) continue;
          context.report({
            node: arg,
            messageId: 'toolArgToPath',
            data: { arg: taint.text, sink },
          });
        }
      },
    };
  },
});

/** The first argument carrying a tool-argument value. */
function firstValue(
  args: readonly TSESTree.Node[],
  follow: (next: TSESTree.Node) => Taint | null,
): Taint | null {
  for (const arg of args) {
    const inner = arg.type === 'SpreadElement' ? arg.argument : arg;
    const t = follow(inner);
    if (t?.kind === 'value') return t;
  }
  return null;
}
