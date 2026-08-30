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
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

import { findVariable } from '../../utils/provenance';

type MessageIds = 'violationDetected' | 'predictableTempPath';

export interface Options {
  tempPaths?: string[];
  ignoreFiles?: string[];
}

type RuleOptions = [Options?];

const DEFAULT_TEMP_PATHS = ['/tmp', '/var/tmp', 'temp/', '/temp'];

/**
 * fs entry points whose first argument is a path DATA COMES TO REST AT.
 *
 * `writeFile`/`writeFileSync` alone was the shape the rule's own tests were
 * written in. Real code reaches the same world-writable directory through
 * `appendFile*` (an audit trail) and `createWriteStream` (an archive being
 * assembled), and those bytes are just as readable by every local account.
 */
const FS_WRITE_FUNCTIONS = new Set([
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
 * one of them is not a predictable path, it is the fix. See `flowsIntoMkdtemp`.
 */
const FS_MKDTEMP_FUNCTIONS = new Set(['mkdtemp', 'mkdtempSync']);

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
  for (let start = 0; start + target.length <= segments.length; start += 1) {
    if (target.every((segment, offset) => segments[start + offset] === segment)) return true;
  }
  return false;
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
    !node.callee.computed &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'os' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'tmpdir'
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
  if (callee.type !== 'MemberExpression' || callee.computed) return false;
  if (callee.property.type !== 'Identifier') return false;
  if (callee.property.name !== 'join' && callee.property.name !== 'resolve') {
    return false;
  }
  if (callee.object.type !== 'Identifier' || callee.object.name !== 'path') {
    return false;
  }
  if (node.arguments.length < 2) return false;
  if (!isTmpdirCall(node.arguments[0])) return false;
  return node.arguments
    .slice(1)
    .every((arg) => arg.type === 'Literal' && typeof arg.value === 'string');
}

/**
 * `` `${os.tmpdir()}/report.csv` `` — the same constant temp path, spelled with
 * a template instead of `path.join`.
 *
 * `isStaticTmpdirJoin` only recognises the `path.join` spelling, so the
 * interpolated form (which is at least as common in real code, because it is
 * shorter) resolved to the identical predictable path and reported nothing.
 *
 * Every OTHER expression must be a string literal, exactly as in the join case:
 * `` `${os.tmpdir()}/${randomUUID()}.bin` `` is unpredictable, which is the
 * mitigation, so it is left alone.
 */
function isStaticTmpdirTemplate(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.TemplateLiteral) return false;
  let sawTmpdir = false;
  for (const expression of node.expressions) {
    if (isTmpdirCall(expression)) {
      sawTmpdir = true;
      continue;
    }
    if (expression.type !== AST_NODE_TYPES.Literal || typeof expression.value !== 'string') {
      return false;
    }
  }
  return sawTmpdir;
}

/**
 * `os.tmpdir() + '/agent-state.json'` — the third spelling of the same path.
 *
 * `+` is what people write before they remember `path.join` exists, and it
 * produces a path as constant as either of the other two forms.
 */
