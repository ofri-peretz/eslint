/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent sensitive data in temp directories
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  resolveModuleBinding,
  staticString,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

import { findVariable } from '../../utils/provenance';
import { undeclaredFsBinding } from '../../utils/module-binding';

type MessageIds = 'violationDetected' | 'predictableTempPath';

export interface Options {
  tempPaths?: string[];
  ignoreFiles?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_TEMP_PATHS = ['/tmp', '/var/tmp', 'temp/', '/temp'];

/**
 * Every resolved spelling of these fs functions, as `module:export.path` keys.
 *
 * `fs` reaches them at its root and under `fs.promises`; `fs/promises` at its
 * root. Anything deeper (`fs.constants.writeFile`) is some other API that
 * merely shares a method name, and a module called as a function names none.
 */
function fsEntryPoints(fns: readonly string[]): ReadonlySet<string> {
  return new Set(
    fns.flatMap((fn) => [`fs:${fn}`, `fs:promises.${fn}`, `fs/promises:${fn}`]),
  );
}

/**
 * fs entry points whose first argument is a path DATA COMES TO REST AT.
 *
 * `writeFile`/`writeFileSync` alone was the shape the rule's own tests were
 * written in. Real code reaches the same world-writable directory through
 * `appendFile*` (an audit trail) and `createWriteStream` (an archive being
 * assembled), and those bytes are just as readable by every local account.
 */
const FS_WRITE_FUNCTIONS = fsEntryPoints([
  'writeFile',
  'writeFileSync',
  'appendFile',
  'appendFileSync',
  'createWriteStream',
  // fs-extra's own write entry points, reached through the `equivalents` map
  // below. Its users write `outputFile`, not `writeFile`, because it mkdirs the
  // parent first — so guarding only the fs spelling guards none of them.
  'outputFile',
  'outputFileSync',
]);

/**
 * The mitigation, as an API rather than as a spelling.
 *
 * `mkdtemp`/`mkdtempSync` take a PREFIX, append six random characters and
 * create the directory 0700 — so `path.join(os.tmpdir(), 'ingest-')` handed to
 * one of them is not a predictable path, it is the fix. See `passedAsPathTo`.
 */
const FS_MKDTEMP_FUNCTIONS = fsEntryPoints(['mkdtemp', 'mkdtempSync']);

/** Drop-in `fs` replacements, so a rule that guards fs guards them too. */
const FS_EQUIVALENTS = { 'fs-extra': 'fs', 'graceful-fs': 'fs' } as const;

/**
 * Does `haystack` contain `needle` as a whole run of path SEGMENTS?
 *
 * The old test was `haystack.includes(tempPath)`, and `/temp` is a substring of
 * a great many strings that are not paths into the shared temp directory.
 * `Shopify/cli`
 * `packages/app/src/cli/utilities/developer-platform-client/app-management-client.ts:155`
 * is the one that made it obvious:
 *
 * ```ts
 * const TEMPLATE_JSON_URL = 'https://cdn.shopify.com/static/cli/extensions/templates.json'
 * ```
 *
 * `…/templates.json` contains `/temp`, so a CDN URL was reported as sensitive
 * data written to temp storage. Matching on segment boundaries is the whole
 * fix: `/temp` matches `/temp/x` and `/temp`, and does not match `/templates`.
 *
 * Both separators are honoured because `tempPaths` is user-configurable and a
 * Windows-style value is a reasonable thing to configure.
 */
function containsPathSegments(haystack: string, needle: string): boolean {
  const split = (value: string): string[] =>
    value.split(/[/\\]/).filter((segment) => segment.length > 0);
  const target = split(needle);
  if (target.length === 0) return false;
  const segments = split(haystack);
  // A start too near the end runs off it, and `undefined` matches no segment.
  return segments.some((_, start) =>
    target.every((segment, offset) => segments[start + offset] === segment),
  );
}

/**
 * `os.tmpdir()` — the portable spelling of the shared temp directory.
 *
 * The literal scan above only sees a hard-coded `/tmp/...` string. Code that
 * reaches the same world-writable directory through `os.tmpdir()` is the
 * identical exposure and was silently unchecked, which is why
 * `corpus/CWE-377/vulnerable/tmpdir-static-name.js` reported nothing while its
 * `/tmp/app-export.json` sibling reported.
 */
function isTmpdirCall(node: TSESTree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'os' &&
    propertyName(node.callee) === 'tmpdir'
  );
}

