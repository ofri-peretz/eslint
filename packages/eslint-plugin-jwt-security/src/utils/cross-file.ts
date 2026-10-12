/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Cross-file reading for RELATIVE imports.
 *
 * Another file of the same project is parsed with the parser ESLint is
 * already using (falling back to `@typescript-eslint/parser` from the project
 * being linted), and the parse is cached per absolute path and mtime, so a
 * long-running ESLint (IDE, watch mode) re-reads a file that changed. A file that cannot be found, read or parsed answers `null` — the
 * caller abstains. Nothing here throws.
 *
 * The one question asked across a file boundary: which PACKAGE does an export
 * of a relative module come from? `exports.client = require('openid-client')`
 * in `./client.js` makes `const { client } = require('./client')` an
 * openid-client value, which is structure, not a guess.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import { requireSpecifier } from './value-flow';

/** What the linted file is, for resolving its relative imports. */
export interface CrossFileContext {
  readonly filename: string;
  readonly parser: unknown;
}

interface ParserLike {
  parseForESLint?(code: string, options: object): { ast: TSESTree.Program };
  parse?(code: string, options: object): TSESTree.Program;
}

/** Bounds a chain of re-exports across files. */
const MAX_FILE_HOPS = 4;

/** Extensions a relative specifier may leave off, in Node/TS resolution order. */
const RESOLUTION_SUFFIXES = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '/index.ts',
  '/index.tsx',
  '/index.js',
  '/index.mjs',
  '/index.cjs',
];

const parsed = new Map<
  string,
  { mtimeMs: number; program: TSESTree.Program | null }
>();

/** `@typescript-eslint/parser` from the project being linted, if installed. */
function fallbackParser(): unknown {
  try {
    return createRequire(path.join(process.cwd(), 'noop.js'))(
      '@typescript-eslint/parser',
    );
  } catch {
    return null;
  }
}

function tryParse(
  candidate: unknown,
  code: string,
  filePath: string,
): TSESTree.Program | null {
  const parser = candidate as ParserLike | null;
  if (!parser) return null;
  const options = {
    ecmaVersion: 'latest',
    sourceType: 'module',
    range: true,
    loc: true,
    filePath,
  };
  try {
    return parser.parseForESLint
      ? parser.parseForESLint(code, options).ast
      : parser.parse!(code, options);
  } catch {
    return null;
  }
}

/** Parse source text with the configured parser, then the fallback. */
export function parseSource(
  code: string,
  filePath: string,
  parser: unknown,
): TSESTree.Program | null {
  return (
    tryParse(parser, code, filePath) ??
    tryParse(fallbackParser(), code, filePath)
  );
}

/** Read and parse a file once per version on disk. */
export function parseFileCached(
  filePath: string,
  parser: unknown,
): TSESTree.Program | null {
  const mtimeMs =
    fs.statSync(filePath, { throwIfNoEntry: false })?.mtimeMs ?? -1;
  const cached = parsed.get(filePath);
  if (cached?.mtimeMs === mtimeMs) return cached.program;
  let program: TSESTree.Program | null = null;
  try {
    program = parseSource(fs.readFileSync(filePath, 'utf8'), filePath, parser);
  } catch {
    program = null;
  }
  parsed.set(filePath, { mtimeMs, program });
  return program;
}

/** `./client` from `/app/lib/context.js` -> `/app/lib/client.js`, if it exists. */
function resolveRelative(fromFile: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(path.resolve(fromFile)), specifier);
  // TypeScript's ESM convention imports `./http.js` for a `./http.ts` source.
  const typescriptTwin = base.replace(/\.js$/, '.ts');
  for (const candidate of [
    ...RESOLUTION_SUFFIXES.map((suffix) => base + suffix),
    typescriptTwin,
  ]) {
    if (fs.statSync(candidate, { throwIfNoEntry: false })?.isFile()) {
      return candidate;
    }
  }
  return null;
}

