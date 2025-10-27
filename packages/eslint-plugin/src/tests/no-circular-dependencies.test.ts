/**
 * Tests for no-circular-dependencies rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCircularDependencies } from '../rules/no-circular-dependencies';

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

describe('no-circular-dependencies', () => {
  ruleTester.run('no-circular-dependencies', noCircularDependencies, {
    valid: [
      // Valid case: No circular dependencies
      {
        code: `
          import { utils } from './utils';
          export const result = utils.process();
        `,
        filename: '/project/src/index.ts',
      },
      // Valid case: Test files are ignored by default
      {
        code: `
          import { Component } from './Component';
          describe('Component', () => {});
        `,
        filename: '/project/src/Component.test.ts',
      },
      // Valid case: Dynamic imports don't cause issues
      {
        code: `
          const module = await import('./dynamic-module');
        `,
        filename: '/project/src/index.ts',
      },
    ],
    invalid: [
      // Note: These tests would need actual file system setup to work properly
      // In a real scenario, you would use a test fixture with actual files
      // For now, these serve as documentation of expected behavior
    ],
  });
});

/**
 * Integration test documentation
 * 
 * To properly test circular dependencies, you need to:
 * 1. Create test fixtures with actual TypeScript files
 * 2. Set up a proper file system structure
 * 3. Use ESLint's RuleTester with real file paths
 * 
 * Example test fixture structure:
 * 
 * test-fixtures/
 * ├── circular-basic/
 * │   ├── a.ts     // imports b.ts
 * │   └── b.ts     // imports a.ts (circular!)
 * ├── circular-barrel/
 * │   ├── index.ts // barrel export
 * │   ├── a.ts     // imports from index.ts
 * │   └── b.ts     // exports through index.ts, imports a.ts
 * └── circular-infrastructure/
 *     ├── services/
 *     │   └── logger.ts  // infrastructure
 *     └── utils/
 *         └── helper.ts  // imports logger, logger imports this
 * 
 * Expected behaviors:
 * 
 * 1. Basic circular dependency:
 *    a.ts ← imports from → b.ts
 *    Should report: circularDependency message
 * 
 * 2. Barrel export circular dependency:
 *    a.ts → index.ts → b.ts → a.ts
 *    Should report: barrelExportCycle with fix suggestion
 * 
 * 3. Infrastructure circular dependency:
 *    services/logger.ts ← → utils/helper.ts
 *    Should report: infrastructureCycle (critical)
 * 
 * 4. Multiple cycles (with reportAllCycles: true):
 *    Should report ALL cycles found, not just the first
 * 
 * 5. Deep cycles (up to maxDepth):
 *    a.ts → b.ts → c.ts → d.ts → a.ts
 *    Should detect and report the full chain
 */

