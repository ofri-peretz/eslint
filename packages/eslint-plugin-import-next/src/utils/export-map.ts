/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What another module exports, read by parsing it: the export map.
 *
 * `named`, `namespace`, `default`, `no-deprecated`, `no-named-as-default`,
 * `no-named-as-default-member` and `export` read other modules through the
 * TypeScript program when there is one. Without type information they read
 * them here instead, the way eslint-plugin-import's `ExportMap` does (v2.32.0,
 * src/exportMap/): resolve the specifier, parse the file with the parser the
 * config names for it, and list what it exports.
 *
 * What is read, and what is not, follows eslint-plugin-import:
 *
 *   - only files with an extension the config parses: `import/extensions`
 *     (default `.js`, `.mjs`, `.cjs`) and the extensions `import/parsers`
 *     maps to a parser. Anything else (a `.ts` file with no parser mapped to
 *     it, a stylesheet, JSON) is unknown, and an unknown module is never a
 *     finding;
 *   - not files matching an `import/ignore` pattern;
 *   - not a file that cannot be an ES module: no `import`/`export` syntax
 *     (a CommonJS file) is unknown, not "exports nothing";
 *   - the parser is the one `import/parsers` names for the extension, else
 *     the one linting the current file. `project`/`projectService` are
 *     dropped: one file is parsed on its own, never a whole program;
 *   - a file that does not parse is not a crash: its errors are kept and
 *     the rule reports them at the import (`Parse errors in imported
 *     module`), as eslint-plugin-import does.
 *
 * Specifiers resolve with eslint-plugin-import's node-resolver settings
 * (`import/resolver.node`, `import/resolve`) and its defaults: extensions
 * `.mjs, .js, .json, .node`, or TypeScript's when the config names a
 * TypeScript resolver.
 *
 * Cost is bounded: a file is parsed once per lint run and settings (cached by
 * path, invalidated by mtime, at most `MAX_ENTRIES` maps kept); a file over
 * `MAX_BYTES` is not parsed; re-exports and `export *` are followed lazily,
 * only as far as a lookup needs, and cycles end the walk instead of
 * recursing forever.
 *
 * Deliberate differences from eslint-plugin-import: `export * as ns from`
 * exports `ns`, not every name of the other module; a string-literal export
 * name (`export { a as "b" } from`) is that name; a re-export cycle ends a
 * lookup instead of overflowing the stack; JSDoc is read by a small tag
 * scanner, not doctrine (only the tags' names and text are used).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

import { nodeResolverSettings, resolveWithSettings } from './settings-resolver';
import { loadTypeScript } from './typescript-peer';

/** A documentation tag, as JSDoc or TomDoc writes it. */
export interface DocTag {
  title: string;
  description: string;
}

export interface Doc {
  tags: DocTag[];
}

/** What is known about one exported name. */
export interface ExportMeta {
  doc?: Doc;
  /** The module this name is a namespace of (`import * as b; export { b }`). */
  namespace?: ExportMap | null;
}

export interface ParseError {
  message: string;
  lineNumber?: number;
  column?: number;
}

type Thunk = () => ExportMap | null;

interface Reexport {
  local: string;
  getImport: Thunk;
}

/** A module's exports, as eslint-plugin-import's `ExportMap` holds them. */
export class ExportMap {
  readonly namespace = new Map<string, ExportMeta>();
  readonly reexports = new Map<string, Reexport>();
  /** `export * from '…'`, each resolved only when a lookup needs it. */
  readonly dependencies = new Set<Thunk>();
  readonly errors: ParseError[] = [];
  /** `Module` once the file has import/export syntax; `ambiguous` otherwise. */
  parseGoal: 'ambiguous' | 'Module' = 'ambiguous';
  /** The module's own `@module` JSDoc block. */
  doc?: Doc;
  mtimeMs = 0;

  constructor(readonly path: string) {}

  get hasDefault(): boolean {
    return this.get('default') != null;
  }

  /** How many names it exports, `export *` included. */
  size(seen = new Set<ExportMap>()): number {
    if (seen.has(this)) return 0;
    seen.add(this);
    let size = this.namespace.size + this.reexports.size;
    for (const dependency of this.dependencies) {
      size += dependency()?.size(seen) ?? 0;
    }
    return size;
  }

  /**
   * Is `name` exported? An explicit re-export is trusted without following
   * it; `export *` is followed. A default is never re-exported by `export *`.
   */
  has(name: string, seen = new Set<ExportMap>()): boolean {
    if (this.namespace.has(name) || this.reexports.has(name)) return true;
    if (name === 'default' || seen.has(this)) return false;
    seen.add(this);
    for (const dependency of this.dependencies) {
      if (dependency()?.has(name, seen)) return true;
    }
    return false;
  }

  /**
   * Does an `export *` here, or in a module it star-exports, name a module
   * that is not known (does not resolve, is ignored, or does not parse)?
   * Then this module may export names nothing here can list.
   */
  hasUnknown(seen = new Set<ExportMap>()): boolean {
    if (seen.has(this)) return false;
    seen.add(this);
    for (const dependency of this.dependencies) {
      const inner = dependency();
      if (!inner || inner.hasUnknown(seen)) return true;
    }
    return false;
  }

  /**
   * Might `name` be exported? `has`, or a star export of a module that is not
   * known (a default is never star-exported). For "is it missing?" checks,
   * where an unknown module must not become a finding.
   */
  mayHave(name: string): boolean {
    return this.has(name) || (name !== 'default' && this.hasUnknown());
  }

  /**
   * Does `name` fully resolve, through every re-export? `path` is the chain
   * of modules followed. A re-export of a module that is ignored, or an
   * `export *` of one, may export anything: found.
   */
  hasDeep(
    name: string,
    seen = new Set<string>(),
  ): { found: boolean; path: ExportMap[] } {
    if (this.namespace.has(name)) return { found: true, path: [this] };
    // A module is revisited only by a cycle when asked the same name.
    const visit = `${this.path}\u0000${name}`;
    if (seen.has(visit)) return { found: false, path: [this] };
    seen.add(visit);
    const reexport = this.reexports.get(name);
    if (reexport) {
      const imported = reexport.getImport();
      if (imported == null) return { found: true, path: [this] };
      const deep = imported.hasDeep(reexport.local, seen);
      deep.path.unshift(this);
      return deep;
    }
    if (name !== 'default') {
      for (const dependency of this.dependencies) {
        const inner = dependency();
        if (inner == null) return { found: true, path: [this] };
        const deep = inner.hasDeep(name, seen);
        if (deep.found) {
          deep.path.unshift(this);
          return deep;
        }
      }
    }
    return { found: false, path: [this] };
  }

  /**
   * What is known about `name`: its metadata, `null` when it is re-exported
   * from a module that is ignored, `undefined` when it is not exported.
   */
  get(name: string, seen = new Set<string>()): ExportMeta | null | undefined {
    const own = this.namespace.get(name);
    if (own) return own;
    const visit = `${this.path}\u0000${name}`;
    if (seen.has(visit)) return undefined;
    seen.add(visit);
    const reexport = this.reexports.get(name);
    if (reexport) {
      const imported = reexport.getImport();
      if (imported == null) return null;
      return imported.get(reexport.local, seen);
    }
    if (name !== 'default') {
      for (const dependency of this.dependencies) {
        const value = dependency()?.get(name, seen);
        if (value !== undefined) return value;
      }
    }
    return undefined;
  }

  /** Every exported name with its metadata (`null` when unknown). */
  forEach(
    callback: (meta: ExportMeta | null | undefined, name: string) => void,
    seen = new Set<ExportMap>(),
  ): void {
    if (seen.has(this)) return;
    seen.add(this);
    this.namespace.forEach((meta, name) => callback(meta, name));
    this.reexports.forEach(({ local, getImport }, name) => {
      const imported = getImport();
      callback(imported?.get(local), name);
    });
    for (const dependency of this.dependencies) {
      dependency()?.forEach((meta, name) => {
        if (name !== 'default') callback(meta, name);
      }, seen);
    }
  }

  /** The parse errors, as eslint-plugin-import prints them. */
  errorText(): string {
    return this.errors
      .map((e) => `${e.message} (${e.lineNumber}:${e.column})`)
      .join(', ');
  }
}

// ── the context a map is built for ────────────────────────────────────────

type Settings = Readonly<Record<string, unknown>>;

interface Parser {
  parse?: (code: string, options: unknown) => unknown;
  parseForESLint?: (code: string, options: unknown) => { ast?: unknown };
}

/** The parts of a rule context that decide how another file is read. */
interface ChildContext {
  settings: Settings;
  parser: Parser | null;
  parserOptions: Record<string, unknown>;
  ecmaVersion?: unknown;
  sourceType?: unknown;
  tsconfigRootDir?: string;
  /** The file being linted: a parser named in settings may be found from it. */
  fromFile: string;
  /** Distinguishes maps built under different settings or parsers. */
  key: string;
}

type AnyContext = Readonly<TSESLint.RuleContext<string, readonly unknown[]>>;

interface LooseContext {
  settings?: Settings;
  parserPath?: string;
  parserOptions?: Record<string, unknown>;
  languageOptions?: {
    parser?: unknown;
    parserOptions?: Record<string, unknown>;
    ecmaVersion?: unknown;
    sourceType?: unknown;
  };
}

/**
 * The bounds on cost: a file bigger than `maxBytes` is not parsed (it is
 * unknown, never a finding), and at most `maxEntries` maps are kept between
 * files. Mutable for tests only.
 */
export const limits = { maxBytes: 1024 * 1024, maxEntries: 5000 };

const isParser = (value: unknown): value is Parser =>
  typeof value === 'object' &&
  value !== null &&
  (typeof (value as Parser).parse === 'function' ||
    typeof (value as Parser).parseForESLint === 'function');

/**
 * A parser named in settings: the one the linted project installs (found
 * from the file being linted, so two packages of a workspace can each use
 * their own version), else the one beside this plugin. Node's module cache
 * loads each resolved file once.
 */
function loadParser(name: string, fromFile: string): Parser | null {
  for (const from of [fromFile, __filename]) {
    let parser: unknown;
    try {
      parser = createRequire(from)(name);
    } catch {
      // Not installed there.
      continue;
    }
    return isParser(parser) ? parser : null;
  }
  return null;
}

const ids = new WeakMap<object, number>();
let nextId = 1;
const idOf = (value: object): number => {
  let id = ids.get(value);
  if (id === undefined) {
    id = nextId++;
    ids.set(value, id);
  }
  return id;
};

const keys = new WeakMap<object, string>();
/** A stable key for a settings object, computed once per object. */
function keyOf(value: object): string {
  let key = keys.get(value);
  if (key === undefined) {
    try {
      key = JSON.stringify(value);
    } catch {
      // Not serialisable (a cycle): the object's own identity.
      key = `#${idOf(value)}`;
    }
    keys.set(value, key);
  }
  return key;
}

const childContexts = new WeakMap<object, ChildContext>();

function childContextOf(context: AnyContext): ChildContext {
  // A runtime may reuse one context object across files: rebuild per file.
  const cached = childContexts.get(context);
  if (cached?.fromFile === context.filename) return cached;
  const loose = context as unknown as LooseContext;
  // Flat config has `languageOptions`; eslintrc, `parserPath` and
  // `parserOptions`.
  const languageOptions = loose.languageOptions ?? {};
  const parserOptions =
    languageOptions.parserOptions ?? loose.parserOptions ?? {};
  const parser = isParser(languageOptions.parser)
    ? languageOptions.parser
    : typeof loose.parserPath === 'string'
      ? loadParser(loose.parserPath, context.filename)
      : null;
  const settings = loose.settings ?? {};
  const rootDir = parserOptions['tsconfigRootDir'];
  const child: ChildContext = {
    settings,
    parser,
    parserOptions,
    ecmaVersion: languageOptions.ecmaVersion,
    sourceType: languageOptions.sourceType,
    tsconfigRootDir: typeof rootDir === 'string' ? rootDir : undefined,
    fromFile: context.filename,
    key: [
      parser ? idOf(parser) : 0,
      keyOf(settings),
      keyOf(parserOptions),
      String(languageOptions.ecmaVersion),
      String(languageOptions.sourceType),
    ].join('\u0000'),
  };
  childContexts.set(context, child);
  return child;
}

// ── resolution ────────────────────────────────────────────────────────────

const NODE_EXTENSIONS = ['.mjs', '.js', '.json', '.node'];
const TYPESCRIPT_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.d.ts',
  '.js',
  '.jsx',
  '.json',
  '.node',
];

