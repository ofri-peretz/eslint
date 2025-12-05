/**
 * Comprehensive tests for no-commonjs rule
 * Prevents CommonJS require/module.exports
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCommonjs } from '../rules/no-commonjs';

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

describe('no-commonjs', () => {
  describe('Basic CommonJS detection', () => {
    ruleTester.run('detect CommonJS require calls', noCommonjs, {
      valid: [
        // Valid ES6 imports
        {
          code: 'import helper from "./helper";',
          filename: '/src/utils/helpers.js',
        },
        {
          code: 'import { Component } from "react";',
          filename: '/src/components/Button.js',
        },
        // AMD (different rule)
        {
          code: 'define(["helper"], function(helper) {});',
          filename: '/src/utils/helpers.js',
        },
        // No CommonJS calls
        {
          code: 'console.log("hello");',
          filename: '/src/utils/helpers.js',
        },
        // Allowed in specific files
        {
          code: 'const helper = require("./helper");',
          filename: '/src/legacy/commonjs.js',
          options: [{ allowInFiles: ['**/legacy/**'] }],
        },
      ],
      invalid: [
        // Invalid CommonJS require calls
        {
          code: 'const helper = require("./helper");',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'commonjsRequire',
            suggestions: [{ messageId: 'commonjsRequire', output: `const helper = // Convert to: import * as moduleName from './helper';\nrequire("./helper");` }],
          }],
        },
        {
          code: 'const { Component } = require("react");',
          filename: '/src/components/Button.js',
          errors: [{
            messageId: 'commonjsRequire',
            suggestions: [{ messageId: 'commonjsRequire', output: `const { Component } = // Convert to: import * as moduleName from 'react';\nrequire("react");` }],
          }],
        },
        {
          code: 'const utils = require("./utils");',
          filename: '/src/utils/index.js',
          errors: [{
            messageId: 'commonjsRequire',
            suggestions: [{ messageId: 'commonjsRequire', output: `const utils = // Convert to: import * as moduleName from './utils';\nrequire("./utils");` }],
          }],
        },
      ],
    });
  });

  describe('CommonJS module.exports', () => {
    ruleTester.run('detect module.exports patterns', noCommonjs, {
      valid: [
        // Valid ES6 exports
        {
          code: 'export default helper;',
          filename: '/src/utils/helpers.js',
        },
        {
          code: 'export { Component };',
          filename: '/src/components/Button.js',
        },
        // Allowed module.exports
        {
          code: 'module.exports = helper;',
          filename: '/src/legacy/commonjs.js',
          options: [{ allowModuleExports: true }],
        },
      ],
      invalid: [
        // Invalid module.exports
        {
          code: 'module.exports = helper;',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'commonjsExport',
            suggestions: [{ messageId: 'commonjsExport', output: '// Convert to: export default helper;\nmodule.exports = helper;' }],
          }],
        },
        {
          code: 'module.exports.helper = function() {};',
          filename: '/src/utils/index.js',
          errors: [{
            messageId: 'commonjsModule',
            suggestions: [{ messageId: 'commonjsModule', output: '// Convert to: export const propertyName = value;\nmodule.exports.helper = function() {};' }],
          }],
        },
        {
          code: 'exports.Component = class {};',
          filename: '/src/components/Button.js',
          errors: [{
            messageId: 'commonjsModule',
            suggestions: [{ messageId: 'commonjsModule', output: '// Convert to: export const Component = class {};\nexports.Component = class {};' }],
          }],
        },
      ],
    });
  });

  describe('CommonJS exports patterns', () => {
    ruleTester.run('detect exports.* patterns', noCommonjs, {
      valid: [
        {
          code: 'export const helper = () => {};',
          filename: '/src/utils/helpers.js',
        },
        // Allowed exports
        {
          code: 'exports.helper = function() {};',
          filename: '/src/legacy/commonjs.js',
          options: [{ allowExports: true }],
        },
      ],
      invalid: [
        {
          code: 'exports.helper = function() {};',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'commonjsModule',
            suggestions: [{ messageId: 'commonjsModule', output: '// Convert to: export const helper = function() {};\nexports.helper = function() {};' }],
          }],
        },
        {
          code: 'exports.Component = class {};',
          filename: '/src/components/Button.js',
          errors: [{
            messageId: 'commonjsModule',
            suggestions: [{ messageId: 'commonjsModule', output: '// Convert to: export const Component = class {};\nexports.Component = class {};' }],
          }],
        },
      ],
    });
  });

  describe('CommonJS globals', () => {
    ruleTester.run('detect CommonJS globals', noCommonjs, {
      valid: [
        {
          code: 'const dirname = import.meta.url;',
          filename: '/src/utils/helpers.js',
        },
      ],
      invalid: [
        {
          code: 'console.log(__dirname);',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'preferES6',
          }],
        },
        {
          code: 'const filename = __filename;',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'preferES6',
          }],
        },
      ],
    });
  });

  describe('TypeScript import = require', () => {
    ruleTester.run('handle TypeScript import syntax', noCommonjs, {
      valid: [
        {
          code: 'import helper from "./helper";',
          filename: '/src/utils/helpers.ts',
        },
      ],
      invalid: [
        {
          code: 'import helper = require("./helper");',
          filename: '/src/utils/helpers.ts',
          errors: [{
            messageId: 'commonjsRequire',
            suggestions: [{ messageId: 'commonjsRequire', output: `import helper from './helper';` }],
          }],
        },
      ],
    });
  });

  describe('Auto-fix functionality', () => {
    ruleTester.run('provide auto-fix suggestions', noCommonjs, {
      valid: [],
      invalid: [
        {
          code: 'const helper = require("./helper");',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'commonjsRequire',
            suggestions: [{ messageId: 'commonjsRequire', output: `const helper = // Convert to: import * as moduleName from './helper';\nrequire("./helper");` }],
          }],
        },
        {
          code: 'module.exports = helper;',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'commonjsExport',
            suggestions: [{ messageId: 'commonjsExport', output: '// Convert to: export default helper;\nmodule.exports = helper;' }],
          }],
        },
      ],
    });
  });

  describe('Configuration options', () => {
    ruleTester.run('respect allowRequire option', noCommonjs, {
      valid: [
        {
          code: 'const helper = require("./helper");',
          filename: '/src/utils/helpers.js',
          options: [{ allowRequire: true }],
        },
      ],
      invalid: [
        {
          code: 'module.exports = helper;',
          filename: '/src/utils/helpers.js',
          options: [{ allowRequire: true }],
          errors: [{
            messageId: 'commonjsExport',
            suggestions: [{ messageId: 'commonjsExport', output: '// Convert to: export default helper;\nmodule.exports = helper;' }],
          }],
        },
      ],
    });

    ruleTester.run('respect allowModuleExports option', noCommonjs, {
      valid: [
        {
          code: 'module.exports = helper;',
          filename: '/src/utils/helpers.js',
          options: [{ allowModuleExports: true }],
        },
      ],
      invalid: [
        {
          code: 'const helper = require("./helper");',
          filename: '/src/utils/helpers.js',
          options: [{ allowModuleExports: true }],
          errors: [{
            messageId: 'commonjsRequire',
            suggestions: [{ messageId: 'commonjsRequire', output: `const helper = // Convert to: import * as moduleName from './helper';\nrequire("./helper");` }],
          }],
        },
      ],
    });

    ruleTester.run('respect allowExports option', noCommonjs, {
      valid: [
        {
          code: 'exports.helper = function() {};',
          filename: '/src/utils/helpers.js',
          options: [{ allowExports: true }],
        },
      ],
      invalid: [
        {
          code: 'const helper = require("./helper");',
          filename: '/src/utils/helpers.js',
          options: [{ allowExports: true }],
          errors: [{
            messageId: 'commonjsRequire',
            suggestions: [{ messageId: 'commonjsRequire', output: `const helper = // Convert to: import * as moduleName from './helper';\nrequire("./helper");` }],
          }],
        },
      ],
    });
  });

  describe('Error messages', () => {
    ruleTester.run('provide helpful error messages', noCommonjs, {
      valid: [],
      invalid: [
        {
          code: 'const helper = require("./helper");',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'commonjsRequire',
            suggestions: [{ messageId: 'commonjsRequire', output: `const helper = // Convert to: import * as moduleName from './helper';\nrequire("./helper");` }],
          }],
        },
        {
          code: 'module.exports = helper;',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'commonjsExport',
            suggestions: [{ messageId: 'commonjsExport', output: '// Convert to: export default helper;\nmodule.exports = helper;' }],
          }],
        },
        {
          code: 'exports.helper = function() {};',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'commonjsModule',
            suggestions: [{ messageId: 'commonjsModule', output: '// Convert to: export const helper = function() {};\nexports.helper = function() {};' }],
          }],
        },
      ],
    });
  });
});
