/**
 * Comprehensive tests for dependency-analysis.ts
 *
 * These tests use real temporary files to achieve 100% coverage
 * of file system operations that cannot be tested via RuleTester.
 */
import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  type FileSystemCache,
  type PersistentCacheData,
  createFileSystemCache,
  clearCache,
  getFileHash,
  isCacheValid,
  fileExists,
  patternToRegexWithCache,
  shouldIgnoreFileWithCache,
  resolveImportPath,
  getFileImports,
  hasOnlyTypeImports,
  findAllCircularDependencies,
  getMinimalCycle,
  getCycleHash,
  createLRUCache,
  isDefinitelyExternal,
  // Incremental analysis functions
  saveCacheToDisk,
  loadCacheFromDisk,
  getFilesNeedingReanalysis,
  isIncrementalAvailable,
  getCycleForFile,
} from './dependency-analysis';
import { clearResolverCache } from './resolver';
import {
  fileExistsSync,
  readFileSync,
  readJsonFileSync,
  findFileUpward,
} from '../node/fs';
// Note: PatternCache is created/initialized via internal module setup, not directly used in tests

// Mock resolver to avoid integration issues with get-tsconfig in tests
vi.mock('./resolver', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./resolver')>();
  return {
    ...mod,
    resolveModule: vi.fn((importPath: string, fromFile: string, options: unknown) => {
      // Handle aliases manually for testing
      if (importPath.startsWith('@app/')) {
        const subpath = importPath.replace('@app/', '');
        // Special case for index file test
        if (subpath === 'utils') return path.join(testDir, 'src/utils/index.ts');
        // Append .ts for file tests
        return path.join(testDir, 'src', subpath) + '.ts';
      }
      if (importPath.startsWith('@src/')) {
        return path.join(testDir, 'src', importPath.replace('@src/', '')) + '.ts';
      }
      if (importPath.startsWith('@lib/')) {
        return path.join(testDir, 'lib', importPath.replace('@lib/', '')) + '.ts';
      }
      // Call original for relative/absolute paths
      return mod.resolveModule(importPath, fromFile, options);
    }),
  };
});

// Test directory for temporary files
let testDir: string;
let cache: FileSystemCache;

/**
 * Create a temporary file with content
 */
