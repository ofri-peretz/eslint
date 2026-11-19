/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Resolution that honours eslint-plugin-import's resolver settings.
 *
 * A config carried over from eslint-plugin-import names its resolvers in one
 * of two places:
 *
 *   settings: { 'import/resolver': { node: { extensions, paths }, typescript: true } }
 *   settings: { 'import/resolve': { extensions, paths } }   // the older key
 *
 * `import/resolver` is an object (its keys in order), a resolver name, or an
 * array of names and objects. eslint-plugin-import tries the resolvers in that
 * order until one resolves the specifier, and so does this: a node resolver
 * limited to `.ts` that misses `./b` (b.js) hands it to the typescript
 * resolver next. The older `import/resolve` key is the node resolver's
 * options, read only when `import/resolver` is absent — eslint-plugin-import's
 * `settings['import/resolver'] || { node: settings['import/resolve'] }`.
 *
 * Each resolver is approximated by the devkit resolver (oxc-resolver, which
 * also reads the nearest tsconfig.json `paths`):
 *
 *   - node: its `extensions`, in order (`['.jsx', '.js']` makes `./bar`
 *     bar.jsx even when bar.js exists), and its `paths`, extra directories a
 *     bare specifier is looked up in after `node_modules` (NODE_PATH);
 *   - typescript (`typescript`, `eslint-import-resolver-typescript`): its
 *     `extensions`, else eslint-import-resolver-typescript's own list;
 *   - any other resolver (webpack, a custom one): the devkit default.
 *
 * Without settings this is the devkit resolver, unchanged.
 */
import * as path from 'node:path';

import { resolveModule } from '@interlace/eslint-devkit';

/** eslint-import-resolver-typescript's extensions, in its order. */
const TYPESCRIPT_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.d.ts',
  '.js',
  '.jsx',
  '.json',
  '.node',
];

const TYPESCRIPT_RESOLVERS = new Set([
  'typescript',
  'eslint-import-resolver-typescript',
]);
const NODE_RESOLVERS = new Set(['node', 'eslint-import-resolver-node']);

/** One configured resolver, as this plugin approximates it. */
export interface ResolverStep {
  kind: 'node' | 'typescript' | 'other';
  /** The extensions it tries, in order; absent: the caller's default. */
  extensions?: string[];
  /** node: extra directories for a bare specifier. */
  paths?: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const strings = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')
    ? value
    : undefined;

/** `[name, options]` per configured resolver, in the order they are tried. */
function configuredResolvers(
  settings: Readonly<Record<string, unknown>>,
): [string, unknown][] {
  const configured = settings['import/resolver'] || {
    node: settings['import/resolve'],
  };
  if (typeof configured === 'string') return [[configured, null]];
  if (Array.isArray(configured))
    return configured.flatMap((r): [string, unknown][] =>
      typeof r === 'string'
        ? [[r, null]]
        : isRecord(r)
          ? Object.entries(r)
          : [],
    );
  return isRecord(configured) ? Object.entries(configured) : [];
}

function stepOf(name: string, options: unknown): ResolverStep {
  const config = isRecord(options) ? options : {};
  if (NODE_RESOLVERS.has(name))
    return {
      kind: 'node',
      extensions: strings(config['extensions']),
      paths: strings(config['paths']),
    };
  if (TYPESCRIPT_RESOLVERS.has(name))
    return {
      kind: 'typescript',
      extensions: strings(config['extensions']) ?? TYPESCRIPT_EXTENSIONS,
    };
  return { kind: 'other' };
}

/** Settings objects are shared by every file a config lints. */
const chains = new WeakMap<object, ResolverStep[]>();

/**
 * The configured resolvers, in the order they are tried. Never empty: with no
 * usable resolver configured, one step that resolves the default way.
 */
export function resolverChain(
  settings: Readonly<Record<string, unknown>>,
): ResolverStep[] {
  const cached = chains.get(settings);
  if (cached) return cached;
  const seen = new Set<string>();
  const chain: ResolverStep[] = [];
  for (const [name, options] of configuredResolvers(settings)) {
    const step = stepOf(name, options);
    // Two resolvers this plugin approximates the same way resolve the same:
    // trying the second adds nothing.
    const key = JSON.stringify(step);
    if (seen.has(key)) continue;
    seen.add(key);
    chain.push(step);
  }
  if (chain.length === 0) chain.push({ kind: 'other' });
  chains.set(settings, chain);
  return chain;
}

/** One resolver's attempt: its extensions, then its `paths`. */
function resolveStep(
  specifier: string,
  file: string,
  extensions: string[] | undefined,
  paths: string[] | undefined,
): string | null {
  const options = extensions ? { extensions } : {};
  const found = resolveModule(specifier, file, options);
  if (found !== null || /^[./]/.test(specifier)) return found;
  for (const dir of paths ?? []) {
    // Resolved as a relative specifier from inside that directory. A
    // relative `paths` entry is relative to the working directory, as
    // NODE_PATH is.
    const hit = resolveModule(
      `./${specifier}`,
      path.join(path.resolve(dir), 'index.js'),
      options,
    );
    if (hit !== null) return hit;
  }
  return null;
}

/**
 * Resolve `specifier` from `file` the way the configured resolvers would:
 * each in turn, the first file found wins.
 *
 * `extensions`, when given, wins over every resolver's own list (a rule
 * option that names them). `nodeDefaults` is the list for a node resolver
 * that names none, and for a resolver this plugin does not know; absent, the
 * devkit default.
 */
export function resolveWithSettings(
  specifier: string,
  file: string,
  settings: Readonly<Record<string, unknown>>,
  extensions?: string[],
  nodeDefaults?: string[],
): string | null {
  for (const step of resolverChain(settings)) {
    const found = resolveStep(
      specifier,
      file,
      extensions ?? step.extensions ?? nodeDefaults,
      step.paths,
    );
    if (found !== null) return found;
  }
  return null;
}
