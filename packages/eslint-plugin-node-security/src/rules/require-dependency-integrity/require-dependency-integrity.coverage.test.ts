/**
 * Coverage-gap tests for require-dependency-integrity (dual-layer, Layer 1).
 * Targets: non-matching string literals, and every TemplateLiteral branch
 * (link/href match, non-CDN sources, integrity present).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireDependencyIntegrity } from './index';

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

describe('require-dependency-integrity coverage gaps', () => {
  ruleTester.run('require-dependency-integrity', requireDependencyIntegrity, {
    valid: [
      // Plain string literal, no script/link markup → outer check false
      { code: "const s = 'hello world';" },
      // Plain template literal, no markup → template outer check false
      { code: 'const t = `hello world`;' },
      // Template script tag from a NON-CDN source → CDN check false
      {
        code: 'const t = `<script src="https://example.com/app.js"></script>`;',
      },
      // Template CDN script WITH integrity → integrity check blocks report
      {
        code: 'const t = `<script src="https://cdn.example.com/app.js" integrity="sha384-abc"></script>`;',
      },
    ],
    invalid: [
      // Template <link href=...> from a CDN without integrity → reported
      {
        code: 'const t = `<link href="https://cdn.example.com/style.css">`;',
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  });
});
