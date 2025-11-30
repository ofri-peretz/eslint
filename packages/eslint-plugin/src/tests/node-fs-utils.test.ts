/**
 * Comprehensive tests for fs-utils.ts
 *
 * These tests use real temporary files to achieve 100% coverage
 * of file system operations that cannot be tested via RuleTester.
 */
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  type FileSystemCache,
  type ImportInfo,
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
  fileExistsSync,
  readFileSync,
  readJsonFileSync,
  findFileUpward,
} from '../utils/node-fs-utils';
import {
  patternToRegex,
  shouldIgnoreFile,
  isBarrelExport,
  createPatternCache,
  type PatternCache,
} from '../utils/node-path-utils';

// Test directory for temporary files
let testDir: string;
let cache: FileSystemCache;
let patternCache: PatternCache;

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

describe('fs-utils', () => {
  beforeEach(() => {
    // Create a unique test directory for each test
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-utils-test-'));
    cache = createFileSystemCache();
    patternCache = createPatternCache();
  });

  afterEach(() => {
    cleanupTestDir();
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
      cache.fileHashes.set(filePath, hash!);

      const valid = isCacheValid(filePath, cache);

      expect(valid).toBe(true);
    });

    it('should return false when file has been modified', () => {
      const filePath = createTempFile('test.ts', 'original content');
      const originalHash = getFileHash(filePath);
      cache.fileHashes.set(filePath, originalHash!);

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

  describe('patternToRegex', () => {
    it('should convert simple glob pattern', () => {
      const regex = patternToRegex('*.ts', patternCache);

      expect(regex.test('file.ts')).toBe(true);
      // Note: regex is not anchored, so .ts matches anywhere in string
      expect(regex.test('file.tsx')).toBe(true); // contains .ts as substring
    });

    it('should convert double star pattern', () => {
      const regex = patternToRegex('**/*.test.ts', patternCache);

      // ** becomes .*, so the pattern matches paths with /
      expect(regex.test('dir/file.test.ts')).toBe(true);
      expect(regex.test('dir/subdir/file.test.ts')).toBe(true);
    });

    it('should convert question mark pattern', () => {
      const regex = patternToRegex('file?.ts', patternCache);

      expect(regex.test('file1.ts')).toBe(true);
      expect(regex.test('fileA.ts')).toBe(true);
      // ? matches exactly one character, not two
      expect(regex.test('file12.ts')).toBe(false); // 12 is two chars, not one
    });

    it('should escape dots in pattern', () => {
      const regex = patternToRegex('file.ts', patternCache);

      expect(regex.test('file.ts')).toBe(true);
      expect(regex.test('filexts')).toBe(false); // dot should be literal
    });

    it('should cache compiled patterns', () => {
      expect(patternCache.has('*.ts')).toBe(false);

      const regex1 = patternToRegex('*.ts', patternCache);
      expect(patternCache.has('*.ts')).toBe(true);

      const regex2 = patternToRegex('*.ts', patternCache);
      expect(regex1).toBe(regex2); // Same instance
    });
  });

  describe('patternToRegexWithCache', () => {
    it('should work with FileSystemCache', () => {
      const regex = patternToRegexWithCache('*.ts', cache);

      expect(regex.test('file.ts')).toBe(true);
      expect(cache.compiledPatterns.has('*.ts')).toBe(true);
    });
  });

  describe('shouldIgnoreFile', () => {
    it('should return true when file matches ignore pattern', () => {
      const result = shouldIgnoreFile(
        '/project/src/file.test.ts',
        ['**/*.test.ts'],
        patternCache
      );

      expect(result).toBe(true);
    });

    it('should return false when file does not match any pattern', () => {
      const result = shouldIgnoreFile(
        '/project/src/file.ts',
        ['**/*.test.ts', '**/*.spec.ts'],
        patternCache
      );

      expect(result).toBe(false);
    });

    it('should check all patterns', () => {
      expect(
        shouldIgnoreFile('/project/file.test.ts', ['**/*.test.ts'], patternCache)
      ).toBe(true);
      expect(
        shouldIgnoreFile('/project/file.spec.ts', ['**/*.spec.ts'], patternCache)
      ).toBe(true);
      expect(
        shouldIgnoreFile(
          '/project/__tests__/file.ts',
          ['**/__tests__/**'],
          patternCache
        )
      ).toBe(true);
    });

    it('should normalize file path', () => {
      // path.normalize converts backslashes to forward slashes on POSIX
      // but on Windows it would keep them
      // The pattern **/*.test.ts becomes .*\/[^/]*\.test\.ts
      const result = shouldIgnoreFile(
        '/project/src/file.test.ts',
        ['**/*.test.ts'],
        patternCache
      );

      expect(result).toBe(true);
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

  describe('isBarrelExport', () => {
    it('should return true for index files', () => {
      const barrels = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];

      expect(isBarrelExport('/project/src/index.ts', barrels)).toBe(true);
      expect(isBarrelExport('/project/src/utils/index.tsx', barrels)).toBe(
        true
      );
    });

    it('should return false for non-index files', () => {
      const barrels = ['index.ts', 'index.tsx'];

      expect(isBarrelExport('/project/src/file.ts', barrels)).toBe(false);
      expect(isBarrelExport('/project/src/indexFile.ts', barrels)).toBe(false);
    });

    it('should work with custom barrel names', () => {
      const barrels = ['barrel.ts', 'public-api.ts'];

      expect(isBarrelExport('/project/src/barrel.ts', barrels)).toBe(true);
      expect(isBarrelExport('/project/src/public-api.ts', barrels)).toBe(true);
      expect(isBarrelExport('/project/src/index.ts', barrels)).toBe(false);
    });
  });

  describe('resolveImportPath', () => {
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

      // Note: fileExists returns true for directories, so when the directory exists,
      // the function returns early without trying index files
      expect(resolved).toBe(helpersDir);
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
      const fileB = createTempFile(
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
      const fileB = createTempFile('src/b.ts', `import { a } from './a';`);
      const fileC = createTempFile('src/c.ts', `import { a } from './a';`);

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
      const parentPkg = createTempFile(
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
});

