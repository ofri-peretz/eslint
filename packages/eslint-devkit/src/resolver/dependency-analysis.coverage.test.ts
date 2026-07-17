/**
 * Coverage-focused tests for dependency-analysis.ts
 *
 * Uses real temporary fixture files (same approach as
 * dependency-analysis.test.ts) to exercise the remaining branches:
 * global resolution cache hits, type-only/re-export edges, Tarjan
 * depth-limit fallbacks, shortest-cycle BFS, the per-import DFS detector,
 * and incremental persistence defaults.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  type FileSystemCache,
  createFileSystemCache,
  createLRUCache,
  resolveImportPath,
  getFileImports,
  computeSCCsFromFile,
  isFileInCycle,
  findShortestCyclePath,
  detectCycleFromImport,
  findAllCircularDependencies,
  saveCacheToDisk,
  loadCacheFromDisk,
  getFilesNeedingReanalysis,
} from './dependency-analysis';
import { clearResolverCache } from './resolver';

let testDir: string;
let cache: FileSystemCache;

function createTempFile(relativePath: string, content: string): string {
  const fullPath = path.join(testDir, relativePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf-8');
  return fs.realpathSync(fullPath);
}

function baseOptions() {
  return {
    workspaceRoot: testDir,
    barrelExports: ['index.ts'],
    cache,
  };
}

beforeEach(() => {
  testDir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'dep-analysis-cov-')),
  );
  cache = createFileSystemCache();
  clearResolverCache();
});

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('resolveImportPath global cache for non-relative imports', () => {
  it('returns the globally cached result on the second call', () => {
    const fromFile = createTempFile('src/a.ts', 'export const a = 1;');
    const opts = {
      fromFile,
      workspaceRoot: testDir,
      barrelExports: ['index.ts'],
      cache,
    };
    // '@nope/missing' is scoped (not "definitely external") and unresolvable
    const first = resolveImportPath('@nope/missing', opts);
    expect(first).toBeNull();
    expect(cache.resolvedPaths.has('@nope/missing')).toBe(true);

    // Second call must short-circuit through the global cache branch
    const second = resolveImportPath('@nope/missing', opts);
    expect(second).toBeNull();
  });
});

describe('createLRUCache zero-capacity eviction', () => {
  it('handles maxSize 0 without evicting from an empty map', () => {
    const lru = createLRUCache<string, number>(0);
    // size (0) >= maxSize (0) with an empty map → firstKey undefined branch
    lru.set('a', 1);
    expect(lru.get('a')).toBe(1);
    expect(lru.size).toBe(1);
  });
});

describe('resolveImportPath scope-only specifiers', () => {
  it('resolves through the pipeline for @-specifiers flagged as external', () => {
    const fromFile = createTempFile('src/a.ts', 'export const a = 1;');
    // '@lonescope' (no slash) matches the bare-specifier external pattern,
    // but @-prefixed paths skip the early external return and fall through.
    const result = resolveImportPath('@lonescope', {
      fromFile,
      workspaceRoot: testDir,
      barrelExports: ['index.ts'],
      cache,
    });
    expect(result).toBeNull();
  });
});

describe('getFileImports type-only and re-export edges', () => {
  it('marks `import type` edges as typeOnly', () => {
    const b = createTempFile('src/b.ts', 'export type B = string;');
    const a = createTempFile(
      'src/a.ts',
      "import type { B } from './b';\nexport const a: B = 'x';\n",
    );
    const imports = getFileImports(a, baseOptions());
    expect(imports).toHaveLength(1);
    expect(imports[0].path).toBe(b);
    expect(imports[0].typeOnly).toBe(true);
  });

  it('captures re-export (`export { } from`) edges', () => {
    const c = createTempFile('src/c.ts', 'export const c = 1;');
    const barrel = createTempFile('src/barrel.ts', "export { c } from './c';\n");
    const imports = getFileImports(barrel, baseOptions());
    expect(imports).toHaveLength(1);
    expect(imports[0].path).toBe(c);
    expect(imports[0].typeOnly).toBeUndefined();
  });

  it('skips SCC invalidation when re-parsing an unchanged file', () => {
    createTempFile('src/dep.ts', 'export const dep = 1;');
    const a = createTempFile(
      'src/a.ts',
      "import { dep } from './dep';\nexport const a = 1;\n",
    );
    const first = getFileImports(a, baseOptions());
    expect(first).toHaveLength(1);

    // Drop the parsed-imports cache but KEEP the file hash: the re-parse
    // sees oldHash === hash and must not invalidate the SCC cache.
    cache.dependencies.delete(a);
    cache.sccComputed = true;
    const second = getFileImports(a, baseOptions());
    expect(second).toHaveLength(1);
    expect(cache.sccComputed).toBe(true);
  });
});

describe('computeSCCsFromFile edge cases', () => {
  it('skips files re-pushed onto the discovery stack before their first visit', () => {
    // r → c; c → {d, e}; e → d. When e is popped before d, d is pushed a
    // second time and the duplicate pop hits the visited-continue branch.
    createTempFile('src/d.ts', 'export const d = 1;');
    createTempFile(
      'src/e.ts',
      "import { d } from './d';\nexport const e = 1;\n",
    );
    createTempFile(
      'src/c.ts',
      "import { d } from './d';\nimport { e } from './e';\nexport const c = 1;\n",
    );
    const r = createTempFile(
      'src/r.ts',
      "import { c } from './c';\nexport const r = 1;\n",
    );
    const sccs = computeSCCsFromFile(r, { maxDepth: 20, ...baseOptions() });
    // No cycles anywhere; every file lands in a singleton SCC
    expect(sccs.every((s) => !s.hasCycle)).toBe(true);
    expect(sccs).toHaveLength(4);
  });

  it('preserves existing SCC index entries when extending from a new root', () => {
    // First root: a → b. Second root: n → a (a/b already indexed).
    const b = createTempFile('src/b.ts', 'export const b = 1;');
    const a = createTempFile(
      'src/a.ts',
      "import { b } from './b';\nexport const a = 1;\n",
    );
    const n = createTempFile(
      'src/n.ts',
      "import { a } from './a';\nexport const n = 1;\n",
    );
    // Pre-warm the import caches so the second SCC pass does not re-parse a
    // new file (a fresh hash would invalidate the SCC cache mid-test).
    getFileImports(n, baseOptions());
    getFileImports(a, baseOptions());
    getFileImports(b, baseOptions());

    computeSCCsFromFile(a, { maxDepth: 20, ...baseOptions() });
    const aIndex = cache.sccIndex.get(a);
    expect(aIndex).toBeDefined();

    computeSCCsFromFile(n, { maxDepth: 20, ...baseOptions() });
    // a keeps its original index; n got a new one
    expect(cache.sccIndex.get(a)).toBe(aIndex);
    expect(cache.sccIndex.has(n)).toBe(true);
  });

  it('falls back to lowlink 0 when recursion is truncated by the depth limit', () => {
    // a → b → c → a, but maxDepth 1 truncates Tarjan's recursion at c,
    // so c has no lowlink when b computes Math.min(..., lowlink(c) ?? 0).
    createTempFile('src/c.ts', "import { a } from './a';\nexport const c = 1;\n");
    createTempFile('src/b.ts', "import { c } from './c';\nexport const b = 1;\n");
    const a = createTempFile(
      'src/a.ts',
      "import { b } from './b';\nexport const a = 1;\n",
    );
    const sccs = computeSCCsFromFile(a, { maxDepth: 1, ...baseOptions() });
    expect(Array.isArray(sccs)).toBe(true);
    expect(sccs.length).toBeGreaterThan(0);
    // Every discovered file is indexed even under truncation
    expect(cache.sccIndex.has(a)).toBe(true);
  });
});

describe('isFileInCycle', () => {
  it('returns false for files never indexed in any SCC', () => {
    expect(isFileInCycle('/nowhere/unknown.ts', cache)).toBe(false);
  });
});

describe('findShortestCyclePath', () => {
  it('returns null when the source file is not in any SCC', () => {
    expect(
      findShortestCyclePath('/nowhere/src.ts', '/nowhere/tgt.ts', {
        ...baseOptions(),
      }),
    ).toBeNull();
  });

  it('finds the shortest cycle path via BFS, skipping dynamic/off-SCC edges', () => {
    // Cycle: s → t → {u, v} → w → s, plus t → x (off-SCC) and a dynamic edge.
    const w = createTempFile(
      'src/w.ts',
      "import { s } from './s';\nexport const w = 1;\n",
    );
    const u = createTempFile(
      'src/u.ts',
      "import { w } from './w';\nexport const u = 1;\n",
    );
    const v = createTempFile(
      'src/v.ts',
      "import { w } from './w';\nexport const v = 1;\n",
    );
    createTempFile('src/x.ts', 'export const x = 1;');
    createTempFile('src/dyn.ts', 'export const dyn = 1;');
    const t = createTempFile(
      'src/t.ts',
      [
        "import { u } from './u';",
        "import { v } from './v';",
        "import { x } from './x';",
        "const d = import('./dyn');",
        'export const t = 1;',
      ].join('\n') + '\n',
    );
    const s = createTempFile(
      'src/s.ts',
      "import { t } from './t';\nexport const s = 1;\n",
    );

    computeSCCsFromFile(s, { maxDepth: 50, ...baseOptions() });
    expect(isFileInCycle(s, cache)).toBe(true);

    const cyclePath = findShortestCyclePath(s, t, { ...baseOptions() });
    expect(cyclePath).not.toBeNull();
    // BFS shortest path from t back to s: t → (u|v) → w → s
    expect(cyclePath![0]).toBe(t);
    expect(cyclePath![cyclePath!.length - 1]).toBe(s);
    expect(cyclePath).toHaveLength(4);
    expect([u, v]).toContain(cyclePath![1]);
    expect(cyclePath![2]).toBe(w);
  });

  it('returns null when BFS exhausts without reaching the source', () => {
    // Non-cyclic pair: leaf has no imports, so BFS from it finds nothing.
    const leaf = createTempFile('src/leaf.ts', 'export const leaf = 1;');
    const root = createTempFile(
      'src/root.ts',
      "import { leaf } from './leaf';\nexport const root = 1;\n",
    );
    computeSCCsFromFile(root, { maxDepth: 50, ...baseOptions() });
    // root is indexed (singleton SCC) but leaf can never reach it
    expect(cache.sccIndex.has(root)).toBe(true);
    expect(findShortestCyclePath(root, leaf, { ...baseOptions() })).toBeNull();
  });
});

describe('detectCycleFromImport', () => {
  const detectOpts = (over: Partial<{ maxDepth: number; reportAllCycles: boolean }> = {}) => ({
    maxDepth: over.maxDepth ?? 30,
    reportAllCycles: over.reportAllCycles ?? false,
    ...baseOptions(),
  });

  it('finds a simple a↔b cycle with the full path', () => {
    const b = createTempFile(
      'src/b.ts',
      "import { a } from './a';\nexport const b = 1;\n",
    );
    const a = createTempFile(
      'src/a.ts',
      "import { b } from './b';\nexport const a = 1;\n",
    );
    const cycles = detectCycleFromImport(a, b, detectOpts());
    expect(cycles).toEqual([[a, b, a]]);
  });

  it('returns [] immediately when the target is cached as non-cyclic', () => {
    const b = createTempFile(
      'src/b.ts',
      "import { a } from './a';\nexport const b = 1;\n",
    );
    const a = createTempFile(
      'src/a.ts',
      "import { b } from './b';\nexport const a = 1;\n",
    );
    cache.nonCyclicFiles.add(b);
    expect(detectCycleFromImport(a, b, detectOpts())).toEqual([]);
  });

  it('does not cache the target as non-cyclic when the depth limit truncates the DFS', () => {
    createTempFile('src/c.ts', "import { a } from './a';\nexport const c = 1;\n");
    const b = createTempFile(
      'src/b.ts',
      "import { c } from './c';\nexport const b = 1;\n",
    );
    const a = createTempFile(
      'src/a.ts',
      "import { b } from './b';\nexport const a = 1;\n",
    );
    const cycles = detectCycleFromImport(a, b, detectOpts({ maxDepth: 1 }));
    expect(cycles).toEqual([]);
    expect(cache.nonCyclicFiles.has(b)).toBe(false);
  });

  it('caches the target as non-cyclic after a complete cycle-free DFS', () => {
    const leaf = createTempFile('src/leaf.ts', 'export const leaf = 1;');
    const a = createTempFile(
      'src/a.ts',
      "import { leaf } from './leaf';\nexport const a = 1;\n",
    );
    expect(detectCycleFromImport(a, leaf, detectOpts())).toEqual([]);
    expect(cache.nonCyclicFiles.has(leaf)).toBe(true);
  });

  it('skips already-visited files and known non-cyclic files during the DFS', () => {
    // diamond: b → c, b → d, c → e, d → e (e visited twice)
    const e = createTempFile('src/e.ts', 'export const e = 1;');
    createTempFile('src/c.ts', "import { e } from './e';\nexport const c = 1;\n");
    createTempFile('src/d.ts', "import { e } from './e';\nexport const d = 1;\n");
    const b = createTempFile(
      'src/b.ts',
      "import { c } from './c';\nimport { d } from './d';\nexport const b = 1;\n",
    );
    const a = createTempFile(
      'src/a.ts',
      "import { b } from './b';\nexport const a = 1;\n",
    );
    expect(detectCycleFromImport(a, b, detectOpts())).toEqual([]);

    // second run: mark an inner file as known non-cyclic so the DFS takes
    // the inner nonCyclicFiles fast-path return
    cache.nonCyclicFiles.delete(b);
    cache.nonCyclicFiles.add(e);
    expect(detectCycleFromImport(a, b, detectOpts())).toEqual([]);
  });

  it('collects every cycle when reportAllCycles is true, and only the first otherwise', () => {
    // b → a (cycle 1) and b → c → a (cycle 2)
    createTempFile('src/c.ts', "import { a } from './a';\nexport const c = 1;\n");
    const b = createTempFile(
      'src/b.ts',
      "import { a } from './a';\nimport { c } from './c';\nexport const b = 1;\n",
    );
    const a = createTempFile(
      'src/a.ts',
      "import { b } from './b';\nexport const a = 1;\n",
    );

    const all = detectCycleFromImport(a, b, detectOpts({ reportAllCycles: true }));
    expect(all).toHaveLength(2);
    expect(all[0][all[0].length - 1]).toBe(a);
    expect(all[1][all[1].length - 1]).toBe(a);

    // first-only mode stops after one cycle (loop break before the next dfs)
    const freshCache = createFileSystemCache();
    const firstOnly = detectCycleFromImport(a, b, {
      maxDepth: 30,
      reportAllCycles: false,
      workspaceRoot: testDir,
      barrelExports: ['index.ts'],
      cache: freshCache,
    });
    expect(firstOnly).toHaveLength(1);
  });

  it('ignores dynamic imports during the DFS', () => {
    createTempFile('src/dyn.ts', 'export const dyn = 1;');
    const b = createTempFile(
      'src/b.ts',
      "const d = import('./dyn');\nexport const b = 1;\n",
    );
    const a = createTempFile(
      'src/a.ts',
      "import { b } from './b';\nexport const a = 1;\n",
    );
    expect(detectCycleFromImport(a, b, detectOpts())).toEqual([]);
    expect(cache.nonCyclicFiles.has(b)).toBe(true);
  });
});

describe('findAllCircularDependencies internal recursion branches', () => {
  const cycleOpts = (reportAll = true) => ({
    maxDepth: 10,
    reportAllCycles: reportAll,
    ...baseOptions(),
  });

  it('returns [] when called past the depth limit', () => {
    const f = createTempFile('src/deep.ts', 'export const deep = 1;');
    const result = findAllCircularDependencies(f, cycleOpts(), ['other'], 11, new Set());
    expect(result).toEqual([]);
  });

  it('returns [] for files already visited in this DFS run', () => {
    const f = createTempFile('src/vis.ts', 'export const vis = 1;');
    const result = findAllCircularDependencies(
      f,
      cycleOpts(),
      ['other'],
      1,
      new Set([f]),
    );
    expect(result).toEqual([]);
  });

  it('skips dynamic imports while extracting cycle paths', () => {
    createTempFile('src/d.ts', 'export const d = 1;');
    const b = createTempFile(
      'src/b.ts',
      "import { a } from './a';\nexport const b = 1;\n",
    );
    const a = createTempFile(
      'src/a.ts',
      "import { b } from './b';\nconst d = import('./d');\nexport const a = 1;\n",
    );
    const cycles = findAllCircularDependencies(a, cycleOpts(true));
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]).toEqual([a, b, a]);
    // the dynamically imported file never participates in any reported cycle
    for (const cycle of cycles) {
      expect(cycle.some((f) => f.endsWith('d.ts'))).toBe(false);
    }
  });
});

describe('getFilesNeedingReanalysis dependent-file scan', () => {
  it('does not flag dependents whose imports are unrelated to the change', () => {
    const changed = createTempFile('src/changed.ts', 'export const c = 1;');
    cache.sccComputed = true;
    cache.fileHashes.set(changed, 'stale-hash'); // differs from current

    // A cached dependent that imports something else entirely
    const bystander = path.join(testDir, 'src/bystander.ts');
    cache.dependencies.set(bystander, [
      { path: path.join(testDir, 'src/unrelated.ts'), source: './unrelated' },
    ]);

    const result = getFilesNeedingReanalysis([changed], cache, {
      enabled: true,
    });
    expect(result).toContain(changed);
    expect(result).not.toContain(bystander);
  });
});

describe('incremental persistence defaults', () => {
  it('saveCacheToDisk falls back to the default cache file path', () => {
    cache.graphHash = 'h';
    saveCacheToDisk(cache, { enabled: true }, testDir);
    const defaultFile = path.join(
      testDir,
      'node_modules/.cache/forge-eslint/cycles.json',
    );
    expect(fs.existsSync(defaultFile)).toBe(true);
    const data = JSON.parse(fs.readFileSync(defaultFile, 'utf-8'));
    expect(data.version).toBe(1);
    expect(data.graphHash).toBe('h');
  });

  it('loadCacheFromDisk returns false when disabled', () => {
    expect(loadCacheFromDisk(cache, { enabled: false }, testDir)).toBe(false);
    expect(loadCacheFromDisk(cache, {}, testDir)).toBe(false);
  });

  it('loadCacheFromDisk round-trips via the default cache file path', () => {
    cache.fileHashes.set('/f.ts', 'hash');
    cache.graphHash = 'round-trip';
    saveCacheToDisk(cache, { enabled: true }, testDir);

    const restored = createFileSystemCache();
    expect(loadCacheFromDisk(restored, { enabled: true }, testDir)).toBe(true);
    expect(restored.graphHash).toBe('round-trip');
    expect(restored.fileHashes.get('/f.ts')).toBe('hash');
  });
});