/**
 * `path.join(os.tmpdir(), <string literal>…)` — a fully constant name inside
 * the shared temp directory.
 *
 * The "all remaining segments are string literals" requirement is what keeps
 * this from firing on the accepted safe shape. A randomised segment
 * (`randomUUID()`, `Date.now()`, an interpolated template) makes the final path
 * unpredictable, which is exactly the mitigation, so those are left alone.
 */
function isStaticTmpdirJoin(node: TSESTree.CallExpression): boolean {
  const { callee } = node;
  if (callee.type !== 'MemberExpression') return false;
  // `path['join'](os.tmpdir(), 'x')` builds the same static path.
  const method = propertyName(callee);
  if (method !== 'join' && method !== 'resolve') {
    return false;
  }
  if (callee.object.type !== 'Identifier' || callee.object.name !== 'path') {
    return false;
  }
  if (node.arguments.length < 2) return false;
  if (!isTmpdirCall(node.arguments[0])) return false;
  return node.arguments.slice(1).every((arg) => staticString(arg) !== null);
}

/**
 * `` `${os.tmpdir()}/report.csv` `` — the same constant temp path, spelled with
 * a template instead of `path.join`.
 *
 * `isStaticTmpdirJoin` only recognises the `path.join` spelling, so the
 * interpolated form (which is at least as common in real code, because it is
 * shorter) resolved to the identical predictable path and reported nothing.
 *
 * Every OTHER expression must be a literal, exactly as in the join case:
 * `` `${os.tmpdir()}/${randomUUID()}.bin` `` is unpredictable, which is the
 * mitigation, so it is left alone.
 */
function isStaticTmpdirTemplate(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.TemplateLiteral) return false;
  // Any literal interpolates to the same text on every run — `${8080}` is as
  // constant as `${'cache'}`.
  return (
    node.expressions.some(isTmpdirCall) &&
    node.expressions.every(
      (expression) =>
        isTmpdirCall(expression) || expression.type === AST_NODE_TYPES.Literal,
    )
  );
}

/**
 * `os.tmpdir() + '/agent-state.json'` — the third spelling of the same path.
 *
 * `+` is what people write before they remember `path.join` exists, and it
 * produces a path as constant as either of the other two forms.
 */
function isStaticTmpdirConcat(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.BinaryExpression || node.operator !== '+')
    return false;
  const side = (part: TSESTree.Node): 'tmpdir' | 'static' | 'other' => {
    if (isTmpdirCall(part)) return 'tmpdir';
    if (staticString(part) !== null) return 'static';
    if (isStaticTmpdirConcat(part)) return 'tmpdir';
    return 'other';
  };
  const sides = new Set([side(node.left as TSESTree.Node), side(node.right)]);
  return !sides.has('other') && sides.has('tmpdir');
}

/** Any spelling of "a constant name inside the shared temp directory". */
function isPredictableTempPath(node: TSESTree.Node): boolean {
  return (
    (node.type === AST_NODE_TYPES.CallExpression && isStaticTmpdirJoin(node)) ||
    isStaticTmpdirTemplate(node) ||
    isStaticTmpdirConcat(node)
  );
}

