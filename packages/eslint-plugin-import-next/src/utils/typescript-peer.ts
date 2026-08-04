/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lazy access to the `typescript` peer.
 *
 * `named`, `namespace` and `default` each need exactly one runtime value from
 * TypeScript — `SymbolFlags.Alias`. Importing it at module scope put
 * `require("typescript")` in the emitted output, so the plugin threw
 * `Cannot find module 'typescript'` on a clean install for anyone linting plain
 * JavaScript, who has no reason to have TypeScript installed.
 *
 * The value is only ever needed on a path that already has a TS `Symbol` in
 * hand, which means the type checker ran, which means TypeScript is present.
 * Loading it lazily keeps the plugin importable without it, and costs one
 * memoised `require` on the type-aware path.
 */
import type ts from 'typescript';

let cached: typeof ts | null | undefined;

/** The `typescript` module, or `null` when the consumer hasn't installed it. */
export function loadTypeScript(): typeof ts | null {
  if (cached === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- deliberate lazy load of an optional peer
      cached = require('typescript') as typeof ts;
    } catch {
      cached = null;
    }
  }
  return cached;
}

/**
 * `SymbolFlags.Alias`, or `0` when TypeScript isn't installed.
 *
 * Zero rather than `undefined` so callers can mask directly (`flags & alias`)
 * without a branch of their own: with no checker there is no symbol to resolve,
 * and `flags & 0` is correctly falsy.
 */
export function aliasSymbolFlag(): number {
  return loadTypeScript()?.SymbolFlags.Alias ?? 0;
}

/** Test seam: drop the memoised module so a missing peer can be simulated. */
export function resetTypeScriptPeerCache(): void {
  cached = undefined;
}
