/**
 * Comprehensive tests for no-clickjacking rule
 * Security: CWE-1021 (Improper Restriction of Rendered UI Layers or Frames)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noClickjacking } from './index';

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
        // Frame-busting is the remediation `requireFrameBusting` asks for. The
        // rule reported it as `frameManipulation` — flagging its own fix. All
        // four spellings are the same program; the old check matched printed
        // source, so spacing changed the verdict.
        `if (top != self) { top.location = self.location; }`,
        `if (top !=  self) { top.location = self.location; }`,
        `if (top!==self) { top.location = self.location; }`,
        `if (window.top !== window.self) { window.top.location = window.self.location; }`,
        `if (top === self) { ok(); } else { top.location = self.location; }`,
        // Guard written window-qualified, assignment written bare — the same
        // program, and the reason the reference check walks the AST.
        `if (window.top != window.self) { top.location = self.location; }`,
        // A function boundary inside the guard is crossed only when the
        // function cannot escape it. An inline callback has no name to call
        // it by, so the frame check still gates the redirect.
        `if (top != self) { setTimeout(() => { top.location = self.location; }, 0); }`,
        // Same for an IIFE.
        `if (top != self) { (function () { top.location = self.location; })(); }`,
        // A named declaration whose every reference is inside the guard can
        // only run under it.
        `if (top != self) { function bust() { top.location = self.location; } bust(); }`,
        // Trusted iframe sources (starts with /)
        {
          code: '<iframe src="/local-content.html"></iframe>',
        },
        // Proper CSP (would be set server-side) - no UI elements
        {
          code: "// CSP: frame-ancestors 'self'; const x = 1;",
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
      invalid: [
        {
          // A call result is not a frame reference — this is not frame-busting.
          code: `if (getTop() != self) { top.location = 'https://evil.test'; }`,
          errors: 1,
        },

        {
          // An `if` that is NOT a frame comparison does not make the assignment
          // frame-busting — this is a redirect gated on an unrelated flag.
          code: `if (isEmbedded) { top.location = 'https://evil.test'; }`,
          errors: 1,
        },
        {
          // The guard does not reach through an escaping function. `var` is
          // function-scoped, so this binding hoists out of the block and the
          // call below resolves to it — the redirect can run with no frame
          // check having happened at all.
          //
          // The block-scoped spelling (`function doRedirect() {}` inside the
          // `if`) is deliberately NOT here: nothing outside can resolve it, so
          // it is unreachable rather than unguarded.
          code: `if (top != self) { var doRedirect = () => { top.location = 'https://evil.test'; }; } doRedirect();`,
          errors: 1,
        },
        {
          // Stored on an object inside the guard, callable from anywhere.
          code: `if (top != self) { window.doRedirect = () => { top.location = 'https://evil.test'; }; }`,
          errors: 1,
        },
      ],
    });
  });

  describe('Invalid Code - Missing Frame Busting', () => {
    // Note: missingFrameBusting now only triggers on entry point files (index/app/page.tsx/jsx)
    // These tests use the default test filename which is not an entry point
    ruleTester.run(
      'valid - non-entry-point files skip frame-busting check',
      noClickjacking,
      {
        valid: [
          // Code with button (UI element) but no frame-busting - now valid since not entry point
          {
            code: 'const x = 1; function handleClick() {} button;',
          },
          // Code with onClick handler but no frame-busting - now valid since not entry point
          {
            code: 'element.onClick = handler;',
          },
        ],
        invalid: [],
      },
    );
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
    ruleTester.run(
      'invalid - transparent elements that could hide attacks',
      noClickjacking,
      {
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
      },
    );
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

    ruleTester.run(
      'config - disable frame-busting requirement',
      noClickjacking,
      {
        valid: [
          // With requireFrameBusting=false, UI elements don't trigger missingFrameBusting
          {
            code: '<form><input type="text" /><button>Submit</button></form>',
            options: [{ requireFrameBusting: false }],
          },
        ],
        invalid: [],
      },
    );
  });

  describe('Complex Clickjacking Scenarios', () => {
    ruleTester.run(
      'complex - real-world clickjacking attack patterns',
      noClickjacking,
      {
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
      },
    );
  });
});

/**
 * Regression lock — the verdict must not move when the file is renamed.
 *
 * `requireFrameBusting` used to gate on a FILENAME REGEX
 * (`index|app|main|page|layout`) plus a `sourceCode.getText().includes('<button')`
 * scan of the whole file. Identical bytes reported in `src/app/layout.tsx` and
 * stayed silent in `src/components/Toolbar.tsx`. It now asks whether the file
 * builds a document shell, which is a fact about the code.
 */
