/**
 * @fileoverview Tests for no-insecure-websocket
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noInsecureWebsocket } from './index';

/*
 * Fixture hosts deliberately avoid `example.com`. RFC 2606 reserves it precisely so that
 * nothing treats it as a real endpoint, and these rules now exempt it — a placeholder
 * domain cannot be a cleartext-transmission risk. Using it as a stand-in for "some remote
 * host" would test the exemption, not the rule.
 */

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-insecure-websocket', noInsecureWebsocket, {
  valid: [
        'const x = 42;',
        'const flag = true;',
    // Secure WebSocket connections
    { code: "new WebSocket('wss://acmecorp.io')" },
    { code: "const ws = new WebSocket('wss://secure.acmecorp.io/socket')" },
    { code: "new WebSocket(`wss://acmecorp.io/${path}`)" },
    // Non-WebSocket code
    { code: "const x = 1" },
  ],

  invalid: [
    // Insecure WebSocket connections (caught by both NewExpression and Literal)
    { 
      code: "new WebSocket('ws://acmecorp.io')", 
      errors: [{ messageId: 'violationDetected' }, { messageId: 'violationDetected' }]
    },
    // Template literal (only caught by NewExpression)
    { 
      code: "new WebSocket(`ws://acmecorp.io/${path}`)", 
      errors: [{ messageId: 'violationDetected' }]
    },
    // ws:// in standalone string literal
    { 
      code: "const url = 'ws://acmecorp.io'", 
      errors: [{ messageId: 'violationDetected' }]
    },
  ],
});
