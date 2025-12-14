/**
 * @fileoverview Tests for require-dependency-integrity
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireDependencyIntegrity } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-dependency-integrity', requireDependencyIntegrity, {
  valid: [
    // Resources with integrity
    { code: "const html = '<script src=\"https://cdn.example.com/lib.js\" integrity=\"sha384-abc\"></script>'" },
    { code: "const link = '<link href=\"https://cdnjs.cloudflare.com/style.css\" integrity=\"sha256-xyz\">'" },
    // Non-CDN resources
    { code: "const script = '<script src=\"/local/app.js\"></script>'" },
    { code: "const x = 1" },
  ],

  invalid: [
    // CDN resources without integrity
    { 
      code: "const html = '<script src=\"https://cdn.example.com/lib.js\"></script>'",
      errors: [{ messageId: 'violationDetected' }]
    },
    { 
      code: "const link = '<link href=\"https://cdnjs.cloudflare.com/style.css\">'",
      errors: [{ messageId: 'violationDetected' }]
    },
    { 
      code: "const js = '<script src=\"https://unpkg.com/react@17/umd/react.js\"></script>'",
      errors: [{ messageId: 'violationDetected' }]
    },
    { 
      code: "`<script src=\"https://jsdelivr.net/lib.js\"></script>`",
      errors: [{ messageId: 'violationDetected' }]
    },
  ],
});
