/**
 * @fileoverview Tests for no-http-urls
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHttpUrls } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-http-urls', noHttpUrls, {
  valid: [
    // HTTPS URLs
    { code: "const apiUrl = 'https://api.example.com/data'" },
    { code: "fetch('https://secure.example.com/api')" },
    // Allowed localhost
    { code: "const devUrl = 'http://localhost:3000'" },
    { code: "const localApi = 'http://127.0.0.1:8080/api'" },
    // Allowed hosts via options
    { 
      code: "const devUrl = 'http://dev.local/api'",
      options: [{ allowedHosts: ['dev.local'] }]
    },
    // Allowed ports via options
    { 
      code: "const devUrl = 'http://0.0.0.0:5000/api'",
      options: [{ allowedHosts: ['0.0.0.0'], allowedPorts: [5000] }]
    },
    // Non-URL strings
    { code: "const protocol = 'http'" },
    { code: "const x = 1" },
  ],

  invalid: [
    // Insecure http URLs
    { 
      code: "const apiUrl = 'http://api.example.com/data'", 
      errors: [{ messageId: 'insecureHttpWithException' }] 
    },
    { 
      code: "fetch('http://insecure.example.com/api')", 
      errors: [{ messageId: 'insecureHttpWithException' }] 
    },
    // Template literals
    { 
      code: "const url = `http://external.com/api/${path}`", 
      errors: [{ messageId: 'insecureHttpWithException' }] 
    },
    // Without allowed hosts (uses insecureHttp message)
    { 
      code: "const url = 'http://prod.example.com/api'",
      options: [{ allowedHosts: [] }],
      errors: [{ messageId: 'insecureHttp' }] 
    },
  ],
});
