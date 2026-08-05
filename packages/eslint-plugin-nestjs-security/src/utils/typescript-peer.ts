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

/**
 * The `typescript` module, or `null` when the consumer hasn't installed it.
 *
 * `resolve` exists so the absent-module path can be tested. TypeScript is a
 * devDependency of this repo, so the failure this helper exists to prevent
 * cannot be reproduced here by removing it — and vitest transforms the module,
 * so neither `vi.doMock` nor patching `Module._load` reaches a CommonJS
 * `require` in the transpiled output. A seam is the only way the guarantee is
 * verified rather than assumed.
 */
export function loadTypeScript(
  resolve: (name: string) => typeof ts = (name) => require(name) as typeof ts,
): typeof ts | null {
  if (cached === undefined) {
    try {
      cached = resolve('typescript');
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
