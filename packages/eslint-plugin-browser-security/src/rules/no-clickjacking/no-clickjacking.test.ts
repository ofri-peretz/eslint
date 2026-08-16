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
/**
 * NOTE — this constant USED to be
 *
 *   "<div style='position: absolute; top: 0; left: 0'></div>"
 *
 * and it was asserted INVALID: a `transparentFrameOverlay` finding on an
 * element that is fully visible. That is an ordinary full-bleed element — a
 * hero, a scrim, a sticky header — and the test pinned the rule to reporting
 * it. A clickjacking overlay is dangerous precisely because it is present in
 * the hit-test tree and INVISIBLE, so that it swallows the click meant for
 * what is underneath; position alone carries none of that. The test asserted
 * the defect as correct, so the fixture is now an actually-invisible overlay
 * and the visible one is asserted VALID below.
 */
const OVERLAY =
  'const banner = "<div style=\'position: absolute; top: 0; left: 0; opacity: 0\'></div>";';

ruleTester.run('options change the verdict', noClickjacking, {
  valid: [
    // detectTransparentOverlays: off silences the overlay report.
    { code: OVERLAY, options: [{ detectTransparentOverlays: false }] },
    // A VISIBLE full-bleed element is not an overlay at any option setting.
    {
      code: 'const banner = "<div style=\'position: absolute; top: 0; left: 0\'></div>";',
    },
    // Nor is one removed from layout: `display: none` receives no clicks, so
    // it cannot swallow one.
    {
      code: 'const bar = "<div style=\'position: absolute; top: 0; left: 0; display: none\'></div>";',
    },
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

/**
 * Regression lock — an overlay is decided by ITS DECLARATIONS, not by whether
 * the author happened to write the word "style" or "css" nearby.
 *
 * The CSS gate was `text.includes('style=') || text.includes('css')`, which is
 * a test of phrasing. A styled-components block, an emotion rule and a plain
 * style string name neither word, so every CSS-in-JS overlay in the corpus was
 * invisible.
 */
ruleTester.run('lock: CSS is recognised by parsing it', noClickjacking, {
  valid: [
    // Prose with colons is not CSS.
    { code: `const t = 'Transparency: we show you every fee, up front.';` },
    { code: `const r = 'Contrast ratio: 4.5:1 minimum';` },
    // A fade-in is on its way to being VISIBLE.
    {
      code: 'const css = `.skeleton { position: absolute; top: 0; opacity: 0; transition: opacity 0.3s ease-in; }`;',
    },
  ],
  invalid: [
    // A styled-components overlay: no "style", no "css", still an overlay.
    {
      code: 'const Capture = styled.div`position: fixed; inset: 0; opacity: 0;`;',
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
    // A plain style string with a negative z-index.
    {
      code: `const style = 'position: absolute; top: 0; left: 0; z-index: -1';`,
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
  ],
});

/**
 * Regression lock — `window.`-prefixed frame references.
 *
 * The receiver had to be a bare Identifier, so `window.top.location = url`
 * matched at NEITHER level: the outer node was skipped for its shape, and the
 * inner `window.top` only ever found a MemberExpression above it, never the
 * assignment. And the guard check accepted only the window comparison while
 * `hasFrameBusting` also accepted the LOCATION comparison — so a file could be
 * recognised as frame-busting and have its frame-busting reported.
 */
ruleTester.run('lock: window-prefixed frame references', noClickjacking, {
  valid: [
    // The location-comparison guard, with the redirect in a callback that
    // cannot escape it. Both halves are the remediation.
    {
      code: `if (window.top.location !== window.self.location) { setTimeout(() => { top.location = self.location; }, 0); }`,
    },
  ],
  invalid: [
    {
      code: `function escapeFrame() { window.top.location = 'https://app.example/home'; }`,
      errors: [{ messageId: 'frameManipulation' }],
    },
  ],
});

/**
 * Regression lock — an iframe's origin is folded through scope.
 *
 * Only an inline string literal was read, so the hard-coded embeds were seen
 * and the configurable ones — the ones a deployment can point anywhere — were
 * not. Resolution must decide the verdict in BOTH directions: the same shape
 * resolving to a relative path stays quiet.
 */
ruleTester.run('lock: iframe src resolves through scope', noClickjacking, {
  valid: [
    { code: `const P = '/preview/document'; const el = <iframe src={P} />;` },
    {
      code: `const P = ['/a', '/b']; const el = <iframe src={P[1]} />;`,
    },
    // Unfoldable: a rule that cannot read the origin must not guess at it.
    { code: `const el = <iframe src={props.src} />;` },
  ],
  invalid: [
    {
      code: `const O = 'https://widgets.partner.example/embed'; const el = <iframe src={O} />;`,
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
    {
      code: `const E = ['https://a.example/w', 'https://b.example/w']; const el = <iframe src={E[1]} />;`,
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
  ],
});

/** Edge shapes the iframe-src folding must survive. */
ruleTester.run('edge shapes: src folding', noClickjacking, {
  valid: [
    // Non-string and unfoldable expressions.
    { code: `const el = <iframe src={42} />;` },
    { code: `const el = <iframe src={a + b} />;` },
    { code: `const N = 42; const el = <iframe src={N} />;` },
    // A re-assigned binding has no single knowable value.
    { code: `let u = '/a'; u = 'https://evil.example'; const el = <iframe src={u} />;` },
    // A computed index that is not a number.
    { code: `const A = ['https://evil.example']; const el = <iframe src={A[k]} />;` },
    // An index past the end of the array.
    { code: `const A = ['https://evil.example']; const el = <iframe src={A[5]} />;` },
    // A hole in the array.
    { code: `const A = [, 'https://evil.example']; const el = <iframe src={A[0]} />;` },
    // The array reached through an unresolvable name.
    { code: `const el = <iframe src={unknownTable[0]} />;` },
    // A member expression that is not computed.
    { code: `const el = <iframe src={config.embedUrl} />;` },
    // An iframe with no src at all, and one with an empty src.
    { code: `const el = <iframe title="x" />;` },
    { code: `const el = <iframe src="" />;` },
    // An explicitly trusted absolute origin.
    {
      code: `const el = <iframe src="https://trusted.example/w" />;`,
      options: [{ trustedSources: ['https://trusted.example'] }],
    },
    // A protocol-relative URL is absolute, and is NOT same-origin — but with
    // the origin explicitly trusted it is allowed.
    {
      code: `const el = <iframe src="//trusted.example/w" />;`,
      options: [{ trustedSources: ['//trusted.example'] }],
    },
  ],
  invalid: [
    // A nested constant chain.
    {
      code: `const A = 'https://evil.example/w'; const B = A; const el = <iframe src={B} />;`,
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
    // A protocol-relative URL can leave the origin, so 'self' does not cover it.
    {
      code: `const el = <iframe src="//evil.example/w" />;`,
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
    // A trusted entry that is not a URL and does not match the source.
    {
      code: `const el = <iframe src="https://evil.example/w" />;`,
      options: [{ trustedSources: ['not-a-url'] }],
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
  ],
});

/** Edge shapes the CSS parser and the animation exclusion must survive. */
ruleTester.run('edge shapes: css parsing', noClickjacking, {
  valid: [
    // A colon with no recognised CSS property either side.
    { code: `const s = 'note: remember to check this';` },
    // An animation on the property that made it look invisible.
    { code: `const s = 'visibility: hidden; transition: visibility 0.2s;';` },
    { code: `const s = 'opacity: 0; animation: fade-in 1s;';` },
    // An animation on a DIFFERENT property does not excuse invisibility —
    // asserted invalid below; here the animation names nothing relevant and
    // the element is visible.
    { code: `const s = 'opacity: 1; transition: transform 0.2s;';` },
    // `!important` and a trailing comma are stripped from the value.
    { code: `const s = 'opacity: 0.5 !important; position: absolute;';` },
  ],
  invalid: [
    // An animation on an unrelated property leaves the invisibility standing.
    {
      code: `const s = 'opacity: 0; transition: transform 0.2s;';`,
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
    // `!important` stripped, still fully transparent.
    {
      code: `const s = 'position: absolute; opacity: 0 !important;';`,
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
  ],
});

/**
 * The folds are BOUNDED. A chain longer than the bound resolves to nothing
 * rather than looping, and the same chain inside the bound still resolves.
 */
ruleTester.run('bounded folding', noClickjacking, {
  valid: [
    // Six hops — past the bound, so the origin is unreadable.
    {
      code: `const a = 'https://evil.example/w'; const b = a; const c = b; const d = c; const e = d; const f = e; const el = <iframe src={f} />;`,
    },
    // A deep array chain, likewise past the bound.
    {
      code: `const a = ['https://evil.example/w']; const b = a; const c = b; const d = c; const e = d; const el = <iframe src={e[0]} />;`,
    },
  ],
  invalid: [
    // Three hops — inside the bound.
    {
      code: `const a = 'https://evil.example/w'; const b = a; const c = b; const el = <iframe src={c} />;`,
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
    // An array reached through one alias.
    {
      code: `const a = ['https://evil.example/w']; const b = a; const el = <iframe src={b[0]} />;`,
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
  ],
});

/** The array fold accepts only what it can prove. */
ruleTester.run('array folding shapes', noClickjacking, {
  valid: [
    // The container is a call result, not a foldable array.
    { code: `const el = <iframe src={getTable()[0]} />;` },
    // The container folds to something that is not an array.
    { code: `const T = { a: 1 }; const el = <iframe src={T[0]} />;` },
  ],
  invalid: [
    // A nested table, folded twice.
    {
      code: `const T = [['https://evil.example/w']]; const el = <iframe src={T[0][0]} />;`,
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
  ],
});

/** The nested-table fold, in both directions. */
ruleTester.run('nested table folding', noClickjacking, {
  valid: [
    { code: `const T = [['https://evil.example/w']]; const el = <iframe src={T[0][k]} />;` },
    { code: `const T = [['https://evil.example/w']]; const el = <iframe src={T[9][0]} />;` },
    { code: `const T = [[, 'https://evil.example/w']]; const el = <iframe src={T[0][0]} />;` },
    { code: `const T = [['/preview']]; const el = <iframe src={T[0][0]} />;` },
  ],
  invalid: [],
});

/** A nested table indexed by something unreadable. */
ruleTester.run('unreadable nested index', noClickjacking, {
  valid: [{ code: `const T = [['https://evil.example/w']]; const el = <iframe src={T[k][0]} />;` }],
  invalid: [],
});

/** The overlay option also governs template literals. */
ruleTester.run('overlay option covers templates', noClickjacking, {
  valid: [
    {
      code: 'const t = `position: absolute; top: 0; opacity: 0`;',
      options: [{ detectTransparentOverlays: false }],
    },
  ],
  invalid: [
    {
      code: 'const t = `position: absolute; top: 0; opacity: 0`;',
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
  ],
});
