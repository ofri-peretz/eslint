/**
 * Tests for require-websocket-wss rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireWebsocketWss } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-websocket-wss', requireWebsocketWss, {
  valid: [
    // Correct usage: secure wss://
    {
      code: `const ws = new WebSocket('wss://example.com/socket');`,
    },
    {
      code: `const ws = new WebSocket('wss://api.example.com:443/ws');`,
    },
    // Localhost is allowed by default
    {
      code: `const ws = new WebSocket('ws://localhost:3000');`,
    },
    {
      code: `const ws = new WebSocket('ws://127.0.0.1:8080');`,
    },
    {
      code: `const ws = new WebSocket('ws://0.0.0.0:3000');`,
    },
    // IPv6 localhost
    {
      code: `const ws = new WebSocket('ws://[::1]:3000');`,
    },
    // Template literal with wss
    {
      code: 'const ws = new WebSocket(`wss://${host}/socket`);',
    },
    // Variable URL (can't analyze statically)
    {
      code: `const ws = new WebSocket(wsUrl);`,
    },
    // Test files allowed by default
    {
      code: `const ws = new WebSocket('ws://example.com');`,
      filename: 'test.spec.ts',
    },
    // Not a WebSocket constructor
    {
      code: `const msg = new Message('ws://example.com');`,
    },
    // WebSocket as method call (not constructor)
    {
      code: `const ws = createWebSocket('ws://example.com');`,
    },
  ],
  invalid: [
    // Basic insecure WebSocket
    {
      code: `const ws = new WebSocket('ws://example.com');`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://example.com');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://example.com');`,
    },
    // With port
    {
      code: `const ws = new WebSocket('ws://api.example.com:8080/socket');`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://api.example.com:8080/socket');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://api.example.com:8080/socket');`,
    },
    // With path
    {
      code: `const ws = new WebSocket('ws://example.com/api/v1/socket');`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://example.com/api/v1/socket');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://example.com/api/v1/socket');`,
    },
    // Template literal with ws:// (no auto-fix, only suggestion)
    {
      code: 'const ws = new WebSocket(`ws://example.com/socket`);',
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: 'const ws = new WebSocket(`wss://example.com/socket`);' },
          ],
        },
      ],
    },
    // Localhost with allowLocalhost: false
    {
      code: `const ws = new WebSocket('ws://localhost:3000');`,
      options: [{ allowLocalhost: false }],
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://localhost:3000');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://localhost:3000');`,
    },
    // 127.0.0.1 with allowLocalhost: false
    {
      code: `const ws = new WebSocket('ws://127.0.0.1:8080');`,
      options: [{ allowLocalhost: false }],
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://127.0.0.1:8080');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://127.0.0.1:8080');`,
    },
    // Test file with allowInTests: false
    {
      code: `const ws = new WebSocket('ws://example.com');`,
      filename: 'test.spec.ts',
      options: [{ allowInTests: false }],
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://example.com');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://example.com');`,
    },
    // Double quotes (fix converts to single quotes)
    {
      code: `const ws = new WebSocket("ws://example.com");`,
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            { messageId: 'useWss', output: `const ws = new WebSocket('wss://example.com');` },
          ],
        },
      ],
      output: `const ws = new WebSocket('wss://example.com');`,
    },
  ],
});
