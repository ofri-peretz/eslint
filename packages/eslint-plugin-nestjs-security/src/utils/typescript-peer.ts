/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lazy access to the `typescript` peer.
 *
 * `no-missing-validation-pipe` needs real TypeScript values on its type-aware
 * path — `canHaveDecorators`, `getDecorators`, `isClassDeclaration` and
 * `SymbolFlags.Alias`. Importing the module at top level put
 * `require("typescript")` in the emitted output, and this package does not
 * declare TypeScript as a dependency, so a plain
 * `npm i -D eslint-plugin-nestjs-security` threw `Cannot find module`.
 *
 * The values are only ever reached after `hasParserServices()` is true, which
 * means the type checker ran, which means TypeScript is installed. Loading it
 * lazily keeps the plugin importable without it and costs one memoised
 * `require` on the type-aware path.
 *
 * Mirrors `eslint-plugin-import-next/src/utils/typescript-peer.ts`.
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

/** Reset the memo. Exported for tests. */
export function clearTypeScriptCache(): void {
  cached = undefined;
}
