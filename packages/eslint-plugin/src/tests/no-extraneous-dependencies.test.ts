/**
 * Comprehensive tests for no-extraneous-dependencies rule
 * Forbid the use of extraneous packages not listed in package.json
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noExtraneousDependencies } from '../rules/architecture/no-extraneous-dependencies';

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

// Mock fs module for testing
const mockPackageJson = {
  dependencies: {
    'lodash': '^4.17.0',
    'axios': '^1.0.0',
    'react': '^18.0.0',
    '@types/node': '^20.0.0'
  },
  devDependencies: {
    'vitest': '^1.0.0',
    '@types/react': '^18.0.0',
    'typescript': '^5.0.0'
  },
  optionalDependencies: {
    'optional-pkg': '^1.0.0'
  },
  peerDependencies: {
    'peer-pkg': '^1.0.0'
  },
  bundledDependencies: ['bundled-pkg']
};

describe('no-extraneous-dependencies', () => {
  describe('Basic dependency validation', () => {
    ruleTester.run('validate dependencies', noExtraneousDependencies, {
      valid: [
        // Dependencies allowed
        {
          code: 'import lodash from "lodash";',
          filename: '/test/file.js',
          options: [{ /* mock package.json */ }],
        },
        // Dev dependencies allowed by default
        {
          code: 'import vitest from "vitest";',
          filename: '/test/file.js',
          options: [{ /* mock package.json */ }],
        },
        // Optional dependencies allowed by default
        {
          code: 'import optionalPkg from "optional-pkg";',
          filename: '/test/file.js',
          options: [{ /* mock package.json */ }],
        },
        // Peer dependencies allowed by default
        {
          code: 'import peerPkg from "peer-pkg";',
          filename: '/test/file.js',
          options: [{ /* mock package.json */ }],
        },
        // Bundled dependencies allowed by default
        {
          code: 'import bundledPkg from "bundled-pkg";',
          filename: '/test/file.js',
          options: [{ /* mock package.json */ }],
        },
        // Relative imports ignored
        {
          code: 'import helper from "./utils/helper";',
          filename: '/test/file.js',
        },
        // Node.js built-ins ignored
        {
          code: 'import fs from "fs";',
          filename: '/test/file.js',
        },
        {
          code: 'import path from "node:path";',
          filename: '/test/file.js',
        },
      ],
      invalid: [
        // Missing dependency
        {
          code: 'import missingPkg from "missing-package";',
          filename: '/test/file.js',
          options: [{ packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'missing-package',
                importPath: 'missing-package',
                suggestion: 'Add "missing-package" to package.json dependencies',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install missing-package\nimport missingPkg from "missing-package";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev missing-package\nimport missingPkg from "missing-package";',
                },
              ],
            },
          ],
        },
        // Scoped package not in dependencies
        {
          code: 'import pkg from "@scope/missing";',
          filename: '/test/file.js',
          options: [{ packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: '@scope/missing',
                importPath: '@scope/missing',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install @scope/missing\nimport pkg from "@scope/missing";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev @scope/missing\nimport pkg from "@scope/missing";',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Dependency type restrictions', () => {
    ruleTester.run('restrict dev dependencies', noExtraneousDependencies, {
      valid: [
        // Regular dependencies still allowed
        {
          code: 'import lodash from "lodash";',
          filename: '/test/file.js',
          options: [{ devDependencies: false }],
        },
      ],
      invalid: [
        // Dev dependencies not allowed
        {
          code: 'import vitest from "vitest";',
          filename: '/test/file.js',
          options: [{ devDependencies: false, packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'devDependencyInProduction',
              data: {
                packageName: 'vitest',
                importPath: 'vitest',
                suggestion: 'Move to dependencies if used in production, or ensure this code is only executed in development',
              },
              suggestions: [
                {
                  messageId: 'moveToDependencies',
                  output: '// TODO: Move vitest from devDependencies to dependencies in package.json\nimport vitest from "vitest";',
                },
              ],
            },
          ],
        },
        {
          code: 'import typescript from "typescript";',
          filename: '/test/file.js',
          options: [{ devDependencies: false, packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'devDependencyInProduction',
              data: {
                packageName: 'typescript',
                importPath: 'typescript',
              },
              suggestions: [
                {
                  messageId: 'moveToDependencies',
                  output: '// TODO: Move typescript from devDependencies to dependencies in package.json\nimport typescript from "typescript";',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('restrict optional dependencies', noExtraneousDependencies, {
      valid: [
        // Regular dependencies still allowed
        {
          code: 'import lodash from "lodash";',
          filename: '/test/file.js',
          options: [{ optionalDependencies: false }],
        },
      ],
      invalid: [
        // Optional dependencies not allowed
        {
          code: 'import optionalPkg from "optional-pkg";',
          filename: '/test/file.js',
          options: [{ optionalDependencies: false, packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'optional-pkg',
                importPath: 'optional-pkg',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install optional-pkg\nimport optionalPkg from "optional-pkg";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev optional-pkg\nimport optionalPkg from "optional-pkg";',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('restrict peer dependencies', noExtraneousDependencies, {
      valid: [
        // Regular dependencies still allowed
        {
          code: 'import lodash from "lodash";',
          filename: '/test/file.js',
          options: [{ peerDependencies: false }],
        },
      ],
      invalid: [
        // Peer dependencies not allowed
        {
          code: 'import peerPkg from "peer-pkg";',
          filename: '/test/file.js',
          options: [{ peerDependencies: false, packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'peer-pkg',
                importPath: 'peer-pkg',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install peer-pkg\nimport peerPkg from "peer-pkg";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev peer-pkg\nimport peerPkg from "peer-pkg";',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('restrict bundled dependencies', noExtraneousDependencies, {
      valid: [
        // Regular dependencies still allowed
        {
          code: 'import lodash from "lodash";',
          filename: '/test/file.js',
          options: [{ bundledDependencies: false }],
        },
      ],
      invalid: [
        // Bundled dependencies not allowed
        {
          code: 'import bundledPkg from "bundled-pkg";',
          filename: '/test/file.js',
          options: [{ bundledDependencies: false, packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'bundled-pkg',
                importPath: 'bundled-pkg',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install bundled-pkg\nimport bundledPkg from "bundled-pkg";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev bundled-pkg\nimport bundledPkg from "bundled-pkg";',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Resolution strategies', () => {
    ruleTester.run('strict resolution strategy', noExtraneousDependencies, {
      valid: [
        // Only explicitly listed packages allowed
        {
          code: 'import lodash from "lodash";',
          filename: '/test/file.js',
          options: [{ resolutionStrategy: 'strict' }],
        },
      ],
      invalid: [
        // Missing packages not allowed
        {
          code: 'import missingPkg from "missing-package";',
          filename: '/test/file.js',
          options: [{ resolutionStrategy: 'strict', packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'missing-package',
                importPath: 'missing-package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install missing-package\nimport missingPkg from "missing-package";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev missing-package\nimport missingPkg from "missing-package";',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('workspace resolution strategy', noExtraneousDependencies, {
      valid: [
        // Regular dependencies allowed
        {
          code: 'import lodash from "lodash";',
          filename: '/test/file.js',
          options: [{ resolutionStrategy: 'workspace' }],
        },
        // Workspace packages (scoped) allowed
        {
          code: 'import pkg from "@workspace/package";',
          filename: '/test/file.js',
          options: [{ resolutionStrategy: 'workspace' }],
        },
        {
          code: 'import util from "@company/utils";',
          filename: '/test/file.js',
          options: [{ resolutionStrategy: 'workspace' }],
        },
      ],
      invalid: [
        // Non-workspace scoped packages not allowed
        {
          code: 'import missingPkg from "@external/package";',
          filename: '/test/file.js',
          options: [{ resolutionStrategy: 'workspace', packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: '@external/package',
                importPath: '@external/package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install @external/package\nimport missingPkg from "@external/package";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev @external/package\nimport missingPkg from "@external/package";',
                },
              ],
            },
          ],
        },
      ],
    });

    ruleTester.run('monorepo resolution strategy', noExtraneousDependencies, {
      valid: [
        // Regular dependencies allowed
        {
          code: 'import lodash from "lodash";',
          filename: '/test/file.js',
          options: [{ resolutionStrategy: 'monorepo' }],
        },
        // Workspace packages allowed
        {
          code: 'import pkg from "@workspace/package";',
          filename: '/test/file.js',
          options: [{ resolutionStrategy: 'monorepo' }],
        },
      ],
      invalid: [
        // Missing packages not in workspace not allowed
        {
          code: 'import missingPkg from "missing-package";',
          filename: '/test/file.js',
          options: [{ resolutionStrategy: 'monorepo', packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'missing-package',
                importPath: 'missing-package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install missing-package\nimport missingPkg from "missing-package";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev missing-package\nimport missingPkg from "missing-package";',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Allow patterns', () => {
    ruleTester.run('allow packages by pattern', noExtraneousDependencies, {
      valid: [
        // Regular dependencies still allowed
        {
          code: 'import lodash from "lodash";',
          filename: '/test/file.js',
          options: [{ allowPatterns: ['^test-.*$'] }],
        },
        // Pattern-matched packages allowed
        {
          code: 'import pkg from "test-package";',
          filename: '/test/file.js',
          options: [{ allowPatterns: ['^test-.*$'] }],
        },
        {
          code: 'import pkg from "test-utils";',
          filename: '/test/file.js',
          options: [{ allowPatterns: ['^test-.*$'] }],
        },
        // Scoped packages with pattern
        {
          code: 'import pkg from "@test/scope";',
          filename: '/test/file.js',
          options: [{ allowPatterns: ['^@test/.*$'] }],
        },
        // Multiple patterns
        {
          code: 'import pkg from "dev-package";',
          filename: '/test/file.js',
          options: [{ allowPatterns: ['^test-.*$', '^dev-.*$'] }],
        },
      ],
      invalid: [
        // Pattern doesn't match
        {
          code: 'import pkg from "other-package";',
          filename: '/test/file.js',
          options: [{ allowPatterns: ['^test-.*$'], packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'other-package',
                importPath: 'other-package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install other-package\nimport pkg from "other-package";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev other-package\nimport pkg from "other-package";',
                },
              ],
            },
          ],
        },
        // Invalid regex pattern (fallback to no match)
        {
          code: 'import pkg from "test-package";',
          filename: '/test/file.js',
          options: [{ allowPatterns: ['[invalid regex'], packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'test-package',
                importPath: 'test-package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install test-package\nimport pkg from "test-package";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev test-package\nimport pkg from "test-package";',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Import types', () => {
    ruleTester.run('handle different import types', noExtraneousDependencies, {
      valid: [
        // ES6 imports
        {
          code: 'import lodash from "lodash";',
          filename: '/test/file.js',
        },
        {
          code: 'import { cloneDeep } from "lodash";',
          filename: '/test/file.js',
        },
        {
          code: 'import * as React from "react";',
          filename: '/test/file.js',
        },
      ],
      invalid: [
        // ES6 import of missing package
        {
          code: 'import missing from "missing-package";',
          filename: '/test/file.js',
          options: [{ packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'missing-package',
                importPath: 'missing-package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install missing-package\nimport missing from "missing-package";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev missing-package\nimport missing from "missing-package";',
                },
              ],
            },
          ],
        },
        // Require calls
        {
          code: 'const missing = require("missing-package");',
          filename: '/test/file.js',
          options: [{ packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'missing-package',
                importPath: 'missing-package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install missing-package\nconst missing = require("missing-package");',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev missing-package\nconst missing = require("missing-package");',
                },
              ],
            },
          ],
        },
        // Dynamic imports
        {
          code: 'const missing = import("missing-package");',
          filename: '/test/file.js',
          options: [{ packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'missing-package',
                importPath: 'missing-package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install missing-package\nconst missing = import("missing-package");',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev missing-package\nconst missing = import("missing-package");',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Scoped packages', () => {
    ruleTester.run('handle scoped packages correctly', noExtraneousDependencies, {
      valid: [
        // Allowed scoped package
        {
          code: 'import nodeTypes from "@types/node";',
          filename: '/test/file.js',
        },
        // Sub-path imports
        {
          code: 'import { cloneDeep } from "lodash/fp";',
          filename: '/test/file.js',
        },
        {
          code: 'import button from "@mui/material/Button";',
          filename: '/test/file.js',
          options: [{ /* would need @mui/material in deps */ }],
        },
      ],
      invalid: [
        // Missing scoped package
        {
          code: 'import missing from "@missing/package";',
          filename: '/test/file.js',
          options: [{ packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: '@missing/package',
                importPath: '@missing/package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install @missing/package\nimport missing from "@missing/package";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev @missing/package\nimport missing from "@missing/package";',
                },
              ],
            },
          ],
        },
        // Scoped package not in dependencies
        {
          code: 'import missing from "@external/package";',
          filename: '/test/file.js',
          options: [{ packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: '@external/package',
                importPath: '@external/package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install @external/package\nimport missing from "@external/package";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev @external/package\nimport missing from "@external/package";',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Suggestion capabilities', () => {
    ruleTester.run('provide helpful suggestions', noExtraneousDependencies, {
      valid: [],
      invalid: [
        // Missing dependency suggestions
        {
          code: 'import missing from "missing-package";',
          filename: '/test/file.js',
          options: [{ packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'missing-package',
                importPath: 'missing-package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install missing-package\nimport missing from "missing-package";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev missing-package\nimport missing from "missing-package";',
                },
              ],
            },
          ],
        },
        // Dev dependency in production suggestions
        {
          code: 'import vitest from "vitest";',
          filename: '/test/file.js',
          options: [{ devDependencies: false, packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'devDependencyInProduction',
              suggestions: [
                {
                  messageId: 'moveToDependencies',
                  output: '// TODO: Move vitest from devDependencies to dependencies in package.json\nimport vitest from "vitest";',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Edge cases', () => {
    ruleTester.run('handle edge cases', noExtraneousDependencies, {
      valid: [
        // Absolute paths ignored
        {
          code: 'import config from "/absolute/path/config";',
          filename: '/test/file.js',
        },
        // Complex relative paths ignored
        {
          code: 'import sibling from "../../../sibling";',
          filename: '/deep/nested/file.js',
        },
        // URL imports (future Node.js feature)
        {
          code: 'import pkg from "https://example.com/pkg.js";',
          filename: '/test/file.js',
        },
      ],
      invalid: [
        // Multiple missing dependencies
        {
          code: `
            import missing1 from "missing-package-1";
            import missing2 from "missing-package-2";
            const missing3 = require("missing-package-3");
          `,
          filename: '/test/file.js',
          options: [{ packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'missing-package-1',
                importPath: 'missing-package-1',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '\n            // TODO: Run: npm install missing-package-1\nimport missing1 from "missing-package-1";\n            import missing2 from "missing-package-2";\n            const missing3 = require("missing-package-3");\n          ',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '\n            // TODO: Run: npm install --save-dev missing-package-1\nimport missing1 from "missing-package-1";\n            import missing2 from "missing-package-2";\n            const missing3 = require("missing-package-3");\n          ',
                },
              ],
            },
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'missing-package-2',
                importPath: 'missing-package-2',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '\n            import missing1 from "missing-package-1";\n            // TODO: Run: npm install missing-package-2\nimport missing2 from "missing-package-2";\n            const missing3 = require("missing-package-3");\n          ',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '\n            import missing1 from "missing-package-1";\n            // TODO: Run: npm install --save-dev missing-package-2\nimport missing2 from "missing-package-2";\n            const missing3 = require("missing-package-3");\n          ',
                },
              ],
            },
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'missing-package-3',
                importPath: 'missing-package-3',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '\n            import missing1 from "missing-package-1";\n            import missing2 from "missing-package-2";\n            // TODO: Run: npm install missing-package-3\nconst missing3 = require("missing-package-3");\n          ',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '\n            import missing1 from "missing-package-1";\n            import missing2 from "missing-package-2";\n            // TODO: Run: npm install --save-dev missing-package-3\nconst missing3 = require("missing-package-3");\n          ',
                },
              ],
            },
          ],
        },
        // Mixed valid and invalid imports
        {
          code: `
            import lodash from "lodash"; // valid
            import missing from "missing-package"; // invalid
            import vitest from "vitest"; // valid (dev dep)
          `,
          filename: '/test/file.js',
          options: [{ packageJson: mockPackageJson, devDependencies: false }],
          errors: [
            {
              messageId: 'missingDependency',
              line: 3,
              data: {
                packageName: 'missing-package',
                importPath: 'missing-package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '\n            import lodash from "lodash"; // valid\n            // TODO: Run: npm install missing-package\nimport missing from "missing-package"; // invalid\n            import vitest from "vitest"; // valid (dev dep)\n          ',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '\n            import lodash from "lodash"; // valid\n            // TODO: Run: npm install --save-dev missing-package\nimport missing from "missing-package"; // invalid\n            import vitest from "vitest"; // valid (dev dep)\n          ',
                },
              ],
            },
            {
              messageId: 'devDependencyInProduction',
              line: 4,
              data: {
                packageName: 'vitest',
                importPath: 'vitest',
              },
              suggestions: [
                {
                  messageId: 'moveToDependencies',
                  output: '\n            import lodash from "lodash"; // valid\n            import missing from "missing-package"; // invalid\n            // TODO: Move vitest from devDependencies to dependencies in package.json\nimport vitest from "vitest"; // valid (dev dep)\n          ',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('TypeScript support', () => {
    ruleTester.run('handle TypeScript constructs', noExtraneousDependencies, {
      valid: [
        {
          code: 'import React from "react";',
          filename: '/test/component.tsx',
        },
        {
          code: 'import type { FC } from "react";',
          filename: '/test/component.tsx',
        },
      ],
      invalid: [
        {
          code: 'import missing from "missing-package";',
          filename: '/test/component.tsx',
          options: [{ packageJson: mockPackageJson }],
          errors: [
            {
              messageId: 'missingDependency',
              data: {
                packageName: 'missing-package',
                importPath: 'missing-package',
              },
              suggestions: [
                {
                  messageId: 'addToDependencies',
                  output: '// TODO: Run: npm install missing-package\nimport missing from "missing-package";',
                },
                {
                  messageId: 'addToDevDependencies',
                  output: '// TODO: Run: npm install --save-dev missing-package\nimport missing from "missing-package";',
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
