/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: `oxc-resolver` is an OPTIONAL peer dependency, and its
 * absence degrades to a Node-only fallback instead of an error.
 *
 * It ships a ~1.5 MB native NAPI binary that exactly one plugin in this
 * ecosystem actually needs, so it is loaded lazily rather than at module load.
 * Two things must stay true, and both are asserted here:
 *
 *   1. Importing the resolver module must NOT require the binary — otherwise
 *      every consumer is back to downloading it.
 *   2. When the binary is genuinely missing, resolution must still work for the
 *      common shapes (node_modules, tsconfig paths) via the fallback resolver.
 *      This replaces the earlier contract that threw MissingResolverPeerError.
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

  it('falls back to Node resolution when the peer is absent', async () => {
    const { resolveModule, clearResolverCache } = await import('./resolver');

    clearResolverCache();
    hideOxcResolver();

    // Contract change (was: throw MissingResolverPeerError). A missing optional
    // peer no longer disables import resolution: bare specifiers resolve through
    // Node's own resolver, and unresolvable ones still return null.
    expect(resolveModule('vitest', __filename)).toBeTruthy();
    expect(
      resolveModule('definitely-not-installed-pkg', __filename),
    ).toBeNull();
  });

  it('fallback honours tsconfig paths and ESM-only exports', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, realpathSync } =
      await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'devkit-fallback-')));
    mkdirSync(join(root, 'src/lib'), { recursive: true });
    mkdirSync(join(root, 'node_modules/esm-only/dist'), { recursive: true });
    writeFileSync(
      join(root, 'tsconfig.json'),
      '{ // comment\n "compilerOptions": { "baseUrl": ".", "paths": { "@lib/*": ["src/lib/*"], }, }, }',
    );
    writeFileSync(join(root, 'src/lib/util.ts'), '');
    writeFileSync(join(root, 'src/main.ts'), '');
    writeFileSync(
      join(root, 'node_modules/esm-only/package.json'),
      '{"name":"esm-only","exports":{".":{"import":"./dist/index.mjs"}}}',
    );
    writeFileSync(join(root, 'node_modules/esm-only/dist/index.mjs'), '');

    hideOxcResolver();
    const { resolveModule, clearResolverCache } = await import('./resolver');
    clearResolverCache();
    const from = join(root, 'src/main.ts');
    expect(resolveModule('@lib/util', from)).toBe(
      join(root, 'src/lib/util.ts'),
    );
    expect(resolveModule('esm-only', from)).toBe(
      join(root, 'node_modules/esm-only/dist/index.mjs'),
    );
  });

  it('still exports the deprecated MissingResolverPeerError class', async () => {
    const { MissingResolverPeerError } = await import('./resolver');
    const err = new MissingResolverPeerError('x');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('MissingResolverPeerError');
  });

  it('resolves normally when the peer IS installed', async () => {
    const { resolveModule, clearResolverCache } = await import('./resolver');
    clearResolverCache();

    // Sanity check that the lazy path is wired to a working resolver — a
    // self-resolve of a package that definitely exists.
    expect(resolveModule('vitest', __filename)).toBeTruthy();
  });
});
