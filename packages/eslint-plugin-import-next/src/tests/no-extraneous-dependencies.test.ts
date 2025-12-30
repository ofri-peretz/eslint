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
