/**
 * Tests for no-insecure-http-parser
 * CWE-444: Inconsistent Interpretation of HTTP Requests (Request Smuggling)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureHttpParser } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-insecure-http-parser', () => {
  ruleTester.run('no-insecure-http-parser', noInsecureHttpParser, {
    valid: [
      // benchmarks/corpus/CWE-444/safe/server-default-parser.js and
      // .../request-default-parser.js — the option is simply absent.
      { name: 'the default parser', code: `http.createServer((req, res) => res.end('ok'));` },
      { code: `https.request({ host, path, method: 'GET' }, onResponse);` },
      // Explicitly strict.
      { code: `http.createServer({ insecureHTTPParser: false }, handler);` },
      // A non-literal value may well be false at runtime — reporting is a guess.
      { code: `http.createServer({ insecureHTTPParser: allowLegacy }, handler);` },
      { code: `opts.insecureHTTPParser = allowLegacy;` },
      { code: `opts.insecureHTTPParser = false;` },
      // A computed identifier key names a variable, not this option.
      { code: `const o = { [insecureHTTPParser]: true };` },
      { code: 'const o = { [`x`]: true };' },
      { code: `opts[key] = true;` },
      // Unrelated keys.
      { code: `const o = { keepAlive: true };` },
      { code: `const o = { 'keepAlive': true };` },
      { code: `opts.keepAlive = true;` },
      { code: `enabled = true;` },
      // allowInTests bypass, both handlers.
      {
        code: `http.createServer({ insecureHTTPParser: true }, handler);`,
        options: [{ allowInTests: true }],
        filename: 'server.test.ts',
      },
      {
        code: `opts.insecureHTTPParser = true;`,
        options: [{ allowInTests: true }],
        filename: 'server.test.ts',
      },
    ],
    invalid: [
      // LOCK: benchmarks/corpus/CWE-444/vulnerable/server-insecure-parser.js
      {
        name: 'insecureHTTPParser accepts malformed requests, which is how smuggling starts',
        code: `http.createServer({ insecureHTTPParser: true }, (req, res) => res.end('ok'));`,
        errors: [
          {
            messageId: 'insecureHttpParser',
            suggestions: [
              {
                messageId: 'useStrictParser',
                output: `http.createServer({ insecureHTTPParser: false }, (req, res) => res.end('ok'));`,
              },
            ],
          },
        ],
      },
      // LOCK: benchmarks/corpus/CWE-444/vulnerable/request-insecure-parser.js
      {
        code: `const req = https.request({ host, path, method: 'GET', insecureHTTPParser: true }, onResponse);`,
        errors: [
          {
            messageId: 'insecureHttpParser',
            suggestions: [
              {
                messageId: 'useStrictParser',
                output: `const req = https.request({ host, path, method: 'GET', insecureHTTPParser: false }, onResponse);`,
              },
            ],
          },
        ],
      },
      // String key spelling.
      {
        code: `const o = { 'insecureHTTPParser': true };`,
        errors: [
          {
            messageId: 'insecureHttpParser',
            suggestions: [
              {
                messageId: 'useStrictParser',
                output: `const o = { 'insecureHTTPParser': false };`,
              },
            ],
          },
        ],
      },
      // Built once, passed to http.createServer somewhere else — anchoring on
      // the property is what makes this reachable at all.
      {
        code: `serverOptions.insecureHTTPParser = true;`,
        errors: [
          {
            messageId: 'insecureHttpParser',
            suggestions: [
              {
                messageId: 'useStrictParser',
                output: `serverOptions.insecureHTTPParser = false;`,
              },
            ],
          },
        ],
      },
      {
        code: `serverOptions['insecureHTTPParser'] = true;`,
        errors: [
          {
            messageId: 'insecureHttpParser',
            suggestions: [
              {
                messageId: 'useStrictParser',
                output: `serverOptions['insecureHTTPParser'] = false;`,
              },
            ],
          },
        ],
      },
      // allowInTests: true but NOT a test file — the bypass must not leak.
      {
        code: `http.createServer({ insecureHTTPParser: true }, handler);`,
        options: [{ allowInTests: true }],
        filename: 'server.ts',
        errors: [
          {
            messageId: 'insecureHttpParser',
            suggestions: [
              {
                messageId: 'useStrictParser',
                output: `http.createServer({ insecureHTTPParser: false }, handler);`,
              },
            ],
          },
        ],
      },
      {
        code: `opts.insecureHTTPParser = true;`,
        options: [{ allowInTests: true }],
        filename: 'server.ts',
        errors: [
          {
            messageId: 'insecureHttpParser',
            suggestions: [
              {
                messageId: 'useStrictParser',
                output: `opts.insecureHTTPParser = false;`,
              },
            ],
          },
        ],
      },
    ],
  });
});
