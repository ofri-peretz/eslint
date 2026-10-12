/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Bounded value following, inside a file and across RELATIVE imports.
 *
 * The driver plugins' shared detectors (SQL injection, mass assignment,
 * unscoped mutation, TLS, credentials) are AST-structural. Two extensions are
 * allowed, and both live here so every factory uses the same ones:
 *
 *   (a) INTRA-FILE value following — a bounded, cycle-guarded walk through
 *       `const`/`let` initialisers, single assignments, destructures, member
 *       reads, `await`s and the returns of functions written in the file;
 *   (b) CROSS-FILE resolution of RELATIVE imports — `./db`, `../models` —
 *       read from disk, parsed with the linting parser, cached per absolute
 *       path and modification time.
 *
 * This is the same walk `eslint-plugin-postgresql-security` ships in
 * `utils/cross-file.ts`, generalised so it is not tied to one driver.
 *
 * Nothing here decides from a variable NAME, and nothing here throws: an
 * unreadable, unparseable or unresolvable module is an abstention.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '../ast-node-types';
import { objectKeyName, propertyName } from '../ast/spellings';
import { unwrapTypeSyntax } from '../ast/type-syntax';

/** A parsed module on disk, with the scope analysis its own parser produced. */
export interface ModuleInfo {
  readonly file: string;
  readonly ast: TSESTree.Program;
  readonly scopeManager: TSESLint.Scope.ScopeManager;
}

/** Where a value is being read: the file it sits in, and how to parse others. */
export interface Env {
  /** Absolute path of the file the node belongs to. */
  readonly file: string;
  /** The parser the lint run uses — reused for every module it opens. */
  readonly parser: unknown;
  /** The module the node belongs to, or `null` for the file being linted. */
  readonly module: ModuleInfo | null;
  /** The innermost scope of a node in this file. */
  readonly scopeOf: (node: TSESTree.Node) => TSESLint.Scope.Scope;
}

/** A node, together with the scope and environment it must be read in. */
export interface Value {
  readonly node: TSESTree.Node;
  readonly scope: TSESLint.Scope.Scope;
  readonly env: Env;
}

/** How far a value is followed before giving up. */
export const MAX_FOLLOW_DEPTH = 8;

/** Extensions tried, in order, for a specifier written without one. */
const EXTENSIONS: readonly string[] = [
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
];

/** `./x`, `../x`, `.`, `..` — a file in this project, never a package. */
const RELATIVE = /^\.{1,2}(?:\/|$)/;

/** `./db.js` written for TypeScript's ESM output, meaning `./db.ts`. */
const JS_EXTENSION = /\.[cm]?js$/;

/** Parsed modules by absolute path, invalidated by modification time. */
const modules = new Map<
  string,
  { readonly mtimeMs: number; readonly info: ModuleInfo | null }
>();

/** The slice of a rule context this module reads. */
export interface FollowContextLike {
  readonly physicalFilename: string;
  readonly languageOptions?: { readonly parser?: unknown };
  readonly sourceCode: { getScope(node: TSESTree.Node): TSESLint.Scope.Scope };
}

/** Is `specifier` relative — a file in this project rather than a package? */
export function isRelativeSpecifier(specifier: string): boolean {
  return RELATIVE.test(specifier);
}

/** The environment of the file a rule is linting. */
export function envOf(context: FollowContextLike): Env {
  return {
    file: path.resolve(context.physicalFilename),
    parser: context.languageOptions?.parser,
    module: null,
    scopeOf: (node) => context.sourceCode.getScope(node),
  };
}

/** A node read in the scope of the environment it sits in. */
export function valueAt(node: TSESTree.Node, env: Env): Value {
  return { node, scope: env.scopeOf(node), env };
}

function isFile(candidate: string): boolean {
  return fs.statSync(candidate, { throwIfNoEntry: false })?.isFile() === true;
}

/**
 * The file a RELATIVE specifier names, or `null`. A bare package specifier,
 * a path alias, or a path with nothing on disk behind it is not resolved.
 */
export function resolveRelative(
  fromFile: string,
  specifier: string,
): string | null {
  if (!isRelativeSpecifier(specifier)) return null;
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...EXTENSIONS.map((extension) => `${base}${extension}`),
    ...EXTENSIONS.map((extension) => path.join(base, `index${extension}`)),
  ];
  if (JS_EXTENSION.test(base)) {
    const stem = base.replace(JS_EXTENSION, '');
    candidates.push(`${stem}.ts`, `${stem}.tsx`);
  }
  return candidates.find(isFile) ?? null;
}

