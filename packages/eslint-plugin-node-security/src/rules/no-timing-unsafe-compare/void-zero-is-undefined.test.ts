/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTimingUnsafeCompare } from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/**
 * Found scanning firecrawl-mcp's bundled `dist/server.js` (FastMCP): a tool
 * handler reads `request.params._meta` and checks
 * `meta?.progressToken === void 0` before sending a progress notification.
 * `void 0` is how bundlers and minifiers write `undefined`, so this is a
 * presence check with no secret on either side. `=== undefined` was already
 * silent; the bundled spelling was not.
 */
const HANDLER = (check: string): string => `
  server.setRequestHandler(S, async (request) => {
    const meta = request.params._meta;
    if (${check}) return;
  });
`;

ruleTester.run('void 0 is undefined, not a secret', noTimingUnsafeCompare, {
  valid: [
    {
      name: 'the bundled presence check',
      code: HANDLER('meta?.progressToken === void 0'),
    },
    { name: 'negated', code: HANDLER('meta.progressToken !== void 0') },
    { name: 'void on the left', code: HANDLER('void 0 == meta.progressToken') },
    {
      name: 'any void expression is undefined',
      code: HANDLER('meta.authToken === void "x"'),
    },
    {
      name: 'the source spelling stays silent',
      code: HANDLER('meta.progressToken === undefined'),
    },
  ],
  invalid: [
    {
      name: 'the same handler comparing the token with a configured secret still reports',
      code: HANDLER('meta.authToken === process.env.API_SECRET'),
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
    {
      name: 'a non-void unary on a secret is not a constant',
      code: HANDLER('meta.authToken === !process.env.API_SECRET'),
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
  ],
});
