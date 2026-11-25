/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-extraneous-dependencies
 * Forbid the use of extraneous packages (eslint-plugin-import inspired)
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { createRule, staticString } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  readJsonFileSync,
  findFileUpward,
  statSync,
} from '@interlace/eslint-devkit';
import { getDirname } from '@interlace/eslint-devkit';
import {
  namesUnmodelledResolver,
  resolveWithSettings,
} from '../utils/settings-resolver';

type MessageIds =
  | 'extraneousDependency'
  | 'missingDependency'
  | 'devDependencyInProduction'
  | 'addToDependencies'
  | 'addToDevDependencies'
  | 'moveToDependencies'
  | 'packageJsonNotFound'
  | 'packageJsonUnparsable';

/**
 * A dependency kind's switch: `true`/`false`, or eslint-plugin-import's list
 * of globs naming the files that may import that kind (`['**\/*.test.js']`).
 */
type DependencyKindSetting = boolean | string[];

export interface Options {
  /** Allow dev dependencies */
  devDependencies?: DependencyKindSetting;
  /** Allow optional dependencies */
  optionalDependencies?: DependencyKindSetting;
  /** Allow peer dependencies */
  peerDependencies?: DependencyKindSetting;
  /** Allow bundled dependencies */
  bundledDependencies?: DependencyKindSetting;
  /**
   * eslint-plugin-import: the folder(s) whose package.json declares the
   * dependencies, instead of the nearest one. Several are merged.
   */
  packageDir?: string | string[];
  /**
   * eslint-plugin-import: `true` also checks internal modules — a bare
   * specifier matching the `import/internal-regex` setting, or one the
   * configured resolvers resolve to a file of this package outside
   * `node_modules`, such as a tsconfig `paths` alias. Absent or `false`: an
   * internal module is the project's own code, not a package, and is skipped.
   */
  includeInternal?: boolean;
  /** eslint-plugin-import: check type-only imports and exports too. */
  includeTypes?: boolean;
  /** Package.json file name to use */
  packageJsonPath?: string;
  /** Direct package.json content for testing */
  packageJson?: PackageJson;
  /**
   * Dependency resolution strategy. 'workspace' and 'monorepo' are aliases; see the
   * schema description for exactly what they allow.
   */
  resolutionStrategy?: 'strict' | 'workspace' | 'monorepo';
  /** Allow packages matching patterns */
  allowPatterns?: string[];
  /** Ignore specific packages (don't report as missing) */
  ignore?: string[];
  /**
   * Treat an inline-type-only import (`import { type X } from 'pkg'`) as a
   * runtime import. Set this when the project compiles with TypeScript's
   * `verbatimModuleSyntax`: under that flag the inline form is not erased —
   * `tsc` emits `import {} from 'pkg'`, so the package must still resolve at
   * runtime. A statement-level `import type` is erased under every setting and
   * stays skipped either way. Same option, same meaning, as `no-cycle`.
   */
  verbatimModuleSyntax?: boolean;
}

type RuleOptions = [Options?];

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  bundledDependencies?: string[] | boolean | Record<string, string>;
  /** npm accepts both spellings. */
  bundleDependencies?: string[] | boolean | Record<string, string>;
}

/**
 * The bundled list, as eslint-plugin-import reads it: `bundleDependencies`
 * wins over `bundledDependencies` unless it is falsy (`||`, so
 * `bundleDependencies: false` falls through), and an object form (`{ "pkg": "latest" }`) names
 * its keys. `true` bundles every dependency, which are allowed anyway.
 */
function bundledList(json: PackageJson): string[] {
  const list = json.bundleDependencies || json.bundledDependencies;
  if (Array.isArray(list)) return list;
  return list && typeof list === 'object' ? Object.keys(list) : [];
}

/**
 * eslint-plugin-import's `packageDir` with several folders: one manifest
 * whose dependency fields are the union of theirs.
 */
function mergeManifests(manifests: PackageJson[]): PackageJson {
  const merged = {
    dependencies: {},
    devDependencies: {},
    optionalDependencies: {},
    peerDependencies: {},
    bundledDependencies: [] as string[],
  };
  for (const json of manifests) {
    Object.assign(merged.dependencies, json.dependencies);
    Object.assign(merged.devDependencies, json.devDependencies);
    Object.assign(merged.optionalDependencies, json.optionalDependencies);
    Object.assign(merged.peerDependencies, json.peerDependencies);
    merged.bundledDependencies.push(...bundledList(json));
  }
  return merged;
}