/** `@typescript-eslint/parser`, when it is installed next to the project. */
function fallbackParser(): unknown {
  try {
    return createRequire(path.join(process.cwd(), 'package.json'))(
      '@typescript-eslint/parser',
    );
  } catch {
    return null;
  }
}

interface ParseResult {
  readonly ast: TSESTree.Program;
  readonly scopeManager?: TSESLint.Scope.ScopeManager | null;
}

/** Give every node its `parent`, as ESLint does for the file it lints. */
function linkParents(
  node: TSESTree.Node,
  parent: TSESTree.Node | undefined,
): void {
  (node as { parent?: TSESTree.Node }).parent = parent;
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue;
    const children: unknown[] = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (
        typeof child === 'object' &&
        child !== null &&
        typeof (child as TSESTree.Node).type === 'string'
      ) {
        linkParents(child as TSESTree.Node, node);
      }
    }
  }
}

/** Parse source text with the first parser that also produces scope analysis. */
export function parseModule(
  text: string,
  file: string,
  parser: unknown,
): ModuleInfo | null {
  for (const candidate of [parser, fallbackParser()]) {
    const parseForESLint = (candidate as { parseForESLint?: unknown } | null)
      ?.parseForESLint;
    if (typeof parseForESLint !== 'function') continue;
    try {
      const result = (
        parseForESLint as (code: string, options: object) => ParseResult
      )(text, {
        filePath: file,
        sourceType: 'module',
        ecmaVersion: 'latest',
        range: true,
        loc: true,
      });
      if (!result.scopeManager) continue;
      linkParents(result.ast, undefined);
      return { file, ast: result.ast, scopeManager: result.scopeManager };
    } catch {
      // Unparseable by this parser — try the next one, then abstain.
    }
  }
  return null;
}

/**
 * The module at `file`, parsed and cached. JSON is read as the default export
 * of a module whose value is the JSON text, so every AST check applies to it.
 */
export function loadModule(file: string, parser: unknown): ModuleInfo | null {
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  if (stat === undefined || !stat.isFile()) return null;
  const cached = modules.get(file);
  if (cached !== undefined && cached.mtimeMs === stat.mtimeMs)
    return cached.info;

  let info: ModuleInfo | null = null;
  try {
    const text = fs.readFileSync(file, 'utf8');
    if (path.extname(file) === '.json') {
      JSON.parse(text);
      info = parseModule(`export default (${text});`, `${file}.ts`, parser);
    } else {
      info = parseModule(text, file, parser);
    }
  } catch {
    info = null;
  }
  modules.set(file, { mtimeMs: stat.mtimeMs, info });
  return info;
}

/** The innermost scope that contains `node`, inside a module opened from disk. */
export function scopeIn(
  module: ModuleInfo,
  node: TSESTree.Node,
): TSESLint.Scope.Scope {
  let current = node;
  for (; current.parent; current = current.parent) {
    const scope = module.scopeManager.acquire(current, true);
    if (scope !== null) return scope;
  }
  // The Program always carries the module (or global) scope.
  return module.scopeManager.acquire(current, true) as TSESLint.Scope.Scope;
}

/** The environment of a module opened from disk. */
export function moduleEnv(module: ModuleInfo, parser: unknown): Env {
  return {
    file: module.file,
    parser,
    module,
    scopeOf: (node) => scopeIn(module, node),
  };
}

/** The variable a name resolves to, walking outward from `scope`. */
export function lookup(
  name: string,
  scope: TSESLint.Scope.Scope,
): TSESLint.Scope.Variable | null {
  for (
    let current: TSESLint.Scope.Scope | null = scope;
    current;
    current = current.upper
  ) {
    const variable = current.set.get(name);
    if (variable !== undefined) return variable;
  }
  return null;
}

/** `require('x')` — the specifier a CommonJS load names, or `null`. */
export function requiredSpecifier(
  node: TSESTree.Node | null | undefined,
): string | null {
  if (
    node?.type !== AST_NODE_TYPES.CallExpression ||
    node.callee.type !== AST_NODE_TYPES.Identifier ||
    node.callee.name !== 'require'
  ) {
    return null;
  }
  const [argument] = node.arguments;
  return argument?.type === AST_NODE_TYPES.Literal &&
    typeof argument.value === 'string'
    ? argument.value
    : null;
}

/** `export { a as "b" }` — an export name is an identifier or a string. */
function moduleExportName(
  node: TSESTree.Identifier | TSESTree.StringLiteral,
): string {
  return node.type === AST_NODE_TYPES.Identifier ? node.name : node.value;
}

