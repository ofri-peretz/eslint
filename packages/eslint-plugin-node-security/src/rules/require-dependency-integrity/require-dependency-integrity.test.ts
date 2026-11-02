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
    {
      name: 'integrity is present',
      code: 'const html = \'<script src="https://cdn.example.com/lib.js" integrity="sha384-abc"></script>\'',
    },
    {
      code: 'const link = \'<link href="https://cdnjs.cloudflare.com/style.css" integrity="sha256-xyz">\'',
    },
    // Non-CDN resources
    { code: 'const script = \'<script src="/local/app.js"></script>\'' },
    {
      code: 'const x = 1',
      name: 'code with no CDN resource tag has nothing to check',
    },
    // TAGGED template, every quasi an invalid escape: `cooked` is null
    // throughout, so `renderTemplate` reads `raw` — and raw holds no CDN tag.
    {
      name: 'every quasi an invalid escape — raw holds no CDN tag',
      code: 'tag`\\unicode${x}\\unicode`',
    },
    {
      name: 'a same-origin proxy path that names a CDN URL in its query is same-origin',
      code: 'const html = \'<script src="/proxy?url=https://cdn.jsdelivr.net/npm/a.js"></script>\'',
    },
    {
      // Prefetch is a hint for a later navigation; SRI applies to preload,
      // stylesheet and modulepreload only, whatever `as` says.
      name: 'a prefetch link takes no integrity even as a script',
      code: 'const html = \'<link rel="prefetch" as="script" href="https://cdn.jsdelivr.net/npm/a.js">\'',
    },
    {
      name: 'an icon link takes no integrity',
      code: 'const html = \'<link rel="icon" href="https://cdn.jsdelivr.net/favicon.ico">\'',
    },
  ],

  invalid: [
    {
      name: 'single-quoted attributes are attributes',
      code: "const html = \"<script data-note='a > b' src='https://cdn.jsdelivr.net/npm/a.js'></script>\"",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      // `rel` is a space-separated token list; "alternate stylesheet" is the
      // standard way to offer an alternative style sheet.
      name: 'an alternate stylesheet is a stylesheet',
      code: "const html = \"<link rel='alternate stylesheet' href='https://cdn.jsdelivr.net/npm/dark.css'>\"",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a rel of only whitespace names no relation, so the link is still judged',
      code: 'const html = \'<link rel=" " href="https://cdn.jsdelivr.net/npm/a.css">\'',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'an escaped tag opener in a template is still a script tag',
      code: 'const html = `\\x3Cscript src="https://cdn.jsdelivr.net/npm/a.js">\\x3C/script>`',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'an escaped tag opener after an interpolation is still a script tag',
      code: 'const html = `<!-- ${title} -->\\x3Cscript src="https://cdn.jsdelivr.net/npm/a.js">\\x3C/script>`',
      errors: [{ messageId: 'violationDetected' }],
    },
    // CDN resources without integrity
    {
      name: 'a CDN script tag with no integrity attribute',
      code: 'const html = \'<script src="https://cdn.example.com/lib.js"></script>\'',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const link = \'<link href="https://cdnjs.cloudflare.com/style.css">\'',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const js = \'<script src="https://unpkg.com/react@17/umd/react.js"></script>\'',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a CDN script tag in a template literal with no integrity attribute is reported',
      code: '`<script src="https://jsdelivr.net/lib.js"></script>`',
      errors: [{ messageId: 'violationDetected' }],
    },
    // The positive control for the null-`cooked` fallback: quasis[0] cooks
    // normally and carries the tag, the TRAILING quasi is an invalid escape and
    // cooks to null. The tag is still found — a null quasi must not swallow the
    // rest of the template.
    {
      name: 'a null trailing quasi must not swallow the rest of the template',
      code: 'tag`<script src="https://jsdelivr.net/lib.js"></script>${x}\\unicode`',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
