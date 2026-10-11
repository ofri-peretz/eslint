/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview What value does this name hold — in this file, or in the
 * relative module it is imported from?
 *
 * MCP servers keep tool descriptions and Zod schemas in their own modules
 * (`./descriptions`, `./schemas`). A rule that stops at the import line has
 * two bad options: report every imported description as "assembled at
 * runtime", or trust every import. This resolver reads the imported module
 * instead:
 *
 *   - only RELATIVE specifiers (`./x`, `../x`) — a package is not this
 *     project's code;
 *   - the file is parsed with the parser ESLint is already using
 *     (`context.languageOptions.parser`), and the result is cached per
 *     absolute path and modification time;
 *   - any failure — no file, no `parseForESLint`, a parse error, a cycle, the
 *     depth bound — is `unknown`, and callers abstain on `unknown`.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { propertyName, staticString } from '@interlace/eslint-devkit';
import { lookupVariable } from './tool-registration';

/** Where an expression lives: the scope to resolve its names in, and its file. */
export interface Site {
  scope: TSESLint.Scope.Scope;
  file: string;
}

export type Resolution =
  /** The expression the name is bound to, and where it lives. */
  | { kind: 'value'; node: TSESTree.Node; site: Site }
  /** `import * as ns from './x'` — the module itself. */
  | { kind: 'namespace'; file: string }
  /** Provably not a fixed expression: a `let`, a parameter, a destructure, a function. */
  | { kind: 'dynamic' }
  /** Declared nowhere this file can see. */
  | { kind: 'global' }
  /** Could not be resolved — a package import, an unreadable module, a cycle. */
  | { kind: 'unknown' };

/** The subset of an ESLint parser this resolver uses. */
export interface ParserLike {
  parseForESLint?: (
    code: string,
    options: Record<string, unknown>,
  ) => {
    ast: TSESTree.Program;
    scopeManager?: TSESLint.Scope.ScopeManager | null;
  };
}

export interface ResolveOptions {
  parser: unknown;
  /** Hops taken so far across names and modules. */
  depth: number;
}

/** How many name/module hops one question may take. */
export const MAX_RESOLVE_DEPTH = 12;

