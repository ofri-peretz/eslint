/**
 * Comprehensive tests for no-amd rule
 * Prevents AMD require/define calls
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAmd } from '../../rules/development/no-amd';

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

describe('no-amd', () => {
  describe('Basic AMD detection', () => {
    ruleTester.run('detect AMD define calls', noAmd, {
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
        // CommonJS (different rule)
        {
          code: 'const helper = require("./helper");',
          filename: '/src/utils/helpers.js',
        },
        // No AMD calls
        {
          code: 'console.log("hello");',
          filename: '/src/utils/helpers.js',
        },
        // No AMD calls to allow
      ],
      invalid: [
        // Invalid AMD define calls
        {
          code: 'define(["helper"], function(helper) {});',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'preferES6',
          }],
        },
        {
          code: 'define(function() {});',
          filename: '/src/components/Button.js',
          errors: [{
            messageId: 'preferES6',
          }],
        },
        {
          code: 'define("module", ["dep"], function(dep) {});',
          filename: '/src/utils/index.js',
          errors: [{
            messageId: 'preferES6',
          }],
        },
      ],
    });
  });

  describe('AMD require calls', () => {
    ruleTester.run('detect AMD require calls', noAmd, {
      valid: [
        {
          code: 'const helper = require("./helper");',
          filename: '/src/utils/helpers.js',
        },
        {
          code: 'import helper from "./helper";',
          filename: '/src/utils/helpers.js',
        },
      ],
      invalid: [
        {
          code: 'require(["helper"], function(helper) {});',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'preferES6',
          }],
        },
        {
          code: 'require(["dep1", "dep2"], function(dep1, dep2) {});',
          filename: '/src/components/Button.js',
          errors: [{
            messageId: 'preferES6',
          }],
        },
      ],
    });
  });

  describe('Global AMD definitions', () => {
    ruleTester.run('detect global AMD patterns', noAmd, {
      valid: [
        {
          code: 'export default function() {}',
          filename: '/src/utils/helpers.js',
        },
      ],
      invalid: [
        {
          code: 'define([], function() { return {}; });',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'preferES6',
          }],
        },
      ],
    });
  });

  describe('Basic functionality', () => {
    ruleTester.run('forbid AMD calls', noAmd, {
      valid: [],
      invalid: [
        {
          code: 'define(["helper"], function(helper) {});',
          errors: [{
            messageId: 'preferES6',
          }],
        },
        {
          code: 'require(["dep"], function(dep) {});',
          errors: [{
            messageId: 'preferES6',
          }],
        },
      ],
    });
  });

  describe('Configuration options', () => {
    ruleTester.run('respect allow option - glob patterns', noAmd, {
      valid: [
        {
          code: 'define(["helper"], function(helper) {});',
          filename: '/src/legacy/amd.js',
          options: [{ allow: ['**/legacy/**'] }],
        },
        {
          code: 'require(["dep"], function(dep) {});',
          filename: '/src/old/require.js',
          options: [{ allow: ['**/old/**'] }],
        },
      ],
      invalid: [
        {
          code: 'define(["helper"], function(helper) {});',
          filename: '/src/utils/helpers.js',
          options: [{ allow: ['**/legacy/**'] }],
          errors: [{
            messageId: 'preferES6',
          }],
        },
      ],
    });

    ruleTester.run('respect allow option - simple string matching', noAmd, {
      valid: [
        // Simple string matching (not glob) - filename.includes(pattern)
        {
          code: 'define(["helper"], function(helper) {});',
          filename: '/src/legacy/amd.js',
          options: [{ allow: ['legacy'] }],
        },
        {
          code: 'require(["dep"], function(dep) {});',
          filename: '/src/old-code/require.js',
          options: [{ allow: ['old-code'] }],
        },
        {
          code: 'define(function() {});',
          filename: '/vendor/third-party.js',
          options: [{ allow: ['vendor'] }],
        },
      ],
      invalid: [
        {
          code: 'define(["helper"], function(helper) {});',
          filename: '/src/utils/helpers.js',
          options: [{ allow: ['legacy'] }],
          errors: [{
            messageId: 'preferES6',
          }],
        },
      ],
    });

    ruleTester.run('respect suggestES6 option', noAmd, {
      valid: [],
      invalid: [
        // suggestES6 option is present but doesn't change behavior
        {
          code: 'define(["helper"], function(helper) {});',
          filename: '/src/utils/helpers.js',
          options: [{ suggestES6: true }],
          errors: [{
            messageId: 'preferES6',
          }],
        },
        {
          code: 'define(["helper"], function(helper) {});',
          filename: '/src/utils/helpers.js',
          options: [{ suggestES6: false }],
          errors: [{
            messageId: 'preferES6',
          }],
        },
      ],
    });
  });

  describe('Error messages', () => {
    ruleTester.run('provide helpful error messages', noAmd, {
      valid: [],
      invalid: [
        {
          code: 'define(["helper"], function(helper) {});',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'preferES6',
            data: {
              functionName: 'define',
              currentFile: '/src/utils/helpers.js',
            },
          }],
        },
        {
          code: 'require(["dep"], function(dep) {});',
          filename: '/src/utils/helpers.js',
          errors: [{
            messageId: 'preferES6',
            data: {
              functionName: 'require',
              currentFile: '/src/utils/helpers.js',
            },
          }],
        },
      ],
    });
  });
});
