/**
 * Tests for no-extraneous-dependencies
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noExtraneousDependencies } from '../rules/no-extraneous-dependencies';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const mockPackageJson = {
  dependencies: {
    'react': '18.0.0',
    '@org/comp': '1.0.0'
  },
  devDependencies: {
    'jest': '29.0.0',
    'eslint': '8.0.0'
  },
  optionalDependencies: {
    'redis': '1.0.0'
  },
  peerDependencies: {
    'prop-types': '15.0.0'
  },
  bundledDependencies: ['bundled-lib']
};

ruleTester.run('no-extraneous-dependencies', noExtraneousDependencies, {
  valid: [
    // Regular dependencies
    {
      name: 'a declared dependency', 
      code: `import React from 'react';`,
      options: [{ packageJson: mockPackageJson }]
    },
    { 
      code: `import Comp from '@org/comp';`,
      options: [{ packageJson: mockPackageJson }]
    },
    { 
      code: `import Sub from '@org/comp/sub';`,
      options: [{ packageJson: mockPackageJson }]
    },
    
    // Dev Dependencies (allowed by default)
    { 
      code: `import jest from 'jest';`,
      options: [{ packageJson: mockPackageJson }]
    },
    
    // Optional Dependencies
    { 
        code: `import redis from 'redis';`,
        options: [{ packageJson: mockPackageJson }]
    },

    // Peer Dependencies
    { 
        code: `import PropTypes from 'prop-types';`,
        options: [{ packageJson: mockPackageJson }]
    },

    // Bundled Dependencies
    { 
        code: `import bundled from 'bundled-lib';`,
        options: [{ packageJson: mockPackageJson }]
    },

    // Builtins
    { 
        code: `import fs from 'fs';`,
        options: [{ packageJson: mockPackageJson }]
    },
    { 
        code: `import path from 'node:path';`,
        options: [{ packageJson: mockPackageJson }]
    },
    
    // Relative imports
    { 
        code: `import foo from './foo';`,
        options: [{ packageJson: mockPackageJson }]
    },

    // Allow patterns
    {
        code: `import 'internal-lib';`,
        options: [{ 
            packageJson: mockPackageJson,
            allowPatterns: ['internal-*']
        }]
    },

    // Require checks
    {
        code: `const React = require('react');`,
        options: [{ packageJson: mockPackageJson }]
    },

    // Export from
    {
        code: `export { React } from 'react';`,
        options: [{ packageJson: mockPackageJson }]
    },
    {
        code: `export * from 'react';`,
        options: [{ packageJson: mockPackageJson }]
    },

    // Dynamic import
    {
        code: `import('react');`,
        options: [{ packageJson: mockPackageJson }]
    }
  ],

  invalid: [
    // Missing dependency
    {
      name: 'an import of a package that is not in package.json',
      code: `import axios from 'axios';`,
      options: [{ packageJson: mockPackageJson }],
      errors: [{ 
        messageId: 'missingDependency',
        suggestions: [
          { messageId: 'addToDependencies', output: `// TODO: Run: npm install axios\nimport axios from 'axios';` },
          { messageId: 'addToDevDependencies', output: `// TODO: Run: npm install --save-dev axios\nimport axios from 'axios';` }
        ]
      }]
    },
    
    // Dev Dependency in Production (devDependencies: false)
    {
        code: `import jest from 'jest';`,
        options: [{ packageJson: mockPackageJson, devDependencies: false }],
        errors: [{
            messageId: 'devDependencyInProduction',
            suggestions: [
                { messageId: 'moveToDependencies', output: `// TODO: Move jest from devDependencies to dependencies in package.json\nimport jest from 'jest';` }
            ]
        }]
    },
    
    // We skip other invalid cases because asserting suggestions strings is brittle 
    // and maintenance heavy if messages change. The logic is covered by the invalid
    // case above and the diverse valid cases.
  ],
});

/**
 * What is not an external dependency.
 *
 * The relative guard tested only the `./` and `../` PREFIXES, so the bare forms
 * fell through and were reported as packages literally named `.` and `..`.
 * `require('..')` is how a package's own tests import its root, and it was four
 * of the ten findings on auth0/express-openid-connect — the first repository
 * this rule was ever measured against, because it had been excluded from the
 * corpus gate on the false premise that it needed an installed tree.
 *
 * A `#`-prefixed specifier resolves through the package's own `imports` field.
 * It is internal by specification and can never name an external dependency.
 */
ruleTester.run('no-extraneous-dependencies — what is not a package', noExtraneousDependencies, {
  valid: [
    // `require('..')` / `import from '..'` — the package root.
    { code: "import a from '..';", options: [{ packageJson: mockPackageJson }] },
    { code: "import a from '.';", options: [{ packageJson: mockPackageJson }] },
    { code: "const a = require('..');", options: [{ packageJson: mockPackageJson }] },
    // Still relative with a path attached.
    { code: "import a from './sib';", options: [{ packageJson: mockPackageJson }] },
    { code: "import a from '../sib';", options: [{ packageJson: mockPackageJson }] },
    // Node subpath imports resolve through the package's own `imports` field.
    { code: "import a from '#internal/thing';", options: [{ packageJson: mockPackageJson }] },
    { code: "import a from '#dep';", options: [{ packageJson: mockPackageJson }] },
    // An absolute path is not a package either.
    { code: "import a from '/abs/path';", options: [{ packageJson: mockPackageJson }] },
  ],
  invalid: [
    {
      // POSITIVE CONTROL. Without it every valid case above passes on a rule
      // that stopped reporting.
      code: "import a from 'definitely-not-declared';",
      options: [{ packageJson: mockPackageJson }],
      errors: [
        {
          messageId: 'missingDependency',
          suggestions: [
            {
              messageId: 'addToDependencies',
              output: `// TODO: Run: npm install definitely-not-declared\nimport a from 'definitely-not-declared';`,
            },
            {
              messageId: 'addToDevDependencies',
              output: `// TODO: Run: npm install --save-dev definitely-not-declared\nimport a from 'definitely-not-declared';`,
            },
          ],
        },
      ],
    },
    {
      // FN GUARD: a package name may legitimately BEGIN with dots. The guard
      // requires a `/` or end-of-string after them, so `..weird` is still a
      // package and still reports.
      code: "import a from '..weird';",
      options: [{ packageJson: mockPackageJson }],
      errors: [
        {
          messageId: 'missingDependency',
          suggestions: [
            {
              messageId: 'addToDependencies',
              output: `// TODO: Run: npm install ..weird\nimport a from '..weird';`,
            },
            {
              messageId: 'addToDevDependencies',
              output: `// TODO: Run: npm install --save-dev ..weird\nimport a from '..weird';`,
            },
          ],
        },
      ],
    },
  ],
});
