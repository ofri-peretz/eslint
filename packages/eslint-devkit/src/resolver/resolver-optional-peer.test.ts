/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: `oxc-resolver` is an OPTIONAL peer dependency.
 *
 * It ships a ~1.5 MB native NAPI binary that exactly one plugin in this
 * ecosystem actually needs, so it is loaded lazily rather than at module load.
 * Two things must stay true, and both are asserted here:
 *
 *   1. Importing the resolver module must NOT require the binary — otherwise
 *      every consumer is back to downloading it.
 *   2. When the binary is genuinely missing, the failure must be an actionable
 *      install instruction, not a raw MODULE_NOT_FOUND from deep in a lint run.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Module } from 'node:module';

/**
 * The lazy load is a CommonJS `require`, so `vi.mock` (which patches ESM
 * resolution) can't see it. Patching `Module._load` is what actually
 * intercepts it — and it exercises the real code path rather than a stub.
 */
type ModuleInternals = { _load: (...args: unknown[]) => unknown };
const moduleInternals = Module as unknown as ModuleInternals;
const realLoad = moduleInternals._load;

function hideOxcResolver(): void {
  moduleInternals._load = function patched(...args: unknown[]) {
    if (args[0] === 'oxc-resolver') {
      throw Object.assign(new Error("Cannot find module 'oxc-resolver'"), {
        code: 'MODULE_NOT_FOUND',
      });
    }
    return realLoad.apply(this, args);
  };
}

describe('oxc-resolver optional peer', () => {
  beforeEach(() => {
    // Fresh module each case, so the memoised factory ref starts empty.
    vi.resetModules();
  });

  afterEach(() => {
    moduleInternals._load = realLoad;
  });

  it('imports the resolver module without loading the native binary', async () => {
    hideOxcResolver();

    // If the binary were required at module load, this import would throw.
    const mod = await import('./resolver');

    expect(typeof mod.resolveModule).toBe('function');
    expect(typeof mod.clearResolverCache).toBe('function');
  });

  it('throws an actionable install error when the peer is absent', async () => {
    const { resolveModule, clearResolverCache, MissingResolverPeerError } =
      await import('./resolver');

    clearResolverCache();
    hideOxcResolver();

    // A bare specifier can't take the relative-path fast path, so this
    // reaches the lazy load.
    const attempt = () => resolveModule('some-bare-package', __filename);

    // Critically: it must THROW, not return null. `resolveModule` swallows
    // ordinary resolution failures, and a missing peer disappearing down that
    // path would silently disable every import rule instead of telling the
    // user to install it.
    expect(attempt).toThrow(MissingResolverPeerError);
    expect(attempt).toThrow(/optional peer dependency "oxc-resolver"/);
    expect(attempt).toThrow(/npm install --save-dev oxc-resolver/);
  });

  it('resolves normally when the peer IS installed', async () => {
    const { resolveModule, clearResolverCache } = await import('./resolver');
    clearResolverCache();

    // Sanity check that the lazy path is wired to a working resolver — a
    // self-resolve of a package that definitely exists.
    expect(resolveModule('vitest', __filename)).toBeTruthy();
  });
});