/** The names a config gives eslint-import-resolver-typescript. */
const TYPESCRIPT_RESOLVERS = new Set([
  'typescript',
  'eslint-import-resolver-typescript',
]);

/** Does the config resolve with a TypeScript resolver? */
function usesTypeScriptResolver(settings: Settings): boolean {
  const resolver = settings['import/resolver'];
  const names =
    typeof resolver === 'string'
      ? [resolver]
      : Array.isArray(resolver)
        ? resolver.flatMap((r) =>
            typeof r === 'string' ? [r] : Object.keys(Object(r)),
          )
        : Object.keys(Object(resolver));
  return names.some((name) => TYPESCRIPT_RESOLVERS.has(name));
}

const TS_FILE = /\.[cm]?tsx?$/;

/** The file `specifier` names from `fromFile`, or null. */
export function resolveFor(
  specifier: string,
  fromFile: string,
  settings: Settings,
): string | null {
  const extensions =
    nodeResolverSettings(settings).extensions ??
    (usesTypeScriptResolver(settings)
      ? TYPESCRIPT_EXTENSIONS
      : NODE_EXTENSIONS);
  return resolveWithSettings(specifier, fromFile, settings, extensions);
}

// ── which files are read ─────────────────────────────────────────────────

/** `import/parsers`: parser name → the extensions it reads. */
function parserTable(settings: Settings): [string, unknown[]][] {
  return Object.entries(Object(settings['import/parsers'])).filter(
    (entry): entry is [string, unknown[]] => Array.isArray(entry[1]),
  );
}

