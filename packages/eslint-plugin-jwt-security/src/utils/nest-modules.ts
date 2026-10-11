/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Cross-file: what `JwtModule` registration does this package make?
 *
 * `this.jwtService.sign(payload)` takes its `expiresIn` from
 * `JwtModule.register({ signOptions })` (or `registerAsync`'s factory), and
 * that call lives in a `*.module.ts` somewhere else in the package. This
 * walks up from the linted file to the nearest `package.json`, reads every
 * `*.module.ts` under it that mentions `JwtModule`, parses each with the
 * parser ESLint is already using (falling back to `@typescript-eslint/parser`),
 * and reads each registration's `signOptions.expiresIn` structurally.
 *
 * The answer is cached per package root for the life of the process. Any file
 * that cannot be read or parsed is skipped; any registration whose options
 * cannot be read makes the verdict `unknown`. Nothing here throws.
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
import { childNodes, requireSpecifier, soleReturn } from './value-flow';

/** What the package's JwtModule registrations say about `expiresIn`. */
export type ModuleExpiry = 'set' | 'missing' | 'unknown';

interface ParserLike {
  parseForESLint?(code: string, options: object): { ast: TSESTree.Program };
  parse?(code: string, options: object): TSESTree.Program;
}

/** Directories that hold built, vendored or generated code, never sources. */
const SKIPPED_DIRECTORIES: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.next',
  'out',
]);

/** A NestJS module file, by the framework's file convention. */
const MODULE_FILE = /\.module\.ts$/;

/** Bounds the walk on a very large package. */
const MAX_SCANNED_ENTRIES = 5000;

const NESTJS_JWT = '@nestjs/jwt';

const verdictByRoot = new Map<string, ModuleExpiry>();

/**
 * The verdict for the package that contains `filename`:
 *
 * - `set`: every registration found sets `signOptions.expiresIn`;
 * - `missing`: every registration could be read, and one sets none;
 * - `unknown`: no package root, no registration, or one that cannot be read.
 */
export function nestModuleExpiry(
  filename: string,
  parser: unknown,
): ModuleExpiry {
  const root = packageRootDirectory(path.dirname(path.resolve(filename)));
  if (root === null) return 'unknown';
  let verdict = verdictByRoot.get(root);
  if (verdict === undefined) {
    const registrations = moduleFiles(root).flatMap((file) =>
      registrationsIn(file, parser),
    );
    verdict = combine(registrations);
    verdictByRoot.set(root, verdict);
  }
  return verdict;
}

function combine(registrations: ModuleExpiry[]): ModuleExpiry {
  if (registrations.length === 0 || registrations.includes('unknown')) {
    return 'unknown';
  }
  return registrations.includes('missing') ? 'missing' : 'set';
}