/** `a.b.c` for a non-computed member chain rooted at an identifier, or `null`. */
function memberChain(node: TSESTree.Node): string | null {
  if (node.type === AST_NODE_TYPES.Identifier) return node.name;
  if (node.type !== AST_NODE_TYPES.MemberExpression) return null;
  const key = propertyName(node);
  const head = memberChain(node.object);
  return key === null || head === null ? null : `${head}.${key}`;
}

/** The value of a plainly keyed property of an object literal, or `null`. */
export function findProperty(
  object: TSESTree.ObjectExpression,
  key: string,
): TSESTree.Node | null {
  for (const property of object.properties) {
    if (
      property.type === AST_NODE_TYPES.Property &&
      objectKeyName(property) === key
    ) {
      return property.value;
    }
  }
  return null;
}

/** The value `name` is exported as from `module` — `'default'` for the default export. */
export function exportedValue(
  module: ModuleInfo,
  name: string,
  parser: unknown,
  depth = 0,
): Value | null {
  if (depth > MAX_FOLLOW_DEPTH) return null;
  const env = moduleEnv(module, parser);

  for (const statement of module.ast.body) {
    if (statement.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
      if (name === 'default') return valueAt(statement.declaration, env);
      continue;
    }
    if (statement.type === AST_NODE_TYPES.ExportNamedDeclaration) {
      const declaration = statement.declaration;
      if (declaration?.type === AST_NODE_TYPES.VariableDeclaration) {
        const declarator = declaration.declarations.find(
          (d) => d.id.type === AST_NODE_TYPES.Identifier && d.id.name === name,
        );
        if (declarator?.init) return valueAt(declarator.init, env);
      } else if (
        (declaration?.type === AST_NODE_TYPES.FunctionDeclaration ||
          declaration?.type === AST_NODE_TYPES.ClassDeclaration ||
          declaration?.type === AST_NODE_TYPES.TSTypeAliasDeclaration ||
          declaration?.type === AST_NODE_TYPES.TSInterfaceDeclaration) &&
        declaration.id?.name === name
      ) {
        return valueAt(declaration, env);
      }
      for (const specifier of statement.specifiers) {
        if (moduleExportName(specifier.exported) !== name) continue;
        const local = moduleExportName(specifier.local);
        if (statement.source !== null) {
          const target = resolveRelative(
            module.file,
            String(statement.source.value),
          );
          const next = target === null ? null : loadModule(target, parser);
          return next === null
            ? null
            : exportedValue(next, local, parser, depth + 1);
        }
        const variable = lookup(local, env.scopeOf(module.ast));
        return variable === null
          ? null
          : follow(valueAt(variable.identifiers[0], env), depth + 1);
      }
      continue;
    }
    // CommonJS: `module.exports = { … }` / `module.exports.name = …` / `exports.name = …`
    if (
      statement.type === AST_NODE_TYPES.ExpressionStatement &&
      statement.expression.type === AST_NODE_TYPES.AssignmentExpression &&
      statement.expression.operator === '='
    ) {
      const { left, right } = statement.expression;
      const target = memberChain(left);
      if (target === 'module.exports') {
        if (name === 'default') return valueAt(right, env);
        const object = follow(valueAt(right, env), depth + 1);
        if (object.node.type === AST_NODE_TYPES.ObjectExpression) {
          const property = findProperty(object.node, name);
          if (property !== null) return valueAt(property, object.env);
        }
      } else if (
        target === `module.exports.${name}` ||
        target === `exports.${name}`
      ) {
        return valueAt(right, env);
      }
    }
  }
  return null;
}

/**
 * Where an imported binding comes from: the module on disk and the name it
 * is exported under (`'default'`, a named export, or `'*'` for a namespace).
 */
export function importOrigin(
  variable: TSESLint.Scope.Variable,
  env: Env,
): { readonly module: ModuleInfo; readonly name: string } | null {
  const specifier = importSpecifierOf(variable);
  if (specifier === null) return null;
  const file = resolveRelative(env.file, specifier.source);
  const module = file === null ? null : loadModule(file, env.parser);
  return module === null ? null : { module, name: specifier.name };
}

/**
 * The module specifier a binding is loaded from, and the export it names —
 * for `import`, `import * as`, `const x = require()` and
 * `const { a } = require()`. `null` for any other binding.
 */