function isIgnored(file: string, settings: Settings): boolean {
  const listed = settings['import/extensions'];
  const extensions = new Set<unknown>(
    Array.isArray(listed) ? listed : ['.js', '.mjs', '.cjs'],
  );
  for (const [, list] of parserTable(settings)) {
    for (const ext of list) extensions.add(ext);
  }
  if (!extensions.has(path.extname(file))) return true;
  const patterns = settings['import/ignore'];
  return (
    Array.isArray(patterns) &&
    patterns.some((pattern) => {
      try {
        return new RegExp(String(pattern)).test(file);
      } catch {
        // Not a regular expression: matches nothing.
        return false;
      }
    })
  );
}

/** eslint-module-utils' cheap "could this be a module?" test. */
const MAYBE_MODULE =
  /(^|[;})])\s*(export|import)((\s+\w)|(\s*[{*=]))|import\(/m;
const MODULE_NODE = /^(?:(?:Exp|Imp)ort.*Declaration|TSExportAssignment)$/;

// ── parsing ──────────────────────────────────────────────────────────────

type Ast = TSESTree.Program;

function runParser(
  parser: Parser,
  text: string,
  options: Record<string, unknown>,
): Ast {
  let ast: unknown = parser.parseForESLint?.(text, options)?.ast;
  if (!isProgram(ast) && parser.parse) ast = parser.parse(text, options);
  if (!isProgram(ast)) throw new Error('the parser returned no AST');
  return ast;
}

const isProgram = (value: unknown): value is Ast =>
  Array.isArray((value as Ast | undefined)?.body);

/**
 * Can this parser parse at all? A runtime may expose a parser object whose
 * `parse` only throws (oxlint's JS plugins, today): reading other modules
 * with it would report every one of them as unparseable. Probed once.
 */
const usable = new WeakMap<Parser, boolean>();
function canParse(parser: Parser, options: Record<string, unknown>): boolean {
  let ok = usable.get(parser);
  if (ok === undefined) {
    // With the options the real parse gets: a parser may need the file path
    // or its configuration to parse at all.
    try {
      runParser(parser, '', options);
      ok = true;
    } catch {
      ok = false;
    }
    usable.set(parser, ok);
  }
  return ok;
}

/**
 * The parser for `file`: `import/parsers` by extension, else the config's;
 * null when there is none that parses.
 */
function parserFor(file: string, context: ChildContext): Parser | null {
  const ext = path.extname(file);
  const named = parserTable(context.settings).find(([, list]) =>
    list.includes(ext),
  );
  const parser = named
    ? loadParser(named[0], context.fromFile)
    : context.parser;
  return parser && canParse(parser, parseOptions(file, context))
    ? parser
    : null;
}

/** The options `file` is parsed with: the config's, for one file alone. */
function parseOptions(
  file: string,
  context: ChildContext,
): Record<string, unknown> {
  const options: Record<string, unknown> = {
    ...context.parserOptions,
    ecmaFeatures: { ...Object(context.parserOptions['ecmaFeatures']) },
    comment: true,
    attachComment: true,
    tokens: true,
    loc: true,
    range: true,
    filePath: file,
  };
  // One file on its own, never a whole program.
  delete options['EXPERIMENTAL_useProjectService'];
  delete options['projectService'];
  delete options['project'];
  delete options['projects'];
  if (context.ecmaVersion) options['ecmaVersion'] = context.ecmaVersion;
  if (context.sourceType) options['sourceType'] = context.sourceType;
  return options;
}

function parse(
  parser: Parser,
  file: string,
  content: string,
  context: ChildContext,
): Ast {
  const text = content
    .replace(/^\uFEFF/, '')
    .replace(/^#!([^\r\n]+)/u, (_, rest: string) => `//${rest}`);
  return runParser(parser, text, parseOptions(file, context));
}

// ── documentation ────────────────────────────────────────────────────────

/** The tags of one block comment, read as JSDoc. */
export function parseJsDoc(value: string): Doc {
  const tags: DocTag[] = [];
  let current: DocTag | null = null;
  for (const raw of value.split(/\r?\n/)) {
    const line = raw.replace(/^\s*\*?\s?/, '');
    const tag = /^\s*@(\w+)\s*(.*)$/.exec(line);
    if (tag) {
      current = { title: tag[1], description: tag[2] };
      tags.push(current);
    } else if (current) {
      current.description += `\n${line}`;
    }
  }
  for (const tag of tags) tag.description = tag.description.trim();
  return { tags };
}

type Comment = TSESTree.Comment;

/** TomDoc: the first paragraph of line comments, `Deprecated: why`. */
function parseTomDoc(comments: readonly Comment[]): Doc | undefined {
  const lines: string[] = [];
  for (const comment of comments) {
    if (/^\s*$/.test(comment.value)) break;
    lines.push(comment.value.trim());
  }
  const status = /^(Public|Internal|Deprecated):\s*(.+)/.exec(lines.join(' '));
  if (!status) return undefined;
  return {
    tags: [{ title: status[1].toLowerCase(), description: status[2] }],
  };
}

/** Reads the doc comments in front of export declarations. */
class DocReader {
  private readonly comments: readonly Comment[];
  private readonly styles: Set<string>;

  constructor(
    private readonly text: string,
    ast: Ast,
    settings: Settings,
  ) {
    this.comments = ast.comments ?? [];
    const styles = settings['import/docstyle'];
    this.styles = new Set(Array.isArray(styles) ? styles : ['jsdoc']);
  }

  /** The comments directly in front of `node`, nothing but space between. */
  private before(node: TSESTree.Node): Comment[] {
    const found: Comment[] = [];
    let cursor = node.range[0];
    // The last comment that ends before the node: a binary search, so a
    // file with one doc comment per export stays linear-logarithmic.
    let low = 0;
    let high = this.comments.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.comments[mid].range[1] <= cursor) low = mid + 1;
      else high = mid;
    }
    for (let i = low - 1; i >= 0; i--) {
      const comment = this.comments[i];
      if (this.text.slice(comment.range[1], cursor).trim() !== '') break;
      found.unshift(comment);
      cursor = comment.range[0];
    }
    return found;
  }

  /** The doc of the first of `nodes` that has comments in front of it. */
  capture(...nodes: TSESTree.Node[]): ExportMeta {
    const meta: ExportMeta = {};
    for (const node of nodes) {
      const leading = this.before(node);
      if (leading.length === 0) continue;
      if (this.styles.has('jsdoc')) {
        const blocks = leading.filter((c) => c.type === 'Block');
        if (blocks.length > 0) {
          meta.doc = parseJsDoc(blocks[blocks.length - 1].value);
        }
      }
      if (this.styles.has('tomdoc')) {
        const doc = parseTomDoc(leading);
        if (doc) meta.doc = doc;
      }
      break;
    }
    return meta;
  }
}

// ── TypeScript's esModuleInterop ─────────────────────────────────────────

const interop = new Map<string, boolean>();

/** Does the nearest tsconfig turn on `esModuleInterop`? */
function isEsModuleInterop(context: ChildContext): boolean {
  const root = context.tsconfigRootDir ?? process.cwd();
  let value = interop.get(root);
  if (value === undefined) {
    value = false;
    const ts = loadTypeScript();
    if (ts) {
      try {
        const configPath = ts.findConfigFile(root, ts.sys.fileExists);
        if (configPath) {
          const config = ts.readConfigFile(configPath, ts.sys.readFile);
          value =
            ts.parseJsonConfigFileContent(
              config.config,
              ts.sys,
              path.dirname(configPath),
            ).options.esModuleInterop === true;
        }
      } catch {
        // A tsconfig TypeScript cannot read: the option is not on.
      }
    }
    interop.set(root, value);
  }
  return value;
}

// ── building a map ───────────────────────────────────────────────────────

type Node = TSESTree.Node;

const cache = new Map<string, ExportMap | null>();

/** Test seam: forget every map built so far. */
export function clearExportMapCache(): void {
  cache.clear();
  interop.clear();
}

function remember(key: string, map: ExportMap | null): void {
  cache.delete(key);
  cache.set(key, map);
  if (cache.size > limits.maxEntries) {
    cache.delete(cache.keys().next().value as string);
  }
}

/** Names bound by a declaration pattern (`const { a, b: [c] } = o`). */
function patternNames(pattern: Node, found: string[] = []): string[] {
  switch (pattern.type) {
    case 'Identifier':
      found.push(pattern.name);
      break;
    case 'ObjectPattern':
      for (const property of pattern.properties) {
        if (property.type === 'RestElement')
          patternNames(property.argument, found);
        else patternNames(property.value, found);
      }
      break;
    case 'ArrayPattern':
      for (const element of pattern.elements) {
        if (!element) continue;
        if (element.type === 'RestElement')
          patternNames(element.argument, found);
        else patternNames(element, found);
      }
      break;
    case 'AssignmentPattern':
      patternNames(pattern.left, found);
      break;
  }
  return found;
}

const nameOf = (node: { type: string; name?: string; value?: unknown }) =>
  node.type === 'Identifier' ? (node.name as string) : String(node.value);

/** Does the tree hold a dynamic `import()` anywhere? */
const NOT_CHILDREN = new Set(['parent', 'loc', 'range', 'tokens', 'comments']);
function hasDynamicImport(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const record = node as Record<string, unknown>;
  if (record['type'] === 'ImportExpression') return true;
  return Object.entries(record).some(
    ([key, value]) => !NOT_CHILDREN.has(key) && hasDynamicImport(value),
  );
}

const DECLARATIONS = new Set([
  'FunctionDeclaration',
  'ClassDeclaration',
  'TSDeclareFunction',
  'TSEnumDeclaration',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
  'TSAbstractClassDeclaration',
  'TSModuleDeclaration',
]);

const EXPORT_ASSIGNED = new Set([
  'VariableDeclaration',
  'ClassDeclaration',
  'TSDeclareFunction',
  'TSEnumDeclaration',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
  'TSAbstractClassDeclaration',
  'TSModuleDeclaration',
]);

function build(
  file: string,
  content: string,
  context: ChildContext,
): ExportMap | null {
  // No parser that can read it: unknown, not unparseable.
  const parser = parserFor(file, context);
  if (!parser) return null;
  const map = new ExportMap(file);
  let ast: Ast;
  try {
    ast = parse(parser, file, content, context);
  } catch (error) {
    map.errors.push(
      error instanceof Error
        ? {
            message: error.message,
            lineNumber: (error as ParseError).lineNumber,
            column: (error as ParseError).column,
          }
        : { message: String(error) },
    );
    return map;
  }

  const isModule = ast.body.some((node) => MODULE_NODE.test(node.type));
  if (!isModule && !hasDynamicImport(ast.body)) return null;

  const docs = new DocReader(content, ast, context.settings);
  const resolve = (specifier: string) =>
    resolveFor(specifier, file, context.settings);
  // A module that does not parse is unknown to the modules that re-export
  // it: it may export anything. (Its own errors are reported where it is
  // imported directly.)
  //
  // Resolved when a lookup needs it, not when this map is built: a module
  // that does not exist yet (generated later) is unknown until it does,
  // without waiting for this file to change.
  const importOf =
    (specifier: string): Thunk =>
    () => {
      const target = resolve(specifier);
      const inner = target === null ? null : mapFor(target, context);
      return inner?.errors.length ? null : inner;
    };

  // `import * as ns from './x'` here, so `export { ns }` is x's namespace.
  const namespaces = new Map<string, string>();
  const withNamespace = (
    meta: ExportMeta,
    local: TSESTree.Identifier,
  ): ExportMeta => {
    const source = namespaces.get(local.name);
    if (source !== undefined) {
      Object.defineProperty(meta, 'namespace', {
        get: () => importOf(source)(),
        enumerable: true,
      });
    }
    return meta;
  };

  for (const comment of ast.comments ?? []) {
    if (comment.type !== 'Block') continue;
    const doc = parseJsDoc(comment.value);
    if (doc.tags.some((t) => t.title === 'module')) {
      map.doc = doc;
      break;
    }
  }

  const esModuleInterop = () => isEsModuleInterop(context);

  for (const node of ast.body) {
    switch (node.type) {
      case 'ExportDefaultDeclaration': {
        const meta = docs.capture(node);
        if (node.declaration.type === 'Identifier') {
          withNamespace(meta, node.declaration);
        }
        map.namespace.set('default', meta);
        break;
      }
      case 'ExportAllDeclaration': {
        if (node.exported) {
          // `export * as ns from './x'` exports `ns`, x's namespace.
          const source = node.source.value;
          const meta: ExportMeta = {};
          Object.defineProperty(meta, 'namespace', {
            get: () => importOf(source)(),
            enumerable: true,
          });
          map.namespace.set(nameOf(node.exported), meta);
        } else {
          // Unresolved, it is unknown: a lookup through it is not a miss.
          map.dependencies.add(importOf(node.source.value));
        }
        break;
      }
      case 'ImportDeclaration':
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportNamespaceSpecifier') {
            namespaces.set(specifier.local.name, node.source.value);
          }
        }
        break;
      case 'ExportNamedDeclaration': {
        const declaration = node.declaration as Node | null;
        if (declaration) {
          if (DECLARATIONS.has(declaration.type)) {
            const id = (declaration as { id?: Node | null }).id;
            if (id?.type === 'Identifier') {
              map.namespace.set(id.name, docs.capture(node));
            }
          } else if (declaration.type === 'VariableDeclaration') {
            for (const declarator of declaration.declarations) {
              const meta = docs.capture(declarator, node);
              for (const name of patternNames(declarator.id)) {
                map.namespace.set(name, meta);
              }
            }
          }
        }
        const source = node.source?.value;
        for (const specifier of node.specifiers) {
          const exported = nameOf(specifier.exported);
          if (source === undefined) {
            // Without a source, the local is always an Identifier.
            map.namespace.set(
              exported,
              withNamespace({}, specifier.local as TSESTree.Identifier),
            );
          } else {
            map.reexports.set(exported, {
              local: nameOf(specifier.local),
              getImport: importOf(source),
            });
          }
        }
        break;
      }
      case 'TSExportAssignment':
        exportAssigned(node, node.expression);
        break;
      case 'TSNamespaceExportDeclaration':
        if (esModuleInterop()) exportAssigned(node, node.id);
        break;
    }
  }

  /**
   * `export = Foo`: the module's exports are what `Foo` is. A namespace
   * exports its members, anything else is the default.
   */
  function exportAssigned(node: Node, expression: Node): void {
    const name =
      expression.type === 'Identifier'
        ? expression.name
        : ((expression as { id?: { name?: string } }).id?.name ?? null);
    const declarations = ast.body.filter((statement) => {
      if (!EXPORT_ASSIGNED.has(statement.type)) return false;
      if (statement.type === 'VariableDeclaration') {
        return statement.declarations.some(
          (d) => d.id.type === 'Identifier' && d.id.name === name,
        );
      }
      const id = (statement as { id?: Node | null }).id;
      return id?.type === 'Identifier' && id.name === name;
    });
    if (declarations.length === 0) {
      map.namespace.set('default', docs.capture(node));
      return;
    }
    if (esModuleInterop() && !map.namespace.has('default')) {
      map.namespace.set('default', {});
    }
    for (const declaration of declarations) {
      if (declaration.type !== 'TSModuleDeclaration') {
        map.namespace.set('default', docs.capture(declaration));
        continue;
      }
      // Every member of the namespace, exported or not. (`namespace A.B`
      // has a qualified name, never an Identifier, so it is not matched.)
      const block = declaration.body as TSESTree.TSModuleBlock | undefined;
      for (const member of block?.body ?? []) {
        const inner =
          member.type === 'ExportNamedDeclaration'
            ? (member.declaration as Node | null)
            : member;
        if (!inner) continue;
        if (inner.type === 'VariableDeclaration') {
          for (const declarator of inner.declarations) {
            const meta = docs.capture(declaration, inner, member);
            for (const local of patternNames(declarator.id)) {
              map.namespace.set(local, meta);
            }
          }
        } else {
          const id = (inner as { id?: Node | null }).id;
          if (id?.type === 'Identifier') {
            map.namespace.set(id.name, docs.capture(member));
          }
        }
      }
    }
  }

  if (
    esModuleInterop() &&
    map.namespace.size > 0 &&
    !map.namespace.has('default')
  ) {
    map.namespace.set('default', {});
  }
  if (isModule) map.parseGoal = 'Module';
  return map;
}