/**
 * eslint-plugin-import's `testConfig`: a boolean is itself, absent is
 * allowed, and a glob list allows the files it matches, written either
 * relative to the working directory or as an absolute pattern.
 */
function allowedFor(
  setting: DependencyKindSetting | undefined,
  filename: string,
): boolean {
  if (!Array.isArray(setting)) return setting !== false;
  return setting.some(
    (glob) =>
      path.matchesGlob(filename, glob) ||
      path.matchesGlob(filename, path.join(process.cwd(), glob)),
  );
}

/** A dependency kind's schema: a switch, or eslint-plugin-import's globs. */
function kindSchema(kind: string) {
  return {
    type: ['boolean', 'array'] as ('boolean' | 'array')[],
    items: { type: 'string' as const },
    default: true,
    description: `Allow imports from ${kind}: \`true\`/\`false\`, or globs of the files that may import them.`,
  };
}

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
  'bundledDependencies',
  'bundleDependencies',
] as const;

/** The statements a suggestion's TODO comment goes above. */
const STATEMENT_TYPES = new Set<string>([
  'ImportDeclaration',
  'ExportNamedDeclaration',
  'ExportAllDeclaration',
  'TSImportEqualsDeclaration',
  'VariableDeclaration',
  'ExpressionStatement',
]);

/**
 * Does this package.json declare a package? A nameless file with no
 * dependency field (a `{"type":"module"}` scope marker in a sub-folder) only
 * scopes how Node reads the files below it; dependencies still come from the
 * package around it.
 */
function declaresPackage(json: PackageJson): boolean {
  return json.name !== undefined || DEPENDENCY_FIELDS.some((f) => f in json);
}

/**
 * Manifest lookups are shared across files: every file in a package resolves to the
 * same package.json, and reading + parsing it per file was this rule's whole cost on
 * oxlint (~0.5 s per 1,100 files). Module scope, so ESLint (which calls the derived
 * `create` per file) benefits too.
 *
 * - A parsed manifest is reused while its mtime is unchanged, so an editor session
 *   (oxlint / ESLint language server) still sees edits to package.json.
 * - ponytail: the directory → manifest-path map is never invalidated, so a package.json
 *   created *closer* to a file mid-session is not seen until restart. Drop the map
 *   (keep the mtime cache) if that bites.
 */
const manifestPathByDir = new Map<string, string | null>();
const manifestByPath = new Map<
  string,
  { mtimeMs: number; json: PackageJson | null }
>();

function findManifest(dir: string): string | null {
  let hit = manifestPathByDir.get(dir);
  if (hit === undefined) {
    // Settle `dir` first: at the filesystem root a marker's parent is the
    // root again, and the recursive call below then reads this `null`.
    manifestPathByDir.set(dir, null);
    hit = findFileUpward('package.json', dir);
    const json = hit ? readManifest(hit) : null;
    // Walk past scope markers to the manifest that declares the package.
    if (json && !declaresPackage(json)) {
      hit = findManifest(getDirname(getDirname(hit as string)));
    }
    manifestPathByDir.set(dir, hit);
  }
  return hit;
}

function readManifest(file: string): PackageJson | null {
  const stat = statSync(file);
  if (!stat) return null;
  const cached = manifestByPath.get(file);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.json;
  const json = readJsonFileSync<PackageJson>(file);
  manifestByPath.set(file, { mtimeMs: stat.mtimeMs, json });
  return json;
}

