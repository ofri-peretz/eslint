/**
 * @fileoverview Tests for no-insecure-websocket
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noInsecureWebsocket } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-insecure-websocket', noInsecureWebsocket, {
  valid: [
    // Secure WebSocket connections
    { code: "new WebSocket('wss://example.com')" },
    { code: "const ws = new WebSocket('wss://secure.example.com/socket')" },
    { code: "new WebSocket(`wss://example.com/${path}`)" },
    // Non-WebSocket code
    { code: "const x = 1" },
  ],

  invalid: [
    // Insecure WebSocket connections (caught by both NewExpression and Literal)
    { 
      code: "new WebSocket('ws://example.com')", 
      errors: [{ messageId: 'violationDetected' }, { messageId: 'violationDetected' }]
    },
    // Template literal (only caught by NewExpression)
    { 
      code: "new WebSocket(`ws://example.com/${path}`)", 
      errors: [{ messageId: 'violationDetected' }]
    },
    // ws:// in standalone string literal
    { 
      code: "const url = 'ws://example.com'", 
      errors: [{ messageId: 'violationDetected' }]
    },
  ],
});
