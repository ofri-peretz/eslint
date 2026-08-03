/**
 * The `typescript` peer is optional at runtime.
 *
 * `named`, `namespace` and `default` need a handful of TypeScript enum values,
 * but only on a path where the type checker has already run. Importing the
 * module at top level put `require("typescript")` in the emitted output, so the
 * plugin threw `Cannot find module 'typescript'` on a clean install for anyone
 * linting plain JavaScript. These tests pin the lazy, failure-tolerant access.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Module from 'node:module';
import { aliasSymbolFlag, loadTypeScript, resetTypeScriptPeerCache } from './typescript-peer';

describe('typescript peer loading', () => {
  beforeEach(() => resetTypeScriptPeerCache());
  afterEach(() => {
    vi.restoreAllMocks();
    resetTypeScriptPeerCache();
  });

  it('loads the real module when it is installed', () => {
    const ts = loadTypeScript();
    expect(ts).not.toBeNull();
    expect(typeof ts?.SymbolFlags.Alias).toBe('number');
  });

  it('memoises, so the type-aware path does not re-require per node', () => {
    expect(loadTypeScript()).toBe(loadTypeScript());
  });

  it('exposes SymbolFlags.Alias', () => {
    expect(aliasSymbolFlag()).toBe(loadTypeScript()?.SymbolFlags.Alias);
  });

  it('returns null instead of throwing when the peer is absent', () => {
    // Simulate a consumer who never installed TypeScript.
    const original = (Module as unknown as { _load: (...a: unknown[]) => unknown })._load;
    vi.spyOn(Module as unknown as { _load: (...a: unknown[]) => unknown }, '_load').mockImplementation(
      (request: unknown, ...rest: unknown[]) => {
        if (request === 'typescript') throw new Error("Cannot find module 'typescript'");
        return original(request, ...rest);
      },
    );
    expect(loadTypeScript()).toBeNull();
    // Callers treat undefined as "no alias" — `flags & 0` is always falsy.
    expect(aliasSymbolFlag()).toBe(0);
  });
});
