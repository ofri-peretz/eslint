/**
 * Tests for require-blob-url-revocation rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireBlobUrlRevocation } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-blob-url-revocation', requireBlobUrlRevocation, {
  valid: [
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
    // Properly revoked
    {
      name: 'the URL is revoked',
      code: `
        const url = URL.createObjectURL(blob);
        img.src = url;
        URL.revokeObjectURL(url);
      `,
    },
    // Test files allowed
    {
      code: `const url = URL.createObjectURL(blob);`,
      filename: 'file.test.ts',
    },
    // Not a createObjectURL call
    {
      code: `const url = someOtherFunction(blob);`,
    },
  ],
  invalid: [
    // Missing revocation
    {
      name: 'an object URL created and never revoked',
      code: `const url = URL.createObjectURL(blob);`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // Used but not revoked
    {
      code: `
        const blobUrl = URL.createObjectURL(file);
        img.src = blobUrl;
      `,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // Test file with allowInTests: false
    {
      code: `const url = URL.createObjectURL(blob);`,
      filename: 'file.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingRevoke' }],
    },
  ],
});

/**
 * REGRESSION LOCK — ownership is a BINDING, not a spelling, and the handle does
 * not have to live in a `const`.
 *
 * Three omissions, each of which hid real leaks:
 *
 *   1. Both halves required a bare `Identifier` named `URL`, so
 *      `window.URL.createObjectURL` was not a creation AND
 *      `window.URL.revokeObjectURL` was not a revocation — a false negative and
 *      a false positive from the same line of code. `self.URL` is the only
 *      spelling available inside a worker.
 *   2. Only `const x = URL.createObjectURL(...)` was tracked, so
 *      `img.src = URL.createObjectURL(file)` — the most common spelling of the
 *      API — was invisible.
 *   3. Ownership was keyed on the variable's NAME, file-wide, so one revocation
 *      released every same-named handle in every other function.
 *
 * Every case below fails on the pre-fix rule.
 */
ruleTester.run('require-blob-url-revocation-ownership', requireBlobUrlRevocation, {
  valid: [
    // Created and released through the qualified global.
    {
      code: `const reportUrl = window.URL.createObjectURL(blob);\nwindow.open(reportUrl);\nwindow.URL.revokeObjectURL(reportUrl);`,
    },
    // A handle parked on a property, released through the same path.
    {
      code: `preview.src = URL.createObjectURL(file);\npreview.onload = () => URL.revokeObjectURL(preview.src);`,
    },
    // An instance property, released by the component's teardown.
    {
      code: `class Lightbox {\n  open(file) { this.previewUrl = URL.createObjectURL(file); }\n  destroy() { URL.revokeObjectURL(this.previewUrl); }\n}`,
    },
    // A helper that hands ownership to its caller by returning the handle.
    { code: `export function createPreviewUrl(file) { return URL.createObjectURL(file); }` },
    // Not the platform's URL — a test double with the same method name.
    {
      code: `const fakeUrl = { createObjectURL: (b) => 'blob:' + b.size };\nconst u = fakeUrl.createObjectURL(blob);`,
    },
    // A computed target is not a trackable path, so no claim is made either way.
    { code: `slots[index] = URL.createObjectURL(blob);` },
    // Assignment to an existing binding, released through that binding.
    {
      code: `let url;\nurl = URL.createObjectURL(blob);\nimg.src = url;\nURL.revokeObjectURL(url);`,
    },
    // A path whose root is a call is not a trackable path.
    { code: `getState().previewUrl = URL.createObjectURL(blob);` },
    // An implicit global — no binding anywhere — still has one slot per name.
    {
      code: `implicitUrl = URL.createObjectURL(blob);\nURL.revokeObjectURL(implicitUrl);`,
    },
  ],
  invalid: [
    // The most common spelling: straight into the sink, no variable at all.
    {
      code: `preview.src = URL.createObjectURL(event.target.files[0]);`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // The qualified global as a creation.
    {
      code: `const reportUrl = window.URL.createObjectURL(blob);\nwindow.open(reportUrl);`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // Worker spelling.
    {
      code: `const handle = self.URL.createObjectURL(blob);\npost(handle);`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // Stored nowhere at all: unreachable, therefore unrevocable.
    {
      code: `URL.createObjectURL(blob);`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // Two scopes, one name, one revocation. The second helper still leaks.
    {
      code: `function a(rows) {\n  const objectUrl = URL.createObjectURL(new Blob([rows]));\n  URL.revokeObjectURL(objectUrl);\n}\nfunction b(bytes) {\n  const objectUrl = URL.createObjectURL(new Blob([bytes]));\n  download(objectUrl);\n}`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // A revocation IS present — of a DIFFERENT handle.
    {
      code: `let currentUrl = null;\nfunction swap(file) {\n  const nextUrl = URL.createObjectURL(file);\n  URL.revokeObjectURL(currentUrl);\n  preview.src = nextUrl;\n}`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // Assignment to an existing binding, never released.
    {
      code: `let url;\nurl = URL.createObjectURL(blob);\nimg.src = url;`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // A revocation whose argument is a computed path pins nothing.
    {
      code: `const url = URL.createObjectURL(blob);\nURL.revokeObjectURL(slots[0]);`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // An implicit global, never released.
    {
      code: `implicitUrl = URL.createObjectURL(blob);\nimg.src = implicitUrl;`,
      errors: [{ messageId: 'missingRevoke' }],
    },
  ],
});
