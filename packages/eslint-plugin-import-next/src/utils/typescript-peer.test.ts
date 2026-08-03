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
import fs from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
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

/**
 * Rule-level lock.
 *
 * The tests above pin the utility, but nothing would fail if a rule reverted to
 * `import ts from 'typescript'` at module scope: the workspace has TypeScript
 * installed, so every rule test would still pass and only a *consumer* without
 * it would break. This asserts the adoption, not just the helper.
 */
describe('rules do not import typescript at module scope', () => {
  const RULES_DIR = path.resolve(__dirname, '..', 'rules');

  it('every rule source imports typescript only as a type, if at all', () => {
    const offenders: string[] = [];
    for (const entry of fs.readdirSync(RULES_DIR)) {
      if (!entry.endsWith('.ts') || entry.endsWith('.test.ts')) continue;
      const source = fs.readFileSync(path.join(RULES_DIR, entry), 'utf-8');
      for (const line of source.split('\n')) {
        // `import type ts from 'typescript'` is erased at compile time and safe.
        // Any other import of it emits a require and breaks a clean install.
        if (/^\s*import\s+(?!type\b)[^;]*\bfrom\s+['"]typescript['"]/.test(line)) {
          offenders.push(`${entry}: ${line.trim()}`);
        }
      }
    }
    expect(
      offenders,
      'These rules import `typescript` as a value, which emits require("typescript") ' +
        'and throws for consumers who lint plain JavaScript. Use `loadTypeScript()` ' +
        `from utils/typescript-peer instead:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});
