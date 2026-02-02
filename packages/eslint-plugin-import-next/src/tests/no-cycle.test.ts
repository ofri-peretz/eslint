/**
 * Tests for no-cycle rule with Mocks
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, afterAll, vi, beforeAll } from 'vitest';

// Use vi.hoisted to ensure mocks are available in factory
const mocks = vi.hoisted(() => {
    return {
        findAllCircularDependencies: vi.fn(),
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
    createFileSystemCache: () => ({ reportedCycles: new Set() }),
    clearCache: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
    resolveImportPath: mocks.resolveImportPath,
    hasOnlyTypeImports: () => false,
    findAllCircularDependencies: mocks.findAllCircularDependencies,
    getMinimalCycle: (c: any) => c, // eslint-disable-line @typescript-eslint/no-explicit-any
    getCycleHash: (c: any) => JSON.stringify(c), // eslint-disable-line @typescript-eslint/no-explicit-any
  };
});

import { noCycle } from '../rules/no-cycle';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
// Note: RuleTester.it is intentionally not set - let RuleTester create its own tests

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

// Access mocks directly via the hoisted object
const { findAllCircularDependencies, resolveImportPath, isBarrelExport } = mocks;

// Set up mocks before all tests run
beforeAll(() => {
    findAllCircularDependencies.mockImplementation((filename: string) => {
        if (!filename) return [];
        if (filename.includes('cycle-a')) {
            return [['/path/to/cycle-a.ts', '/path/to/cycle-b.ts', '/path/to/cycle-a.ts']];
        }
        if (filename.includes('cycle-complex')) {
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
