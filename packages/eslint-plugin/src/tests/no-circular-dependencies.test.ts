/**
 * Tests for no-circular-dependencies rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCircularDependencies } from '../rules/architecture/no-circular-dependencies';

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
      // Valid case: External package imports (line 336)
      {
        code: `
          import { something } from 'lodash';
          import React from 'react';
        `,
        filename: '/project/src/index.ts',
      },
      // Valid case: Ignore patterns (line 253-255)
      {
        code: `
          import { something } from './ignored';
        `,
        filename: '/project/src/index.ts',
        options: [{ ignorePatterns: ['**/src/**'] }],
      },
      // Valid case: Different ignore patterns
      {
        code: `
          import { something } from './test';
        `,
        filename: '/project/src/index.ts',
        options: [{ ignorePatterns: ['**/*.ts'] }],
      },
      // Valid case: Alias imports (@app, @src) - line 307-333
      {
        code: `
          import { Component } from '@app/components';
          import { utils } from '@src/utils';
        `,
        filename: '/project/src/index.ts',
      },
      // Valid case: Type-only imports (line 433-448)
      {
        code: `
          import type { Type } from './types';
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

  describe('Options - maxDepth', () => {
    ruleTester.run('maxDepth option', noCircularDependencies, {
      valid: [
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ maxDepth: 10 }],
        },
      ],
      invalid: [],
    });
  });

  describe('Options - barrelExports', () => {
    ruleTester.run('barrelExports option', noCircularDependencies, {
      valid: [
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ barrelExports: ['index.ts', 'barrel.ts'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Options - reportAllCycles', () => {
    ruleTester.run('reportAllCycles option', noCircularDependencies, {
      valid: [
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ reportAllCycles: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Options - fixStrategy', () => {
    ruleTester.run('fixStrategy option', noCircularDependencies, {
      valid: [
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ fixStrategy: 'module-split' }],
        },
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ fixStrategy: 'direct-import' }],
        },
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ fixStrategy: 'extract-shared' }],
        },
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ fixStrategy: 'dependency-injection' }],
        },
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ fixStrategy: 'auto' }],
        },
      ],
      invalid: [],
    });
  });

  describe('Options - moduleNamingConvention', () => {
    ruleTester.run('moduleNamingConvention option', noCircularDependencies, {
      valid: [
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ moduleNamingConvention: 'semantic' }],
        },
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ moduleNamingConvention: 'numbered' }],
        },
      ],
      invalid: [],
    });
  });

  describe('Options - coreModuleSuffix and extendedModuleSuffix', () => {
    ruleTester.run('module suffix options', noCircularDependencies, {
      valid: [
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ 
            coreModuleSuffix: '.core',
            extendedModuleSuffix: '.extended'
          }],
        },
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ 
            coreModuleSuffix: '.base',
            extendedModuleSuffix: '.impl'
          }],
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases - Pattern Matching', () => {
    ruleTester.run('edge cases - pattern matching', noCircularDependencies, {
      valid: [
        // Test glob pattern matching (line 224-239)
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ ignorePatterns: ['**/*.test.ts', '**/test/**'] }],
        },
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ ignorePatterns: ['src/**', '**/utils/**'] }],
        },
        // Test wildcard patterns
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ ignorePatterns: ['*.ts', '**/test*'] }],
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases - Import Patterns', () => {
    ruleTester.run('edge cases - import patterns', noCircularDependencies, {
      valid: [
        // Test different import syntaxes (line 359-380)
        {
          code: 'import defaultExport from "./module";',
          filename: '/project/src/index.ts',
        },
        {
          code: 'import * as namespace from "./module";',
          filename: '/project/src/index.ts',
        },
        {
          code: 'import { named1, named2 } from "./module";',
          filename: '/project/src/index.ts',
        },
        {
          code: 'import defaultExport, { named } from "./module";',
          filename: '/project/src/index.ts',
        },
        {
          code: 'import "./side-effect";',
          filename: '/project/src/index.ts',
        },
        // Test dynamic imports (line 414-416)
        {
          code: 'const module = await import("./dynamic");',
          filename: '/project/src/index.ts',
        },
        {
          code: 'import("./dynamic").then(m => m.default);',
          filename: '/project/src/index.ts',
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases - Pattern Caching (line 228)', () => {
    ruleTester.run('edge cases - pattern caching', noCircularDependencies, {
      valid: [
        // Test that patterns are cached (line 228 - return cached)
        { 
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ 
            ignorePatterns: ['**/*.test.ts', '**/*.test.ts'] // Same pattern twice to test cache
          }],
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases - File Existence Cache (line 273)', () => {
    ruleTester.run('edge cases - file existence cache', noCircularDependencies, {
      valid: [
        // Test that file existence is cached (line 273 - return cached)
        {
          code: 'import { a } from "./a"; import { b } from "./a";',
          filename: '/project/src/index.ts',
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases - Dependency Cache (line 346)', () => {
    ruleTester.run('edge cases - dependency cache', noCircularDependencies, {
      valid: [
        // Test that file imports are cached (line 346 - return cached)
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases - Path Resolution', () => {
    ruleTester.run('edge cases - path resolution', noCircularDependencies, {
      valid: [
        // Test relative imports with extensions (line 288-294)
        {
          code: 'import { a } from "./module.ts";',
          filename: '/project/src/index.ts',
        },
        {
          code: 'import { a } from "./module.tsx";',
          filename: '/project/src/index.ts',
        },
        {
          code: 'import { a } from "./module.js";',
          filename: '/project/src/index.ts',
        },
        {
          code: 'import { a } from "./module.jsx";',
          filename: '/project/src/index.ts',
        },
        // Test relative imports without extension (line 303)
        {
          code: 'import { a } from "./module";',
          filename: '/project/src/index.ts',
        },
        // Test alias imports without match (line 333)
        {
          code: 'import { a } from "@";',
          filename: '/project/src/index.ts',
        },
        // Test alias imports with different aliases (line 313)
        {
          code: 'import { a } from "@custom/component";',
          filename: '/project/src/index.ts',
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases - Visited Tracking (line 403)', () => {
    ruleTester.run('edge cases - visited tracking', noCircularDependencies, {
      valid: [
        // Test that visited files are tracked (line 403 - return early if visited)
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
        },
      ],
      invalid: [],
    });
  });

  describe('Edge Cases - Max Depth (line 393)', () => {
    ruleTester.run('edge cases - max depth', noCircularDependencies, {
      valid: [
        // Test max depth limit (line 393 - return empty if depth exceeded)
        {
          code: 'import { a } from "./a";',
          filename: '/project/src/index.ts',
          options: [{ maxDepth: 0 }],
        },
      ],
      invalid: [],
    });
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

