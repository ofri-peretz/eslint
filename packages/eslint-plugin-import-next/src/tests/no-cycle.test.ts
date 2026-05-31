/**
 * Tests for no-cycle rule with Mocks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, afterAll, vi, beforeAll, it } from 'vitest';

// Use vi.hoisted to ensure mocks are available in factory
const mocks = vi.hoisted(() => {
    return {
        detectCycleFromImport: vi.fn(),
        resolveImportPath: vi.fn(),
        isBarrelExport: vi.fn().mockReturnValue(false),
    };
});

// Mock the devkit
vi.mock('@interlace/eslint-devkit', () => {
  return {
    createRule: (data: any) => data, // eslint-disable-line @typescript-eslint/no-explicit-any
    formatLLMMessage: () => 'Mocked cycle detection message', // Must return string
    MessageIcons: { ARCHITECTURE: 'ARCHITECTURE', WARNING: 'WARNING' },
    formatCycleDisplay: () => 'cycle',
    getModuleNames: () => ['a', 'b'],
    getRelativeImportPath: () => './b',
    getBasename: (p: string) => p,
    isBarrelExport: mocks.isBarrelExport,
    shouldIgnoreFile: () => false,
    createFileSystemCache: () => ({
      reportedCycles: new Set(),
      nonCyclicFiles: new Set(),
      dependencies: new Map(),
      fileExists: new Map(),
      fileHashes: new Map(),
      compiledPatterns: new Map(),
      sccIndex: new Map(),
      sccs: [],
      sccComputed: false,
      graphHash: '',
      resolvedPaths: new Map(),
      pendingCycleReports: new Map(),
    }),
    clearCache: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
    resolveImportPath: mocks.resolveImportPath,
    hasOnlyTypeImports: () => false,
    detectCycleFromImport: mocks.detectCycleFromImport,
    getMinimalCycle: (c: any) => c, // eslint-disable-line @typescript-eslint/no-explicit-any
    getCycleHash: (c: any) => JSON.stringify(c), // eslint-disable-line @typescript-eslint/no-explicit-any
  };
});

import { noCycle } from '../rules/no-cycle';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

// Access mocks directly via the hoisted object
const { detectCycleFromImport, resolveImportPath, isBarrelExport } = mocks;

// Set up mocks before all tests run
beforeAll(() => {
    // detectCycleFromImport is called with (sourceFile, targetFile, options)
    // It should return cycles that include the sourceFile
    detectCycleFromImport.mockImplementation((sourceFile: string, targetFile: string) => {
        if (!sourceFile || !targetFile) return [];
        if (sourceFile.includes('cycle-a') && targetFile.includes('cycle-b')) {
            return [['/path/to/cycle-a.ts', '/path/to/cycle-b.ts', '/path/to/cycle-a.ts']];
        }
        if (sourceFile.includes('cycle-complex') && targetFile.includes('dep1')) {
             return [
                 ['/path/to/cycle-complex.ts', '/path/to/dep1.ts', '/path/to/cycle-complex.ts'],
             ];
        }
        return [];
    });

    resolveImportPath.mockImplementation((source: string) => {
        if (source === './cycle-b') return '/path/to/cycle-b.ts';
        if (source === './dep1') return '/path/to/dep1.ts';
        return null;
    });
    
    isBarrelExport.mockReturnValue(false);
});

// ruleTester.run() creates its own describe/it blocks - don't nest inside it()
ruleTester.run('no-cycle', noCycle as any, { // eslint-disable-line @typescript-eslint/no-explicit-any
  valid: [
    { 
        code: `import foo from './foo';`,
        filename: '/path/to/no-cycle.ts' 
    },
    { 
        code: `import foo from 'external';`,
        filename: '/path/to/no-cycle.ts'
        // External imports don't cause cycles, so no special options needed
    }
  ],

  invalid: [
    {
      code: `import b from './cycle-b';`,
      filename: '/path/to/cycle-a.ts',
      errors: [{ messageId: 'moduleSplit' }] 
    },
    {
      code: `import dep1 from './dep1';`,
      filename: '/path/to/cycle-complex.ts',
      errors: [{ messageId: 'moduleSplit' }] 
    }
  ],
});
