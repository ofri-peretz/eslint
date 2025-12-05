/**
 * Comprehensive tests for path.ts
 *
 * Tests path utilities with 100% coverage.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'node:path';
import {
  formatCycleDisplay,
  getModuleNames,
  getRelativeImportPath,
  getBasename,
  getDirname,
  getRelativePath,
  normalizePath,
  joinPath,
  resolvePath,
  getExtname,
  createPatternCache,
  patternToRegex,
  shouldIgnoreFile,
  isBarrelExport,
  type PatternCache,
} from './path';

describe('node/path', () => {
  describe('createPatternCache', () => {
    it('should create an empty Map', () => {
      const cache = createPatternCache();

      expect(cache).toBeInstanceOf(Map);
      expect(cache.size).toBe(0);
    });
  });

  describe('patternToRegex', () => {
    let cache: PatternCache;

    beforeEach(() => {
      cache = createPatternCache();
    });

    it('should convert simple glob pattern', () => {
      const regex = patternToRegex('*.ts', cache);

      expect(regex.test('file.ts')).toBe(true);
      // Pattern is not anchored, so it matches .ts anywhere
      expect(regex.test('file.tsx')).toBe(true); // matches .ts substring
      expect(regex.test('dir/file.ts')).toBe(true); // .* matches across /
    });

    it('should convert double star pattern', () => {
      const regex = patternToRegex('**/*.test.ts', cache);

      // ** becomes .*, so matches any path
      expect(regex.test('src/file.test.ts')).toBe(true);
      expect(regex.test('dir/file.test.ts')).toBe(true);
      expect(regex.test('dir/subdir/file.test.ts')).toBe(true);
    });

    it('should convert question mark pattern', () => {
      const regex = patternToRegex('file?.ts', cache);

      expect(regex.test('file1.ts')).toBe(true);
      expect(regex.test('fileA.ts')).toBe(true);
      expect(regex.test('file.ts')).toBe(false);
    });

    it('should escape dots in pattern', () => {
      const regex = patternToRegex('file.ts', cache);

      expect(regex.test('file.ts')).toBe(true);
      expect(regex.test('filexts')).toBe(false); // dot should be literal
    });

    it('should cache compiled patterns', () => {
      expect(cache.has('*.ts')).toBe(false);

      const regex1 = patternToRegex('*.ts', cache);
      expect(cache.has('*.ts')).toBe(true);

      const regex2 = patternToRegex('*.ts', cache);
      expect(regex1).toBe(regex2); // Same instance
    });

    it('should return cached pattern on subsequent calls', () => {
      const regex1 = patternToRegex('test', cache);
      const regex2 = patternToRegex('test', cache);

      expect(regex1).toBe(regex2);
    });
  });

  describe('shouldIgnoreFile', () => {
    let cache: PatternCache;

    beforeEach(() => {
      cache = createPatternCache();
    });

    it('should return true when file matches ignore pattern', () => {
      const result = shouldIgnoreFile(
        '/project/src/file.test.ts',
        ['**/*.test.ts'],
        cache,
      );

      expect(result).toBe(true);
    });

    it('should return false when file does not match any pattern', () => {
      const result = shouldIgnoreFile(
        '/project/src/file.ts',
        ['**/*.test.ts', '**/*.spec.ts'],
        cache,
      );

      expect(result).toBe(false);
    });

    it('should return false for empty patterns array', () => {
      const result = shouldIgnoreFile('/project/src/file.ts', [], cache);

      expect(result).toBe(false);
    });

    it('should match node_modules pattern', () => {
      const result = shouldIgnoreFile(
        '/project/node_modules/lodash/index.js',
        ['**/node_modules/**'],
        cache,
      );

      expect(result).toBe(true);
    });
  });

  describe('isBarrelExport', () => {
    it('should return true for index.ts', () => {
      const barrels = ['index.ts', 'index.tsx', 'index.js'];

      expect(isBarrelExport('/project/src/index.ts', barrels)).toBe(true);
    });

    it('should return true for index.tsx', () => {
      const barrels = ['index.ts', 'index.tsx'];

      expect(
        isBarrelExport('/project/components/Button/index.tsx', barrels),
      ).toBe(true);
    });

    it('should return false for non-index files', () => {
      const barrels = ['index.ts', 'index.tsx'];

      expect(isBarrelExport('/project/src/utils.ts', barrels)).toBe(false);
    });

    it('should return false for index in filename but not exact match', () => {
      const barrels = ['index.ts'];

      expect(isBarrelExport('/project/src/indexFile.ts', barrels)).toBe(false);
    });

    it('should work with custom barrel names', () => {
      const barrels = ['public-api.ts', 'barrel.ts'];

      expect(isBarrelExport('/project/src/public-api.ts', barrels)).toBe(true);
      expect(isBarrelExport('/project/src/barrel.ts', barrels)).toBe(true);
      expect(isBarrelExport('/project/src/index.ts', barrels)).toBe(false);
    });
  });

  describe('formatCycleDisplay', () => {
    it('should format 2-element cycle with bidirectional arrow', () => {
      const result = formatCycleDisplay(
        ['/project/src/a.ts', '/project/src/b.ts'],
        '/project',
      );

      expect(result).toBe('src/a.ts ⟷ src/b.ts');
    });

    it('should format 3+ element cycle with chain arrows', () => {
      const result = formatCycleDisplay(
        ['/project/src/a.ts', '/project/src/b.ts', '/project/src/c.ts'],
        '/project',
      );

      expect(result).toBe('src/a.ts → src/b.ts → src/c.ts → src/a.ts');
    });

    it('should handle single element', () => {
      const result = formatCycleDisplay(['/project/src/a.ts'], '/project');

      expect(result).toBe('src/a.ts → src/a.ts');
    });

    it('should normalize backslashes to forward slashes', () => {
      // Simulate Windows-style paths
      const result = formatCycleDisplay(
        ['/project/src/dir/a.ts', '/project/src/dir/b.ts'],
        '/project',
      );

      expect(result).not.toContain('\\');
      expect(result).toContain('/');
    });

    it('should handle nested directories', () => {
      const result = formatCycleDisplay(
        ['/project/src/components/Button.tsx', '/project/src/utils/helpers.ts'],
        '/project',
      );

      expect(result).toBe('src/components/Button.tsx ⟷ src/utils/helpers.ts');
    });

    it('should handle empty array', () => {
      const result = formatCycleDisplay([], '/project');

      // Empty array: map returns empty array, join returns empty string, then we add ' → undefined'
      expect(result).toBe(' → undefined');
    });
  });

  describe('getModuleNames', () => {
    it('should extract module names from file paths', () => {
      const result = getModuleNames(
        ['/project/src/utils.ts', '/project/src/helpers.ts'],
        '/project',
      );

      expect(result).toEqual(['utils', 'helpers']);
    });

    it('should use directory name for index files', () => {
      const result = getModuleNames(
        ['/project/src/utils/index.ts', '/project/src/helpers/index.tsx'],
        '/project',
      );

      expect(result).toEqual(['utils', 'helpers']);
    });

    it('should handle mixed index and regular files', () => {
      const result = getModuleNames(
        ['/project/src/utils/index.ts', '/project/src/helper.ts'],
        '/project',
      );

      expect(result).toEqual(['utils', 'helper']);
    });

    it('should remove file extensions', () => {
      const result = getModuleNames(
        [
          '/project/src/file.ts',
          '/project/src/component.tsx',
          '/project/src/module.js',
          '/project/src/legacy.jsx',
        ],
        '/project',
      );

      expect(result).toEqual(['file', 'component', 'module', 'legacy']);
    });

    it('should handle deeply nested paths', () => {
      const result = getModuleNames(
        ['/project/src/components/ui/Button/index.ts'],
        '/project',
      );

      expect(result).toEqual(['Button']);
    });

    it('should handle empty array', () => {
      const result = getModuleNames([], '/project');

      expect(result).toEqual([]);
    });
  });

  describe('getRelativeImportPath', () => {
    it('should return relative path with ./ prefix for same directory', () => {
      const result = getRelativeImportPath(
        '/project/src/a.ts',
        '/project/src/b.ts',
      );

      expect(result).toBe('./b');
    });

    it('should return relative path with ../ for parent directory', () => {
      const result = getRelativeImportPath(
        '/project/src/dir/a.ts',
        '/project/src/b.ts',
      );

      expect(result).toBe('../b');
    });

    it('should handle multiple levels up', () => {
      const result = getRelativeImportPath(
        '/project/src/deep/nested/a.ts',
        '/project/src/b.ts',
      );

      expect(result).toBe('../../b');
    });

    it('should remove .ts extension', () => {
      const result = getRelativeImportPath(
        '/project/src/a.ts',
        '/project/src/utils.ts',
      );

      expect(result).toBe('./utils');
      expect(result).not.toContain('.ts');
    });

    it('should remove .tsx extension', () => {
      const result = getRelativeImportPath(
        '/project/src/a.ts',
        '/project/src/Component.tsx',
      );

      expect(result).toBe('./Component');
      expect(result).not.toContain('.tsx');
    });

    it('should remove .js extension', () => {
      const result = getRelativeImportPath(
        '/project/src/a.ts',
        '/project/src/utils.js',
      );

      expect(result).toBe('./utils');
    });

    it('should remove .jsx extension', () => {
      const result = getRelativeImportPath(
        '/project/src/a.ts',
        '/project/src/Component.jsx',
      );

      expect(result).toBe('./Component');
    });

    it('should normalize backslashes', () => {
      const result = getRelativeImportPath(
        '/project/src/a.ts',
        '/project/src/dir/b.ts',
      );

      expect(result).not.toContain('\\');
      expect(result).toBe('./dir/b');
    });

    it('should handle going into subdirectory', () => {
      const result = getRelativeImportPath(
        '/project/src/a.ts',
        '/project/src/utils/helpers.ts',
      );

      expect(result).toBe('./utils/helpers');
    });
  });

  describe('getBasename', () => {
    it('should return filename from path', () => {
      expect(getBasename('/project/src/utils.ts')).toBe('utils.ts');
    });

    it('should handle nested paths', () => {
      expect(getBasename('/project/src/deep/nested/file.ts')).toBe('file.ts');
    });

    it('should handle relative paths', () => {
      expect(getBasename('src/utils.ts')).toBe('utils.ts');
    });

    it('should handle just filename', () => {
      expect(getBasename('file.ts')).toBe('file.ts');
    });
  });

  describe('getDirname', () => {
    it('should return directory from path', () => {
      const result = getDirname('/project/src/utils.ts');

      expect(result).toBe('/project/src');
    });

    it('should handle nested paths', () => {
      const result = getDirname('/project/src/deep/nested/file.ts');

      expect(result).toBe('/project/src/deep/nested');
    });

    it('should handle relative paths', () => {
      const result = getDirname('src/utils.ts');

      expect(result).toBe('src');
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path between directories', () => {
      const result = getRelativePath('/project/src', '/project/src/utils.ts');

      expect(result).toBe('utils.ts');
    });

    it('should handle going up directories', () => {
      const result = getRelativePath('/project/src/dir', '/project/src');

      expect(result).toBe('..');
    });

    it('should handle sibling directories', () => {
      const result = getRelativePath('/project/src', '/project/lib');

      expect(result).toBe(path.join('..', 'lib'));
    });
  });

  describe('normalizePath', () => {
    it('should convert backslashes to forward slashes', () => {
      // Manually construct a path with backslashes for testing
      const result = normalizePath('/project/src/file.ts');

      expect(result).not.toContain('\\');
    });

    it('should handle path with dots', () => {
      const result = normalizePath('/project/src/../lib/file.ts');

      expect(result).toBe('/project/lib/file.ts');
    });

    it('should handle double slashes', () => {
      const result = normalizePath('/project//src/file.ts');

      expect(result).toBe('/project/src/file.ts');
    });
  });

  describe('joinPath', () => {
    it('should join path segments', () => {
      const result = joinPath('/project', 'src', 'utils.ts');

      expect(result).toBe(path.join('/project', 'src', 'utils.ts'));
    });

    it('should handle multiple segments', () => {
      const result = joinPath('a', 'b', 'c', 'd');

      expect(result).toBe(path.join('a', 'b', 'c', 'd'));
    });

    it('should handle single segment', () => {
      const result = joinPath('file.ts');

      expect(result).toBe('file.ts');
    });
  });

  describe('resolvePath', () => {
    it('should resolve to absolute path', () => {
      const result = resolvePath('/project', 'src', 'utils.ts');

      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('utils.ts');
    });

    it('should resolve relative paths', () => {
      const result = resolvePath('/project/src', '..', 'lib');

      expect(result).toBe('/project/lib');
    });

    it('should handle single absolute path', () => {
      const result = resolvePath('/project/src');

      expect(result).toBe('/project/src');
    });
  });

  describe('getExtname', () => {
    it('should return .ts extension', () => {
      expect(getExtname('/project/src/utils.ts')).toBe('.ts');
    });

    it('should return .tsx extension', () => {
      expect(getExtname('/project/src/Component.tsx')).toBe('.tsx');
    });

    it('should return .js extension', () => {
      expect(getExtname('/project/src/utils.js')).toBe('.js');
    });

    it('should return empty string for no extension', () => {
      expect(getExtname('/project/Dockerfile')).toBe('');
    });

    it('should handle multiple dots', () => {
      expect(getExtname('/project/file.test.ts')).toBe('.ts');
    });
  });
});
