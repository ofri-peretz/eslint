/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Resolution that honours eslint-plugin-import's node-resolver settings.
 *
 * A config carried over from eslint-plugin-import says how its node resolver
 * looks for files in one of two places:
 *
 *   settings: { 'import/resolver': { node: { extensions, paths } } }
 *   settings: { 'import/resolve': { extensions, paths } }   // the older key
 *
 * `extensions` is the list, in order, a specifier without one is tried with:
 * with `['.jsx', '.js']`, `./bar` is `bar.jsx` even when `bar.js` exists.
 * `paths` are extra directories a bare specifier is looked up in, after
 * `node_modules` (NODE_PATH): `import x from 'in-alternate-root'`.
 *
 * Without those settings this is the devkit resolver, unchanged.
 */
import * as path from 'node:path';

import { resolveModule } from '@interlace/eslint-devkit';

export interface NodeResolverSettings {
  extensions?: string[];
  paths?: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const strings = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')
    ? value
    : undefined;

/** The node resolver's settings, from either key, or `{}`. */
export function nodeResolverSettings(
  settings: Readonly<Record<string, unknown>>,
): NodeResolverSettings {
  const legacy = settings['import/resolve'];
  // `import/resolver` is an object, or an array of resolver names and
  // objects tried in order; the node resolver's options are in `node`.
  const resolvers = [settings['import/resolver']].flat();
  const node = resolvers.find(
    (r): r is Record<string, unknown> => isRecord(r) && isRecord(r['node']),
  )?.['node'];
  const config = isRecord(node) ? node : isRecord(legacy) ? legacy : {};
  return {
    extensions: strings(config['extensions']),
    paths: strings(config['paths']),
  };
}

/**
 * Resolve `specifier` from `file` the way the configured node resolver
 * would. `extensions`, when given, wins over the settings' own list (a rule
 * option that names them).
 */
export function resolveWithSettings(
  specifier: string,
  file: string,
  settings: Readonly<Record<string, unknown>>,
  extensions?: string[],
): string | null {
  const node = nodeResolverSettings(settings);
  const exts = extensions ?? node.extensions;
  const options = exts ? { extensions: exts } : {};
  const found = resolveModule(specifier, file, options);
  if (found !== null || /^[./]/.test(specifier)) return found;
  for (const dir of node.paths ?? []) {
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