export function importSpecifierOf(
  variable: TSESLint.Scope.Variable,
): { readonly source: string; readonly name: string } | null {
  const def = variable.defs[0];
  if (def === undefined) return null;
  if (def.type === 'ImportBinding') {
    if (def.node.type === AST_NODE_TYPES.TSImportEqualsDeclaration) {
      // `import db = require('x')` — CommonJS, so the whole `module.exports`.
      const reference = def.node.moduleReference;
      return reference.type === AST_NODE_TYPES.TSExternalModuleReference &&
        reference.expression.type === AST_NODE_TYPES.Literal
        ? { source: String(reference.expression.value), name: '*' }
        : null;
    }
    const declaration = def.parent as TSESTree.ImportDeclaration;
    const source = String(declaration.source.value);
    if (def.node.type === AST_NODE_TYPES.ImportSpecifier)
      return { source, name: moduleExportName(def.node.imported) };
    if (def.node.type === AST_NODE_TYPES.ImportNamespaceSpecifier)
      return { source, name: '*' };
    return { source, name: 'default' };
  }
  if (def.type !== 'Variable') return null;
  const declarator = def.node as TSESTree.VariableDeclarator;
  const init =
    declarator.init?.type === AST_NODE_TYPES.AwaitExpression
      ? declarator.init.argument
      : declarator.init;
  const source =
    requiredSpecifier(init) ??
    (init?.type === AST_NODE_TYPES.ImportExpression &&
    init.source.type === AST_NODE_TYPES.Literal &&
    typeof init.source.value === 'string'
      ? init.source.value
      : null);
  if (source === null) return null;
  if (declarator.id.type !== AST_NODE_TYPES.ObjectPattern)
    return { source, name: '*' };
  const property = declarator.id.properties.find(
    (p): p is TSESTree.Property =>
      p.type === AST_NODE_TYPES.Property &&
      p.value.type === AST_NODE_TYPES.Identifier &&
      p.value.name === variable.name,
  );
  const name = property === undefined ? null : objectKeyName(property);
  return name === null ? null : { source, name };
}

/** The expression a function returns: a concise body, or its trailing `return`. */
export function returnedValue(fn: TSESTree.Node): TSESTree.Node | null {
  if (
    fn.type !== AST_NODE_TYPES.FunctionDeclaration &&
    fn.type !== AST_NODE_TYPES.FunctionExpression &&
    fn.type !== AST_NODE_TYPES.ArrowFunctionExpression
  ) {
    return null;
  }
  if (fn.body.type !== AST_NODE_TYPES.BlockStatement) return fn.body;
  const last = fn.body.body.at(-1);
  return last?.type === AST_NODE_TYPES.ReturnStatement ? last.argument : null;
}

/**
 * Every value a function can return: a concise body, or the argument of each
 * `return` in its own body (nested functions excluded). `null` when the body
 * can also fall off its end without a `return`, or when one `return` carries
 * no value — then not every result is known.
 */
export function returnedValues(
  fn: TSESTree.FunctionLike,
): TSESTree.Node[] | null {
  if (fn.body === null || fn.body === undefined) return null;
  if (fn.body.type !== AST_NODE_TYPES.BlockStatement) return [fn.body];
  const found: TSESTree.Node[] = [];
  let bare = false;
  const visit = (node: TSESTree.Node): void => {
    if (node.type === AST_NODE_TYPES.ReturnStatement) {
      if (node.argument === null) bare = true;
      else found.push(node.argument);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'parent') continue;
      const children: unknown[] = Array.isArray(value) ? value : [value];
      for (const child of children) {
        if (
          typeof child !== 'object' ||
          child === null ||
          typeof (child as TSESTree.Node).type !== 'string'
        )
          continue;
        const type = (child as TSESTree.Node).type;
        if (
          type === AST_NODE_TYPES.FunctionDeclaration ||
          type === AST_NODE_TYPES.FunctionExpression ||
          type === AST_NODE_TYPES.ArrowFunctionExpression
        )
          continue;
        visit(child as TSESTree.Node);
      }
    }
  };
  visit(fn.body);
  if (bare || !alwaysLeaves(fn.body) || found.length === 0) return null;
  return found;
}

/** Does control never fall off the end of this statement? */
function alwaysLeaves(statement: TSESTree.Statement): boolean {
  switch (statement.type) {
    case AST_NODE_TYPES.ReturnStatement:
    case AST_NODE_TYPES.ThrowStatement:
      return true;
    case AST_NODE_TYPES.BlockStatement: {
      const last = statement.body.at(-1);
      return last !== undefined && alwaysLeaves(last);
    }
    case AST_NODE_TYPES.IfStatement:
      return (
        statement.alternate !== null &&
        alwaysLeaves(statement.consequent) &&
        alwaysLeaves(statement.alternate)
      );
    default:
      return false;
  }
}