export const noExtraneousDependencies = createRule<RuleOptions, MessageIds>({
  name: 'no-extraneous-dependencies',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/no-extraneous-dependencies.md',
      description:
        'Forbid the use of extraneous packages not listed in package.json',
    },
    hasSuggestions: true,
    // The reported messages are one line naming the package and the
    // package.json it belongs in, as eslint-plugin-import's are
    // (`'zod' should be listed in the project's dependencies.`): a drop-in
    // rule's output is read beside the incumbent's, so it is not
    // formatLLMMessage's two-line, icon-and-severity shape.
    messages: {
      extraneousDependency: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Extraneous Dependency',
        description: 'Package not listed in package.json dependencies',
        severity: 'HIGH',
        fix: 'Add package to package.json or remove the import',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-extraneous-dependencies.md',
      }),
      missingDependency:
        "'{{packageName}}' should be listed in the dependencies of {{manifest}}. Run 'npm i -S {{packageName}}' to add it.",
      devDependencyInProduction:
        "'{{packageName}}' should be listed in the dependencies of {{manifest}}, not devDependencies.",
      addToDependencies: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Add to Dependencies',
        description: 'Add package to dependencies in package.json',
        severity: 'HIGH',
        fix: 'Run: npm install <package>',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-extraneous-dependencies.md',
      }),
      addToDevDependencies: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Add to Dev Dependencies',
        description: 'Add package to devDependencies in package.json',
        severity: 'HIGH',
        fix: 'Run: npm install --save-dev <package>',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-extraneous-dependencies.md',
      }),
      packageJsonNotFound:
        'The package.json file named by packageDir could not be found: {{manifest}}.',
      packageJsonUnparsable:
        'The package.json file named by packageDir could not be parsed: {{manifest}}.',
      moveToDependencies: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Move to Dependencies',
        description: 'Move package from devDependencies to dependencies',
        severity: 'MEDIUM',
        fix: 'Move package from devDependencies to dependencies in package.json',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-extraneous-dependencies.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          devDependencies: kindSchema('devDependencies'),
          optionalDependencies: kindSchema('optionalDependencies'),
          peerDependencies: kindSchema('peerDependencies'),
          bundledDependencies: kindSchema('bundledDependencies'),
          packageDir: {
            type: ['string', 'array'],
            items: { type: 'string' },
            description:
              'Folder(s) whose package.json declares the dependencies, instead of the nearest one; several are merged.',
          },
          includeInternal: {
            type: 'boolean',
            description:
              'Check internal modules too (`import/internal-regex`, or resolving to a file of this package outside node_modules, such as a path alias). Absent: skipped.',
          },
          includeTypes: {
            type: 'boolean',
            description: 'Check type-only imports and exports too.',
          },
          packageJsonPath: {
            type: 'string',
            description: 'Path to package.json file to use.',
          },
          packageJson: {
            type: 'object',
            description: 'Direct package.json content for testing.',
          },
          resolutionStrategy: {
            type: 'string',
            enum: ['strict', 'workspace', 'monorepo'],
            default: 'strict',
            description:
              "Dependency resolution strategy. 'strict' allows only packages declared in the nearest package.json. 'workspace' and 'monorepo' are aliases of each other: they additionally allow the literal '@workspace/' and '@company/' scopes, and do NOT read workspace-root or sibling manifests; for real monorepo scopes use allowPatterns.",
          },
          allowPatterns: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Regex patterns for packages to allow even if not in package.json.',
          },
          ignore: {
            type: 'array',
            items: { type: 'string' },
            description:
              "Specific package names to ignore (don't report as missing).",
          },
          verbatimModuleSyntax: {
            type: 'boolean',
            default: false,
            description:
              "Check inline-type-only imports (`import { type X } from 'pkg'`) as runtime imports. Enable when the project compiles with TypeScript's `verbatimModuleSyntax`, under which tsc emits `import {} from 'pkg'` for them. Statement-level `import type` is always ignored.",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      devDependencies: true,
      optionalDependencies: true,
      peerDependencies: true,
      bundledDependencies: true,
      resolutionStrategy: 'strict',
      allowPatterns: [],
      verbatimModuleSyntax: false,
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let devDependencies: boolean;
    let optionalDependencies: boolean;
    let peerDependencies: boolean;
    let bundledDependencies: boolean;
    let packageJsonPath: string | undefined;
    let packageJson: PackageJson | undefined;
    let resolutionStrategy: 'strict' | 'workspace' | 'monorepo';
    let allowPatterns: string[];
    let ignore: string[];
    let verbatimModuleSyntax: boolean;
    let includeTypes: boolean;
    let skipInternal: boolean;
    let coreModules: unknown[];
    let resolvedPackageJson: PackageJson | null;
    let allowedPackages: Set<string>;
    /** The package.json the dependencies were read from, for the message. */
    let manifest: string;
    const shown = (file: string) => path.relative(context.cwd, file);

    /**
     * eslint-plugin-import's "internal" module: a bare specifier the project
     * maps to its own code, by the `import/internal-regex` setting or by
     * resolving — through the configured resolvers, tsconfig `paths`
     * included — to a file of this package that is not in a module folder
     * (`node_modules`, or the `import/external-module-folders` setting).
     * A file outside the linted file's package is external
     * (eslint-plugin-import's `isExternalPath`), and so is one that does not
     * resolve here; `notAPackageToDeclare` then skips it, as
     * eslint-plugin-import does once `resolve()` comes back empty.
     */
    function isInternal(
      importPath: string,
      resolve: () => string | null,
    ): boolean {
      const internalRegex = context.settings['import/internal-regex'];
      if (
        typeof internalRegex === 'string' &&
        new RegExp(internalRegex).test(importPath)
      ) {
        return true;
      }
      const resolved = resolve();
      if (resolved === null) return false;
      if (resolved.split(path.sep).includes('node_modules')) return false;
      const inside = (dir: string) => {
        const rel = path.relative(dir, resolved);
        return !rel.startsWith('..') && !path.isAbsolute(rel);
      };
      const manifest = findManifest(getDirname(context.filename));
      const root = manifest
        ? getDirname(manifest)
        : getDirname(context.filename);
      if (!inside(root)) return false;
      const folders = context.settings['import/external-module-folders'];
      return !(Array.isArray(folders) ? folders : []).some(
        (folder) =>
          typeof folder === 'string' && inside(path.resolve(root, folder)),
      );
    }

    /**
     * eslint-plugin-import's second look before it reports: the name in the
     * package.json of the file the specifier resolves to. A path alias into
     * another package of the repo (`@cli/constants` → a workspace package's
     * file) is that package, declared under its own name.
     */
    function realPackageName(resolved: string | null): string | undefined {
      if (resolved === null) return undefined;
      const manifest = findManifest(getDirname(resolved));
      return manifest ? readManifest(manifest)?.name : undefined;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function isExternalPackage(importPath: string): string | null {
      // Skip relative imports.
      //
      // `.` and `..` are relative specifiers too — `require('..')` is how a
      // package's own tests import the package root, and it appeared four times
      // in ten findings on auth0/express-openid-connect. Testing only for the
      // `./` and `../` PREFIXES let both fall through and be reported as
      // packages literally named `.` and `..`.
      if (/^\.\.?(\/|$)/.test(importPath)) {
        return null;
      }

      // Skip absolute paths
      if (importPath.startsWith('/')) {
        return null;
      }

      // Skip Node subpath imports.
      //
      // A `#`-prefixed specifier resolves through the package's OWN `imports`
      // field in package.json. It is internal by specification and can never
      // name an external dependency, so reporting one is always wrong.
      if (importPath.startsWith('#')) {
        return null;
      }

      // Skip Node.js built-ins.
      //
      // This was a hand-written list of 29 names, frozen at roughly Node 8:
      // no `process`, `module`, `worker_threads`, `perf_hooks`, `async_hooks`
      // or `test`. `import process from 'node:process'` — the spelling
      // `unicorn/prefer-node-protocol` demands — was reported as a missing
      // dependency. A `node:`-prefixed specifier is a builtin by definition,
      // and the bare names are whatever the running Node says they are.
      if (
        importPath.startsWith('node:') ||
        builtinModules.includes(importPath)
      ) {
        return null;
      }

      // Skip any other `<scheme>:` specifier.
      //
      // A specifier carrying a URI scheme is not a package path, so splitting it
      // on `/` derives a name npm's grammar forbids — `:` is outside
      // [a-z0-9-._~]. `fumadocs-mdx:collections/server` yielded the "package"
      // `fumadocs-mdx:collections` and a HIGH report telling the user to run
      // `npm install fumadocs-mdx:collections`, which cannot succeed, while the
      // package that actually backs it (`fumadocs-mdx`) was declared all along.
      // This is the same class as the `#` and `node:` cases above, and it covers
      // both spec-defined URL specifiers (`data:`, `https:`) and build-tool
      // virtual modules (`virtual:`, `astro:`). Mapping the prefix to a package
      // would only move the false positive: `virtual:pwa-register` belongs to no
      // package, and `astro:content` does not belong to one named `astro`.
      // A bare Windows drive path is not a scheme — require 2+ chars.
      if (/^[a-zA-Z][a-zA-Z0-9+\-.]+:/.test(importPath)) {
        return null;
      }

      // Extract package name from scoped packages or regular packages
      const packageName = importPath.startsWith('@')
        ? importPath.split('/').slice(0, 2).join('/')
        : importPath.split('/')[0];

      return packageName;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function isWorkspacePackage(packageName: string): boolean {
      // Two literal scopes, not real workspace resolution: nothing here reads the
      // workspace-root manifest, expands a `workspaces` glob or looks at a sibling
      // package. The schema description says so; `allowPatterns` is the escape hatch
      // for real monorepo scopes.
      return (
        packageName.startsWith('@workspace/') ||
        packageName.startsWith('@company/')
      );
    }

    function checkImport(importPath: string, node: TSESTree.Node) {
      const packageName = isExternalPackage(importPath);
      if (!packageName) {
        return;
      }

      // `import/core-modules`: names the runtime provides (`electron`).
      if (coreModules.includes(packageName)) {
        return;
      }

      // Check allow patterns first
      const isAllowedByPattern = allowPatterns.some((pattern: string) => {
        try {
          const regex = new RegExp(pattern);
          return regex.test(packageName);
        } catch {
          return false;
        }
      });

      if (isAllowedByPattern) {
        return;
      }

      // `ignore` is an exact-name allowlist, the blunt sibling of `allowPatterns`.
      // It is published in the schema and the generated docs, so it has to do
      // something; before this it was never read.
      if (ignore.includes(packageName)) {
        return;
      }

      // Apply resolution strategy
      const shouldCheckDependency = (name: string) => {
        switch (resolutionStrategy) {
          case 'workspace':
            // Allow packages that are in dependencies OR are workspace packages
            return !allowedPackages.has(name) && !isWorkspacePackage(name);
          case 'monorepo':
            // Allow cross-package imports in monorepos
            return !allowedPackages.has(name) && !isWorkspacePackage(name);
          case 'strict':
          default:
            return !allowedPackages.has(name);
        }
      };
      /**
       * Asked last, since it costs a resolution that only a specifier about
       * to be reported needs: is it the project's own code (internal), does
       * it resolve to nothing (eslint-plugin-import checks a dependency only
       * once it resolves: docusaurus' `@theme/*` and `@docusaurus/*` virtual
       * modules), or is it a file of another package, declared under that
       * package's name?
       *
       * "Resolves to nothing" is concluded only when every configured
       * resolver is one this plugin models. Under webpack's, a specifier none
       * of ours resolves (`alias/chai`) may still be a package, so it is
       * checked.
       */
      const notAPackageToDeclare = () => {
        let resolved: string | null | undefined;
        const resolve = () =>
          resolved === undefined
            ? (resolved = resolveWithSettings(
                importPath,
                context.filename,
                context.settings,
              ))
            : resolved;
        if (skipInternal && isInternal(importPath, resolve)) return true;
        if (resolve() === null) {
          // `@/` — nothing between `@` and `/` — is not a scoped package
          // under any resolver: npm scopes need at least one character after
          // `@`. It is the create-next-app / shadcn tsconfig `paths` alias
          // convention (`"paths": { "@/*": ["./src/*"] }`), and an unmodelled
          // resolver otherwise treats an unresolved specifier as maybe-a-real
          // package (same reasoning as `fumadocs-mdx:collections` above) —
          // which reported every aliased import as missing once a project
          // configured one (#1551). A specifier no resolver, modelled or
          // not, could ever turn into an installable package is exempt from
          // that assumption.
          if (packageName.startsWith('@/')) return true;
          if (!namesUnmodelledResolver(context.settings)) return true;
        }
        const realName = realPackageName(resolve());
        return (
          realName !== undefined &&
          realName !== packageName &&
          // This package's own name is allowed for self-reference; a path
          // alias back into this package is not a self-reference.
          realName !== resolvedPackageJson?.name &&
          !shouldCheckDependency(realName)
        );
      };

      if (shouldCheckDependency(packageName) && !notAPackageToDeclare()) {
        // Check if it's in devDependencies but we're in production code
        const isInDevDeps =
          resolvedPackageJson?.devDependencies &&
          resolvedPackageJson.devDependencies[packageName];
        if (isInDevDeps && !devDependencies) {
          // Dev dependency used in production code
          context.report({
            node,
            messageId: 'devDependencyInProduction',
            data: {
              packageName,
              manifest,
              importPath,
              suggestion:
                'Move to dependencies if used in production, or ensure this code is only executed in development',
            },
            suggest: [
              {
                messageId: 'moveToDependencies',
                fix(fixer: TSESLint.RuleFixer) {
                  // Find the parent statement to insert before
                  let parentStatement = node;
                  while (
                    parentStatement &&
                    !STATEMENT_TYPES.has(parentStatement.type)
                  ) {
                    parentStatement = parentStatement.parent as TSESTree.Node;
                  }
                  if (parentStatement) {
                    return fixer.insertTextBefore(
                      parentStatement,
                      `// TODO: Move ${packageName} from devDependencies to dependencies in package.json\n`,
                    );
                  }
                  return fixer.insertTextBefore(
                    node,
                    `// TODO: Move ${packageName} from devDependencies to dependencies in package.json\n`,
                  );
                },
              },
            ],
          });
        } else {
          // Completely missing dependency
          context.report({
            node,
            messageId: 'missingDependency',
            data: {
              packageName,
              manifest,
              importPath,
              allowedPackages:
                Array.from(allowedPackages).slice(0, 5).join(', ') +
                (allowedPackages.size > 5 ? '...' : ''),
              suggestion: `Add "${packageName}" to package.json dependencies`,
            },
            suggest: [
              {
                messageId: 'addToDependencies',
                fix(fixer: TSESLint.RuleFixer) {
                  // Find the parent statement to insert before
                  let parentStatement = node;
                  while (
                    parentStatement &&
                    !STATEMENT_TYPES.has(parentStatement.type)
                  ) {
                    parentStatement = parentStatement.parent as TSESTree.Node;
                  }
                  if (parentStatement) {
                    return fixer.insertTextBefore(
                      parentStatement,
                      `// TODO: Run: npm install ${packageName}\n`,
                    );
                  }
                  return fixer.insertTextBefore(
                    node,
                    `// TODO: Run: npm install ${packageName}\n`,
                  );
                },
              },
              {
                messageId: 'addToDevDependencies',
                fix(fixer: TSESLint.RuleFixer) {
                  // Find the parent statement to insert before
                  let parentStatement = node;
                  while (
                    parentStatement &&
                    !STATEMENT_TYPES.has(parentStatement.type)
                  ) {
                    parentStatement = parentStatement.parent as TSESTree.Node;
                  }
                  if (parentStatement) {
                    return fixer.insertTextBefore(
                      parentStatement,
                      `// TODO: Run: npm install --save-dev ${packageName}\n`,
                    );
                  }
                  return fixer.insertTextBefore(
                    node,
                    `// TODO: Run: npm install --save-dev ${packageName}\n`,
                  );
                },
              },
            ],
          });
        }
      }
    }

    return {
      before() {
        const [options] = context.options;
        const o = options || {};
        ({
          packageJsonPath,
          packageJson,
          resolutionStrategy = 'strict',
          allowPatterns = [],
          ignore = [],
          verbatimModuleSyntax = false,
        } = o);

        const filename = context.filename;
        if (!filename) {
          return false;
        }
        devDependencies = allowedFor(o.devDependencies, filename);
        optionalDependencies = allowedFor(o.optionalDependencies, filename);
        peerDependencies = allowedFor(o.peerDependencies, filename);
        bundledDependencies = allowedFor(o.bundledDependencies, filename);
        includeTypes = o.includeTypes === true;
        skipInternal = o.includeInternal !== true;
        coreModules = (context.settings['import/core-modules'] ??
          []) as unknown[];

        // Use provided package.json if available (for testing)
        resolvedPackageJson = null;
        manifest = 'package.json';
        if (packageJson) {
          // Use directly provided package.json (for testing)
          resolvedPackageJson = packageJson;
        } else if (packageJsonPath) {
          // Use specified package.json file
          manifest = shown(packageJsonPath);
          resolvedPackageJson = readManifest(packageJsonPath);
          if (!resolvedPackageJson) {
            // Invalid package.json - skip
            return false;
          }
        } else if (o.packageDir?.length) {
          // eslint-plugin-import's `packageDir`, resolved from the working
          // directory as it resolves it. One folder must hold a readable
          // manifest — a config error is reported once, and the file is not
          // linted against a guess; of several, the readable ones merge.
          const manifests = ([] as string[])
            .concat(o.packageDir)
            .map((dir) => path.join(path.resolve(dir), 'package.json'));
          const read = manifests.map(readManifest);
          manifest = manifests
            .filter((_, i) => read[i])
            .map(shown)
            .join(', ');
          if (manifests.length === 1 && !read[0]) {
            context.report({
              loc: { line: 1, column: 0 },
              messageId: statSync(manifests[0])
                ? 'packageJsonUnparsable'
                : 'packageJsonNotFound',
              data: { manifest: shown(manifests[0]) },
            });
            return false;
          }
          resolvedPackageJson = mergeManifests(
            read.filter((json): json is PackageJson => json !== null),
          );
        } else {
          // Find package.json automatically
          const packageJsonFile = findManifest(getDirname(filename));

          if (!packageJsonFile) {
            // No package.json found - skip this rule
            return false;
          }

          // Read and parse package.json
          manifest = shown(packageJsonFile);
          resolvedPackageJson = readManifest(packageJsonFile);
          if (!resolvedPackageJson) {
            // Invalid package.json - skip
            return false;
          }
        }

        // Build allowed packages map
        allowedPackages = new Set<string>();

        // Add dependencies
        if (resolvedPackageJson?.dependencies) {
          Object.keys(resolvedPackageJson.dependencies).forEach((pkg) =>
            allowedPackages.add(pkg),
          );
        }

        // Add dev dependencies if allowed
        if (devDependencies && resolvedPackageJson?.devDependencies) {
          Object.keys(resolvedPackageJson.devDependencies).forEach((pkg) =>
            allowedPackages.add(pkg),
          );
        }

        // Add optional dependencies if allowed
        if (optionalDependencies && resolvedPackageJson?.optionalDependencies) {
          Object.keys(resolvedPackageJson.optionalDependencies).forEach((pkg) =>
            allowedPackages.add(pkg),
          );
        }

        // Add peer dependencies if allowed
        if (peerDependencies && resolvedPackageJson?.peerDependencies) {
          Object.keys(resolvedPackageJson.peerDependencies).forEach((pkg) =>
            allowedPackages.add(pkg),
          );
        }

        // Add bundled dependencies if allowed (either npm spelling; `true`
        // bundles every dependency, which are already allowed above).
        if (bundledDependencies) {
          bundledList(resolvedPackageJson).forEach((pkg) =>
            allowedPackages.add(pkg),
          );
        }

        // The package's own name: Node resolves it to the package itself
        // (self-reference through `exports`, or a workspace link).
        if (resolvedPackageJson?.name) {
          allowedPackages.add(resolvedPackageJson.name);
        }
        return true;
      },
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // Type imports are erased at compile time, so they cannot pull in a
        // runtime dependency. Upstream ignores them by default: `import type`,
        // and an import whose every specifier is an inline `type`. The inline
        // form is NOT erased under `verbatimModuleSyntax` (tsc emits
        // `import {} from 'pkg'`), so the option keeps it checked.
        if (
          !includeTypes &&
          (node.importKind === 'type' ||
            (!verbatimModuleSyntax &&
              node.specifiers.length > 0 &&
              node.specifiers.every(
                (s) => s.type === 'ImportSpecifier' && s.importKind === 'type',
              )))
        ) {
          return;
        }
        if (node.source.value && typeof node.source.value === 'string') {
          checkImport(node.source.value, node.source);
        }
      },

      // A re-export loads the package at runtime like an import does; a
      // type-only one is erased.
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (!node.source || (!includeTypes && node.exportKind === 'type'))
          return;
        if (
          !includeTypes &&
          !verbatimModuleSyntax &&
          node.specifiers.length > 0 &&
          node.specifiers.every((s) => s.exportKind === 'type')
        ) {
          return;
        }
        checkImport(node.source.value, node.source);
      },

      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        if (!includeTypes && node.exportKind === 'type') return;
        checkImport(node.source.value, node.source);
      },

      // TS `import x = require('pkg')` compiles to `require('pkg')`.
      TSImportEqualsDeclaration(node: TSESTree.TSImportEqualsDeclaration) {
        if (
          (!includeTypes && node.importKind === 'type') ||
          node.moduleReference.type !== 'TSExternalModuleReference'
        ) {
          return;
        }
        const arg = node.moduleReference.expression;
        checkImport((arg as TSESTree.StringLiteral).value, arg);
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

      ImportExpression(node: TSESTree.ImportExpression) {
        // Check dynamic imports
        if (
          node.source.type === 'Literal' &&
          typeof node.source.value === 'string'
        ) {
          checkImport(node.source.value, node.source);
        }
      },
    };
  },
});