/** The module a top-level binding of `program` is loaded from. */
function bindingModule(
  program: TSESTree.Program,
  name: string,
): { source: string; exportName: string | null } | null {
  for (const stmt of program.body) {
    if (stmt.type === AST_NODE_TYPES.ImportDeclaration) {
      for (const spec of stmt.specifiers) {
        if (spec.local.name !== name) continue;
        return {
          source: String(stmt.source.value),
          exportName:
            spec.type === AST_NODE_TYPES.ImportSpecifier
              ? objectKeyName({ key: spec.imported, computed: false } as never)
              : null,
        };
      }
    }
    if (stmt.type === AST_NODE_TYPES.VariableDeclaration) {
      for (const declarator of stmt.declarations) {
        const source = requireSpecifier(declarator.init);
        if (source === null) continue;
        if (
          declarator.id.type === AST_NODE_TYPES.Identifier &&
          declarator.id.name === name
        ) {
          // `const x = require('m').y` names export `y`; `require('m')` the whole.
          const init = declarator.init!;
          return {
            source,
            exportName:
              init.type === AST_NODE_TYPES.MemberExpression
                ? propertyName(init)
                : null,
          };
        }
        if (declarator.id.type === AST_NODE_TYPES.ObjectPattern) {
          for (const prop of declarator.id.properties) {
            if (
              prop.type === AST_NODE_TYPES.Property &&
              prop.value.type === AST_NODE_TYPES.Identifier &&
              prop.value.name === name
            ) {
              return { source, exportName: objectKeyName(prop) };
            }
          }
        }
      }
    }
  }
  return null;
}

/** The expression a module exports under `name`, CommonJS or ESM. */
type Exported =
  | { readonly kind: 'value'; readonly node: TSESTree.Node }
  | {
      readonly kind: 'reexport';
      readonly source: string;
      readonly exportName: string;
    };

function exportedValue(
  program: TSESTree.Program,
  name: string,
): Exported | null {
  for (const stmt of program.body) {
    // exports.name = X / module.exports.name = X / module.exports = { name }
    if (
      stmt.type === AST_NODE_TYPES.ExpressionStatement &&
      stmt.expression.type === AST_NODE_TYPES.AssignmentExpression &&
      stmt.expression.left.type === AST_NODE_TYPES.MemberExpression
    ) {
      const { left, right } = stmt.expression;
      const target = propertyName(left);
      if (target === name) return { kind: 'value', node: right };
      if (
        target === 'exports' &&
        right.type === AST_NODE_TYPES.ObjectExpression
      ) {
        for (const prop of right.properties) {
          if (
            prop.type === AST_NODE_TYPES.Property &&
            objectKeyName(prop) === name
          ) {
            return { kind: 'value', node: prop.value };
          }
        }
      }
    }
    if (stmt.type !== AST_NODE_TYPES.ExportNamedDeclaration) continue;
    // export const name = X
    if (stmt.declaration?.type === AST_NODE_TYPES.VariableDeclaration) {
      for (const declarator of stmt.declaration.declarations) {
        if (
          declarator.id.type === AST_NODE_TYPES.Identifier &&
          declarator.id.name === name &&
          declarator.init !== null
        ) {
          return { kind: 'value', node: declarator.init };
        }
      }
    }
    // export { local as name } [from 'm']
    for (const spec of stmt.specifiers) {
      const exported = objectKeyName({
        key: spec.exported,
        computed: false,
      } as never);
      if (exported !== name) continue;
      const local = objectKeyName({
        key: spec.local,
        computed: false,
      } as never)!;
      return stmt.source
        ? {
            kind: 'reexport',
            source: String(stmt.source.value),
            exportName: local,
          }
        : {
            kind: 'value',
            node: {
              type: AST_NODE_TYPES.Identifier,
              name: local,
            } as TSESTree.Identifier,
          };
    }
  }
  return null;
}

/**
 * The PACKAGE an export of a relative module comes from.
 *
 * Follows `exportName` of `specifier` (relative to `fromFile`) to the
 * top-level binding it is built from in that file, and from there to the
 * package it was loaded from — through further relative re-exports, up to
 * `MAX_FILE_HOPS`. `null` whenever any step cannot be read.
 */
export function relativeExportModule(
  fromFile: string,
  specifier: string,
  exportName: string,
  parser: unknown,
  hops = 0,
): string | null {
  if (hops >= MAX_FILE_HOPS) return null;
  const file = resolveRelative(fromFile, specifier);
  if (file === null) return null;
  const program = parseFileCached(file, parser);
  if (program === null) return null;
  const value = exportedValue(program, exportName);
  if (value === null) return null;
  let binding: { source: string; exportName: string | null } | null;
  if (value.kind === 'reexport') {
    binding = value;
  } else {
    const node = value.node;
    const required = requireSpecifier(node);
    binding =
      required !== null
        ? {
            source: required,
            exportName:
              node.type === AST_NODE_TYPES.MemberExpression
                ? propertyName(node)
                : null,
          }
        : node.type === AST_NODE_TYPES.Identifier
          ? bindingModule(program, node.name)
          : null;
  }
  if (binding === null) return null;
  if (!binding.source.startsWith('.')) return binding.source;
  return binding.exportName === null
    ? null
    : relativeExportModule(
        file,
        binding.source,
        binding.exportName,
        parser,
        hops + 1,
      );
}

