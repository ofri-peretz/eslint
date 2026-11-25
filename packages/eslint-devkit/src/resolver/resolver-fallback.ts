/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dependency-free fallback resolver, used only when the optional peer
 * `oxc-resolver` is not installed.
 *
 * It covers the common shapes with Node's own machinery and plain path work:
 *   - tsconfig `baseUrl` / `paths` (own file plus its `extends` chain, wildcard
 *     patterns, extension and index probing)
 *   - `node_modules` packages via `module.createRequire(...).resolve`, then a
 *     package.json read (`exports` with import-like conditions, `module`,
 *     `main`, `types`) for ESM-only and types-only packages
 *
 * It deliberately does NOT cover: tsconfig `extends` that names an npm package
 * (only relative `extends` paths are followed), tsconfig `references`,
 * `exports` / `imports` patterns with more than one `*`, and Yarn PnP.
 * Those resolve to `null` here and need `oxc-resolver` installed.
 */
import { createRequire, isBuiltin } from 'node:module';
import {
  fileExistsSync,
  findFileUpward,
  readFileSync,
  statSync,
} from '../node/fs';
import { getDirname, joinPath, resolvePath } from '../node/path';

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.d.ts', '.json'];
const DEFAULT_CONDITIONS = ['import', 'require', 'node', 'default', 'types'];

interface FallbackOptions {
  extensions?: string[];
  conditionNames?: string[];
  mainFields?: string[];
}

function isFile(p: string): boolean {
  const s = statSync(p);
  return !!s && s.isFile();
}

/** `p`, `p` + extension, or `p/index` + extension — first file that exists. */
function probe(p: string, extensions: string[]): string | null {
  if (isFile(p)) return p;
  for (const ext of extensions) if (isFile(p + ext)) return p + ext;
  for (const ext of extensions) {
    const idx = joinPath(p, `index${ext}`);
    if (isFile(idx)) return idx;
  }
  return null;
}

/** Strip comments and trailing commas so tsconfig parses as JSON. */
function parseJsonc(text: string): Record<string, unknown> | null {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
    } else {
      out += c;
      i++;
    }
  }
  try {
    return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
  } catch {
    return null;
  }
}

interface PathsConfig {
  baseUrl: string | null;
  paths: Record<string, string[]> | null;
  pathsDir: string;
}

const tsconfigCache = new Map<string, PathsConfig>();

function loadPathsConfig(tsconfigPath: string, depth = 0): PathsConfig {
  const cached = tsconfigCache.get(tsconfigPath);
  if (cached) return cached;
  const dir = getDirname(tsconfigPath);
  const empty: PathsConfig = { baseUrl: null, paths: null, pathsDir: dir };
  const text = readFileSync(tsconfigPath);
  const json = text === null ? null : parseJsonc(text);
  if (!json) return empty;

  let result: PathsConfig = { ...empty };
  const ext = json['extends'];
  if (typeof ext === 'string' && ext.startsWith('.') && depth < 8) {
    const target = resolvePath(
      dir,
      ext.endsWith('.json') ? ext : ext + '.json',
    );
    result = { ...loadPathsConfig(target, depth + 1) };
  }
  const co = (json['compilerOptions'] ?? {}) as Record<string, unknown>;
  if (typeof co['baseUrl'] === 'string') {
    result.baseUrl = resolvePath(dir, co['baseUrl']);
  }
  if (co['paths'] && typeof co['paths'] === 'object') {
    result.paths = co['paths'] as Record<string, string[]>;
    result.pathsDir = result.baseUrl ?? dir;
  }
  tsconfigCache.set(tsconfigPath, result);
  return result;
}

