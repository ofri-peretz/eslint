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
 *   - custom-alias (`custom-alias`, `eslint-import-resolver-custom-alias`):
 *     its `alias` prefixes rewritten to their folders (relative to the
 *     working directory, or to the `packages` folder the file is in) before
 *     resolving with its `extensions`, `['.js']` by default, as it does;
 *   - any other resolver (webpack, a custom one): the devkit default.
 *
 * Without settings this is the devkit resolver, unchanged.
 */
import * as fs from 'node:fs';
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
const ALIAS_RESOLVERS = new Set([
  'custom-alias',
  'eslint-import-resolver-custom-alias',
]);

/** One configured resolver, as this plugin approximates it. */
export interface ResolverStep {
  kind: 'node' | 'typescript' | 'alias' | 'other';
  /** The extensions it tries, in order; absent: the caller's default. */
  extensions?: string[];
  /** node: extra directories for a bare specifier. */
  paths?: string[];
  /** alias: prefix -> folder, in the configured order. */
  alias?: [string, string][];
  /** alias: globs of the workspace packages an alias folder is relative to. */
  packages?: string[];
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
  if (ALIAS_RESOLVERS.has(name)) {
    const alias = isRecord(config['alias'])
      ? Object.entries(config['alias']).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        )
      : [];
    return {
      kind: 'alias',
      extensions: strings(config['extensions']) ?? ['.js'],
      alias,
      packages: strings(config['packages']) ?? [],
    };
  }
  return { kind: 'other' };
}

/**
 * eslint-import-resolver-custom-alias's rewrite: the first-matching prefix
 * (`src` matches `src` and `src/x`; an empty prefix matches any bare
 * specifier) becomes its folder. The folder is relative to the workspace
 * package the file is in, when `packages` names one, else to the working
 * directory. A specifier no prefix matches is resolved as written.
 */
function rewriteAlias(
  specifier: string,
  file: string,
  step: Required<Pick<ResolverStep, 'alias' | 'packages'>>,
): string {
  const roots = step.packages.flatMap((glob) => {
    // glob-parent: the folders before the first glob segment.
    const segments = glob.split('/');
    const firstGlob = segments.findIndex((s) => /[*?[\]{}!]/.test(s));
    const parent = path.resolve(
      segments.slice(0, firstGlob < 0 ? segments.length : firstGlob).join('/'),
    );
    try {
      return fs
        .readdirSync(parent, { withFileTypes: true })
        .filter((d) => !d.isFile())
        .map((d) => path.join(parent, d.name));
    } catch {
      return [];
    }
  });
  const root =
    roots.find((r) => file.startsWith(r + path.sep)) ?? process.cwd();
  let out = specifier;
  for (const [prefix, folder] of step.alias) {
    const target = path.resolve(root, folder);
    if (
      (prefix === '' && !/^[./]/.test(out)) ||
      (out.startsWith(prefix) && out[prefix.length] === '/')
    ) {
      out = path.join(target, out.slice(prefix.length));
    } else if (out === prefix) {
      out = target;
    }
  }
  return out;
}

/**
 * Does the config name a resolver this plugin does not model (webpack, a
 * custom one)? Then "none of ours resolves it" is not "it resolves to
 * nothing": that resolver might map it.
 */
export function namesUnmodelledResolver(
  settings: Readonly<Record<string, unknown>>,
): boolean {
  return configuredResolvers(settings).some(
    ([name]) =>
      !NODE_RESOLVERS.has(name) &&
      !TYPESCRIPT_RESOLVERS.has(name) &&
      !ALIAS_RESOLVERS.has(name),
  );
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

/**
 * The conditions of the module that runs: `types` left out. A package that
 * sends `.` and `./store` to one `types` file (svelte does) still has two
 * runtime modules.
 */
export const RUNTIME_CONDITIONS = ['import', 'require', 'node', 'default'];

/**
 * What a TypeScript source file is written as in a specifier.
 *
 * `./App.jsx` names `App.tsx`, `./a.js` names `a.ts`, `a.tsx` or a declaration
 * file `a.d.ts`, and `.mjs` / `.cjs` name `.mts` / `.cts` (and their `.d.*`).
 * eslint-import-resolver-typescript maps these through `extensionAlias`; the
 * devkit resolver knows `.js` to `.ts` and `.tsx` for a relative specifier only,
 * so `.jsx`, a declaration file, and the same specifiers behind a `paths` alias
 * (`@/widget.js`) came back unresolved: 268 `no-unresolved` findings on
 * lynx-stack that the incumbent, run with the repo's typescript resolver, does
 * not make.
 */
const EMIT_TO_SOURCE: Readonly<Record<string, readonly string[]>> = {
  '.js': ['.ts', '.tsx', '.d.ts'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts', '.d.mts'],
  '.cjs': ['.cts', '.d.cts'],
};

/**
 * `specifier` with its emit extension swapped for each source extension, tried
 * through the same resolver (so a `paths` alias still applies). Only runs after
 * the specifier as written resolved to nothing, so a real `.js` always wins.
 */
function resolveEmitExtension(
  specifier: string,
  file: string,
  options: { extensions?: string[]; conditionNames?: string[] },
): string | null {
  const emit = Object.keys(EMIT_TO_SOURCE).find((ext) =>
    specifier.endsWith(ext),
  );
  if (!emit) return null;
  const stem = specifier.slice(0, -emit.length);
  for (const source of EMIT_TO_SOURCE[emit]) {
    // The stem plus the full source extension, resolved as written: `./a.d.ts`
    // is an exact file, `./a.tsx` one the extension list does not need to cover.
    const hit = resolveModule(stem + source, file, options);
    if (hit !== null) return hit;
  }
  return null;
}

/** One resolver's attempt: its extensions, then its `paths`. */
function resolveStep(
  specifier: string,
  file: string,
  extensions: string[] | undefined,
  paths: string[] | undefined,
  conditionNames: string[] | undefined,
): string | null {
  const options = {
    ...(extensions ? { extensions } : {}),
    ...(conditionNames ? { conditionNames } : {}),
  };
  const found =
    resolveModule(specifier, file, options) ??
    resolveEmitExtension(specifier, file, options);
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
 * devkit default. `conditionNames`, when given, are the `exports` conditions
 * matched (`RUNTIME_CONDITIONS`: the file that runs); absent, the devkit's,
 * `types` included.
 */
export function resolveWithSettings(
  specifier: string,
  file: string,
  settings: Readonly<Record<string, unknown>>,
  extensions?: string[],
  nodeDefaults?: string[],
  conditionNames?: string[],
): string | null {
  for (const step of resolverChain(settings)) {
    const found = resolveStep(
      step.kind === 'alias'
        ? rewriteAlias(specifier, file, step as Required<ResolverStep>)
        : specifier,
      file,
      extensions ?? step.extensions ?? nodeDefaults,
      step.paths,
      conditionNames,
    );
    if (found !== null) return found;
  }
  return null;
}