function isStaticTmpdirConcat(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.BinaryExpression || node.operator !== '+') return false;
  const side = (part: TSESTree.Node): 'tmpdir' | 'static' | 'other' => {
    if (isTmpdirCall(part)) return 'tmpdir';
    if (part.type === AST_NODE_TYPES.Literal && typeof part.value === 'string') return 'static';
    if (isStaticTmpdirConcat(part)) return 'tmpdir';
    return 'other';
  };
  const left = side(node.left as TSESTree.Node);
  const right = side(node.right);
  if (left === 'other' || right === 'other') return false;
  return left === 'tmpdir' || right === 'tmpdir';
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
              'Temporary path prefixes to flag. Replaces the built-in list rather than extending it.'
          },
          ignoreFiles: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'List of files or patterns to ignore'
          }
        },
        additionalProperties: false
      }
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const options = context.options[0] || {};
    const tempPaths = options.tempPaths || DEFAULT_TEMP_PATHS;
    const ignoreFiles = options.ignoreFiles || [];
    const filename = context.filename;

    if (ignoreFiles.some(pattern => filename.includes(pattern))) {
      return {};
    }

    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    /**
     * A predictable temp path only matters where it becomes the name something
     * is written to.
     *
     * Called from the three sites that produce such a name — a declarator, an
     * assignment, and the path argument of an fs write — rather than by walking
     * up from the `path.join` call. That is the same "bound to a name, or
     * written through" standard the literal scan below already applies, and it
     * keeps `log(path.join(os.tmpdir(), 'x'))` from reporting.
     */
    /**
     * Which `fs` entry point is this call, if it is one?
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
     * answer — a file where `fs` is an unresolved global, which is how a great
     * deal of scripting code and every snippet is written. It is pre-existing
     * debt, deliberately not extended: the resolver is what the new function
     * names ride on.
     */
    function fsEntryPoint(node: TSESTree.CallExpression): string | undefined {
      const callee = node.callee;

      const scope = context.sourceCode.getScope(node);
      // `fs['writeFileSync']` is `fs.writeFileSync`. The resolver abstains on
      // computed members because a computed key is usually unknowable — but a
      // string literal key names the export as precisely as dot notation does,
      // so resolve the RECEIVER and append the key by hand.
      const binding =
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.computed &&
        callee.property.type === AST_NODE_TYPES.Literal &&
        typeof callee.property.value === 'string'
          ? ((base) =>
              base && { module: base.module, path: [...base.path, callee.property.value as string] })(
              resolveModuleBinding(callee.object, scope, { equivalents: FS_EQUIVALENTS }),
            )
          : resolveModuleBinding(callee, scope, { equivalents: FS_EQUIVALENTS });
      if (binding) {
        const fn = binding.path.at(-1);
        const prefix = binding.path.slice(0, -1);
        if (fn === undefined) return undefined;
        // fs → root or `fs.promises`; fs/promises → root. Anything deeper is
        // some other API that merely shares a method name.
        const reachable =
          (binding.module === 'fs' &&
            (prefix.length === 0 || (prefix.length === 1 && prefix[0] === 'promises'))) ||
          (binding.module === 'fs/promises' && prefix.length === 0);
        return reachable ? fn : undefined;
      }

      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        !callee.computed &&
        callee.object.type === AST_NODE_TYPES.Identifier &&
        callee.object.name === 'fs' &&
        callee.property.type === AST_NODE_TYPES.Identifier
      ) {
        return callee.property.name;
      }
      return undefined;
    }

    /** `fs.writeFile(path, …)` and every other spelling of "bytes land here". */
    function isFsWriteCall(node: TSESTree.CallExpression): boolean {
      const fn = fsEntryPoint(node);
      return fn !== undefined && FS_WRITE_FUNCTIONS.has(fn);
    }

    /**
     * Does this binding get handed to `fs.mkdtemp`?
     *
     * `const PREFIX = path.join(os.tmpdir(), 'ingest-'); await fsp.mkdtemp(PREFIX)`
     * is the remediation this rule's own message prescribes, and the rule
     * reported it: the declarator looked exactly like a constant temp path.
     * mkdtemp appends six random characters and creates the directory 0700, so
     * the prefix is never the resolved path. Recognising that by resolving the
     * consuming call — rather than by insisting the join sit syntactically
     * inside the mkdtemp argument list, which is the only shape the old rule
     * tolerated — is what makes hoisting the prefix to a `const` legal.
     */
    function flowsIntoMkdtemp(identifier: TSESTree.Identifier): boolean {
      const variable = findVariable(context.sourceCode, identifier);
      if (!variable) return false;
      return variable.references.some((reference) => {
        const parent = reference.identifier.parent;
        if (parent?.type !== AST_NODE_TYPES.CallExpression) return false;
        if (parent.arguments[0] !== reference.identifier) return false;
        const fn = fsEntryPoint(parent);
        return fn !== undefined && FS_MKDTEMP_FUNCTIONS.has(fn);
      });
    }

    /**
     * A predictable temp path only matters where it becomes a name something is
     * written to — or, when it is bound, where that binding is not immediately
     * randomised by mkdtemp.
     */
    function reportIfPredictable(
      candidate: TSESTree.Node | null | undefined,
      bound: TSESTree.Node | null,
    ): void {
      if (!candidate) return;
      if (!isPredictableTempPath(candidate)) return;
      if (
        bound !== null &&
        bound.type === AST_NODE_TYPES.Identifier &&
        flowsIntoMkdtemp(bound)
      ) {
        return;
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
      if (node.type === AST_NODE_TYPES.Literal) {
        return typeof node.value === 'string' ? [node.value] : [];
      }
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
        !node.callee.computed &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        (node.callee.property.name === 'join' || node.callee.property.name === 'resolve')
      ) {
        return node.arguments
          .filter(
            (arg): arg is TSESTree.StringLiteral =>
              arg.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string',
          )
          .map((arg) => arg.value);
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
      const direct = staticPathRuns(node);
      if (direct.length > 0) return direct;
      if (node.type !== AST_NODE_TYPES.Identifier) return [];
      const variable = findVariable(context.sourceCode, node);
      if (!variable) return [];
      const priorWrites = variable.references
        .map((reference) => reference.writeExpr)
        .filter((write): write is TSESTree.Node => write != null)
        .filter((write) => write.range[1] <= node.range[0])
        .sort((a, b) => a.range[1] - b.range[1]);
      const lastWrite = priorWrites.at(-1);
      return lastWrite ? staticPathRuns(lastWrite) : [];
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isFsWriteCall(node)) return;

        const pathArg = node.arguments[0];
        if (pathArg) {
          const runs = resolvedPathRuns(pathArg);
          if (runs.some((run) => tempPaths.some((tp) => containsPathSegments(run, tp)))) {
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
