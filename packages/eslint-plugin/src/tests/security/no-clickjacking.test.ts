/**
 * Comprehensive tests for no-clickjacking rule
 * Security: CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noClickjacking } from '../../rules/security/no-clickjacking';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+) with JSX support
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

describe('no-clickjacking', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - protected against clickjacking', noClickjacking, {
      valid: [
        // Trusted iframe sources (starts with /)
        {
          code: '<iframe src="/local-content.html"></iframe>',
        },
        // Proper CSP (would be set server-side) - no UI elements
        {
          code: '// CSP: frame-ancestors \'self\'; const x = 1;',
        },
        // Code without UI elements doesn't require frame-busting
        {
          code: 'const data = { name: "test" };',
        },
        // Frame-busting detection (marks hasFrameBusting=true)
        {
          code: 'if (top != self) { console.log("framed"); }',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Frame Busting', () => {
    ruleTester.run('invalid - missing frame-busting code', noClickjacking, {
      valid: [],
      invalid: [
        // Code with button (UI element) but no frame-busting
        {
          code: 'const x = 1; function handleClick() {} button;',
          errors: [
            {
              messageId: 'missingFrameBusting',
            },
          ],
        },
        // Code with onClick handler but no frame-busting
        {
          code: 'element.onClick = handler;',
          errors: [
            {
              messageId: 'missingFrameBusting',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Unsafe iframe Usage', () => {
    ruleTester.run('invalid - unsafe iframe sources', noClickjacking, {
      valid: [],
      invalid: [
        // External HTTP source is untrusted
        // missingFrameBusting only triggers for UI elements (button|input|form|a|div)
        {
          code: '<iframe src="http://external-site.com"></iframe>',
          errors: [
            {
              messageId: 'unsafeIframeUsage',
            },
          ],
        },
        // HTTPS untrusted source
        {
          code: '<iframe src="https://untrusted.com/widget"></iframe>',
          errors: [
            {
              messageId: 'unsafeIframeUsage',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Frame Manipulation', () => {
    ruleTester.run('invalid - dangerous frame manipulation', noClickjacking, {
      valid: [],
      invalid: [
        // Direct assignment to top.location
        // missingFrameBusting only triggers for UI elements
        {
          code: 'top.location = "http://evil.com";',
          errors: [
            {
              messageId: 'frameManipulation',
            },
          ],
        },
        // Assignment to window.location
        {
          code: 'window.location = "http://evil.com";',
          errors: [
            {
              messageId: 'frameManipulation',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Transparent Overlays', () => {
    ruleTester.run('invalid - transparent elements that could hide attacks', noClickjacking, {
      valid: [],
      invalid: [
        // Literal must include 'style=' or 'css' to trigger
        // missingFrameBusting only triggers for UI elements
        {
          code: 'const css = "style=opacity: 0; position: absolute; top: 0; left: 0;";',
          errors: [
            {
              messageId: 'transparentFrameOverlay',
            },
          ],
        },
        // cssText with visibility hidden
        {
          code: 'element.cssText = "css visibility: hidden; z-index: -1;";',
          errors: [
            {
              messageId: 'transparentFrameOverlay',
            },
          ],
        },
        // Template literal with 'style' keyword
        {
          code: 'const style = `style opacity: 0; position: absolute; top: 0; left: 0;`;',
          errors: [
            {
              messageId: 'transparentFrameOverlay',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noClickjacking, {
      valid: [
        // Trusted sources (starts with /)
        {
          code: '<iframe src="/local-content.html"></iframe>',
        },
        // Safe frame-busting comparison (doesn't assign)
        {
          code: 'if (top !== self) { console.log("framed"); }',
        },
        // String without 'style=' or 'css' doesn't trigger overlay check
        {
          code: 'const loadingStyle = "opacity: 0; transition: opacity 0.3s;";',
        },
        // Disabled frame-busting requirement
        {
          code: '<button onClick={handleClick}>Click me</button>',
          options: [{ requireFrameBusting: false }],
        },
        // Code without UI elements
        {
          code: 'const data = 123;',
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - trusted sources', noClickjacking, {
      valid: [
        // Trusted source configured - no unsafeIframeUsage
        // iframe alone doesn't trigger missingFrameBusting
        {
          code: '<iframe src="https://trusted.com"></iframe>',
          options: [{ trustedSources: ['https://trusted.com'] }],
        },
      ],
      invalid: [
        // Untrusted source - only unsafeIframeUsage (no UI elements for missingFrameBusting)
        {
          code: '<iframe src="https://untrusted.com"></iframe>',
          options: [{ trustedSources: ['https://trusted.com'] }],
          errors: [
            {
              messageId: 'unsafeIframeUsage',
            },
          ],
        },
      ],
    });

    ruleTester.run('config - disable frame-busting requirement', noClickjacking, {
      valid: [
        // With requireFrameBusting=false, UI elements don't trigger missingFrameBusting
        {
          code: '<form><input type="text" /><button>Submit</button></form>',
          options: [{ requireFrameBusting: false }],
        },
      ],
      invalid: [],
    });
  });

  describe('Complex Clickjacking Scenarios', () => {
    ruleTester.run('complex - real-world clickjacking attack patterns', noClickjacking, {
      valid: [],
      invalid: [
        // Untrusted iframe source - only unsafeIframeUsage (iframe doesn't count as UI element)
        {
          code: '<iframe src="https://untrusted-social-widget.com/like" width="200" height="50" />',
          errors: [
            {
              messageId: 'unsafeIframeUsage',
            },
          ],
        },
        // Frame manipulation attempt - only frameManipulation
        {
          code: 'window.location = "https://evil.com";',
          errors: [
            {
              messageId: 'frameManipulation',
            },
          ],
        },
      ],
    });
  });
});
