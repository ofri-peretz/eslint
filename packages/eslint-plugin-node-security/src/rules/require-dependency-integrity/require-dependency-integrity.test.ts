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
    { code: 'const x = 1' },
    // TAGGED template, every quasi an invalid escape: `cooked` is null
    // throughout, so `renderTemplate` reads `raw` — and raw holds no CDN tag.
    {
      name: 'every quasi an invalid escape — raw holds no CDN tag',
      code: 'tag`\\unicode${x}\\unicode`',
    },
  ],

  invalid: [
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