const TOOLBAR = 'export default function T() { return <div><button onClick={go}>Go</button></div>; }';
const SHELL = 'export default function Root() { return <html><body><button onClick={go}>Go</button></body></html>; }';

ruleTester.run('lock: no verdict depends on the filename', noClickjacking, {
  valid: [
    // A component that renders a fragment inside somebody else's document has
    // no say in whether that document can be framed — under EITHER name.
    { code: TOOLBAR, filename: 'src/components/Toolbar.tsx' },
    { code: TOOLBAR, filename: 'src/app/layout.tsx' },
    { code: TOOLBAR, filename: 'src/app/page.tsx' },
    { code: TOOLBAR, filename: 'pages/index.jsx' },
  ],
  invalid: [
    // A document shell reports under EITHER name.
    {
      code: SHELL,
      filename: 'src/app/layout.tsx',
      errors: [{ messageId: 'missingFrameBusting' }],
    },
    {
      code: SHELL,
      filename: 'src/components/Toolbar.tsx',
      errors: [{ messageId: 'missingFrameBusting' }],
    },
    // `<head>` alone is enough — a shell need not spell out `<html>`.
    {
      code: 'export const Head = () => <head><title>App</title></head>;',
      filename: 'src/components/Head.tsx',
      errors: [{ messageId: 'missingFrameBusting' }],
    },
  ],
});

/**
 * Regression lock — a file that already declares frame protection is protected.
 *
 * Nothing but JavaScript frame-busting could clear the old check, so a root
 * layout serving `frame-ancestors 'none'` was still told it had no clickjacking
 * defence.
 */
ruleTester.run('lock: declared frame protection silences the rule', noClickjacking, {
  valid: [
    // CSP in a string constant next to the shell.
    {
      code: `const csp = "default-src 'self'; frame-ancestors 'none'";\nexport default function Root() { return <html><head><meta httpEquiv="Content-Security-Policy" content={csp} /></head><body /></html>; }`,
    },
    // CSP written straight into the meta tag.
    {
      code: `export default function Root() { return <html><head><meta httpEquiv="Content-Security-Policy" content="frame-ancestors 'self'" /></head><body /></html>; }`,
    },
    // A template literal builds the policy.
    {
      code: 'export default function Root() { const csp = `default-src \'self\'; frame-ancestors \'none\'`; return <html><body>{csp}</body></html>; }',
    },
    // X-Frame-Options instead of CSP.
    {
      code: `export default function Root() { const h = { "X-Frame-Options": "DENY" }; return <html><body>{JSON.stringify(h)}</body></html>; }`,
    },
    // Frame-busting JavaScript, the original remediation.
    {
      code: 'export default function Root() { if (top !== self) { top.location = self.location; } return <html><body /></html>; }',
    },
  ],
  invalid: [
    // `frame-ancestors *` allows every framer — that is not protection.
    {
      code: `export default function Root() { return <html><head><meta httpEquiv="Content-Security-Policy" content="frame-ancestors *" /></head><body /></html>; }`,
      errors: [{ messageId: 'missingFrameBusting' }],
    },
    // A CSP with no frame-ancestors directive at all.
    {
      code: `export default function Root() { return <html><head><meta httpEquiv="Content-Security-Policy" content="default-src 'self'" /></head><body /></html>; }`,
      errors: [{ messageId: 'missingFrameBusting' }],
    },
  ],
});

/**
 * Regression lock — the trustedSources allowlist compares ORIGINS.
 *
 * `source.includes(trusted)` made it trivially bypassable: the default
 * `['self', 'same-origin']` trusted `https://evil.example/self`.
 */
