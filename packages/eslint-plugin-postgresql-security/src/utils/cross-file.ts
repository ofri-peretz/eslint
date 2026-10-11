/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Cross-file and multi-hop value following.
 *
 * The rules in this plugin are AST-structural. Two owner-approved extensions
 * live here, and nowhere else:
 *
 *   (a) INTRA-FILE value following — a bounded, cycle-guarded walk through
 *       `const`/`let` initialisers, single assignments, destructures, member
 *       reads, `await`s and the returns of functions written in the file;
 *   (b) CROSS-FILE resolution of RELATIVE imports — `./db`, `../config` — read
 *       from disk, parsed with the linting parser, cached per absolute path
 *       and modification time.
 *
 * Nothing here guesses from a variable NAME, and nothing here throws: an
 * unreadable, unparseable or unresolvable module is an abstention.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  objectKeyName,
  propertyName,
  unwrapTypeSyntax,
} from '@interlace/eslint-devkit';

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
const MAX_DEPTH = 8;

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

interface RuleContextLike {
  readonly physicalFilename: string;
  readonly languageOptions?: { readonly parser?: unknown };
  readonly sourceCode: { getScope(node: TSESTree.Node): TSESLint.Scope.Scope };
}

/** The environment of the file a rule is linting. */
export function envOf(context: RuleContextLike): Env {
  return {
    file: path.resolve(context.physicalFilename),
    parser: context.languageOptions?.parser,
    module: null,
    scopeOf: (node) => context.sourceCode.getScope(node),
  };
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
  if (!RELATIVE.test(specifier)) return null;
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

/** The innermost scope that contains `node`, inside a module or the linted file. */
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

/** `require('./x')` — the relative module a CommonJS load names, or `null`. */
function requiredSpecifier(
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

/** The value `name` is exported as from `module` — `'default'` for the default export. */
export function exportedValue(
  module: ModuleInfo,
  name: string,
  parser: unknown,
  depth = 0,
): Value | null {
  if (depth > MAX_DEPTH) return null;
  const env = moduleEnv(module, parser);
  const at = (node: TSESTree.Node): Value => ({
    node,
    scope: env.scopeOf(node),
    env,
  });

  for (const statement of module.ast.body) {
    if (statement.type === AST_NODE_TYPES.ExportDefaultDeclaration) {
      if (name === 'default') return at(statement.declaration);
      continue;
    }
    if (statement.type === AST_NODE_TYPES.ExportNamedDeclaration) {
      const declaration = statement.declaration;
      if (declaration?.type === AST_NODE_TYPES.VariableDeclaration) {
        const declarator = declaration.declarations.find(
          (d) => d.id.type === AST_NODE_TYPES.Identifier && d.id.name === name,
        );
        if (declarator?.init) return at(declarator.init);
      } else if (
        declaration?.type === AST_NODE_TYPES.FunctionDeclaration &&
        declaration.id?.name === name
      ) {
        return at(declaration);
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
          : follow(at(variable.identifiers[0]), depth + 1);
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
      const target =
        left.type === AST_NODE_TYPES.MemberExpression
          ? memberChain(left)
          : null;
      if (target === 'module.exports') {
        if (name === 'default') return at(right);
        const object = unwrapTypeSyntax(right);
        if (object.type === AST_NODE_TYPES.ObjectExpression) {
          const property = findProperty(object, name);
          if (property !== null) return at(property);
        }
      } else if (
        target === `module.exports.${name}` ||
        target === `exports.${name}`
      ) {
        return at(right);
      }
    }
  }
  return null;
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

/**
 * Where an imported binding comes from: the module on disk and the name it
 * is exported under (`'default'`, a named export, or `'*'` for a namespace).
 */
export function importOrigin(
  variable: TSESLint.Scope.Variable,
  env: Env,
): { readonly module: ModuleInfo; readonly name: string } | null {
  const def = variable.defs[0];
  if (def === undefined) return null;
  let specifier: string | null = null;
  let name = 'default';
  if (def.type === 'ImportBinding') {
    const declaration = def.parent as TSESTree.ImportDeclaration;
    specifier = String(declaration.source.value);
    if (def.node.type === AST_NODE_TYPES.ImportSpecifier) {
      name = moduleExportName(def.node.imported);
    } else if (def.node.type === AST_NODE_TYPES.ImportNamespaceSpecifier) {
      name = '*';
    }
  } else if (def.type === 'Variable') {
    const declarator = def.node as TSESTree.VariableDeclarator;
    specifier = requiredSpecifier(declarator.init);
    if (declarator.id.type === AST_NODE_TYPES.ObjectPattern) {
      const property = declarator.id.properties.find(
        (p): p is TSESTree.Property =>
          p.type === AST_NODE_TYPES.Property &&
          p.value.type === AST_NODE_TYPES.Identifier &&
          p.value.name === variable.name,
      );
      name = property === undefined ? '' : (objectKeyName(property) ?? '');
    } else {
      name = '*';
    }
  }
  if (specifier === null || name === '') return null;
  const file = resolveRelative(env.file, specifier);
  const module = file === null ? null : loadModule(file, env.parser);
  return module === null ? null : { module, name };
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

/** The single write a binding receives — its declaration or its only assignment. */
function singleWrite(variable: TSESLint.Scope.Variable): TSESTree.Node | null {
  // A parameter is written by every caller before any assignment in the body.
  if (variable.defs.some((def) => def.type === 'Parameter')) return null;
  const writes = variable.references.filter((reference) => reference.isWrite());
  if (writes.length !== 1) return null;
  const [write] = writes;
  return write.writeExpr ?? null;
}

/**
 * Follow a value to where it is written.
 *
 * Bounded at {@link MAX_DEPTH} hops and guarded against cycles: a binding
 * that leads back to itself stops where it is.
 */
export function follow(
  start: Value,
  depth = 0,
  seen = new Set<TSESTree.Node>(),
): Value {
  if (depth > MAX_DEPTH || seen.has(start.node)) return start;
  seen.add(start.node);
  const { scope, env } = start;
  const node = unwrapTypeSyntax(start.node);
  const next = (target: TSESTree.Node, nextEnv = env): Value =>
    follow(
      { node: target, scope: nextEnv.scopeOf(target), env: nextEnv },
      depth + 1,
      seen,
    );

  if (node !== start.node) return next(node);
  if (node.type === AST_NODE_TYPES.AwaitExpression) return next(node.argument);

  if (node.type === AST_NODE_TYPES.Identifier) {
    const variable = lookup(node.name, scope);
    if (variable === null) return start;
    if (variable.defs[0]?.type === 'FunctionName')
      return next(variable.defs[0].node);
    const origin = importOrigin(variable, env);
    if (origin !== null) {
      // `const config = require('./config')` is `module.exports`, when the
      // module assigns one; otherwise it is the namespace, read by member.
      const commonJs =
        origin.name === '*' && variable.defs[0]?.type === 'Variable'
          ? exportedValue(origin.module, 'default', env.parser, depth + 1)
          : null;
      if (commonJs !== null) return follow(commonJs, depth + 1, seen);
      if (origin.name === '*') {
        const namespace = moduleEnv(origin.module, env.parser);
        return {
          node: origin.module.ast,
          scope: namespace.scopeOf(origin.module.ast),
          env: namespace,
        };
      }
      const exported = exportedValue(
        origin.module,
        origin.name,
        env.parser,
        depth + 1,
      );
      return exported === null ? start : follow(exported, depth + 1, seen);
    }
    const def = variable.defs[0];
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
    const callee = next(node.callee);
    const returned = returnedValue(callee.node);
    if (returned === null) return start;
    return next(returned, callee.env);
  }

  return start;
}