/** The single write a binding receives — its declaration or its only assignment. */
export function singleWrite(
  variable: TSESLint.Scope.Variable,
): TSESTree.Node | null {
  // A parameter is written by every caller before any assignment in the body.
  if (variable.defs.some((def) => def.type === 'Parameter')) return null;
  const writes = variable.references.filter((reference) => reference.isWrite());
  if (writes.length !== 1) return null;
  return writes[0].writeExpr ?? null;
}

/**
 * Follow a value to where it is written.
 *
 * Bounded at {@link MAX_FOLLOW_DEPTH} hops and guarded against cycles: a
 * binding that leads back to itself stops where it is. A parameter, an
 * undeclared name, or a binding written more than once stops the walk — the
 * caller then judges the node it was left with.
 */
export function follow(
  start: Value,
  depth = 0,
  seen = new Set<TSESTree.Node>(),
): Value {
  if (depth > MAX_FOLLOW_DEPTH || seen.has(start.node)) return start;
  seen.add(start.node);
  const { scope, env } = start;
  const node = unwrapTypeSyntax(start.node);
  const next = (target: TSESTree.Node, nextEnv = env): Value =>
    follow(valueAt(target, nextEnv), depth + 1, seen);

  if (node !== start.node) return next(node);
  if (node.type === AST_NODE_TYPES.AwaitExpression) return next(node.argument);
  if (node.type === AST_NODE_TYPES.ChainExpression)
    return next(node.expression);

  if (node.type === AST_NODE_TYPES.Identifier) {
    const variable = lookup(node.name, scope);
    if (variable === null) return start;
    const def = variable.defs[0];
    if (def?.type === 'FunctionName' || def?.type === 'ClassName')
      return next(def.node);
    const origin = importOrigin(variable, env);
    if (origin !== null) {
      // `const config = require('./config')` is `module.exports`, when the
      // module assigns one; otherwise it is the namespace, read by member.
      const commonJs =
        origin.name === '*' && def?.type === 'Variable'
          ? exportedValue(origin.module, 'default', env.parser, depth + 1)
          : null;
      if (commonJs !== null) return follow(commonJs, depth + 1, seen);
      if (origin.name === '*') {
        return valueAt(origin.module.ast, moduleEnv(origin.module, env.parser));
      }
      const exported = exportedValue(
        origin.module,
        origin.name,
        env.parser,
        depth + 1,
      );
      return exported === null ? start : follow(exported, depth + 1, seen);
    }
    if (
      def?.type === 'Variable' &&
      def.node.id.type === AST_NODE_TYPES.ObjectPattern
    ) {
      // `const { ssl } = config` — the property of what the pattern destructures.
      const property = def.node.id.properties.find(
        (p): p is TSESTree.Property =>
          p.type === AST_NODE_TYPES.Property &&
          p.value.type === AST_NODE_TYPES.Identifier &&
          p.value.name === node.name,
      );
      const key = property === undefined ? null : objectKeyName(property);
      if (key === null || def.node.init === null) return start;
      const object = next(def.node.init);
      if (object.node.type !== AST_NODE_TYPES.ObjectExpression) return start;
      const value = findProperty(object.node, key);
      return value === null ? start : next(value, object.env);
    }
    const written = singleWrite(variable);
    return written === null ? start : next(written);
  }

  if (node.type === AST_NODE_TYPES.MemberExpression) {
    const key = propertyName(node);
    if (key === null) return start;
    const object = next(node.object);
    if (
      object.node.type === AST_NODE_TYPES.Program &&
      object.env.module !== null
    ) {
      // `import * as cfg from './cfg'; cfg.db`
      const exported = exportedValue(
        object.env.module,
        key,
        env.parser,
        depth + 1,
      );
      return exported === null ? start : follow(exported, depth + 1, seen);
    }
    if (object.node.type !== AST_NODE_TYPES.ObjectExpression) return start;
    const value = findProperty(object.node, key);
    return value === null ? start : next(value, object.env);
  }

  if (node.type === AST_NODE_TYPES.CallExpression) {
    // `createPool(makeConfig())` — a function written in this project, read
    // through its trailing `return`.
    const callee = next(node.callee);
    const returned = returnedValue(callee.node);
    return returned === null ? start : next(returned, callee.env);
  }

  return start;
}