function resolveViaTsconfig(
  specifier: string,
  tsconfigPath: string,
  extensions: string[],
): string | null {
  const cfg = loadPathsConfig(tsconfigPath);
  if (cfg.paths) {
    for (const [pattern, targets] of Object.entries(cfg.paths)) {
      const star = pattern.indexOf('*');
      let captured: string | null = null;
      if (star === -1) {
        if (pattern === specifier) captured = '';
      } else {
        const pre = pattern.slice(0, star);
        const post = pattern.slice(star + 1);
        if (
          specifier.length >= pre.length + post.length &&
          specifier.startsWith(pre) &&
          specifier.endsWith(post)
        ) {
          captured = specifier.slice(
            pre.length,
            specifier.length - post.length,
          );
        }
      }
      if (captured === null) continue;
      for (const target of targets) {
        const hit = probe(
          resolvePath(cfg.pathsDir, target.replace('*', captured)),
          extensions,
        );
        if (hit) return hit;
      }
    }
  }
  if (cfg.baseUrl) {
    const hit = probe(resolvePath(cfg.baseUrl, specifier), extensions);
    if (hit) return hit;
  }
  return null;
}

function splitPackage(spec: string): { name: string; sub: string } | null {
  const parts = spec.split('/');
  const n = spec.startsWith('@') ? 2 : 1;
  if (parts.length < n || parts.slice(0, n).some((p) => !p)) return null;
  return { name: parts.slice(0, n).join('/'), sub: parts.slice(n).join('/') };
}

function pickExport(
  target: unknown,
  conditions: string[],
  star: string | null,
): string | null {
  if (typeof target === 'string') {
    return star === null ? target : target.replace('*', star);
  }
  if (Array.isArray(target)) {
    for (const t of target) {
      const r = pickExport(t, conditions, star);
      if (r) return r;
    }
    return null;
  }
  if (target && typeof target === 'object') {
    for (const [key, value] of Object.entries(target)) {
      if (conditions.includes(key)) {
        const r = pickExport(value, conditions, star);
        if (r) return r;
      }
    }
  }
  return null;
}

/** Look `key` up in an `exports`/`imports` map: exact entry, then a single-`*` pattern. */
function matchSubpathMap(
  map: Record<string, unknown>,
  key: string,
  conditions: string[],
): string | null {
  if (key in map) return pickExport(map[key], conditions, null);
  for (const [pattern, target] of Object.entries(map)) {
    const star = pattern.indexOf('*');
    if (star === -1) continue;
    const pre = pattern.slice(0, star);
    const post = pattern.slice(star + 1);
    if (
      key.startsWith(pre) &&
      key.endsWith(post) &&
      key.length >= pre.length + post.length
    ) {
      const rel = pickExport(
        target,
        conditions,
        key.slice(pre.length, key.length - post.length),
      );
      if (rel) return rel;
    }
  }
  return null;
}

function resolveFromPackageDir(
  pkgDir: string,
  sub: string,
  opts: Required<FallbackOptions>,
): string | null {
  const pkgJsonText = readFileSync(joinPath(pkgDir, 'package.json'));
  let pkg: Record<string, unknown> = {};
  if (pkgJsonText) {
    try {
      pkg = JSON.parse(pkgJsonText) as Record<string, unknown>;
    } catch {
      // A manifest that does not parse is unresolvable, as with oxc-resolver.
      return null;
    }
  }
  const key = sub ? `./${sub}` : '.';
  const exportsField = pkg['exports'];
  if (exportsField !== undefined && exportsField !== null) {
    const isSubpathMap =
      typeof exportsField === 'object' &&
      !Array.isArray(exportsField) &&
      Object.keys(exportsField).some((k) => k.startsWith('.'));
    const map: Record<string, unknown> = isSubpathMap
      ? (exportsField as Record<string, unknown>)
      : { '.': exportsField };
    const rel = matchSubpathMap(map, key, opts.conditionNames);
    return rel ? probe(resolvePath(pkgDir, rel), []) : null;
  }
  if (sub) return probe(joinPath(pkgDir, sub), opts.extensions);
  for (const field of [...opts.mainFields, 'types', 'typings']) {
    const v = pkg[field];
    if (typeof v === 'string') {
      const hit = probe(resolvePath(pkgDir, v), opts.extensions);
      if (hit) return hit;
    }
  }
  return probe(pkgDir, opts.extensions);
}

