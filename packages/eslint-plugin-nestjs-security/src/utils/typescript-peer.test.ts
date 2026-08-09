/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The point of this helper is that the plugin stays importable for a consumer
 * with no TypeScript installed — the defect CI caught, where a top-level
 * `require("typescript")` made every rule throw on load. So the case worth
 * testing is the one that cannot occur in this repo: the module being absent.
 *
 * It cannot be reproduced by removing TypeScript: it is a devDependency here.
 * `vi.doMock` does not reach a CommonJS `require` in vitest's transpiled
 * output, and neither does patching `Module._load` — hence the resolver seam.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { loadTypeScript, clearTypeScriptCache } from './typescript-peer';

afterEach(() => {
  clearTypeScriptCache();
});

describe('loadTypeScript', () => {
  it('returns the module when it is installed', () => {
    expect(loadTypeScript()?.SyntaxKind.Decorator).toBeTypeOf('number');
  });

  it('memoises, so the type-aware path pays one require', () => {
    expect(loadTypeScript()).toBe(loadTypeScript());
  });

  it('returns null rather than throwing when TypeScript is absent', () => {
    clearTypeScriptCache();
    expect(
      loadTypeScript(() => {
        throw new Error("Cannot find module 'typescript'");
      }),
    ).toBeNull();
  });
});