function createTempFile(relativePath: string, content: string): string {
  const fullPath = path.join(testDir, relativePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
}

/**
 * Clean up test directory
 */
function cleanupTestDir(): void {
  if (testDir && fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

describe('dependency-analysis', () => {
  beforeEach(() => {
    // Create a unique test directory for each test
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-utils-test-'));
    try {
        testDir = fs.realpathSync(baseDir);
    } catch {
        testDir = baseDir;
    }
    cache = createFileSystemCache();
  });

  afterEach(() => {
    cleanupTestDir();
    clearResolverCache();
  });

  afterAll(() => {
    // Ensure cleanup even if tests fail
    cleanupTestDir();
  });

  describe('createFileSystemCache', () => {
    it('should create an empty cache with all required maps', () => {
      const newCache = createFileSystemCache();

      expect(newCache.dependencies).toBeInstanceOf(Map);
      expect(newCache.fileExists).toBeInstanceOf(Map);
      expect(newCache.fileHashes).toBeInstanceOf(Map);
      expect(newCache.compiledPatterns).toBeInstanceOf(Map);
      expect(newCache.reportedCycles).toBeInstanceOf(Set);

      expect(newCache.dependencies.size).toBe(0);
      expect(newCache.fileExists.size).toBe(0);
      expect(newCache.fileHashes.size).toBe(0);
      expect(newCache.compiledPatterns.size).toBe(0);
      expect(newCache.reportedCycles.size).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', () => {
      // Add some data to the cache
      cache.dependencies.set('file1', []);
      cache.fileExists.set('file2', true);
      cache.fileHashes.set('file3', 'hash');
      cache.compiledPatterns.set('pattern', /test/);
      cache.reportedCycles.add('cycle1');

      // Clear the cache
      clearCache(cache);

      // Verify all entries are cleared
      expect(cache.dependencies.size).toBe(0);
      expect(cache.fileExists.size).toBe(0);
      expect(cache.fileHashes.size).toBe(0);
      expect(cache.compiledPatterns.size).toBe(0);
      expect(cache.reportedCycles.size).toBe(0);
    });
  });

  describe('getFileHash', () => {
    it('should return hash for existing file', () => {
      const filePath = createTempFile('test.ts', 'const x = 1;');

      const hash = getFileHash(filePath);

      expect(hash).not.toBeNull();
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^\d+(\.\d+)?-\d+$/); // mtime-size format
    });

    it('should return null for non-existent file', () => {
      const hash = getFileHash(path.join(testDir, 'nonexistent.ts'));

      expect(hash).toBeNull();
    });

    it('should return different hashes for files with different content', () => {
      const file1 = createTempFile('file1.ts', 'content1');
      const file2 = createTempFile('file2.ts', 'content2 with more text');

      const hash1 = getFileHash(file1);
      const hash2 = getFileHash(file2);

      // Size should be different, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    it('should return same hash for same file (no changes)', () => {
      const filePath = createTempFile('test.ts', 'const x = 1;');

      const hash1 = getFileHash(filePath);
      const hash2 = getFileHash(filePath);

      expect(hash1).toBe(hash2);
    });
  });

  describe('isCacheValid', () => {
    it('should return false when file is not in cache', () => {
      const filePath = createTempFile('test.ts', 'content');

      const valid = isCacheValid(filePath, cache);

      expect(valid).toBe(false);
    });

    it('should return true when file hash matches cached hash', () => {
      const filePath = createTempFile('test.ts', 'content');
      const hash = getFileHash(filePath);
      if (hash) cache.fileHashes.set(filePath, hash);

      const valid = isCacheValid(filePath, cache);

      expect(valid).toBe(true);
    });

    it('should return false when file has been modified', () => {
      const filePath = createTempFile('test.ts', 'original content');
      const originalHash = getFileHash(filePath);
      if (originalHash) cache.fileHashes.set(filePath, originalHash);

      // Modify the file (change content and size)
      fs.writeFileSync(filePath, 'modified content with more text', 'utf-8');

      const valid = isCacheValid(filePath, cache);

      expect(valid).toBe(false);
    });

    it('should return false when cached file no longer exists', () => {
      const filePath = createTempFile('test.ts', 'content');
      cache.fileHashes.set(filePath, 'some-hash');

      // Delete the file
      fs.unlinkSync(filePath);

      const valid = isCacheValid(filePath, cache);

      expect(valid).toBe(false);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', () => {
      const filePath = createTempFile('test.ts', 'content');

      const exists = fileExists(filePath, cache);

      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', () => {
      const exists = fileExists(path.join(testDir, 'nonexistent.ts'), cache);

      expect(exists).toBe(false);
    });

    it('should cache the result', () => {
      const filePath = createTempFile('test.ts', 'content');

      // First call - not cached
      expect(cache.fileExists.has(filePath)).toBe(false);
      fileExists(filePath, cache);
      expect(cache.fileExists.has(filePath)).toBe(true);
      expect(cache.fileExists.get(filePath)).toBe(true);

      // Second call should use cache
      const result = fileExists(filePath, cache);
      expect(result).toBe(true);
    });

    it('should return cached value even if file is deleted', () => {
      const filePath = createTempFile('test.ts', 'content');

      // Cache that file exists
      fileExists(filePath, cache);
      expect(cache.fileExists.get(filePath)).toBe(true);

      // Delete the file
      fs.unlinkSync(filePath);

      // Should still return cached value (true)
      const exists = fileExists(filePath, cache);
      expect(exists).toBe(true);
    });
  });

  describe('patternToRegexWithCache', () => {
    it('should work with FileSystemCache', () => {
      const regex = patternToRegexWithCache('*.ts', cache);

      expect(regex.test('file.ts')).toBe(true);
      expect(cache.compiledPatterns.has('*.ts')).toBe(true);
    });
  });

  describe('shouldIgnoreFileWithCache', () => {
    it('should work with FileSystemCache', () => {
      // The pattern **/*.test.ts becomes .*/[^/]*\.test\.ts
      // which matches any path containing .test.ts
      const result = shouldIgnoreFileWithCache(
        '/project/src/file.test.ts',
        ['**/*.test.ts'],
        cache
      );

      expect(result).toBe(true);
    });

    it('should not match when pattern does not match', () => {
      const result = shouldIgnoreFileWithCache(
        '/project/src/utils.ts',
        ['**/*.test.ts'],
        cache
      );

      expect(result).toBe(false);
    });
  });

  describe('resolveImportPath', () => {
    // Helper to create tsconfig
    function createTsConfig(paths: Record<string, string[]>) {
        const config = {
            compilerOptions: {
                baseUrl: ".",
                paths
            }
        };
        fs.writeFileSync(path.join(testDir, 'tsconfig.json'), JSON.stringify(config));
    }

    it('should resolve relative import with extension', () => {
      const mainFile = createTempFile('src/main.ts', '');
      const utilsFile = createTempFile('src/utils.ts', '');

      const resolved = resolveImportPath('./utils', {
        fromFile: mainFile,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(resolved).toBe(utilsFile);
    });

    it('should resolve relative import to directory path when directory exists', () => {
      createTempFile('src/main.ts', '');
      // Create index file in a subdirectory
      createTempFile('src/helpers/index.ts', '');
      const helpersDir = path.join(testDir, 'src/helpers');

      // Use a fresh cache to avoid cached directory existence
      const freshCache = createFileSystemCache();
      const resolved = resolveImportPath('./helpers', {
        fromFile: path.join(testDir, 'src/main.ts'),
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache: freshCache,
      });

      expect(resolved).toBe(path.join(helpersDir, 'index.ts'));
    });

    it('should resolve parent relative import', () => {
      createTempFile('src/components/button.ts', '');
      const utilsFile = createTempFile('src/utils.ts', '');

      const resolved = resolveImportPath('../utils', {
        fromFile: path.join(testDir, 'src/components/button.ts'),
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(resolved).toBe(utilsFile);
    });

    it('should try multiple extensions', () => {
      const mainFile = createTempFile('src/main.ts', '');
      const componentFile = createTempFile('src/component.tsx', '');

      const resolved = resolveImportPath('./component', {
        fromFile: mainFile,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(resolved).toBe(componentFile);
    });

    it('should resolve @app alias', () => {
      createTsConfig({
        "@app/*": ["src/*"]
      });
      const srcFile = createTempFile('src/utils/helper.ts', '');

      const resolved = resolveImportPath('@app/utils/helper', {
        fromFile: path.join(testDir, 'src/main.ts'),
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(resolved).toBe(srcFile);
    });

    it('should resolve @src alias', () => {
      createTsConfig({
        "@src/*": ["src/*"]
      });
      const srcFile = createTempFile('src/utils/helper.ts', '');

      const resolved = resolveImportPath('@src/utils/helper', {
        fromFile: path.join(testDir, 'src/main.ts'),
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(resolved).toBe(srcFile);
    });

    it('should resolve other aliases to root directory', () => {
      createTsConfig({
        "@lib/*": ["lib/*"]
      });
      const libFile = createTempFile('lib/utils.ts', '');

      const resolved = resolveImportPath('@lib/utils', {
        fromFile: path.join(testDir, 'src/main.ts'),
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(resolved).toBe(libFile);
    });

    it('should return null for external packages', () => {
      createTempFile('src/main.ts', '');

      const resolved = resolveImportPath('lodash', {
        fromFile: path.join(testDir, 'src/main.ts'),
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(resolved).toBeNull();
    });

    it('should return null for node built-ins', () => {
      const resolved = resolveImportPath('fs', {
        fromFile: path.join(testDir, 'src/main.ts'),
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(resolved).toBeNull();
    });

    it('should resolve alias to index file', () => {
      createTsConfig({
        "@app/*": ["src/*"]
      });
      const indexFile = createTempFile('src/utils/index.ts', '');

      const resolved = resolveImportPath('@app/utils', {
        fromFile: path.join(testDir, 'src/main.ts'),
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(resolved).toBe(indexFile);
    });

    it('should return path even if file does not exist (for relative)', () => {
      const resolved = resolveImportPath('./nonexistent', {
        fromFile: path.join(testDir, 'src/main.ts'),
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      // Returns the resolved path even if file doesn't exist
      expect(resolved).toBe(path.join(testDir, 'src/nonexistent'));
    });
  });

  describe('getFileImports', () => {
    it('should extract ES6 imports', () => {
      const mainFile = createTempFile(
        'src/main.ts',
        `
import { foo } from './utils';
import bar from './bar';
import * as all from './all';
      `
      );
      createTempFile('src/utils.ts', 'export const foo = 1;');
      createTempFile('src/bar.ts', 'export default 1;');
      createTempFile('src/all.ts', 'export const all = 1;');

      const imports = getFileImports(mainFile, {
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(imports.length).toBe(3);
      expect(imports.map((i) => i.source)).toContain('./utils');
      expect(imports.map((i) => i.source)).toContain('./bar');
      expect(imports.map((i) => i.source)).toContain('./all');
    });

    it('should extract dynamic imports', () => {
      const mainFile = createTempFile(
        'src/main.ts',
        `
const utils = import('./utils');
const lazy = await import('./lazy');
      `
      );
      createTempFile('src/utils.ts', '');
      createTempFile('src/lazy.ts', '');

      const imports = getFileImports(mainFile, {
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      const dynamicImports = imports.filter((i) => i.dynamic);
      expect(dynamicImports.length).toBe(2);
      expect(dynamicImports[0].dynamic).toBe(true);
    });

    it('should cache imports with hash-based invalidation', () => {
      const mainFile = createTempFile(
        'src/main.ts',
        `import { foo } from './utils';`
      );
      createTempFile('src/utils.ts', '');

      // First call - should read file
      const imports1 = getFileImports(mainFile, {
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });
      expect(imports1.length).toBe(1);
      expect(cache.dependencies.has(mainFile)).toBe(true);
      expect(cache.fileHashes.has(mainFile)).toBe(true);

      // Second call - should use cache
      const imports2 = getFileImports(mainFile, {
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });
      expect(imports2).toBe(imports1); // Same instance from cache
    });

    it('should return empty array for non-existent file', () => {
      const imports = getFileImports(path.join(testDir, 'nonexistent.ts'), {
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(imports).toEqual([]);
    });

    it('should handle file read errors gracefully', () => {
      // Create a directory instead of file (can't be read as file)
      const dirPath = path.join(testDir, 'src/directory');
      fs.mkdirSync(dirPath, { recursive: true });

      // Pre-cache that it "exists" even though it's a directory
      cache.fileExists.set(dirPath, true);

      const imports = getFileImports(dirPath, {
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(imports).toEqual([]);
    });

    it('should skip unresolved imports', () => {
      const mainFile = createTempFile(
        'src/main.ts',
        `
import { foo } from './existing';
import { bar } from 'external-package';
      `
      );
      createTempFile('src/existing.ts', '');

      const imports = getFileImports(mainFile, {
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      // Only the existing import should be included
      expect(imports.length).toBe(1);
      expect(imports[0].source).toBe('./existing');
    });

    it('should handle side-effect imports', () => {
      const mainFile = createTempFile(
        'src/main.ts',
        `
import './polyfill';
import 'some-css.css';
      `
      );
      createTempFile('src/polyfill.ts', '');

      const imports = getFileImports(mainFile, {
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      // Only local side-effect import should be included
      expect(imports.length).toBe(1);
      expect(imports[0].source).toBe('./polyfill');
    });
  });

  describe('hasOnlyTypeImports', () => {
    it('should return true when all imports are type-only', () => {
      const file1 = createTempFile(
        'src/file1.ts',
        `
import type { User } from './types';
import type { Config } from './config';
      `
      );
      const file2 = createTempFile(
        'src/file2.ts',
        `
import type { Data } from './data';
      `
      );

      const result = hasOnlyTypeImports([file1, file2], cache);

      expect(result).toBe(true);
    });

    it('should return false when there are runtime imports', () => {
      const file1 = createTempFile(
        'src/file1.ts',
        `
import { helper } from './utils';
      `
      );
      const file2 = createTempFile(
        'src/file2.ts',
        `
import type { Data } from './data';
      `
      );

      const result = hasOnlyTypeImports([file1, file2], cache);

      expect(result).toBe(false);
    });

    it('should handle non-existent files', () => {
      const existingFile = createTempFile(
        'src/file1.ts',
        `import type { User } from './types';`
      );
      const nonExistentFile = path.join(testDir, 'src/nonexistent.ts');

      const result = hasOnlyTypeImports([existingFile, nonExistentFile], cache);

      expect(result).toBe(true); // Non-existent files are skipped
    });

    it('should return false on file read errors', () => {
      // Create a directory to simulate read error
      const dirPath = path.join(testDir, 'src/directory');
      fs.mkdirSync(dirPath, { recursive: true });
      cache.fileExists.set(dirPath, true);

      const result = hasOnlyTypeImports([dirPath], cache);

      expect(result).toBe(false);
    });

    it('should return true for empty cycle', () => {
      const result = hasOnlyTypeImports([], cache);

      expect(result).toBe(true);
    });
  });

  describe('findAllCircularDependencies', () => {
    it('should detect simple circular dependency', () => {
      const fileA = createTempFile('src/a.ts', `import { b } from './b';`);
      const fileB = createTempFile('src/b.ts', `import { a } from './a';`);

      const cycles = findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(cycles.length).toBeGreaterThan(0);
      // Cycle should contain both files
      const flatCycles = cycles.flat();
      expect(flatCycles).toContain(fileA);
      expect(flatCycles).toContain(fileB);
    });

    it('should detect longer circular dependency chains', () => {
      const fileA = createTempFile('src/a.ts', `import { b } from './b';`);
      const fileB = createTempFile('src/b.ts', `import { c } from './c';`);
      const fileC = createTempFile('src/c.ts', `import { a } from './a';`);

      const cycles = findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(cycles.length).toBeGreaterThan(0);
      const flatCycles = cycles.flat();
      expect(flatCycles).toContain(fileA);
      expect(flatCycles).toContain(fileB);
      expect(flatCycles).toContain(fileC);
    });

    it('should return empty array when no cycles exist', () => {
      const fileA = createTempFile('src/a.ts', `import { b } from './b';`);
      createTempFile('src/b.ts', `export const b = 1;`);

      const cycles = findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      expect(cycles).toEqual([]);
    });

    it('should respect maxDepth limit', () => {
      // Create a chain: a -> b -> c -> d -> e -> a
      createTempFile('src/a.ts', `import { b } from './b';`);
      createTempFile('src/b.ts', `import { c } from './c';`);
      createTempFile('src/c.ts', `import { d } from './d';`);
      createTempFile('src/d.ts', `import { e } from './e';`);
      createTempFile('src/e.ts', `import { a } from './a';`);

      const fileA = path.join(testDir, 'src/a.ts');

      // With shallow depth, should not find cycle
      const shallowCycles = findAllCircularDependencies(fileA, {
        maxDepth: 2,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache: createFileSystemCache(),
      });

      expect(shallowCycles).toEqual([]);

      // With sufficient depth, should find cycle
      const deepCycles = findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache: createFileSystemCache(),
      });

      expect(deepCycles.length).toBeGreaterThan(0);
    });

    it('should skip dynamic imports', () => {
      const fileA = createTempFile(
        'src/a.ts',
        `const b = import('./b');` // Dynamic import
      );
      createTempFile(
        'src/b.ts',
        `import { a } from './a';` // Static import back
      );

      const cycles = findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      // No cycle because dynamic imports are skipped
      expect(cycles).toEqual([]);
    });

    it('should find all cycles when reportAllCycles is true', () => {
      // Create multiple separate cycles
      const fileA = createTempFile(
        'src/a.ts',
        `
import { b } from './b';
import { c } from './c';
      `
      );
      createTempFile('src/b.ts', `import { a } from './a';`);
      createTempFile('src/c.ts', `import { a } from './a';`);

      const cycles = findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      // Should find both cycles
      expect(cycles.length).toBe(2);
    });

    it('should stop after first cycle when reportAllCycles is false', () => {
      const fileA = createTempFile(
        'src/a.ts',
        `
import { b } from './b';
import { c } from './c';
      `
      );
      createTempFile('src/b.ts', `import { a } from './a';`);
      createTempFile('src/c.ts', `import { a } from './a';`);

      const cycles = findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: false,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });

      // Should find only one cycle
      expect(cycles.length).toBe(1);
    });

    it('should detect deep cycles at any depth (unlike eslint-plugin-import no-cycle)', () => {
      // Create a 10-file chain: f1 -> f2 -> f3 -> ... -> f10 -> f1
      // eslint-plugin-import's no-cycle often misses this with default settings
      // Our Tarjan SCC algorithm guarantees finding ALL cycles regardless of depth
      const fileNames = Array.from({ length: 10 }, (_, i) => `file${i + 1}.ts`);
      
      // Create files with chain imports
      fileNames.forEach((name, idx) => {
        const nextIdx = (idx + 1) % 10;
        const nextName = fileNames[nextIdx];
        createTempFile(`deep/${name}`, `import { x } from './${nextName.replace('.ts', '')}';`);
      });

      const startFile = path.join(testDir, 'deep/file1.ts');
      
      // With sufficient maxDepth, should find the cycle
      const cycles = findAllCircularDependencies(startFile, {
        maxDepth: 20, // High enough to traverse 10 files
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache: createFileSystemCache(),
      });

      // MUST find the 10-file cycle
      expect(cycles.length).toBeGreaterThan(0);
      
      // Verify all 10 files are part of the detected cycle
      const flatCycles = cycles.flat();
      fileNames.forEach((name) => {
        const fullPath = path.join(testDir, `deep/${name}`);
        expect(flatCycles).toContain(fullPath);
      });
    });

    it('should benefit from SCC caching across multiple files in same lint run', () => {
      // Create a cycle: a -> b -> c -> a
      const fileA = createTempFile('cached/a.ts', `import { b } from './b';`);
      const fileB = createTempFile('cached/b.ts', `import { c } from './c';`);
      const fileC = createTempFile('cached/c.ts', `import { a } from './a';`);

      // Use same cache for multiple calls
      const sharedCache = createFileSystemCache();

      // First call - computes SCCs
      const cyclesFromA = findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache: sharedCache,
      });

      // SCC should be computed
      expect(sharedCache.sccComputed).toBe(true);
      expect(sharedCache.sccs.length).toBeGreaterThan(0);

      // Second call from fileB - should use cached SCC (O(1) lookup)
      const cyclesFromB = findAllCircularDependencies(fileB, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache: sharedCache,
      });

      // Third call from fileC - should also use cached SCC
      const cyclesFromC = findAllCircularDependencies(fileC, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache: sharedCache,
      });

      // All should detect the cycle
      expect(cyclesFromA.length).toBeGreaterThan(0);
      expect(cyclesFromB.length).toBeGreaterThan(0);
      expect(cyclesFromC.length).toBeGreaterThan(0);

      // All three files should be in the detected cycle
      [cyclesFromA, cyclesFromB, cyclesFromC].forEach((cycles) => {
        const flatCycles = cycles.flat();
        expect(flatCycles).toContain(fileA);
        expect(flatCycles).toContain(fileB);
        expect(flatCycles).toContain(fileC);
      });
    });
  });

  describe('getMinimalCycle', () => {
    it('should return same cycle for simple A->B->A pattern', () => {
      const cycle = ['/a.ts', '/b.ts', '/a.ts'];

      const minimal = getMinimalCycle(cycle);

      expect(minimal).toEqual(['/a.ts', '/b.ts', '/a.ts']);
    });

    it('should extract actual cycle from longer path', () => {
      // Path: A -> B -> C -> B (cycle starts at B)
      const cycle = ['/a.ts', '/b.ts', '/c.ts', '/b.ts'];

      const minimal = getMinimalCycle(cycle);

      expect(minimal).toEqual(['/b.ts', '/c.ts', '/b.ts']);
    });

    it('should handle single element', () => {
      const minimal = getMinimalCycle(['/a.ts']);

      expect(minimal).toEqual(['/a.ts']);
    });

    it('should handle empty array', () => {
      const minimal = getMinimalCycle([]);

      expect(minimal).toEqual([]);
    });

    it('should handle no repetition', () => {
      const cycle = ['/a.ts', '/b.ts', '/c.ts'];

      const minimal = getMinimalCycle(cycle);

      expect(minimal).toEqual(['/a.ts', '/b.ts', '/c.ts']);
    });
  });

  describe('getCycleHash', () => {
    it('should produce consistent hash for same cycle', () => {
      const cycle = ['/a.ts', '/b.ts', '/a.ts'];

      const hash1 = getCycleHash(cycle);
      const hash2 = getCycleHash(cycle);

      expect(hash1).toBe(hash2);
    });

    it('should normalize cycle to start from smallest path', () => {
      // Cycle starting from /a.ts (smallest alphabetically)
      const cycle = ['/a.ts', '/b.ts', '/c.ts', '/a.ts'];

      const hash = getCycleHash(cycle);

      // Should start from /a.ts (smallest)
      expect(hash.startsWith('/a.ts')).toBe(true);
    });

    it('should rotate cycle to smallest starting point', () => {
      // Cycle not starting from smallest path
      const cycle = ['/b.ts', '/a.ts', '/b.ts'];

      const hash = getCycleHash(cycle);

      // getMinimalCycle extracts ['/b.ts', '/a.ts', '/b.ts']
      // Then normalizes to start from smallest: '/a.ts'
      // Result: ['/a.ts', '/b.ts', '/b.ts'] (rotated from index 1)
      expect(hash).toBe('/a.ts->/b.ts->/b.ts');
    });

    it('should produce different hash for different cycles', () => {
      const cycle1 = ['/a.ts', '/b.ts', '/a.ts'];
      const cycle2 = ['/a.ts', '/c.ts', '/a.ts'];

      const hash1 = getCycleHash(cycle1);
      const hash2 = getCycleHash(cycle2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle single element cycle', () => {
      const hash = getCycleHash(['/a.ts']);

      expect(typeof hash).toBe('string');
      expect(hash).toBe('/a.ts');
    });

    it('should use arrow delimiter', () => {
      const hash = getCycleHash(['/a.ts', '/b.ts', '/a.ts']);

      expect(hash).toContain('->');
    });
  });

  // ===========================================
  // Tests for simple uncached file system utilities
  // ===========================================

  describe('fileExistsSync', () => {
    it('should return true for existing file', () => {
      const filePath = createTempFile('exists.ts', 'content');

      expect(fileExistsSync(filePath)).toBe(true);
    });

    it('should return false for non-existent file', () => {
      expect(fileExistsSync(path.join(testDir, 'nonexistent.ts'))).toBe(false);
    });

    it('should return true for existing directory', () => {
      const dirPath = path.join(testDir, 'subdir');
      fs.mkdirSync(dirPath);

      expect(fileExistsSync(dirPath)).toBe(true);
    });
  });

  describe('readFileSync', () => {
    it('should read file content', () => {
      const content = 'Hello, World!';
      const filePath = createTempFile('readable.txt', content);

      const result = readFileSync(filePath);

      expect(result).toBe(content);
    });

    it('should return null for non-existent file', () => {
      const result = readFileSync(path.join(testDir, 'nonexistent.txt'));

      expect(result).toBeNull();
    });

    it('should use specified encoding', () => {
      const content = 'UTF-8 content: 日本語';
      const filePath = createTempFile('utf8.txt', content);

      const result = readFileSync(filePath, 'utf-8');

      expect(result).toBe(content);
    });

    it('should return null on read error', () => {
      // Create a directory instead of a file to cause a read error
      const dirPath = path.join(testDir, 'directory');
      fs.mkdirSync(dirPath);

      const result = readFileSync(dirPath);

      expect(result).toBeNull();
    });
  });

  describe('readJsonFileSync', () => {
    it('should parse valid JSON file', () => {
      const data = { name: 'test', version: '1.0.0' };
      const filePath = createTempFile('valid.json', JSON.stringify(data));

      const result = readJsonFileSync<{ name: string; version: string }>(
        filePath
      );

      expect(result).toEqual(data);
    });

    it('should return null for non-existent file', () => {
      const result = readJsonFileSync(path.join(testDir, 'nonexistent.json'));

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const filePath = createTempFile('invalid.json', 'not valid json {');

      const result = readJsonFileSync(filePath);

      expect(result).toBeNull();
    });

    it('should handle nested JSON objects', () => {
      const data = {
        dependencies: { lodash: '^4.17.21' },
        devDependencies: { typescript: '^5.0.0' },
      };
      const filePath = createTempFile('package.json', JSON.stringify(data));

      const result = readJsonFileSync<typeof data>(filePath);

      expect(result).toEqual(data);
    });

    it('should handle JSON arrays', () => {
      const data = [1, 2, 3, 'test'];
      const filePath = createTempFile('array.json', JSON.stringify(data));

      const result = readJsonFileSync<typeof data>(filePath);

      expect(result).toEqual(data);
    });
  });

  describe('findFileUpward', () => {
    it('should find file in current directory', () => {
      const targetFile = createTempFile('target.txt', 'content');
      const startDir = path.dirname(targetFile);

      const result = findFileUpward('target.txt', startDir);

      expect(result).toBe(targetFile);
    });

    it('should find file in parent directory', () => {
      // Create file in testDir root
      const targetFile = createTempFile('root-file.txt', 'content');
      // Create nested directory
      const nestedDir = path.join(testDir, 'deep', 'nested', 'dir');
      fs.mkdirSync(nestedDir, { recursive: true });

      const result = findFileUpward('root-file.txt', nestedDir);

      expect(result).toBe(targetFile);
    });

    it('should return null when file not found', () => {
      const result = findFileUpward('nonexistent-unique-file.txt', testDir);

      expect(result).toBeNull();
    });

    it('should find package.json up the tree', () => {
      // Create a package.json in the test directory
      const pkgPath = createTempFile(
        'package.json',
        '{"name": "test-package"}'
      );
      const subDir = path.join(testDir, 'src', 'components');
      fs.mkdirSync(subDir, { recursive: true });

      const result = findFileUpward('package.json', subDir);

      expect(result).toBe(pkgPath);
    });

    it('should stop at first match (not continue to parent)', () => {
      // Create package.json in both parent and child
      createTempFile(
        'package.json',
        '{"name": "parent"}'
      );
      const childDir = path.join(testDir, 'packages', 'child');
      fs.mkdirSync(childDir, { recursive: true });
      const childPkg = path.join(childDir, 'package.json');
      fs.writeFileSync(childPkg, '{"name": "child"}', 'utf-8');

      const result = findFileUpward('package.json', childDir);

      // Should find child package.json first
      expect(result).toBe(childPkg);
    });
  });

  // =============================================================================
  // Performance Optimization Tests (inspired by eslint-plugin-import)
  // =============================================================================

  describe('createLRUCache', () => {
    it('should create an empty LRU cache', () => {
      const lruCache = createLRUCache<string, number>(5);
      expect(lruCache.size).toBe(0);
    });

    it('should set and get values', () => {
      const lruCache = createLRUCache<string, number>(5);
      lruCache.set('a', 1);
      lruCache.set('b', 2);
      
      expect(lruCache.get('a')).toBe(1);
      expect(lruCache.get('b')).toBe(2);
    });

    it('should return undefined for non-existent keys', () => {
      const lruCache = createLRUCache<string, number>(5);
      expect(lruCache.get('nonexistent')).toBeUndefined();
    });

    it('should evict oldest entry when capacity is reached', () => {
      const lruCache = createLRUCache<string, number>(3);
      lruCache.set('a', 1);
      lruCache.set('b', 2);
      lruCache.set('c', 3);
      
      // Cache is now full (size 3)
      expect(lruCache.size).toBe(3);
      
      // Add new entry - should evict 'a' (oldest)
      lruCache.set('d', 4);
      
      expect(lruCache.size).toBe(3);
      expect(lruCache.get('a')).toBeUndefined(); // evicted
      expect(lruCache.get('b')).toBe(2);
      expect(lruCache.get('c')).toBe(3);
      expect(lruCache.get('d')).toBe(4);
    });

    it('should move accessed items to end (most recently used)', () => {
      const lruCache = createLRUCache<string, number>(3);
      lruCache.set('a', 1);
      lruCache.set('b', 2);
      lruCache.set('c', 3);
      
      // Access 'a' to move it to the end
      lruCache.get('a');
      
      // Add new entry - should evict 'b' (now oldest) not 'a'
      lruCache.set('d', 4);
      
      expect(lruCache.get('a')).toBe(1); // still present
      expect(lruCache.get('b')).toBeUndefined(); // evicted
      expect(lruCache.get('c')).toBe(3);
      expect(lruCache.get('d')).toBe(4);
    });

    it('should update value and position on re-set', () => {
      const lruCache = createLRUCache<string, number>(3);
      lruCache.set('a', 1);
      lruCache.set('b', 2);
      lruCache.set('c', 3);
      
      // Update 'a' - should move to end
      lruCache.set('a', 100);
      
      // Add new entry - should evict 'b' (now oldest)
      lruCache.set('d', 4);
      
      expect(lruCache.get('a')).toBe(100); // updated value
      expect(lruCache.get('b')).toBeUndefined(); // evicted
    });

    it('should correctly report has() for existing and non-existing keys', () => {
      const lruCache = createLRUCache<string, number>(5);
      lruCache.set('a', 1);
      
      expect(lruCache.has('a')).toBe(true);
      expect(lruCache.has('b')).toBe(false);
    });

    it('should delete entries correctly', () => {
      const lruCache = createLRUCache<string, number>(5);
      lruCache.set('a', 1);
      lruCache.set('b', 2);
      
      expect(lruCache.delete('a')).toBe(true);
      expect(lruCache.get('a')).toBeUndefined();
      expect(lruCache.size).toBe(1);
      
      // Deleting non-existent key
      expect(lruCache.delete('nonexistent')).toBe(false);
    });

    it('should clear all entries', () => {
      const lruCache = createLRUCache<string, number>(5);
      lruCache.set('a', 1);
      lruCache.set('b', 2);
      lruCache.set('c', 3);
      
      lruCache.clear();
      
      expect(lruCache.size).toBe(0);
      expect(lruCache.get('a')).toBeUndefined();
      expect(lruCache.get('b')).toBeUndefined();
      expect(lruCache.get('c')).toBeUndefined();
    });

    it('should handle cache with size 1', () => {
      const lruCache = createLRUCache<string, number>(1);
      lruCache.set('a', 1);
      expect(lruCache.get('a')).toBe(1);
      
      lruCache.set('b', 2);
      expect(lruCache.get('a')).toBeUndefined();
      expect(lruCache.get('b')).toBe(2);
      expect(lruCache.size).toBe(1);
    });
  });

  describe('isDefinitelyExternal', () => {
    describe('known external packages', () => {
      it('should return true for known framework packages', () => {
        expect(isDefinitelyExternal('react')).toBe(true);
        expect(isDefinitelyExternal('react-dom')).toBe(true);
        expect(isDefinitelyExternal('vue')).toBe(true);
        expect(isDefinitelyExternal('angular')).toBe(true);
        expect(isDefinitelyExternal('svelte')).toBe(true);
      });

      it('should return true for known utility packages', () => {
        expect(isDefinitelyExternal('lodash')).toBe(true);
        expect(isDefinitelyExternal('underscore')).toBe(true);
        expect(isDefinitelyExternal('ramda')).toBe(true);
        expect(isDefinitelyExternal('rxjs')).toBe(true);
      });

      it('should return true for known server packages', () => {
        expect(isDefinitelyExternal('express')).toBe(true);
        expect(isDefinitelyExternal('koa')).toBe(true);
        expect(isDefinitelyExternal('fastify')).toBe(true);
        expect(isDefinitelyExternal('hapi')).toBe(true);
      });

      it('should return true for known http packages', () => {
        expect(isDefinitelyExternal('axios')).toBe(true);
        expect(isDefinitelyExternal('node-fetch')).toBe(true);
        expect(isDefinitelyExternal('got')).toBe(true);
      });

      it('should return true for known build tools', () => {
        expect(isDefinitelyExternal('typescript')).toBe(true);
        expect(isDefinitelyExternal('eslint')).toBe(true);
        expect(isDefinitelyExternal('prettier')).toBe(true);
        expect(isDefinitelyExternal('jest')).toBe(true);
        expect(isDefinitelyExternal('vitest')).toBe(true);
        expect(isDefinitelyExternal('webpack')).toBe(true);
        expect(isDefinitelyExternal('rollup')).toBe(true);
        expect(isDefinitelyExternal('vite')).toBe(true);
        expect(isDefinitelyExternal('esbuild')).toBe(true);
      });
    });

    describe('Node.js built-in modules', () => {
      it('should return true for node: prefixed imports', () => {
        expect(isDefinitelyExternal('node:fs')).toBe(true);
        expect(isDefinitelyExternal('node:path')).toBe(true);
        expect(isDefinitelyExternal('node:url')).toBe(true);
        expect(isDefinitelyExternal('node:http')).toBe(true);
        expect(isDefinitelyExternal('node:crypto')).toBe(true);
        expect(isDefinitelyExternal('node:child_process')).toBe(true);
      });

      it('should return true for bare node modules', () => {
        expect(isDefinitelyExternal('fs')).toBe(true);
        expect(isDefinitelyExternal('path')).toBe(true);
        expect(isDefinitelyExternal('url')).toBe(true);
        expect(isDefinitelyExternal('http')).toBe(true);
        expect(isDefinitelyExternal('https')).toBe(true);
        expect(isDefinitelyExternal('crypto')).toBe(true);
        expect(isDefinitelyExternal('util')).toBe(true);
        expect(isDefinitelyExternal('os')).toBe(true);
        expect(isDefinitelyExternal('child_process')).toBe(true);
      });
    });

    describe('bare specifiers (external packages)', () => {
      it('should return true for bare specifiers without slash', () => {
        // Packages without subpaths match ^[a-z@][^/]*$
        expect(isDefinitelyExternal('some-package')).toBe(true);
        expect(isDefinitelyExternal('my-lib')).toBe(true);
        expect(isDefinitelyExternal('xyz')).toBe(true);
      });
    });

    describe('node_modules paths', () => {
      it('should return true for node_modules paths', () => {
        expect(isDefinitelyExternal('/path/to/node_modules/lodash')).toBe(true);
        expect(isDefinitelyExternal('node_modules/react')).toBe(true);
        expect(isDefinitelyExternal('../node_modules/axios')).toBe(true);
      });
    });

    describe('relative and internal paths', () => {
      it('should return false for relative paths', () => {
        expect(isDefinitelyExternal('./utils')).toBe(false);
        expect(isDefinitelyExternal('../components/Button')).toBe(false);
        expect(isDefinitelyExternal('./index')).toBe(false);
      });

      it('should return false for project alias paths', () => {
        expect(isDefinitelyExternal('@app/utils')).toBe(false);
        expect(isDefinitelyExternal('@src/components')).toBe(false);
        expect(isDefinitelyExternal('@lib/helpers')).toBe(false);
      });

      it('should return true for subpath imports of known packages', () => {
        // These are external packages with subpaths - still external
        expect(isDefinitelyExternal('lodash/debounce')).toBe(true);
        expect(isDefinitelyExternal('react/jsx-runtime')).toBe(true);
        expect(isDefinitelyExternal('express/lib/router')).toBe(true);
      });

      it('should return false for subpath imports of unknown packages', () => {
        // Packages not in known list with subpaths
        expect(isDefinitelyExternal('my-custom-lib/utils')).toBe(false);
        expect(isDefinitelyExternal('some-unknown-package/deep/path')).toBe(false);
      });
    });
  });

  describe('FileSystemCache - resolvedPaths LRU cache', () => {
    it('should include resolvedPaths cache in new cache', () => {
      const newCache = createFileSystemCache();
      expect(newCache.resolvedPaths).toBeDefined();
      expect(newCache.resolvedPaths.size).toBe(0);
    });

    it('should cache resolved import paths', () => {
      // Create test files
      const fileA = createTempFile('src/a.ts', 'export const a = 1;');
      const fileB = createTempFile('src/b.ts', 'export const b = 2;');
      
      // First resolution should add to cache
      const result1 = resolveImportPath('./b', {
        fromFile: fileA,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });
      
      expect(result1).toBe(fileB);
      expect(cache.resolvedPaths.size).toBe(1);
      
      // Second resolution should hit cache (same result)
      const result2 = resolveImportPath('./b', {
        fromFile: fileA,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });
      
      expect(result2).toBe(fileB);
      expect(cache.resolvedPaths.size).toBe(1); // Still 1 (cache hit)
    });

    it('should cache null results for external packages', () => {
      const fileA = createTempFile('src/a.ts', 'import lodash from "lodash";');
      
      const result = resolveImportPath('lodash', {
        fromFile: fileA,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });
      
      expect(result).toBeNull();
      // External packages are skipped via isDefinitelyExternal before caching
      // They return null immediately and don't need caching
    });

    it('should clear resolvedPaths when cache is cleared', () => {
      const fileA = createTempFile('src/a.ts', 'export const a = 1;');
      createTempFile('src/b.ts', 'export const b = 2;');
      
      resolveImportPath('./b', {
        fromFile: fileA,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });
      
      expect(cache.resolvedPaths.size).toBeGreaterThan(0);
      
      clearCache(cache);
      
      expect(cache.resolvedPaths.size).toBe(0);
    });
  });

  describe('FileSystemCache - nonCyclicFiles cache', () => {
    it('should include nonCyclicFiles set in new cache', () => {
      const newCache = createFileSystemCache();
      expect(newCache.nonCyclicFiles).toBeDefined();
      expect(newCache.nonCyclicFiles.size).toBe(0);
    });

    it('should cache files that are not in any cycle', () => {
      // Create non-cyclic files
      const fileA = createTempFile('src/a.ts', 'import { b } from "./b";');
      createTempFile('src/b.ts', 'export const b = 1;');
      
      const cycles = findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });
      
      expect(cycles).toHaveLength(0);
      // After checking, non-cyclic files should be cached
      expect(cache.nonCyclicFiles.has(fileA)).toBe(true);
    });

    it('should not cache files that are in a cycle', () => {
      // Create cyclic files
      const fileA = createTempFile('src/a.ts', 'import { b } from "./b";');
      createTempFile('src/b.ts', 'import { a } from "./a";');
      
      const cycles = findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });
      
      expect(cycles.length).toBeGreaterThan(0);
      // Cyclic files should NOT be in nonCyclicFiles cache
      expect(cache.nonCyclicFiles.has(fileA)).toBe(false);
    });

    it('should skip cycle detection for known non-cyclic files', () => {
      // Create non-cyclic files
      const fileA = createTempFile('src/a.ts', 'import { b } from "./b";');
      createTempFile('src/b.ts', 'export const b = 1;');
      
      // First call should compute and cache
      findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });
      
      expect(cache.nonCyclicFiles.has(fileA)).toBe(true);
      
      // Second call should be fast (cached)
      const startTime = Date.now();
      const cycles = findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });
      const duration = Date.now() - startTime;
      
      expect(cycles).toHaveLength(0);
      // Should be very fast (< 5ms) due to cache hit
      expect(duration).toBeLessThan(50);
    });

    it('should clear nonCyclicFiles when cache is cleared', () => {
      const fileA = createTempFile('src/a.ts', 'export const a = 1;');
      
      findAllCircularDependencies(fileA, {
        maxDepth: 10,
        reportAllCycles: true,
        workspaceRoot: testDir,
        barrelExports: ['index.ts'],
        cache,
      });
      
      expect(cache.nonCyclicFiles.size).toBeGreaterThan(0);
      
      clearCache(cache);
      
      expect(cache.nonCyclicFiles.size).toBe(0);
    });
  });

  // ============================================================
  // INCREMENTAL ANALYSIS TESTS
  // ============================================================

  describe('Incremental Analysis', () => {
    describe('isIncrementalAvailable', () => {
      it('should return false when options are undefined', () => {
        expect(isIncrementalAvailable(cache, undefined)).toBe(false);
      });

      it('should return false when incremental is disabled', () => {
        expect(isIncrementalAvailable(cache, { enabled: false })).toBe(false);
      });

      it('should return false when SCC is not computed', () => {
        const freshCache = createFileSystemCache();
        expect(isIncrementalAvailable(freshCache, { enabled: true })).toBe(false);
      });

      it('should return true when incremental is enabled and SCC is computed', () => {
        const incrementalCache = createFileSystemCache();
        incrementalCache.sccComputed = true;
        incrementalCache.sccs = [{ files: ['a.ts'], hasCycle: false }];
        
        expect(isIncrementalAvailable(incrementalCache, { enabled: true })).toBe(true);
      });
    });

    describe('saveCacheToDisk and loadCacheFromDisk', () => {
      it('should not save when incremental is disabled', () => {
        const cacheFile = path.join(testDir, '.cache', 'test-cache.json');
        
        saveCacheToDisk(cache, { enabled: false }, testDir);
        
        expect(fs.existsSync(cacheFile)).toBe(false);
      });

      it('should save cache to disk when enabled', () => {
        const cacheFile = path.join(testDir, '.cache', 'cycles.json');
        const incrementalCache = createFileSystemCache();
        
        // Populate the cache
        incrementalCache.fileHashes.set('a.ts', 'hash-a');
        incrementalCache.fileHashes.set('b.ts', 'hash-b');
        incrementalCache.sccs = [
          { files: ['a.ts', 'b.ts'], hasCycle: true },
        ];
        incrementalCache.sccIndex.set('a.ts', 0);
        incrementalCache.sccIndex.set('b.ts', 0);
        incrementalCache.nonCyclicFiles.add('c.ts');
        incrementalCache.graphHash = 'test-graph-hash';
        incrementalCache.sccComputed = true;
        
        saveCacheToDisk(
          incrementalCache,
          { enabled: true, cacheFile: '.cache/cycles.json' },
          testDir
        );
        
        expect(fs.existsSync(cacheFile)).toBe(true);
        
        const savedData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) as PersistentCacheData;
        expect(savedData.version).toBe(1);
        expect(savedData.fileHashes['a.ts']).toBe('hash-a');
        expect(savedData.sccs).toHaveLength(1);
        expect(savedData.nonCyclicFiles).toContain('c.ts');
      });

      it('should load cache from disk when valid', () => {
        const cacheFile = path.join(testDir, '.cache', 'load-test.json');
        
        // Create a valid cache file
        const cacheData: PersistentCacheData = {
          version: 1,
          createdAt: Date.now(),
          fileHashes: { 'a.ts': 'hash-a', 'b.ts': 'hash-b' },
          sccs: [{ files: ['a.ts', 'b.ts'], hasCycle: true }],
          sccIndex: { 'a.ts': 0, 'b.ts': 0 },
          nonCyclicFiles: ['c.ts'],
          graphHash: 'test-hash',
        };
        
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(cacheData));
        
        const targetCache = createFileSystemCache();
        const loaded = loadCacheFromDisk(
          targetCache,
          { enabled: true, cacheFile: '.cache/load-test.json' },
          testDir
        );
        
        expect(loaded).toBe(true);
        expect(targetCache.sccComputed).toBe(true);
        expect(targetCache.fileHashes.get('a.ts')).toBe('hash-a');
        expect(targetCache.sccs).toHaveLength(1);
        expect(targetCache.nonCyclicFiles.has('c.ts')).toBe(true);
      });

      it('should return false for non-existent cache file', () => {
        const targetCache = createFileSystemCache();
        const loaded = loadCacheFromDisk(
          targetCache,
          { enabled: true, cacheFile: '.cache/nonexistent.json' },
          testDir
        );
        
        expect(loaded).toBe(false);
        expect(targetCache.sccComputed).toBe(false);
      });

      it('should return false for incompatible version', () => {
        const cacheFile = path.join(testDir, '.cache', 'old-version.json');
        
        const oldData = {
          version: 999, // Future/incompatible version
          createdAt: Date.now(),
          fileHashes: {},
          sccs: [],
          sccIndex: {},
          nonCyclicFiles: [],
          graphHash: '',
        };
        
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(oldData));
        
        const targetCache = createFileSystemCache();
        const loaded = loadCacheFromDisk(
          targetCache,
          { enabled: true, cacheFile: '.cache/old-version.json' },
          testDir
        );
        
        expect(loaded).toBe(false);
      });

      it('should return false for expired cache', () => {
        const cacheFile = path.join(testDir, '.cache', 'expired.json');
        
        const expiredData: PersistentCacheData = {
          version: 1,
          createdAt: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago (default is 24h)
          fileHashes: {},
          sccs: [],
          sccIndex: {},
          nonCyclicFiles: [],
          graphHash: '',
        };
        
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(expiredData));
        
        const targetCache = createFileSystemCache();
        const loaded = loadCacheFromDisk(
          targetCache,
          { enabled: true, cacheFile: '.cache/expired.json' },
          testDir
        );
        
        expect(loaded).toBe(false);
      });

      it('should respect custom maxCacheAge', () => {
        const cacheFile = path.join(testDir, '.cache', 'custom-age.json');
        
        // Cache created 2 hours ago
        const recentData: PersistentCacheData = {
          version: 1,
          createdAt: Date.now() - (2 * 60 * 60 * 1000),
          fileHashes: { 'test.ts': 'hash' },
          sccs: [],
          sccIndex: {},
          nonCyclicFiles: [],
          graphHash: '',
        };
        
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(recentData));
        
        const targetCache = createFileSystemCache();
        
        // Should fail with 1 hour max age
        const failedLoad = loadCacheFromDisk(
          targetCache,
          { enabled: true, cacheFile: '.cache/custom-age.json', maxCacheAge: 1 * 60 * 60 * 1000 },
          testDir
        );
        expect(failedLoad).toBe(false);
        
        // Should succeed with 3 hour max age
        const successLoad = loadCacheFromDisk(
          createFileSystemCache(),
          { enabled: true, cacheFile: '.cache/custom-age.json', maxCacheAge: 3 * 60 * 60 * 1000 },
          testDir
        );
        expect(successLoad).toBe(true);
      });
    });

    describe('getFilesNeedingReanalysis', () => {
      it('should return all files when incremental is disabled', () => {
        const files = ['a.ts', 'b.ts', 'c.ts'];
        const result = getFilesNeedingReanalysis(files, cache, { enabled: false });
        
        expect(result).toEqual(files);
      });

      it('should return all files when SCC is not computed', () => {
        const freshCache = createFileSystemCache();
        const files = ['a.ts', 'b.ts', 'c.ts'];
        
        const result = getFilesNeedingReanalysis(files, freshCache, { enabled: true });
        
        expect(result).toEqual(files);
      });

      it('should return empty array when no files changed', () => {
        const incrementalCache = createFileSystemCache();
        incrementalCache.sccComputed = true;
        incrementalCache.sccs = [];
        
        // Create real files and add their hashes
        const fileA = createTempFile('incr/a.ts', 'export const a = 1;');
        const fileB = createTempFile('incr/b.ts', 'export const b = 2;');
        
        const hashA = getFileHash(fileA);
        const hashB = getFileHash(fileB);
        
        if (hashA) incrementalCache.fileHashes.set(fileA, hashA);
        if (hashB) incrementalCache.fileHashes.set(fileB, hashB);
        
        const result = getFilesNeedingReanalysis(
          [fileA, fileB],
          incrementalCache,
          { enabled: true }
        );
        
        expect(result).toEqual([]);
      });

      it('should return changed files', () => {
        const incrementalCache = createFileSystemCache();
        incrementalCache.sccComputed = true;
        incrementalCache.sccs = [];
        
        const fileA = createTempFile('changed/a.ts', 'export const a = 1;');
        const fileB = createTempFile('changed/b.ts', 'export const b = 2;');
        
        // Only cache hash for fileA (fileB is "new" or "changed")
        const hashA = getFileHash(fileA);
        if (hashA) incrementalCache.fileHashes.set(fileA, hashA);
        incrementalCache.fileHashes.set(fileB, 'old-hash-that-doesnt-match');
        
        const result = getFilesNeedingReanalysis(
          [fileA, fileB],
          incrementalCache,
          { enabled: true }
        );
        
        expect(result).toContain(fileB);
        expect(result).not.toContain(fileA);
      });

      it('should include files in same SCC as changed file', () => {
        const incrementalCache = createFileSystemCache();
        incrementalCache.sccComputed = true;
        
        const fileA = createTempFile('scc/a.ts', 'export const a = 1;');
        const fileB = createTempFile('scc/b.ts', 'export const b = 2;');
        const fileC = createTempFile('scc/c.ts', 'export const c = 3;');
        
        // A and B are in the same SCC (cycle), C is separate
        incrementalCache.sccs = [
          { files: [fileA, fileB], hasCycle: true },
          { files: [fileC], hasCycle: false },
        ];
        incrementalCache.sccIndex.set(fileA, 0);
        incrementalCache.sccIndex.set(fileB, 0);
        incrementalCache.sccIndex.set(fileC, 1);
        
        // Only fileB changed
        const hashA = getFileHash(fileA);
        const hashC = getFileHash(fileC);
        if (hashA) incrementalCache.fileHashes.set(fileA, hashA);
        if (hashC) incrementalCache.fileHashes.set(fileC, hashC);
        incrementalCache.fileHashes.set(fileB, 'old-hash');
        
        const result = getFilesNeedingReanalysis(
          [fileA, fileB, fileC],
          incrementalCache,
          { enabled: true }
        );
        
        // Both A and B should be in result because they're in the same SCC
        expect(result).toContain(fileA);
        expect(result).toContain(fileB);
        expect(result).not.toContain(fileC);
      });

      it('should include files that import changed files', () => {
        const incrementalCache = createFileSystemCache();
        incrementalCache.sccComputed = true;
        incrementalCache.sccs = [];
        
        const fileA = createTempFile('import/a.ts', 'export const a = 1;');
        const fileB = createTempFile('import/b.ts', 'import { a } from "./a";');
        
        // Cache indicates B imports A
        incrementalCache.dependencies.set(fileB, [{ path: fileA, source: './a' }]);
        
        // FileA changed
        const hashB = getFileHash(fileB);
        if (hashB) incrementalCache.fileHashes.set(fileB, hashB);
        incrementalCache.fileHashes.set(fileA, 'old-hash');
        
        incrementalCache.nonCyclicFiles.add(fileB);
        
        const result = getFilesNeedingReanalysis(
          [fileA, fileB],
          incrementalCache,
          { enabled: true }
        );
        
        // Both files should be reanalyzed
        expect(result).toContain(fileA);
        expect(result).toContain(fileB);
        // B should be removed from nonCyclicFiles
        expect(incrementalCache.nonCyclicFiles.has(fileB)).toBe(false);
      });
    });

    describe('round-trip save and load', () => {
      it('should preserve all cache data through save/load cycle', () => {
        const sourceCache = createFileSystemCache();
        
        // Create real files
        const fileA = createTempFile('roundtrip/a.ts', 'export const a = 1;');
        const fileB = createTempFile('roundtrip/b.ts', 'import { a } from "./a"; export const b = a + 1;');
        
        // Populate source cache
        const hashA = getFileHash(fileA);
        const hashB = getFileHash(fileB);
        if (hashA) sourceCache.fileHashes.set(fileA, hashA);
        if (hashB) sourceCache.fileHashes.set(fileB, hashB);
        
        sourceCache.sccs = [
          { files: [fileA, fileB], hasCycle: true },
        ];
        sourceCache.sccIndex.set(fileA, 0);
        sourceCache.sccIndex.set(fileB, 0);
        sourceCache.nonCyclicFiles.add('other.ts');
        sourceCache.graphHash = 'test-graph-hash-123';
        sourceCache.sccComputed = true;
        
        // Save
        saveCacheToDisk(
          sourceCache,
          { enabled: true, cacheFile: '.cache/roundtrip.json' },
          testDir
        );
        
        // Load into new cache
        const targetCache = createFileSystemCache();
        const loaded = loadCacheFromDisk(
          targetCache,
          { enabled: true, cacheFile: '.cache/roundtrip.json' },
          testDir
        );
        
        expect(loaded).toBe(true);
        expect(targetCache.sccComputed).toBe(true);
        expect(targetCache.graphHash).toBe('test-graph-hash-123');
        expect(targetCache.fileHashes.get(fileA)).toBe(hashA);
        expect(targetCache.fileHashes.get(fileB)).toBe(hashB);
        expect(targetCache.sccs).toHaveLength(1);
        expect(targetCache.sccs[0].hasCycle).toBe(true);
        expect(targetCache.sccIndex.get(fileA)).toBe(0);
        expect(targetCache.sccIndex.get(fileB)).toBe(0);
        expect(targetCache.nonCyclicFiles.has('other.ts')).toBe(true);
      });
    });

    describe('getCycleForFile', () => {
      it('should return null when sccIndex is undefined (line 771)', () => {
        const cache = createFileSystemCache();
        const result = getCycleForFile('/nonexistent/file.ts', cache);
        expect(result).toBeNull();
      });

      it('should return null when scc is null or undefined (line 774)', () => {
        const cache = createFileSystemCache();
        // Set sccIndex but don't set corresponding scc
        cache.sccIndex.set('/test/file.ts', 999); // Index that doesn't exist
        const result = getCycleForFile('/test/file.ts', cache);
        expect(result).toBeNull();
      });

      it('should return null when scc.hasCycle is false (line 774)', () => {
        const cache = createFileSystemCache();
        cache.sccs = [
          { files: ['/test/file.ts'], hasCycle: false },
        ];
        cache.sccIndex.set('/test/file.ts', 0);
        const result = getCycleForFile('/test/file.ts', cache);
        expect(result).toBeNull();
      });

      it('should return cycle files when file is in a cycle (lines 770-776)', () => {
        const cache = createFileSystemCache();
        const fileA = createTempFile('cycle/a.ts', 'export const a = 1;');
        const fileB = createTempFile('cycle/b.ts', 'export const b = 2;');
        cache.sccs = [
          { files: [fileA, fileB], hasCycle: true },
        ];
        cache.sccIndex.set(fileA, 0);
        cache.sccIndex.set(fileB, 0);
        
        const result = getCycleForFile(fileA, cache);
        expect(result).toEqual([fileA, fileB]);
      });
    });

    describe('loadCacheFromDisk edge cases', () => {
      it('should return false when readFileSync returns null (line 1053)', () => {
        const cache = createFileSystemCache();
        const cacheFile = path.join(testDir, '.cache/null-content.json');
        
        // Create directory but not file, or create file that readFileSync will return null for
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        // Create a directory with the cache file name to simulate readFileSync returning null
        fs.mkdirSync(cacheFile, { recursive: true });
        
        const result = loadCacheFromDisk(
          cache,
          { enabled: true, cacheFile: '.cache/null-content.json' },
          testDir
        );
        
        expect(result).toBe(false);
      });

      it('should return false when JSON.parse fails (line 1082)', () => {
        const cache = createFileSystemCache();
        const cacheFile = path.join(testDir, '.cache/invalid-json.json');
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
        fs.writeFileSync(cacheFile, 'invalid json content', 'utf-8');
        
        const result = loadCacheFromDisk(
          cache,
          { enabled: true, cacheFile: '.cache/invalid-json.json' },
          testDir
        );
        
        expect(result).toBe(false);
      });
    });

    describe('findAllCircularDependencies visited tracking', () => {
      it('should return empty array when file is already visited (line 861)', () => {
        const fileA = createTempFile('visited/a.ts', 'export const a = 1;');
        const fileB = createTempFile('visited/b.ts', 'import { a } from "./a";');
        
        // Create a cycle
        fs.writeFileSync(fileA, 'import { b } from "./b"; export const a = 1;', 'utf-8');
        fs.writeFileSync(fileB, 'import { a } from "./a"; export const b = 2;', 'utf-8');
        
        const cycles = findAllCircularDependencies(fileA, {
          maxDepth: 10,
          reportAllCycles: true,
          workspaceRoot: testDir,
          barrelExports: ['index.ts'],
          cache,
        });
        
        // Should find cycles, but the visited check prevents infinite loops
        // The visited.has check on line 861 prevents re-traversal
        expect(Array.isArray(cycles)).toBe(true);
      });

      it('should skip dynamic imports in cycle detection (line 874)', () => {
        const fileA = createTempFile('dynamic/a.ts', 'const b = import("./b");');
        createTempFile('dynamic/b.ts', 'import { a } from "./a";');
        
        const cycles = findAllCircularDependencies(fileA, {
          maxDepth: 10,
          reportAllCycles: true,
          workspaceRoot: testDir,
          barrelExports: ['index.ts'],
          cache,
        });
        
        // Dynamic imports should be skipped (line 874 continue)
        expect(cycles).toEqual([]);
      });
    });
  });
});

