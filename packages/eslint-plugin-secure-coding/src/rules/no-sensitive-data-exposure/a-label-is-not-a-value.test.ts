/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A credential word in the prose of a log line is not a credential in the log.
 *
 * The rule used to report a label — `token:`, `password=`, `API key:` —
 * followed by ANY runtime value, on the theory that the label says what the
 * value is. Run over the MCP TypeScript SDK's examples it reported four lines,
 * and none of them logged a secret:
 *
 *   - help text naming the `ANTHROPIC_API_KEY` environment variable;
 *   - "resumption token", the SSE last-event id, twice;
 *   - the label `Token:` in front of the token ENDPOINT's URL.
 *
 * The evidence the rule now needs is the value itself: an identifier, a
 * property or an object key whose name says it holds a secret (followed one
 * binding hop, and through a local object literal), or a string literal that
 * carries one written out (`'password: hunter2'`). A label in front of a value
 * the rule cannot name is prose.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSensitiveDataExposure } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const exposure = [{ messageId: 'sensitiveDataExposure' as const }];

describe('no-sensitive-data-exposure — a label is not a value', () => {
  ruleTester.run('label-vs-value', noSensitiveDataExposure, {
    valid: [
      {
        // @source modelcontextprotocol/typescript-sdk examples/client-quickstart/src/index.ts:186
        // @found real-source scan
        name: 'FP: help text naming an env var is prose — both halves of the + are literals',
        code: `
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) {
            console.log(
              '\\nNo ANTHROPIC_API_KEY found. To query these tools with Claude, set your API key:'
              + '\\n  export ANTHROPIC_API_KEY=your-api-key-here'
            );
          }
        `,
      },
      {
        // The same help text written as one literal. A label and its value sit
        // on one line; the next line is a different sentence.
        name: 'a label at the end of a line does not label the next line',
        code: `console.log('Set your API key:\\n  export ANTHROPIC_API_KEY=your-api-key-here');`,
      },
      {
        // @source modelcontextprotocol/typescript-sdk examples/repl/client.ts:680
        // @found real-source scan
        name: 'FP: "resumption token" labels an SSE event id with a literal fallback',
        code: `
          let notificationsToolLastEventId;
          export function start() {
            console.log(\`Using resumption token: \${notificationsToolLastEventId || 'none'}\`);
          }
        `,
      },
      {
        // @source modelcontextprotocol/typescript-sdk examples/repl/client.ts:684
        // @found real-source scan
        name: 'FP: "resumption token" labels an event id passed to a callback',
        code: `
          const onLastEventIdUpdate = (event) => {
            console.log(\`Updated resumption token: \${event}\`);
          };
        `,
      },
      {
        // @source modelcontextprotocol/typescript-sdk examples/shared/src/authServer.ts:330
        // @found real-source scan
        name: 'FP: the label Token: in front of the token endpoint URL',
        code: `
          export function announce(authServerUrl) {
            console.log(\`  Token: \${authServerUrl}api/auth/mcp/token\`);
          }
        `,
      },
      {
        name: 'a label in front of an opaque value is prose: the value names nothing',
        code: 'export function f(t) { console.log(`access token: ${t}`); }',
      },
      {
        name: 'the same with + concatenation',
        code: 'export function f(value) { throw new Error("password: " + value); }',
      },
    ],
    invalid: [
      {
        // @source modelcontextprotocol/typescript-sdk examples/shared/src/auth.ts:158
        // A demo password printed on purpose so the reader can log in — but it
        // is `randomBytes(16)`, generated per run, and it goes to the log. The
        // rule cannot see intent; a banner meant for a human is still a
        // credential in a log stream. Suppress it inline where it is wanted.
        name: 'a generated password printed as a banner is still a password in the log',
        code: `
          import { randomBytes } from 'node:crypto';
          const DEMO_PASSWORD = randomBytes(16).toString('base64url');
          export const DEMO_USER_CREDENTIALS = { email: 'demo@example.com', password: DEMO_PASSWORD };
          console.log(\`[Auth]   Password: \${DEMO_USER_CREDENTIALS.password}\`);
        `,
        errors: exposure,
      },
      {
        name: 'the value names the secret: a template hole',
        code: 'export function f(accessToken) { console.log(`access token: ${accessToken}`); }',
        errors: exposure,
      },
      {
        name: 'the value names the secret: the right side of +',
        code: 'export function f(password) { throw new Error("password: " + password); }',
        errors: exposure,
      },
      {
        name: 'a literal that writes the credential out still reports',
        code: `console.log('password: hunter2');`,
        errors: exposure,
      },
      {
        name: 'a literal value after the label, in a template with an unrelated hole',
        code: 'export function f(user) { console.log(`${user} logged in with password: hunter2`); }',
        errors: exposure,
      },
      {
        // Only the label used to catch this; with the label gone, the value
        // path reads through the local literal instead, and catches it with
        // no label at all.
        // @found rule review
        name: 'FN: a secret aliased into .message through a local object literal is read as the secret',
        code: 'export function f(accessToken) { const error = { message: accessToken }; console.log(`failed: ${error.message}`); }',
        errors: exposure,
      },
    ],
  });
});