export const noDataInTempStorage = createRule<RuleOptions, MessageIds>({
  name: 'no-data-in-temp-storage',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-data-in-temp-storage.md',
      description: 'Prevent sensitive data in temp directories',
      cwe: 'CWE-312',
      cvss: 5.5,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Temp Storage Data',
        cwe: 'CWE-312',
        description: 'Sensitive data written to temp directory - not secure',
        severity: 'HIGH',
        fix: 'Use secure storage location or encrypt data before writing',
        documentationLink: 'https://cwe.mitre.org/data/definitions/312.html',
      }),
      predictableTempPath: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Predictable Temp File Name (CWE-377)',
        cwe: 'CWE-377',
        cvss: 7.5,
        description:
          'path.join(os.tmpdir(), …) with a constant name resolves to the same path on every run, in a directory every local user can write. An attacker who pre-creates that name — or symlinks it at a file they want clobbered — wins the race before the write happens.',
        severity: 'HIGH',
        fix: 'Create the file inside a fresh directory from fs.mkdtemp/mkdtempSync, or add a crypto.randomUUID() segment to the name.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/377.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          tempPaths: {
            type: 'array',
            items: { type: 'string' },
            // `create()` does `options.tempPaths || DEFAULT_TEMP_PATHS`, so the
            // built-ins are the default AND setting this REPLACES them — unlike
            // the `extra*` options elsewhere in this plugin, which extend.
            // Note the `||`: an explicit `[]` is falsy and falls back to the
            // built-ins rather than disabling the rule. The destructuring is
            // the truth; this default records it.
            default: DEFAULT_TEMP_PATHS,
            description:
              'Temporary path prefixes to flag. Replaces the built-in list rather than extending it.',
          },
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'List of files or patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  createOnce(context) {
    let tempPaths: string[];

    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }

    /**
     * Is this call one of the `fs` entry points in `names`?
     *
     * Resolved through the BINDING, not through the receiver's spelling. The
     * old test was `callee.object.name === 'fs'`, which is a name match, and it
     * missed every one of the ordinary ways this is written:
     * `const { writeFileSync } = require('node:fs')`,
     * `import { writeFileSync as write } from 'node:fs'`,
     * `import { writeFile } from 'node:fs/promises'`, `fs.promises.writeFile`.
     * Each of those puts bytes in exactly the same world-readable directory.
     *
     * The bare `fs.<fn>(…)` fallback survives for the case the resolver cannot
     * answer — a file where `fs` is declared nowhere, which is how a great
     * deal of scripting code and every snippet is written. A NAME is not
     * enough: an `fs` the file declares and the resolver cannot trace to the
     * module (a local object, a parameter) is not the module.
     *
     * `fs['writeFileSync']` is `fs.writeFileSync`: `resolveModuleBinding`
     * resolves a string-literal computed key itself.
     */
    function callsFs(
      node: TSESTree.CallExpression,
      names: ReadonlySet<string>,
    ): boolean {
      const scope = context.sourceCode.getScope(node);
      const binding =
        resolveModuleBinding(node.callee, scope, {
          equivalents: FS_EQUIVALENTS,
        }) ?? undeclaredFsBinding(node.callee, scope);
      if (!binding) return false;
      return names.has(`${binding.module}:${binding.path.join('.')}`);
    }

    /**
     * Is this binding handed to one of the fs entry points in `names` as the
     * path (first) argument?
     *
     * For `FS_MKDTEMP_FUNCTIONS` this is the mitigation:
     * `const PREFIX = path.join(os.tmpdir(), 'ingest-'); await fsp.mkdtemp(PREFIX)`
     * is the remediation this rule's own message prescribes, and the rule
     * reported it: the declarator looked exactly like a constant temp path.
     * mkdtemp appends six random characters and creates the directory 0700, so
     * the prefix is never the resolved path. Recognising that by resolving the
     * consuming call — rather than by insisting the join sit syntactically
     * inside the mkdtemp argument list, which is the only shape the old rule
     * tolerated — is what makes hoisting the prefix to a `const` legal.
     */
    function passedAsPathTo(
      variable: TSESLint.Scope.Variable,
      names: ReadonlySet<string>,
    ): boolean {
      return variable.references.some((reference) => {
        const parent = reference.identifier.parent;
        return (
          parent.type === AST_NODE_TYPES.CallExpression &&
          parent.arguments[0] === reference.identifier &&
          callsFs(parent, names)
        );
      });
    }

    /**
     * A predictable temp path only matters where it becomes a name something is
     * written to — or, when it is bound, where that binding is not immediately
     * randomised by mkdtemp.
     *
     * Called from the three sites that produce such a name — a declarator, an
     * assignment, and the path argument of an fs write — rather than by walking
     * up from the `path.join` call, which keeps
     * `log(path.join(os.tmpdir(), 'x'))` from reporting.
     */
    function reportIfPredictable(
      candidate: TSESTree.Node | null | undefined,
      bound: TSESTree.Node | null,
    ): void {
      if (!candidate) return;
      if (!isPredictableTempPath(candidate)) return;
      // Bound to a name, the path is a finding only once something writes
      // through that name — the doc's second condition. `const file =
      // path.join(os.tmpdir(), 'x.tmp')` that is only logged stores nothing.
      // A binding that is not a plain name (`obj.p = …`) is not followed.
      if (bound !== null) {
        const variable =
          bound.type === AST_NODE_TYPES.Identifier
            ? findVariable(context.sourceCode, bound)
            : null;
        if (
          !variable ||
          passedAsPathTo(variable, FS_MKDTEMP_FUNCTIONS) ||
          !passedAsPathTo(variable, FS_WRITE_FUNCTIONS)
        ) {
          return;
        }
      }
      context.report({ node: candidate, messageId: 'predictableTempPath' });
    }

    /**
     * The static path text this expression contributes, as a list of runs.
     *
     * A template is returned as its quasis rather than as one joined string, so
     * a temp segment is never manufactured by gluing two unrelated runs
     * together across an interpolation.
     */
    // oxlint-disable-next-line consistent-function-scoping
    function staticPathRuns(node: TSESTree.Node): string[] {
      const text = staticString(node);
      if (text !== null) return [text];
      if (node.type === AST_NODE_TYPES.TemplateLiteral) {
        return node.quasis.map((quasi) => quasi.value.raw);
      }
      // `path.join('/tmp', 'saml-assertion.xml')` — the literal segments are
      // the path. Only the literals are collected, so `path.join(outDir,
      // 'templates', 'build.log')` contributes `templates` and `build.log` and
      // matches nothing.
      if (
        node.type === AST_NODE_TYPES.CallExpression &&
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        (propertyName(node.callee) === 'join' ||
          propertyName(node.callee) === 'resolve')
      ) {
        // Filter-then-map cannot narrow through the call, so resolve first and
        // drop the unresolvable in one pass.
        return node.arguments
          .map((arg) => staticString(arg))
          .filter((text): text is string => text !== null);
      }
      return [];
    }

    /**
     * The value the path argument actually carries at the sink.
     *
     * Resolved by LAST WRITE BEFORE THE USE, not by the declarator. Reading the
     * declarator answers the wrong question for
     * `let dest = '/tmp/placeholder'; dest = path.join(root, 'dist', 'x'); write(dest)`
     * — the temp literal never reaches disk there, and reporting it is a false
     * positive whose fix is already applied.
     */
    function resolvedPathRuns(node: TSESTree.Node): string[] {
      if (node.type !== AST_NODE_TYPES.Identifier) return staticPathRuns(node);
      const lastWrite = findVariable(context.sourceCode, node)
        ?.references.map((reference) => reference.writeExpr)
        .filter((write): write is TSESTree.Node => write != null)
        .filter((write) => write.range[1] <= node.range[0])
        .sort((a, b) => a.range[1] - b.range[1])
        .at(-1);
      return lastWrite ? staticPathRuns(lastWrite) : [];
    }

    return {
      before() {
        const options = context.options[0] || {};
        tempPaths = options.tempPaths || DEFAULT_TEMP_PATHS;
        const ignoreFiles = options.ignoreFiles || [];
        const filename = context.filename;

        if (ignoreFiles.some((pattern) => filename.includes(pattern))) {
          return false;
        }
        return true;
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (!callsFs(node, FS_WRITE_FUNCTIONS)) return;

        const pathArg = node.arguments[0];
        if (pathArg) {
          const runs = resolvedPathRuns(pathArg);
          if (
            runs.some((run) =>
              tempPaths.some((tp) => containsPathSegments(run, tp)),
            )
          ) {
            report(pathArg);
            return;
          }
        }
        // path.join(os.tmpdir(), 'constant-name') — same exposure as a
        // hard-coded '/tmp/...' literal, written portably.
        reportIfPredictable(pathArg, null);
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        reportIfPredictable(node.init, node.id);
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        reportIfPredictable(node.right, node.left);
      },
    };
  },
});
