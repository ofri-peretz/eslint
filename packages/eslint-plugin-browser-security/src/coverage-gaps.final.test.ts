/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Final layer-1 coverage tests closing the last uncovered branches found by
 * the 100% wave (istanbul branch report on this package). Each fixture names
 * the exact line/branch it exercises.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';

import { noClickjacking } from './rules/no-clickjacking';
import { noMissingCorsCheck } from './rules/no-missing-cors-check';
import { noSensitiveLocalstorage } from './rules/no-sensitive-localstorage';
import { noSensitiveSessionstorage } from './rules/no-sensitive-sessionstorage';
import { noUnescapedUrlParameter } from './rules/no-unescaped-url-parameter';
import { noWorkerMessageInnerhtml } from './rules/no-worker-message-innerhtml';

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

// ---------------------------------------------------------------------------
// no-clickjacking
// ---------------------------------------------------------------------------
ruleTester.run('no-clickjacking (final coverage)', noClickjacking, {
  valid: [
    // IfStatement that is NOT frame-busting code (L301 else path)
    { code: 'if (count > 3) { run(); }', filename: 'lib.ts' },
    // MemberExpression compared on the RIGHT side of a BinaryExpression
    // (L370 `current.right === node` arm) with an equality operator.
    { code: 'if (x === window.top) { y(); }', filename: 'lib.ts' },
    // TemplateLiteral visitor with detectTransparentOverlays disabled
    // (L429 else path)
    {
      code: 'const css = `position: absolute; top: 0; left: 0; opacity: 0; style`;',
      options: [{ detectTransparentOverlays: false }],
      filename: 'lib.ts',
    },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// no-missing-cors-check
// ---------------------------------------------------------------------------
ruleTester.run('no-missing-cors-check (final coverage)', noMissingCorsCheck, {
  valid: [
    // Zero-argument use() call: firstArg ternary null arm (L288) and the
    // non-CallExpression firstArg guard (L301 else path)
    { code: 'app.use();', filename: 'server.ts' },
    // ObjectExpression firstArg whose text mentions cors(: corsCallArg stays
    // null so node.arguments is scanned (L314/L315 alternate arms); no
    // wildcard origin, so no report.
    { code: 'app.use({ handler: cors(cb) });', filename: 'server.ts' },
    // Identifier cors argument resolved through an arrow function with an
    // EXPRESSION body: scopeBody falls back to [] (L353 alternate arm) and
    // the immediate-scope-only search finds nothing.
    {
      code: [
        'const corsOpts = { origin: "*" };',
        'const setup = (app) => app.use(cors(corsOpts));',
      ].join('\n'),
      filename: 'server.ts',
    },
  ],
  invalid: [
    // Wildcard literal in a Property whose key is NOT origin/allowedOrigins
    // (L210 else path) but still inside a cors(...) call context.
    {
      code: 'const c = cors({ methods: "*" });',
      filename: 'server.ts',
      errors: [{ messageId: 'missingCorsCheck' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-sensitive-localstorage
// ---------------------------------------------------------------------------
ruleTester.run('no-sensitive-localstorage (final coverage)', noSensitiveLocalstorage, {
  valid: [
    // Key argument that is neither a string Literal nor an Identifier
    // (L177 else-if fall-through: keyValue stays null)
    { code: 'localStorage.setItem(getKey(), data);', filename: 'app.ts' },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// no-sensitive-sessionstorage
// ---------------------------------------------------------------------------
ruleTester.run('no-sensitive-sessionstorage (final coverage)', noSensitiveSessionstorage, {
  valid: [
    // Key argument that is neither a string Literal nor an Identifier
    // (L147 else-if fall-through: keyValue stays null)
    { code: 'sessionStorage.setItem(getKey(), data);', filename: 'app.ts' },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// no-unescaped-url-parameter
// ---------------------------------------------------------------------------
ruleTester.run('no-unescaped-url-parameter (final coverage)', noUnescapedUrlParameter, {
  valid: [
    // BinaryExpression with a non-`+` operator (L282 else path)
    { code: 'const masked = a & b;', filename: 'app.ts' },
    // URL concatenation whose right side is not user input (L311 else path)
    {
      code: 'const u = "https://api.example.com/items?page=" + pageNumber;',
      filename: 'app.ts',
    },
    // Self-referential initializer: the recursive isUserControlled call hits
    // the visited-set short-circuit (L351 true path) and returns false.
    {
      code: 'var q = q; window.location.href = q;',
      filename: 'app.ts',
    },
    // Identifier whose initializer is a plain Literal: not user-controlled,
    // not a TemplateLiteral, not a BinaryExpression (L371 else path).
    {
      code: 'const dest = 5; window.location.href = dest;',
      filename: 'app.ts',
    },
    // Assignment target whose object is a CallExpression: objectName falls
    // back to '' (L392 alternate arm) and isLocationAssignment stays false
    // (L395 else, L404 else).
    { code: 'getWin().href = value;', filename: 'app.ts' },
    // Computed property on a location member: propName falls back to ''
    // (L393 alternate arm).
    { code: 'window.location["href"] = value;', filename: 'app.ts' },
    // Identifier assignment target that is not `location` (L399 else path)
    { code: 'dest2 = "https://example.com";', filename: 'app.ts' },
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// no-worker-message-innerhtml
// ---------------------------------------------------------------------------
ruleTester.run('no-worker-message-innerhtml (final coverage)', noWorkerMessageInnerhtml, {
  valid: [
    // addEventListener('message') on a MemberExpression object: obj is not
    // an Identifier so it is never registered as a worker (L150 else path).
    {
      code: 'self.pool.addEventListener("message", onMsg);',
      filename: 'app.ts',
    },
  ],
  invalid: [],
});