/** A module of the project: its AST and where it lives. */
export interface ModuleRef {
  readonly program: TSESTree.Program;
  readonly filename: string;
  readonly parser: unknown;
}

/** What a top-level name of a module is, once followed to its definition. */
export type ResolvedSymbol =
  | {
      readonly kind: 'local';
      readonly node: TSESTree.Node;
      readonly module: ModuleRef;
    }
  | { readonly kind: 'external'; readonly source: string }
  | null;

/** A top-level declaration of `name` in `program`, unwrapping `export`. */
function topLevelDeclaration(
  program: TSESTree.Program,
  name: string,
): TSESTree.Node | null {
  for (const stmt of program.body) {
    const declaration =
      stmt.type === AST_NODE_TYPES.ExportNamedDeclaration ||
      stmt.type === AST_NODE_TYPES.ExportDefaultDeclaration
        ? (stmt.declaration ?? stmt)
        : stmt;
    if (
      (declaration.type === AST_NODE_TYPES.FunctionDeclaration ||
        declaration.type === AST_NODE_TYPES.ClassDeclaration ||
        declaration.type === AST_NODE_TYPES.TSInterfaceDeclaration ||
        declaration.type === AST_NODE_TYPES.TSTypeAliasDeclaration) &&
      declaration.id?.name === name
    ) {
      return declaration;
    }
    if (declaration.type !== AST_NODE_TYPES.VariableDeclaration) continue;
    for (const declarator of declaration.declarations) {
      if (
        declarator.id.type === AST_NODE_TYPES.Identifier &&
        declarator.id.name === name &&
        declarator.init !== null &&
        requireSpecifier(declarator.init) === null
      ) {
        return declarator.init;
      }
    }
  }
  return null;
}

/** Load the module a relative specifier names, from `module`'s location. */
function loadRelative(module: ModuleRef, specifier: string): ModuleRef | null {
  const file = resolveRelative(module.filename, specifier);
  const program = file === null ? null : parseFileCached(file, module.parser);
  return program === null
    ? null
    : { program, filename: file!, parser: module.parser };
}

/** What `module` exports as `name`: a declaration, or a re-export followed on. */
function resolveExport(
  module: ModuleRef,
  name: string,
  hops: number,
): ResolvedSymbol {
  if (hops >= MAX_FILE_HOPS) return null;
  const declared = topLevelDeclaration(module.program, name);
  if (declared !== null) return { kind: 'local', node: declared, module };
  for (const stmt of module.program.body) {
    if (stmt.type !== AST_NODE_TYPES.ExportNamedDeclaration) continue;
    for (const spec of stmt.specifiers) {
      if (
        objectKeyName({ key: spec.exported, computed: false } as never) !== name
      ) {
        continue;
      }
      const local = objectKeyName({
        key: spec.local,
        computed: false,
      } as never)!;
      if (stmt.source === null) return resolveSymbol(module, local, hops + 1);
      const source = String(stmt.source.value);
      if (!source.startsWith('.')) return { kind: 'external', source };
      const next = loadRelative(module, source);
      return next === null ? null : resolveExport(next, local, hops + 1);
    }
  }
  return null;
}

/**
 * Follow a top-level name of a module to the node that defines it — in the
 * same module, or across relative imports and re-exports — or to the package
 * it comes from. `null` whenever a step cannot be read.
 */
export function resolveSymbol(
  module: ModuleRef,
  name: string,
  hops = 0,
): ResolvedSymbol {
  // Bounded by `resolveExport`, which every step to another file goes through.
  const local = topLevelDeclaration(module.program, name);
  if (local !== null) return { kind: 'local', node: local, module };
  const binding = bindingModule(module.program, name);
  if (binding === null) return null;
  if (!binding.source.startsWith('.')) {
    return { kind: 'external', source: binding.source };
  }
  if (binding.exportName === null) return null;
  const target = loadRelative(module, binding.source);
  return target === null
    ? null
    : resolveExport(target, binding.exportName, hops + 1);
}

/**
 * Whether a module binds `name` at top level at all — declared there, or
 * imported (even from a module that cannot be read). A name it binds is that
 * binding, never the platform global of the same name.
 */
export function bindsName(module: ModuleRef, name: string): boolean {
  return (
    topLevelDeclaration(module.program, name) !== null ||
    bindingModule(module.program, name) !== null
  );
}