const RELATIVE = /^\.\.?(\/|$)/;

/**
 * A relative specifier probed with the caller's extensions only. A `?query` or
 * `#fragment` suffix is resolved around and put back on the result, as
 * oxc-resolver reports it (`no-duplicates` tells `foo?raw` from `foo?url`).
 */
function resolveRelative(
  specifier: string,
  fromFile: string,
  extensions: string[],
): string | null {
  const cut = specifier.search(/[?#]/);
  const bare = cut === -1 ? specifier : specifier.slice(0, cut);
  const hit = probe(resolvePath(getDirname(fromFile), bare), extensions);
  return hit === null || cut === -1 ? hit : hit + specifier.slice(cut);
}

function resolveViaNodeModules(
  specifier: string,
  fromFile: string,
  opts: Required<FallbackOptions>,
): string | null {
  try {
    return createRequire(fromFile).resolve(specifier);
  } catch {
    // ESM-only or types-only package: read its package.json directly.
  }
  const parts = splitPackage(specifier);
  if (!parts) return null;
  let dir = getDirname(fromFile);
  for (;;) {
    const pkgDir = joinPath(dir, 'node_modules', parts.name);
    if (fileExistsSync(pkgDir)) {
      const hit = resolveFromPackageDir(pkgDir, parts.sub, opts);
      if (hit) return hit;
    }
    const parent = getDirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** `#specifier`: the nearest package.json's `imports` map. */
function resolveViaImportsMap(
  specifier: string,
  fromFile: string,
  opts: Required<FallbackOptions>,
): string | null {
  const pkgPath = findFileUpward('package.json', getDirname(fromFile));
  const text = pkgPath === null ? null : readFileSync(pkgPath);
  if (pkgPath === null || text === null) return null;
  let imports: unknown;
  try {
    imports = (JSON.parse(text) as Record<string, unknown>)['imports'];
  } catch {
    return null;
  }
  if (!imports || typeof imports !== 'object') return null;
  const rel = matchSubpathMap(
    imports as Record<string, unknown>,
    specifier,
    opts.conditionNames,
  );
  if (rel === null) return null;
  return rel.startsWith('.')
    ? probe(resolvePath(getDirname(pkgPath), rel), [])
    : resolveViaNodeModules(rel, pkgPath, opts);
}

/**
 * Resolve a non-relative specifier without `oxc-resolver`.
 * Order matches oxc-resolver: tsconfig paths / baseUrl first, then node_modules.
 */
export function resolveWithoutOxc(
  specifier: string,
  fromFile: string,
  tsconfigPath: string | null,
  options: FallbackOptions = {},
): string | null {
  const opts: Required<FallbackOptions> = {
    extensions: options.extensions ?? DEFAULT_EXTENSIONS,
    conditionNames: options.conditionNames ?? DEFAULT_CONDITIONS,
    mainFields: options.mainFields ?? ['module', 'main'],
  };
  // Builtins are not files: oxc-resolver reports them unresolved, and so do we.
  if (isBuiltin(specifier)) return null;
  if (specifier.startsWith('#')) {
    return resolveViaImportsMap(specifier, fromFile, opts);
  }
  if (RELATIVE.test(specifier)) {
    return resolveRelative(specifier, fromFile, opts.extensions);
  }
  if (specifier.startsWith('/')) return probe(specifier, opts.extensions);
  if (tsconfigPath) {
    const hit = resolveViaTsconfig(specifier, tsconfigPath, opts.extensions);
    if (hit) return hit;
  }
  return resolveViaNodeModules(specifier, fromFile, opts);
}

export function clearFallbackCache(): void {
  tsconfigCache.clear();
}
