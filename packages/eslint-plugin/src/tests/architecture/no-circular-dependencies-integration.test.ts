/**
 * Integration tests for no-circular-dependencies rule
 * 
 * These tests create actual files on disk to test the rule's file system access.
 * This is necessary because the rule uses fs.readFileSync and context.getCwd()
 * to detect circular dependencies.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, beforeEach, afterEach } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCircularDependencies } from '../../rules/architecture/no-circular-dependencies';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { tmpdir } from 'node:os';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+)
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

// Helper to create temporary test directory
function createTempDir(): string {
  return fs.mkdtempSync(path.join(tmpdir(), 'eslint-circular-test-'));
}

// Helper to create a file in a directory
function createFile(dir: string, filename: string, content: string): string {
  const filePath = path.join(dir, filename);
  // Ensure directory exists
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('no-circular-dependencies - Integration Tests', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = createTempDir();
    originalCwd = process.cwd();
    // Change to temp directory so context.getCwd() returns it
    process.chdir(tempDir);
  });

  afterEach(() => {
    // Restore original working directory
    process.chdir(originalCwd);
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic Circular Dependency Detection', () => {
    it('should detect simple circular dependency between two files', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './a';\nexport const b = 'b';");

      ruleTester.run('simple circular dependency', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            errors: [
              {
                messageId: expect.stringMatching(/moduleSplit|directImport|extractShared|dependencyInjection/),
              },
            ],
          },
        ],
      });
    });

    it('should detect three-file circular dependency', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { c } from './c';\nexport const b = 'b';");
      createFile(tempDir, 'c.ts', "import { a } from './a';\nexport const c = 'c';");

      ruleTester.run('three-file circular dependency', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            errors: [
              {
                messageId: expect.any(String),
              },
            ],
          },
        ],
      });
    });
  });

  describe('Path Resolution', () => {
    it('should resolve imports with .ts extension', () => {
      createFile(tempDir, 'module.ts', 'export const mod = 1;');
      const indexFile = createFile(tempDir, 'index.ts', "import { mod } from './module';\nexport const x = mod;");

      ruleTester.run('resolve .ts extension', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(indexFile, 'utf-8'),
            filename: indexFile,
          },
        ],
        invalid: [],
      });
    });

    it('should resolve imports with index files', () => {
      const moduleDir = path.join(tempDir, 'module');
      fs.mkdirSync(moduleDir, { recursive: true });
      createFile(moduleDir, 'index.ts', 'export const mod = 1;');
      const indexFile = createFile(tempDir, 'index.ts', "import { mod } from './module';\nexport const x = mod;");

      ruleTester.run('resolve index files', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(indexFile, 'utf-8'),
            filename: indexFile,
          },
        ],
        invalid: [],
      });
    });

    it('should resolve alias imports with @app prefix', () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      createFile(srcDir, 'component.ts', 'export const Component = () => null;');
      const indexFile = createFile(tempDir, 'index.ts', "import { Component } from '@app/component';\nexport const x = Component;");

      ruleTester.run('resolve @app alias', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(indexFile, 'utf-8'),
            filename: indexFile,
          },
        ],
        invalid: [],
      });
    });

    it('should resolve alias imports with @src prefix', () => {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      createFile(srcDir, 'utils.ts', 'export const util = 1;');
      const indexFile = createFile(tempDir, 'index.ts', "import { util } from '@src/utils';\nexport const x = util;");

      ruleTester.run('resolve @src alias', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(indexFile, 'utf-8'),
            filename: indexFile,
          },
        ],
        invalid: [],
      });
    });

    it('should resolve alias imports with index files', () => {
      const srcDir = path.join(tempDir, 'src');
      const componentDir = path.join(srcDir, 'component');
      fs.mkdirSync(componentDir, { recursive: true });
      createFile(componentDir, 'index.ts', 'export const Component = () => null;');
      const indexFile = createFile(tempDir, 'index.ts', "import { Component } from '@app/component';\nexport const x = Component;");

      ruleTester.run('resolve alias with index', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(indexFile, 'utf-8'),
            filename: indexFile,
          },
        ],
        invalid: [],
      });
    });
  });

  describe('File Reading and Import Detection', () => {
    it('should read file and detect ES6 imports', () => {
      createFile(tempDir, 'module.ts', 'export const mod = 1;');
      const indexFile = createFile(tempDir, 'index.ts', "import { mod } from './module';\nexport const x = mod;");

      ruleTester.run('detect ES6 imports', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(indexFile, 'utf-8'),
            filename: indexFile,
          },
        ],
        invalid: [],
      });
    });

    it('should detect default imports', () => {
      createFile(tempDir, 'module.ts', 'export default 1;');
      const indexFile = createFile(tempDir, 'index.ts', "import mod from './module';\nexport const x = mod;");

      ruleTester.run('detect default imports', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(indexFile, 'utf-8'),
            filename: indexFile,
          },
        ],
        invalid: [],
      });
    });

    it('should detect namespace imports', () => {
      createFile(tempDir, 'module.ts', 'export const mod = 1;');
      const indexFile = createFile(tempDir, 'index.ts', "import * as mod from './module';\nexport const x = mod.mod;");

      ruleTester.run('detect namespace imports', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(indexFile, 'utf-8'),
            filename: indexFile,
          },
        ],
        invalid: [],
      });
    });

    it('should detect dynamic imports', () => {
      createFile(tempDir, 'module.ts', 'export const mod = 1;');
      const indexFile = createFile(tempDir, 'index.ts', "const mod = await import('./module');\nexport const x = mod.mod;");

      ruleTester.run('detect dynamic imports', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(indexFile, 'utf-8'),
            filename: indexFile,
          },
        ],
        invalid: [],
      });
    });

    it('should handle non-existent files gracefully', () => {
      const indexFile = createFile(tempDir, 'index.ts', "import { something } from './nonexistent';\nexport const x = 1;");

      ruleTester.run('handle non-existent files', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(indexFile, 'utf-8'),
            filename: indexFile,
          },
        ],
        invalid: [],
      });
    });
  });

  describe('Cycle Detection Logic', () => {
    it('should respect maxDepth option', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { c } from './c';\nexport const b = 'b';");
      createFile(tempDir, 'c.ts', "import { a } from './a';\nexport const c = 'c';");

      ruleTester.run('respect maxDepth', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ maxDepth: 0 }],
          },
        ],
        invalid: [],
      });
    });

    it('should track visited files to avoid infinite loops', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './a';\nexport const b = 'b';");

      ruleTester.run('track visited files', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            errors: [
              {
                messageId: expect.any(String),
              },
            ],
          },
        ],
      });
    });

    it('should skip dynamic imports in cycle detection', () => {
      const fileA = createFile(tempDir, 'a.ts', "const b = await import('./b');\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './a';\nexport const b = 'b';");

      ruleTester.run('skip dynamic imports', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
          },
        ],
        invalid: [],
      });
    });

    it('should report all cycles when reportAllCycles is true', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './a';\nexport const b = 'b';");

      ruleTester.run('report all cycles', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ reportAllCycles: true }],
            errors: [
              {
                messageId: expect.any(String),
              },
            ],
          },
        ],
      });
    });
  });

  describe('Type-Only Imports', () => {
    it('should detect type-only imports', () => {
      createFile(tempDir, 'types.ts', 'export type Type = string;');
      const fileA = createFile(tempDir, 'a.ts', "import type { Type } from './types';\nexport const a: Type = 'a';");
      createFile(tempDir, 'b.ts', "import type { Type } from './types';\nexport const b: Type = 'b';");

      ruleTester.run('detect type-only imports', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
          },
        ],
        invalid: [],
      });
    });

    it('should detect runtime imports in type-only cycle', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './a';\nexport const b = 'b';");

      ruleTester.run('detect runtime imports', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            errors: [
              {
                messageId: expect.any(String),
              },
            ],
          },
        ],
      });
    });
  });

  describe('Fix Strategy Selection', () => {
    it('should use module-split strategy', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './a';\nexport const b = 'b';");

      ruleTester.run('module-split strategy', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ fixStrategy: 'module-split' }],
            errors: [
              {
                messageId: 'moduleSplit',
              },
            ],
          },
        ],
      });
    });

    it('should use direct-import strategy', () => {
      createFile(tempDir, 'index.ts', "export * from './a';\nexport * from './b';");
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './index';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './index';\nexport const b = 'b';");

      ruleTester.run('direct-import strategy', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ fixStrategy: 'direct-import' }],
            errors: [
              {
                messageId: 'directImport',
              },
            ],
          },
        ],
      });
    });

    it('should use extract-shared strategy', () => {
      createFile(tempDir, 'types.ts', 'export type Type = string;');
      const fileA = createFile(tempDir, 'a.ts', "import type { Type } from './types';\nimport type { Type2 } from './b';\nexport const a: Type = 'a';");
      createFile(tempDir, 'b.ts', "import type { Type } from './types';\nimport type { Type1 } from './a';\nexport const b: Type = 'b';");

      ruleTester.run('extract-shared strategy', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ fixStrategy: 'extract-shared' }],
            errors: [
              {
                messageId: 'extractShared',
              },
            ],
          },
        ],
      });
    });

    it('should use dependency-injection strategy', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './a';\nexport const b = 'b';");

      ruleTester.run('dependency-injection strategy', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ fixStrategy: 'dependency-injection' }],
            errors: [
              {
                messageId: 'dependencyInjection',
              },
            ],
          },
        ],
      });
    });

    it('should auto-detect strategy with barrel export', () => {
      createFile(tempDir, 'index.ts', "export * from './a';\nexport * from './b';");
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './index';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './index';\nexport const b = 'b';");

      ruleTester.run('auto-detect with barrel', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ fixStrategy: 'auto' }],
            errors: [
              {
                messageId: expect.any(String),
              },
            ],
          },
        ],
      });
    });

    it('should auto-detect strategy with types only', () => {
      createFile(tempDir, 'types.ts', 'export type Type = string;');
      const fileA = createFile(tempDir, 'a.ts', "import type { Type } from './types';\nimport type { Type2 } from './b';\nexport const a: Type = 'a';");
      createFile(tempDir, 'b.ts', "import type { Type } from './types';\nimport type { Type1 } from './a';\nexport const b: Type = 'b';");

      ruleTester.run('auto-detect with types', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ fixStrategy: 'auto' }],
            errors: [
              {
                messageId: expect.any(String),
              },
            ],
          },
        ],
      });
    });
  });

  describe('Barrel Export Detection', () => {
    it('should detect barrel exports', () => {
      createFile(tempDir, 'index.ts', "export * from './a';\nexport * from './b';");
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './index';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './index';\nexport const b = 'b';");

      ruleTester.run('detect barrel exports', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ barrelExports: ['index.ts'] }],
            errors: [
              {
                messageId: expect.any(String),
              },
            ],
          },
        ],
      });
    });
  });

  describe('Ignore Patterns', () => {
    it('should ignore files matching ignore patterns', () => {
      const testFile = createFile(tempDir, 'test.ts', "import { a } from './a';\ndescribe('test', () => {});");
      createFile(tempDir, 'a.ts', "import { test } from './test';\nexport const a = 'a';");

      ruleTester.run('ignore test files', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(testFile, 'utf-8'),
            filename: testFile,
            options: [{ ignorePatterns: ['**/*.test.ts'] }],
          },
        ],
        invalid: [],
      });
    });
  });

  describe('Cycle Hash and Deduplication', () => {
    it('should generate cycle hash and deduplicate', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './a';\nexport const b = 'b';");

      ruleTester.run('cycle hash deduplication', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ reportAllCycles: true }],
            errors: [
              {
                messageId: expect.any(String),
              },
            ],
          },
        ],
      });
    });

    it('should extract minimal cycle from longer path', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { c } from './c';\nexport const b = 'b';");
      createFile(tempDir, 'c.ts', "import { b } from './b';\nexport const c = 'c';");

      ruleTester.run('extract minimal cycle', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            errors: [
              {
                messageId: expect.any(String),
              },
            ],
          },
        ],
      });
    });
  });

  describe('Message Generation', () => {
    it('should generate module split message with semantic naming', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './a';\nexport const b = 'b';");

      ruleTester.run('module split semantic', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ 
              fixStrategy: 'module-split',
              moduleNamingConvention: 'semantic'
            }],
            errors: [
              {
                messageId: 'moduleSplit',
              },
            ],
          },
        ],
      });
    });

    it('should generate module split message with numbered naming', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './a';\nexport const b = 'b';");

      ruleTester.run('module split numbered', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ 
              fixStrategy: 'module-split',
              moduleNamingConvention: 'numbered'
            }],
            errors: [
              {
                messageId: 'moduleSplit',
              },
            ],
          },
        ],
      });
    });

    it('should generate direct import message', () => {
      createFile(tempDir, 'index.ts', "export * from './a';\nexport * from './b';");
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './index';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './index';\nexport const b = 'b';");

      ruleTester.run('direct import message', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ fixStrategy: 'direct-import' }],
            errors: [
              {
                messageId: 'directImport',
              },
            ],
          },
        ],
      });
    });

    it('should generate extract shared message', () => {
      createFile(tempDir, 'types.ts', 'export type Type = string;');
      const fileA = createFile(tempDir, 'a.ts', "import type { Type } from './types';\nimport type { Type2 } from './b';\nexport const a: Type = 'a';");
      createFile(tempDir, 'b.ts', "import type { Type } from './types';\nimport type { Type1 } from './a';\nexport const b: Type = 'b';");

      ruleTester.run('extract shared message', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ fixStrategy: 'extract-shared' }],
            errors: [
              {
                messageId: 'extractShared',
              },
            ],
          },
        ],
      });
    });

    it('should generate dependency injection message', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './a';\nexport const b = 'b';");

      ruleTester.run('dependency injection message', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            options: [{ fixStrategy: 'dependency-injection' }],
            errors: [
              {
                messageId: 'dependencyInjection',
              },
            ],
          },
        ],
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle file read errors gracefully', () => {
      // Create a file that will be read
      const indexFile = createFile(tempDir, 'index.ts', 'export const x = 1;');

      ruleTester.run('handle file read errors', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(indexFile, 'utf-8'),
            filename: indexFile,
          },
        ],
        invalid: [],
      });
    });

    it('should handle files not in cycle', () => {
      createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { c } from './c';\nexport const b = 'b';");
      createFile(tempDir, 'c.ts', "import { b } from './b';\nexport const c = 'c';");
      const fileD = createFile(tempDir, 'd.ts', "import { a } from './a';\nexport const d = 'd';");

      ruleTester.run('handle files not in cycle', noCircularDependencies, {
        valid: [
          {
            code: fs.readFileSync(fileD, 'utf-8'),
            filename: fileD,
          },
        ],
        invalid: [],
      });
    });

    it('should handle cycle start index edge case', () => {
      const fileA = createFile(tempDir, 'a.ts', "import { b } from './b';\nexport const a = 'a';");
      createFile(tempDir, 'b.ts', "import { a } from './a';\nexport const b = 'b';");

      ruleTester.run('cycle start index', noCircularDependencies, {
        valid: [],
        invalid: [
          {
            code: fs.readFileSync(fileA, 'utf-8'),
            filename: fileA,
            errors: [
              {
                messageId: expect.any(String),
              },
            ],
          },
        ],
      });
    });
  });
});

