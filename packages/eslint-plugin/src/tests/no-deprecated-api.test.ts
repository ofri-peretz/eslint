/**
 * Comprehensive tests for no-deprecated-api rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noDeprecatedApi } from '../rules/deprecation/no-deprecated-api';

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

describe('no-deprecated-api', () => {
  describe('Default Configuration (no APIs configured)', () => {
    ruleTester.run('no deprecated APIs defined', noDeprecatedApi, {
      valid: [
        {
          code: 'const x = myObject.someMethod();',
        },
        {
          code: 'const result = api.call();',
        },
      ],
      invalid: [],
    });
  });

  describe('Deprecated API Detection via Member Expression', () => {
    ruleTester.run('detect deprecated member access', noDeprecatedApi, {
      valid: [
        {
          code: 'const x = modernAPI.method();',
          options: [{
            apis: [
              {
                name: 'oldAPI',
                replacement: 'newAPI',
                deprecatedSince: '1.0.0',
                reason: 'Replaced by newAPI',
              },
            ],
          }],
        },
      ],
      invalid: [
        {
          code: 'const x = myObject.oldAPI();',
          options: [{
            apis: [
              {
                name: 'oldAPI',
                replacement: 'newAPI',
                deprecatedSince: '1.0.0',
                reason: 'Replaced by newAPI',
              },
            ],
          }],
          errors: [{
            messageId: 'deprecatedAPI',
          }],
        },
        {
          code: 'logger.oldAPI(data);',
          options: [{
            apis: [
              {
                name: 'oldAPI',
                replacement: 'newAPI',
                deprecatedSince: '2.0.0',
                reason: 'Old logging method',
              },
            ],
          }],
          errors: [{
            messageId: 'deprecatedAPI',
          }],
        },
      ],
    });
  });

  describe('Multiple Deprecated APIs', () => {
    ruleTester.run('multiple deprecated APIs', noDeprecatedApi, {
      valid: [
        {
          code: `
            const a = obj.newMethod1();
            const b = obj.newMethod2();
            const c = obj.newMethod3();
          `,
          options: [{
            apis: [
              {
                name: 'oldMethod1',
                replacement: 'newMethod1',
                deprecatedSince: '1.0.0',
                reason: 'old',
              },
              {
                name: 'oldMethod2',
                replacement: 'newMethod2',
                deprecatedSince: '1.5.0',
                reason: 'old',
              },
              {
                name: 'oldMethod3',
                replacement: 'newMethod3',
                deprecatedSince: '2.0.0',
                reason: 'old',
              },
            ],
          }],
        },
      ],
      invalid: [
        {
          code: 'api.oldMethod1();',
          options: [{
            apis: [
              {
                name: 'oldMethod1',
                replacement: 'newMethod1',
                deprecatedSince: '1.0.0',
                reason: 'old',
              },
            ],
          }],
          errors: [{
            messageId: 'deprecatedAPI',
          }],
        },
        {
          code: 'service.oldMethod2(arg);',
          options: [{
            apis: [
              {
                name: 'oldMethod2',
                replacement: 'newMethod2',
                deprecatedSince: '1.5.0',
                reason: 'old',
              },
            ],
          }],
          errors: [{
            messageId: 'deprecatedAPI',
          }],
        },
      ],
    });
  });

  describe('Chained Method Calls', () => {
    ruleTester.run('chained calls', noDeprecatedApi, {
      valid: [
        {
          code: 'obj.newAPI().method().call();',
          options: [{
            apis: [
              {
                name: 'oldAPI',
                replacement: 'newAPI',
                deprecatedSince: '1.0.0',
                reason: 'old',
              },
            ],
          }],
        },
      ],
      invalid: [
        {
          code: 'obj.oldAPI().method().call();',
          options: [{
            apis: [
              {
                name: 'oldAPI',
                replacement: 'newAPI',
                deprecatedSince: '1.0.0',
                reason: 'old',
              },
            ],
          }],
          errors: [{
            messageId: 'deprecatedAPI',
          }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noDeprecatedApi, {
      valid: [
        {
          code: 'const oldAPIString = "oldAPI is deprecated";',
          options: [{
            apis: [
              {
                name: 'oldAPI',
                replacement: 'newAPI',
                deprecatedSince: '1.0.0',
                reason: 'old',
              },
            ],
          }],
        },
        {
          code: 'const obj = { oldAPI: function() {} };',
          options: [{
            apis: [
              {
                name: 'oldAPI',
                replacement: 'newAPI',
                deprecatedSince: '1.0.0',
                reason: 'old',
              },
            ],
          }],
        },
      ],
      invalid: [
        {
          code: 'const val = api.oldAPI;',
          options: [{
            apis: [
              {
                name: 'oldAPI',
                replacement: 'newAPI',
                deprecatedSince: '1.0.0',
                reason: 'old',
              },
            ],
          }],
          errors: [{
            messageId: 'deprecatedAPI',
          }],
        },
      ],
    });
  });
});
