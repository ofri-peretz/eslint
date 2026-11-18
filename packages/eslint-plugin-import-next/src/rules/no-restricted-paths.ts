/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-restricted-paths
 * Enforce which files can be imported in a given folder (eslint-plugin-import inspired)
 */
import path from 'node:path';
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  resolveModule,
  staticString,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds =
  | 'restrictedPath'
  | 'pathViolation'
  | 'zoneViolation'
  | 'exceptionNotInside'
  | 'exceptionNotGlob'
  | 'fromMixesGlobs';

/** eslint-plugin-import's zone: files in `target` may not import from `from`. */
export interface Zone {
  target: string | string[];
  from: string | string[];
  except?: string[];
  message?: string;
}

export interface Options {
  /** Array of restricted path patterns */
  restricted?: string[];
  /** eslint-plugin-import's zones, with its meaning. */
  zones?: Zone[];
  /** Directory the zones' paths are relative to. Default: ESLint's cwd. */
  basePath?: string;
}

/** A glob, as eslint-plugin-import's `is-glob` sees one. */
const isGlob = (p: string): boolean => /[*?]|\[.*\]|\{.*\}|[!@+]\(/.test(p);

/**
 * `file` is `dir` or inside it — by path SEGMENT: a folder named `..cache`
 * is inside, though its relative path starts with `..` (eslint-plugin-import
 * tests the prefix, and calls it outside).
 */
const containsPath = (file: string, dir: string): boolean => {
  const relative = path.relative(dir, file);
  // Another drive (Windows) comes back absolute: outside. `..` alone and
  // `../x` are outside; `..cache/x` is not.
  return (
    !path.isAbsolute(relative) &&
    !`${relative}${path.sep}`.startsWith(`..${path.sep}`)
  );
};

/** One `from` entry of a zone, compiled once per file. */
type FromCheck = {
  restricts: (file: string) => boolean;
  /** Set when the zone's `except` is well formed for this `from`. */
  excepts?: (file: string) => boolean;
  invalid: MessageIds;
};

/** eslint-plugin-import's `makePathValidators`. */
function compileFrom(zone: Zone, basePath: string): FromCheck[] {
  const froms = ([] as string[]).concat(zone.from);
  const except = zone.except ?? [];
  const globs = froms.map(isGlob);
  if (globs.some(Boolean) && !globs.every(Boolean)) {
    return [{ restricts: () => true, invalid: 'fromMixesGlobs' }];
  }
  return froms.map((from) => {
    const absolute = path.resolve(basePath, from);
    if (globs[0]) {
      return {
        restricts: (file) => path.matchesGlob(file, absolute),
        excepts: except.every(isGlob)
          ? (file) => except.some((e) => path.matchesGlob(file, e))
          : undefined,
        invalid: 'exceptionNotGlob',
      };
    }
    const exceptions = except.map((e) => path.resolve(absolute, e));
    return {
      restricts: (file) => containsPath(file, absolute),
      excepts: exceptions.every((e) => containsPath(e, absolute))
        ? (file) => exceptions.some((e) => containsPath(file, e))
        : undefined,
      invalid: 'exceptionNotInside',
    };
  });
}

type RuleOptions = [Options?];

/**
 * Does `importPath` contain the path segments of `pattern`, in order, as whole
 * segments? `server` matches `../server/db` and `@/server`, not `./observer`
 * or `./server-utils`; `app/server` matches `./app/server`.
 */
function containsSegments(importPath: string, pattern: string): boolean {
  const path = importPath.split('/').filter(Boolean);
  const wanted = pattern.split('/').filter(Boolean);
  if (wanted.length === 0) return false;
  for (let i = 0; i + wanted.length <= path.length; i++) {
    if (wanted.every((seg, j) => path[i + j] === seg)) return true;
  }
  return false;
}

export const noRestrictedPaths = createRule<RuleOptions, MessageIds>({
  name: 'no-restricted-paths',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-restricted-paths.md',
      description: 'Enforce which files can be imported in a given folder',
    },
    hasSuggestions: false,
    messages: {
      restrictedPath: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Restricted Import Path',
        description: 'Import violates architectural boundary rules',
        severity: 'HIGH',
        fix: 'Restructure code to respect architectural boundaries',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md',
      }),
      pathViolation: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Architecture Violation',
        description: 'Import crosses forbidden architectural boundary',
        severity: 'HIGH',
        fix: 'Move code or adjust import to comply with architecture rules',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md',
      }),
      zoneViolation: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Zone Boundary Violation',
        description:
          'Unexpected path "{{importPath}}" imported in restricted zone.{{message}}',
        severity: 'MEDIUM',
        fix: 'Restructure imports to respect zone boundaries',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md',
      }),
      exceptionNotInside: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid Zone Exception',
        description:
          'Restricted path exceptions must be descendants of the configured `from` path for that zone',
        severity: 'MEDIUM',
        fix: 'Write each `except` path inside its zone’s `from`',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md',
      }),
      exceptionNotGlob: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid Zone Exception',
        description:
          'Restricted path exceptions must be glob patterns when `from` contains glob patterns',
        severity: 'MEDIUM',
        fix: 'Write every `except` entry as a glob',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md',
      }),
      fromMixesGlobs: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Invalid Zone',
        description:
          'Restricted path `from` must contain either only glob patterns or none',
        severity: 'MEDIUM',
        fix: 'Split the zone so each `from` list is all globs or all paths',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-restricted-paths.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          restricted: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of restricted path patterns',
          },
          zones: {
            type: 'array',
            minItems: 1,
            description:
              'eslint-plugin-import zones: files in `target` may not import files in `from`, except those in `except`',
            items: {
              type: 'object',
              properties: {
                target: {
                  anyOf: [
                    { type: 'string' },
                    {
                      type: 'array',
                      items: { type: 'string' },
                      uniqueItems: true,
                    },
                  ],
                },
                from: {
                  anyOf: [
                    { type: 'string' },
                    {
                      type: 'array',
                      items: { type: 'string' },
                      uniqueItems: true,
                    },
                  ],
                },
                except: {
                  type: 'array',
                  items: { type: 'string' },
                  uniqueItems: true,
                },
                message: { type: 'string' },
              },
              // Without either, `path.resolve(basePath, undefined)` throws
              // mid-lint; a config error at load names the problem instead.
              required: ['target', 'from'],
              additionalProperties: false,
            },
          },
          basePath: {
            type: 'string',
            description:
              "Directory the zones' paths are relative to. Default: ESLint's cwd.",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ restricted: [] }],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let restricted: string[];
    /** The zones whose `target` holds the linted file, compiled. */
    let zones: { zone: Zone; froms: FromCheck[] }[];

    function checkZones(importPath: string, node: TSESTree.Node): void {
      if (zones.length === 0) return;
      const resolved = resolveModule(importPath, context.filename);
      if (!resolved) return;
      const file: string = resolved;
      for (const { zone, froms } of zones) {
        for (const from of froms.filter((f: FromCheck) => f.restricts(file))) {
          if (!from.excepts) {
            context.report({ node, messageId: from.invalid });
          } else if (!from.excepts(file)) {
            context.report({
              node,
              messageId: 'zoneViolation',
              data: {
                importPath,
                message: zone.message ? ` ${zone.message}` : '',
              },
            });
          }
        }
      }
    }

    function checkImport(importPath: string, node: TSESTree.Node) {
      checkZones(importPath, node);
      for (const pattern of restricted) {
        if (containsSegments(importPath, pattern)) {
          context.report({
            node,
            messageId: 'pathViolation',
          });
          return;
        }
      }
    }

    return {
      before() {
        const [options] = context.options;
        let basePath: string | undefined;
        let configured: Zone[];
        ({ restricted = [], zones: configured = [], basePath } = options || {});
        const base = basePath ?? context.cwd;
        zones = configured
          .filter((zone) =>
            ([] as string[]).concat(zone.target).some((target) => {
              const absolute = path.resolve(base, target);
              return isGlob(absolute)
                ? path.matchesGlob(context.filename, absolute)
                : containsPath(context.filename, absolute);
            }),
          )
          .map((zone) => ({ zone, froms: compileFrom(zone, base) }));
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const importPath = node.source.value;

        if (typeof importPath === 'string') {
          checkImport(importPath, node.source);
        }
      },

      // `export { x } from 'p'`, `export * from 'p'`
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.source) checkImport(node.source.value, node.source);
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        checkImport(node.source.value, node.source);
      },

      ImportExpression(node: TSESTree.ImportExpression) {
        const staticText = staticString(node.source);
        if (staticText !== null) checkImport(staticText, node.source);
      },

      // `import x = require('p')`
      TSExternalModuleReference(node: TSESTree.TSExternalModuleReference) {
        // TypeScript only accepts a string literal here.
        const literal = node.expression as TSESTree.StringLiteral;
        checkImport(literal.value, literal);
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Check require() calls
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1
        ) {
          const arg = node.arguments[0];
          const staticText = staticString(arg);
          if (staticText !== null) {
            checkImport(staticText, arg);
          }
        }
      },
    };
  },
});
