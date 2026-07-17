/**
 * Layer-2 tests for the node_modules/realpath handling in resolveImportPath.
 *
 * These branches require a resolver result inside node_modules whose
 * realpath (a) stays in node_modules, (b) escapes it (symlinked workspace
 * package), or (c) cannot be resolved (broken symlink). Reproducing all
 * three with the real oxc-resolver is environment-dependent, so this file
 * mocks resolveModule and node:fs.realpathSync — everything else is real.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createFileSystemCache,
  resolveImportPath,
  getFileImports,
  type FileSystemCache,
} from './dependency-analysis';

const HASH_NULL_FILE = '/virtual/hash-null.ts';

vi.mock('./resolver', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./resolver')>();
  return {
    ...mod,
    resolveModule: vi.fn((importPath: string) => {
      if (importPath === '@ws/in-node-modules')
        return '/ws/node_modules/@ws/in-node-modules/index.js';
      if (importPath === '@ws/symlinked')
        return '/ws/node_modules/@ws/symlinked/index.js';
      if (importPath === '@ws/broken')
        return '/ws/node_modules/@ws/broken/index.js';
      return null;
    }),
  };
});

vi.mock('node:fs', async (importOriginal) => {
  const mod = await importOriginal<typeof import('node:fs')>();
  const isVirtual = (p: unknown) => String(p) === '/virtual/hash-null.ts';
  return {
    ...mod,
    realpathSync: Object.assign(
      vi.fn((p: string) => {
        if (String(p).includes('in-node-modules')) return String(p);
        if (String(p).includes('symlinked'))
          return '/ws/packages/symlinked/index.js';
        throw new Error('ELOOP: broken symlink');
      }),
      { native: mod.realpathSync.native },
    ),
    existsSync: vi.fn((p: unknown) =>
      isVirtual(p) ? true : mod.existsSync(p as never),
    ),
    readFileSync: vi.fn((p: unknown, o: unknown) =>
      isVirtual(p)
        ? 'export const virtual = 1;\n'
        : mod.readFileSync(p as never, o as never),
    ),
    statSync: vi.fn((p: unknown, o?: unknown) => {
      if (isVirtual(p)) throw new Error('ENOENT: stat raced with delete');
      return mod.statSync(p as never, o as never);
    }),
  };
});

let cache: FileSystemCache;

const opts = () => ({
  fromFile: '/ws/src/consumer.ts',
  workspaceRoot: '/ws',
  barrelExports: ['index.ts'],
  cache,
});

beforeEach(() => {
  cache = createFileSystemCache();
});

describe('resolveImportPath node_modules realpath handling', () => {
  it('treats results that truly live in node_modules as external (null)', () => {
    expect(resolveImportPath('@ws/in-node-modules', opts())).toBeNull();
    // cached as null for subsequent lookups
    expect(cache.resolvedPaths.get('@ws/in-node-modules')).toBeNull();
  });

  it('follows symlinked workspace packages out of node_modules', () => {
    expect(resolveImportPath('@ws/symlinked', opts())).toBe(
      '/ws/packages/symlinked/index.js',
    );
  });

  it('treats broken symlinks (realpathSync throws) as external (null)', () => {
    expect(resolveImportPath('@ws/broken', opts())).toBeNull();
    expect(cache.resolvedPaths.get('@ws/broken')).toBeNull();
  });
});

describe('getFileImports when the file hash cannot be computed', () => {
  it('caches parsed imports without touching file hashes (stat raced away)', () => {
    // The virtual file reads fine but statSync throws → getFileHash null →
    // the hash-based invalidation block is skipped entirely.
    const imports = getFileImports(HASH_NULL_FILE, {
      workspaceRoot: '/virtual',
      barrelExports: ['index.ts'],
      cache,
    });
    expect(imports).toEqual([]);
    expect(cache.dependencies.get(HASH_NULL_FILE)).toEqual([]);
    expect(cache.fileHashes.has(HASH_NULL_FILE)).toBe(false);
  });
});