function packageRootDirectory(start: string): string | null {
  for (let directory = start; ;) {
    if (fs.existsSync(path.join(directory, 'package.json'))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

function moduleFiles(root: string): string[] {
  const files: string[] = [];
  const pending = [root];
  let visited = 0;
  while (pending.length > 0 && visited < MAX_SCANNED_ENTRIES) {
    const directory = pending.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      continue; // unreadable directory: skip it, never throw
    }
    for (const entry of entries) {
      visited++;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) pending.push(fullPath);
      } else if (MODULE_FILE.test(fullPath)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

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

function parseModule(file: string, parser: unknown): TSESTree.Program | null {
  let code: string;
  try {
    code = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  // Most module files never mention it; parse only the ones that might.
  if (!code.includes('JwtModule')) return null;
  return tryParse(parser, code, file) ?? tryParse(fallbackParser(), code, file);
}

/** Local names `JwtModule` is bound to from `@nestjs/jwt` in this file. */
function jwtModuleLocals(program: TSESTree.Program): Set<string> {
  const locals = new Set<string>();
  for (const stmt of program.body) {
    if (
      stmt.type === AST_NODE_TYPES.ImportDeclaration &&
      stmt.source.value === NESTJS_JWT
    ) {
      for (const spec of stmt.specifiers) {
        if (
          spec.type === AST_NODE_TYPES.ImportSpecifier &&
          (spec.imported.type === AST_NODE_TYPES.Identifier
            ? spec.imported.name
            : spec.imported.value) === 'JwtModule'
        ) {
          locals.add(spec.local.name);
        }
      }
    }
    if (stmt.type === AST_NODE_TYPES.VariableDeclaration) {
      for (const declarator of stmt.declarations) {
        if (
          requireSpecifier(declarator.init) === NESTJS_JWT &&
          declarator.id.type === AST_NODE_TYPES.ObjectPattern
        ) {
          for (const prop of declarator.id.properties) {
            // `{ JwtModule }` / `{ JwtModule: JM }`; a defaulted or nested
            // value binds no plain name and adds nothing a call could match.
            if (
              prop.type === AST_NODE_TYPES.Property &&
              objectKeyName(prop) === 'JwtModule'
            ) {
              locals.add((prop.value as TSESTree.Identifier).name);
            }
          }
        }
      }
    }
  }
  return locals;
}

function registrationsIn(file: string, parser: unknown): ModuleExpiry[] {
  const program = parseModule(file, parser);
  if (program === null) return [];
  const locals = jwtModuleLocals(program);
  const found: ModuleExpiry[] = [];
  const visit = (node: TSESTree.Node): void => {
    if (
      node.type === AST_NODE_TYPES.CallExpression &&
      node.callee.type === AST_NODE_TYPES.MemberExpression &&
      node.callee.object.type === AST_NODE_TYPES.Identifier &&
      locals.has(node.callee.object.name)
    ) {
      const method = propertyName(node.callee);
      if (method === 'register') {
        found.push(expiryOf(node.arguments[0], program));
      }
      if (method === 'registerAsync') {
        found.push(expiryOfFactory(node.arguments[0], program));
      }
    }
    childNodes(node).forEach(visit);
  };
  visit(program);
  return found;
}

/** An object literal, inline or one top-level `const` away, in this file. */
function objectIn(
  node: TSESTree.Node | null | undefined,
  program: TSESTree.Program,
): TSESTree.ObjectExpression | null {
  if (node?.type === AST_NODE_TYPES.ObjectExpression) return node;
  if (node?.type !== AST_NODE_TYPES.Identifier) return null;
  for (const stmt of program.body) {
    if (stmt.type !== AST_NODE_TYPES.VariableDeclaration) continue;
    for (const declarator of stmt.declarations) {
      if (
        declarator.id.type === AST_NODE_TYPES.Identifier &&
        declarator.id.name === node.name &&
        declarator.init?.type === AST_NODE_TYPES.ObjectExpression
      ) {
        return declarator.init;
      }
    }
  }
  return null;
}

/** A key's value, `absent` when the literal provably lacks it, or `unknown`. */
function lookup(
  object: TSESTree.ObjectExpression,
  key: string,
): TSESTree.Node | 'absent' | 'unknown' {
  let spread = false;
  for (const element of object.properties) {
    if (element.type === AST_NODE_TYPES.SpreadElement) {
      spread = true;
    } else if (objectKeyName(element) === key) {
      return element.value;
    }
  }
  return spread ? 'unknown' : 'absent';
}

/** `register({ signOptions: { expiresIn } })`. */
function expiryOf(
  node: TSESTree.Node | null | undefined,
  program: TSESTree.Program,
): ModuleExpiry {
  const options = objectIn(node, program);
  if (options === null) return 'unknown';
  const signOptions = lookup(options, 'signOptions');
  if (signOptions === 'absent') return 'missing';
  if (signOptions === 'unknown') return 'unknown';
  const sign = objectIn(signOptions, program);
  if (sign === null) return 'unknown';
  const expiresIn = lookup(sign, 'expiresIn');
  if (expiresIn === 'unknown') return 'unknown';
  return expiresIn === 'absent' ? 'missing' : 'set';
}

/** `registerAsync({ useFactory: () => ({ signOptions: { expiresIn } }) })`. */
function expiryOfFactory(
  node: TSESTree.Node | undefined,
  program: TSESTree.Program,
): ModuleExpiry {
  const options = objectIn(node, program);
  const factory = options === null ? 'unknown' : lookup(options, 'useFactory');
  if (typeof factory === 'string') return 'unknown';
  return expiryOf(soleReturn(factory), program);
}
