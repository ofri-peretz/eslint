/**
 * @fileoverview Tests for require-mime-type-validation
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { requireMimeTypeValidation } from './index';

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

const MULTER = `import multer from 'multer';\n`;

ruleTester.run('require-mime-type-validation', requireMimeTypeValidation, {
  valid: [
    'const x = 42;',
    'const flag = true;',
    'const x = 1',
    // Multer with a real type check.
    { code: `${MULTER}multer({ fileFilter: validateMime }).single('file')` },
    {
      code: `${MULTER}const upload = multer({ fileFilter: validateMime });\nupload.array('photos');`,
    },

    // ---- REGRESSION LOCK: the `upload(...)` detector is GONE.
    //
    // It matched any call to a function SPELLED `upload` carrying a single
    // identifier argument and reported it at CWE-434 / CVSS 8.8. `upload(file)`
    // and `upload()` were both asserted in THIS file as true positives. That is
    // the repo's forbidden defect class — a rule deciding by a name — and
    // narrowing was not an option, because there was no evidence to narrow on.
    { code: `await upload(file);` },
    { code: `await upload(formData);` },
    { code: `upload();` },
    { code: `const upload = (f) => api.put(f);\nupload(payload);` },

    // ---- REGRESSION LOCK: `.type` is not the File API's alone.
    //
    // A `.type` read tested by prefix is a MIME check only when the compared
    // literal is a media type. `TS` and `user` are not IANA top-level types, so
    // an AST visitor and a Redux slice must both stay quiet.
    { code: `if (node.type.startsWith('TS')) visit(node);` },
    { code: `if (action.type.startsWith('user/')) reduce(action);` },
    { code: `if (event.type.includes('key')) handle(event);` },

    // Exact allowlist membership — the correct remediation.
    {
      code: `const ALLOWED = new Set(['image/png', 'image/jpeg']);\nif (ALLOWED.has(file.type)) send(file);`,
    },
    {
      code: `input.onchange = (e) => {\n  const f = e.target.files[0];\n  if (f.type !== 'application/pdf') return;\n  const body = new FormData();\n  body.append('file', f);\n  fetch('/u', { method: 'POST', body });\n};`,
    },
    // A FormData post that carries no selected file at all.
    {
      code: `const body = new FormData();\nbody.append('name', user.name);\nfetch('/p', { method: 'POST', body });`,
    },
    // A member-expression receiver resolves to no multer call.
    { code: `api.upload.single('file');` },
    // A call that is not multer's.
    { code: `configureUploads().single('file');` },
    // `fetch` with no options object, and with options carrying no body.
    { code: `fetch('/api/files');` },
    { code: `fetch('/api/files', { method: 'GET' });` },
    // `send`/`append` with too few arguments are not upload sinks.
    { code: `function go(input) { const f = input.files[0]; socket.send(); }` },
    { code: `function go(input) { const f = input.files[0]; bag.append('k'); }` },
    // One handler yields at most one finding.
    {
      code: `function go(input) {\n  const f = input.files[0];\n  if (f.type === 'image/png') {\n    body.append('a', f);\n    body.append('b', f);\n  }\n}`,
    },
    // A substring test on a `.type` with no media-type literal.
    { code: `if (file.type.startsWith(prefix)) send(file);` },
  ],

  invalid: [
    // ---- Multer, resolved through the binding.
    //
    // The idiomatic two-step spelling was QUIET: the check required
    // `callee.object` to be a CallExpression, so only the fully-inlined form
    // matched. Almost all real multer code is written this way.
    {
      code: `${MULTER}const upload = multer({ dest: 'uploads/' });\napp.post('/f', upload.single('file'), handler);`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: `${MULTER}multer().single('avatar')`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: `${MULTER}multer().array('photos')`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // `limits` caps file SIZE and validates no type. This exact code was
    // asserted as VALID in this file.
    {
      code: `${MULTER}multer({ limits: { fileSize: 1024 } }).single('file')`,
      errors: [{ messageId: 'violationDetected' }],
    },

    // ---- A media type tested by substring rather than equality.
    // `image/svg+xml` satisfies every one of these and then executes script
    // when the file is served back.
    {
      code: `if (file.type.startsWith('image/')) send(file);`,
      errors: [{ messageId: 'prefixMimeCheck', data: { method: 'startsWith' } }],
    },
    {
      code: `if (file.type.includes('image/')) send(file);`,
      errors: [{ messageId: 'prefixMimeCheck' }],
    },
    {
      code: `if (file.type.indexOf('application/') === 0) send(file);`,
      errors: [{ messageId: 'prefixMimeCheck' }],
    },

    // ---- Selected files uploaded with no media-type evidence anywhere.
    {
      code: `input.onchange = (e) => {\n  const f = e.target.files[0];\n  const body = new FormData();\n  body.append('file', f);\n  fetch('/u', { method: 'POST', body });\n};`,
      errors: [{ messageId: 'missingMimeValidation' }],
    },
    {
      code: `function send(input) {\n  const xhr = new XMLHttpRequest();\n  xhr.open('POST', '/u');\n  xhr.send(input.files[0]);\n}`,
      errors: [{ messageId: 'missingMimeValidation' }],
    },
    // Two sinks in one handler still yield exactly one finding.
    {
      code: `function go(input) {\n  const f = input.files[0];\n  body.append('a', f);\n  body.append('b', f);\n}`,
      errors: [{ messageId: 'missingMimeValidation' }],
    },
    // At module level the whole Program is the scope.
    {
      code: `const f = document.querySelector('#i').files[0];\nconst body = new FormData();\nbody.append('file', f);`,
      errors: [{ messageId: 'missingMimeValidation' }],
    },
  ],
});