ruleTester.run('lock: trustedSources is an origin allowlist', noClickjacking, {
  valid: [
    // Same-origin relative src, under the default trustedSources.
    { code: '<iframe src="/embed/checkout" />' },
    // An explicitly allowlisted origin, with a path.
    {
      code: '<iframe src="https://trusted.com/embed/checkout" />',
      options: [{ trustedSources: ['https://trusted.com'] }],
    },
  ],
  invalid: [
    // The word `self` inside a foreign URL is not the `self` origin.
    {
      code: '<iframe src="https://evil.example/self" />',
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
    // Nor is an allowlisted origin echoed in a query string.
    {
      code: '<iframe src="https://evil.example/?next=https://trusted.com" />',
      options: [{ trustedSources: ['https://trusted.com'] }],
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
    // Protocol-relative is absolute, so it is not "self".
    {
      code: '<iframe src="//evil.example/widget" />',
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
  ],
});

/**
 * Every option, set to a value that changes the verdict on the SAME code.
 * A case that passes either way proves nothing about the option.
 */
const OVERLAY = 'const banner = "<div style=\'position: absolute; top: 0; left: 0\'></div>";';

ruleTester.run('options change the verdict', noClickjacking, {
  valid: [
    // detectTransparentOverlays: off silences the overlay report.
    { code: OVERLAY, options: [{ detectTransparentOverlays: false }] },
    // trustedAnnotations: a JSDoc marker the project defines.
    {
      code: '/** @overlay-reviewed */\nconst banner = "<div style=\'opacity: 0\'></div>";',
      options: [{ trustedAnnotations: ['overlay-reviewed'] }],
    },
  ],
  invalid: [
    // Same code, option at its default — the option is what changes it.
    { code: OVERLAY, errors: [{ messageId: 'transparentFrameOverlay' }] },
    // strictMode: true disables the safety checker, so an annotation that
    // silences the report by default no longer does.
    {
      code: '/** @overlay-reviewed */\nconst banner = "<div style=\'opacity: 0\'></div>";',
      options: [{ trustedAnnotations: ['overlay-reviewed'], strictMode: true }],
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
  ],
});

/** Edge shapes the origin comparison and the JSX/template walks must survive. */
ruleTester.run('edge shapes', noClickjacking, {
  valid: [
    // A protocol-relative allowlist entry matches a protocol-relative src.
    {
      code: '<iframe src="//cdn.example/widget" />',
      options: [{ trustedSources: ['//cdn.example'] }],
    },
    // A JSX tag that is a member expression is not a document shell.
    { code: 'const f = <Layout.Html><button onClick={go}>x</button></Layout.Html>;' },
    // A tagged template whose cooked value is undefined (invalid escape).
    { code: 'const t = tag`\\unicode and more`;' },
  ],
  invalid: [
    // An allowlist entry that is not a URL cannot match any origin.
    {
      code: '<iframe src="https://trusted.com/embed" />',
      options: [{ trustedSources: ['trusted.com'] }],
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
  ],
});

/**
 * Frame-busting recognised from the AST, including the `.location` comparison
 * form. The old check lowercased the printed test and looked for the literal
 * substrings `'top != self'`, `'top.location'` and friends, so spacing changed
 * the verdict and the same words inside a string matched.
 */
ruleTester.run('frame-busting is read from the AST', noClickjacking, {
  valid: [
    // Location comparison, in spellings the substring matcher missed.
    { code: 'if (top.location != self.location) { x(); } const f = <html><body /></html>;' },
    { code: 'if (window.top.location!==window.self.location) { x(); } const f = <html><body /></html>;' },
    { code: 'if (!self.location) { x(); } const f = <html><body /></html>;' },
  ],
  invalid: [
    // `.location` off something that is not a frame reference is not a frame
    // check.
    {
      code: 'if (iframeEl.location != preview.location) { x(); } const f = <html><body /></html>;',
      errors: [{ messageId: 'missingFrameBusting' }],
    },
    // A test nested deeper than the walk goes is not a frame check either —
    // the recursion is bounded on purpose.
    {
      code: 'if (top.location && a2 && a3 && a4 && a5 && a6 && a7 && a8 && a9 && a10) { x(); } const f = <html><body /></html>;',
      errors: [{ messageId: 'missingFrameBusting' }],
    },
  ],
});