const SOURCE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
];
const TS_FOR_JS: Readonly<Record<string, readonly string[]>> = {
  '.js': ['.ts', '.tsx'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
};

const UNKNOWN: Resolution = { kind: 'unknown' };
const DYNAMIC: Resolution = { kind: 'dynamic' };

function isFile(file: string): boolean {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

/**
 * The file a relative specifier names, or `undefined` for a package specifier
 * or a file that is not there. Tries the path as written, with each source
 * extension, as a directory `index`, and the TypeScript-ESM convention of
 * importing `./x.js` for `./x.ts`.
 */
export function resolveRelative(
  fromFile: string,
  specifier: string,
): string | undefined {
  if (!specifier.startsWith('./') && !specifier.startsWith('../'))
    return undefined;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const ext = path.extname(base);
  const stem = base.slice(0, base.length - ext.length);
  const candidates = [
    base,
    ...(TS_FOR_JS[ext] ?? []).map((e) => stem + e),
    ...SOURCE_EXTENSIONS.map((e) => base + e),
    ...SOURCE_EXTENSIONS.map((e) => path.join(base, `index${e}`)),
  ];
  return candidates.find(isFile);
}

interface ParsedModule {
  ast: TSESTree.Program;
  scope: TSESLint.Scope.Scope;
}

/** Parsed modules, per parser (a parse is only valid for the parser that made it). */
const caches = new WeakMap<
  object,
  Map<string, { mtimeMs: number; parsed: ParsedModule | undefined }>
>();

/** Parse a module with the active parser; `undefined` on any failure. */
export function parseModule(
  file: string,
  parser: unknown,
): ParsedModule | undefined {
  const parse = (parser as ParserLike | undefined)?.parseForESLint;
  if (typeof parse !== 'function') return undefined;
  let mtimeMs: number;
  try {
    mtimeMs = fs.statSync(file).mtimeMs;
  } catch {
    return undefined;
  }
  let cache = caches.get(parser as object);
  if (cache === undefined) {
    cache = new Map();
    caches.set(parser as object, cache);
  }
  const cached = cache.get(file);
  if (cached?.mtimeMs === mtimeMs) return cached.parsed;

  let parsed: ParsedModule | undefined;
  try {
    const result = parse(fs.readFileSync(file, 'utf8'), {
      sourceType: 'module',
      ecmaVersion: 'latest',
      range: true,
      loc: true,
      filePath: file,
    });
    // Parsed as a module, so a module scope exists whenever a scope manager
    // does.
    const scope = result.scopeManager?.scopes.find((s) => s.type === 'module');
    if (scope) parsed = { ast: result.ast, scope };
  } catch {
    parsed = undefined;
  }
  cache.set(file, { mtimeMs, parsed });
  return parsed;
}

/** The name an import/export specifier spells, in either spelling. */
function specName(node: TSESTree.Identifier | TSESTree.StringLiteral): string {
  return node.type === 'Identifier' ? node.name : node.value;
}

/**
 * What `name` is bound to in `site`, following a relative import into its
 * module.
 */
export function resolveIdentifier(
  node: TSESTree.Identifier,
  site: Site,
  options: ResolveOptions,
): Resolution {
  const { depth } = options;
  if (depth > MAX_RESOLVE_DEPTH) return UNKNOWN;
  const variable = lookupVariable(node.name, site.scope);
  const def = variable?.defs[0];
  if (def === undefined) return { kind: 'global' };

  if (def.type === 'ImportBinding') {
    const declaration = def.parent;
    if (declaration.type !== 'ImportDeclaration') return UNKNOWN;
    const file = resolveRelative(site.file, declaration.source.value);
    if (file === undefined) return UNKNOWN;
    const spec = def.node;
    if (spec.type === 'ImportNamespaceSpecifier')
      return { kind: 'namespace', file };
    // The parent is an ImportDeclaration, so the specifier is a default or a
    // named one — never an import-equals.
    const imported =
      spec.type === 'ImportDefaultSpecifier'
        ? 'default'
        : specName((spec as TSESTree.ImportSpecifier).imported);
    return (
      resolveExport(file, imported, { ...options, depth: depth + 1 }) ?? UNKNOWN
    );
  }

  if (
    def.type === 'Variable' &&
    def.parent.kind === 'const' &&
    def.node.id.type === 'Identifier' &&
    def.node.init
  ) {
    return { kind: 'value', node: def.node.init, site };
  }
  return DYNAMIC;
}

/**
 * What module `file` exports as `name`, or `undefined` when it does not
 * export that name at all.
 */
export function resolveExport(
  file: string,
  name: string,
  options: ResolveOptions,
): Resolution | undefined {
  const { depth } = options;
  if (depth > MAX_RESOLVE_DEPTH) return UNKNOWN;
  const parsed = parseModule(file, options.parser);
  if (parsed === undefined) return UNKNOWN;
  const site: Site = { scope: parsed.scope, file };
  const next = { ...options, depth: depth + 1 };

  for (const statement of parsed.ast.body) {
    if (statement.type === 'ExportDefaultDeclaration') {
      if (name !== 'default') continue;
      const declaration = statement.declaration;
      if (declaration.type === 'Identifier')
        return resolveIdentifier(declaration, site, next);
      return declaration.type.endsWith('Declaration')
        ? DYNAMIC
        : { kind: 'value', node: declaration, site };
    }
    if (statement.type === 'ExportAllDeclaration') {
      const target = resolveRelative(file, statement.source.value);
      // `export * as ns from './x'` exports the module itself under one name.
      if (statement.exported !== null) {
        if (specName(statement.exported) !== name) continue;
        return target === undefined
          ? UNKNOWN
          : { kind: 'namespace', file: target };
      }
      const found = target && resolveExport(target, name, next);
      if (found) return found;
      continue;
    }
    if (statement.type !== 'ExportNamedDeclaration') continue;
    const declaration = statement.declaration;
    if (declaration?.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations) {
        if (declarator.id.type !== 'Identifier' || declarator.id.name !== name)
          continue;
        return declaration.kind === 'const' && declarator.init
          ? { kind: 'value', node: declarator.init, site }
          : DYNAMIC;
      }
    } else if (
      declaration &&
      'id' in declaration &&
      declaration.id?.type === 'Identifier' &&
      declaration.id.name === name
    ) {
      // An exported function, class or enum is not text.
      return DYNAMIC;
    }
    for (const spec of statement.specifiers) {
      if (specName(spec.exported) !== name) continue;
      if (statement.source === null)
        return resolveIdentifier(spec.local as TSESTree.Identifier, site, next);
      const target = resolveRelative(file, statement.source.value);
      return target === undefined
        ? UNKNOWN
        : (resolveExport(target, specName(spec.local), next) ?? UNKNOWN);
    }
  }
  return undefined;
}

/**
 * Resolve `node` — an identifier, a property read off a resolvable object
 * literal or namespace, or any other expression — to the expression it
 * finally denotes, following `const` bindings and relative imports.
 */
export function resolveValue(
  node: TSESTree.Node,
  site: Site,
  options: ResolveOptions,
): Resolution {
  // Bounded by the depth checks in resolveIdentifier / resolveExport: every
  // cycle passes through one of them.
  const next = { ...options, depth: options.depth + 1 };
  const unwrapped = unwrapTypeOnly(node);

  if (unwrapped.type === 'Identifier') {
    const found = resolveIdentifier(unwrapped, site, next);
    return found.kind === 'value'
      ? resolveValue(found.node, found.site, next)
      : found;
  }
  if (unwrapped.type === 'MemberExpression') {
    const key = propertyName(unwrapped);
    if (key === null) return DYNAMIC;
    const base = resolveValue(unwrapped.object, site, next);
    if (base.kind === 'namespace') {
      const found = resolveExport(base.file, key, next) ?? UNKNOWN;
      return found.kind === 'value'
        ? resolveValue(found.node, found.site, next)
        : found;
    }
    if (base.kind !== 'value') return base;
    const object = unwrapTypeOnly(base.node);
    if (object.type !== 'ObjectExpression') return DYNAMIC;
    // The last writer wins: a spread after the key may override it.
    let value: Resolution = DYNAMIC;
    for (const prop of object.properties) {
      if (prop.type === 'SpreadElement') {
        value = DYNAMIC;
        continue;
      }
      if (prop.computed) continue;
      const name =
        prop.key.type === 'Identifier' ? prop.key.name : staticString(prop.key);
      if (name === key)
        value = { kind: 'value', node: prop.value, site: base.site };
    }
    return value.kind === 'value'
      ? resolveValue(value.node, value.site, next)
      : value;
  }
  return { kind: 'value', node: unwrapped, site };
}

/** `x as const`, `x satisfies T`, `<T>x`, `x!` — the same value. */
export function unwrapTypeOnly(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (
    current.type === 'TSAsExpression' ||
    current.type === 'TSSatisfiesExpression' ||
    current.type === 'TSTypeAssertion' ||
    current.type === 'TSNonNullExpression'
  ) {
    current = current.expression;
  }
  return current;
}

/** The site of a node in the file being linted. */
export function siteOf(
  context: Readonly<TSESLint.RuleContext<string, readonly unknown[]>>,
  node: TSESTree.Node,
): Site {
  return { scope: context.sourceCode.getScope(node), file: context.filename };
}

/** The parser ESLint is using for this file, for parsing imported modules. */
export function activeParser(
  context: Readonly<TSESLint.RuleContext<string, readonly unknown[]>>,
): unknown {
  return (context.languageOptions as { parser?: unknown } | undefined)?.parser;
}

/**
 * A resolver for one lint run: the expression a value finally denotes, or
 * `undefined` when it cannot be resolved to one.
 */
export function valueResolverFor(
  context: Readonly<TSESLint.RuleContext<string, readonly unknown[]>>,
): (node: TSESTree.Node) => TSESTree.Node | undefined {
  const parser = activeParser(context);
  return (node) => {
    const resolved = resolveValue(node, siteOf(context, node), {
      parser,
      depth: 0,
    });
    return resolved.kind === 'value' ? resolved.node : undefined;
  };
}
