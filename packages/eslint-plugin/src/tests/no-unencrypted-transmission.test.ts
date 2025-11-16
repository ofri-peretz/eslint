/**
 * Comprehensive tests for no-unencrypted-transmission rule
 * CWE-319: Cleartext Transmission of Sensitive Information
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noUnencryptedTransmission } from '../rules/security/no-unencrypted-transmission';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-unencrypted-transmission', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - secure protocols', noUnencryptedTransmission, {
      valid: [
        // HTTPS
        {
          code: 'const url = "https://api.example.com";',
        },
        {
          code: 'fetch("https://api.example.com/data");',
        },
        // WSS
        {
          code: 'const ws = new WebSocket("wss://example.com");',
        },
        // Secure database connections
        {
          code: 'const db = "mongodb+srv://user:pass@cluster.mongodb.net";',
        },
        {
          code: 'const redis = "rediss://localhost:6379";',
        },
        // Test files (when allowInTests is true)
        {
          code: 'const url = "http://localhost:3000";',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - HTTP', () => {
    ruleTester.run('invalid - HTTP protocol', noUnencryptedTransmission, {
      valid: [],
      invalid: [
        {
          code: 'const url = "http://api.example.com";',
          errors: [
            {
              messageId: 'unencryptedTransmission',
              data: {
                issue: 'using insecure protocol http://',
                safeAlternative: 'Use https:// instead of http://',
              },
              suggestions: [
                {
                  messageId: 'useHttps',
                  data: {
                    protocol: 'http://',
                    secureProtocol: 'https://',
                  },
                  output: 'const url = "https://api.example.com";',
                },
              ],
            },
          ],
        },
        {
          code: 'fetch("http://api.example.com/data");',
          errors: [
            {
              messageId: 'unencryptedTransmission',
              data: {
                issue: 'using insecure protocol http://',
                safeAlternative: 'Use https:// instead of http://',
              },
              suggestions: [
                {
                  messageId: 'useHttps',
                  data: {
                    protocol: 'http://',
                    secureProtocol: 'https://',
                  },
                  output: 'fetch("https://api.example.com/data");',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - WebSocket', () => {
    ruleTester.run('invalid - WS protocol', noUnencryptedTransmission, {
      valid: [],
      invalid: [
        {
          code: 'const ws = new WebSocket("ws://example.com");',
          errors: [
            {
              messageId: 'unencryptedTransmission',
              data: {
                issue: 'using insecure protocol ws://',
                safeAlternative: 'Use wss:// instead of ws://',
              },
              suggestions: [
                {
                  messageId: 'useHttps',
                  data: {
                    protocol: 'ws://',
                    secureProtocol: 'wss://',
                  },
                  output: 'const ws = new WebSocket("wss://example.com");',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Database Connections', () => {
    ruleTester.run('invalid - unencrypted database', noUnencryptedTransmission, {
      valid: [],
      invalid: [
        {
          code: 'const db = "mongodb://user:pass@localhost:27017";',
          errors: [
            {
              messageId: 'unencryptedTransmission',
              data: {
                issue: 'using insecure protocol mongodb://',
                safeAlternative: 'Use mongodb+srv:// instead of mongodb://',
              },
              suggestions: [
                {
                  messageId: 'useHttps',
                  data: {
                    protocol: 'mongodb://',
                    secureProtocol: 'mongodb+srv://',
                  },
                  output: 'const db = "mongodb+srv://user:pass@localhost:27017";',
                },
              ],
            },
          ],
        },
        {
          code: 'const redis = "redis://localhost:6379";',
          errors: [
            {
              messageId: 'unencryptedTransmission',
              data: {
                issue: 'using insecure protocol redis://',
                safeAlternative: 'Use rediss:// instead of redis://',
              },
              suggestions: [
                {
                  messageId: 'useHttps',
                  data: {
                    protocol: 'redis://',
                    secureProtocol: 'rediss://',
                  },
                  output: 'const redis = "rediss://localhost:6379";',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Template Literals', () => {
    ruleTester.run('invalid - insecure protocol in template', noUnencryptedTransmission, {
      valid: [],
      invalid: [
        {
          code: 'const url = `http://${host}/api`;',
          errors: [
            {
              messageId: 'unencryptedTransmission',
              data: {
                issue: 'using insecure protocol http:// in template literal',
                safeAlternative: 'Use https:// instead of http://',
              },
              suggestions: undefined,
            },
          ],
        },
      ],
    });
  });
});