/** The export map of the file at `file`, or null when it is unknown. */
function mapFor(file: string, context: ChildContext): ExportMap | null {
  const key = `${context.key}\u0000${file}`;
  const cached = cache.get(key);
  if (cached === null) return null;
  let stats: fs.Stats;
  try {
    stats = fs.statSync(file);
  } catch {
    return null;
  }
  if (cached && cached.mtimeMs === stats.mtimeMs) {
    remember(key, cached);
    return cached;
  }
  if (stats.size > limits.maxBytes || isIgnored(file, context.settings)) {
    remember(key, null);
    return null;
  }
  let content: string;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  if (!MAYBE_MODULE.test(content)) {
    remember(key, null);
    return null;
  }
  const map = build(file, content, context);
  if (map) map.mtimeMs = stats.mtimeMs;
  remember(key, map);
  return map;
}

/**
 * The export map of the module `specifier` names from the file being
 * linted, or null when it does not resolve, is ignored, is not parsed, or
 * cannot be an ES module.
 */
export function exportMapOf(
  specifier: string,
  context: AnyContext,
): ExportMap | null {
  const child = childContextOf(context);
  const file = resolveFor(specifier, context.filename, child.settings);
  // In TypeScript, a JavaScript module's names include what its declaration
  // file (.d.ts) adds — types its source never shows. Unknown, not missing.
  if (
    file === null ||
    (TS_FILE.test(context.filename) && !TS_FILE.test(file))
  ) {
    return null;
  }
  return mapFor(file, child);
}

/** Test seam: the export map of the file at `file`, already resolved. */
export function exportMapOfFile(
  file: string,
  context: AnyContext,
): ExportMap | null {
  return mapFor(file, childContextOf(context));
}
