/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A Lambda handler's parameters are POSITIONAL, so their names are the
 * consumer's.
 *
 * AWS documents the signature as `(event, context, callback)` and those are its
 * words — but nothing stops a handler being written `(payload, runtime)`, and
 * the private list three rules shared (`event, evt, e, request, req`) was our
 * guess at the abbreviations, not AWS's. Position alone cannot replace it:
 * `params.length >= 1` would make every one-argument function a handler.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe as suite, it, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';

import { requireTimeoutHandling } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = suite;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

/** The Lambda evidence gate: every fixture must look like a Lambda file. */
const lambda = (body: string) =>
  `import { Handler } from 'aws-lambda';\n${body}`;

const CALLS_OUT = `await fetch('https://x');`;

suite(
  'require-timeout-handling — the handler parameter names are the project’s',
  () => {
    ruleTester.run('eventParamNames', requireTimeoutHandling, {
      valid: [
        {
          // REPLACES: a name we guessed is no longer one of theirs.
          name: 'a default name the consumer replaced out of the list',
          code: lambda(
            `export const handler = async (event, context) => { ${CALLS_OUT} };`,
          ),
          options: [{ eventParamNames: ['payload'] }],
        },
      ],
      invalid: [
        {
          name: 'the default vocabulary still recognises the AWS spelling',
          code: lambda(
            `export const handler = async (event, context) => { ${CALLS_OUT} };`,
          ),
          errors: 1,
        },
        {
          // The point: a handler written in anybody's own words is now reachable.
          name: 'a handler whose parameters are named nothing in particular',
          code: lambda(
            `export const handler = async (payload, runtime) => { ${CALLS_OUT} };`,
          ),
          options: [
            { eventParamNames: ['payload'], contextParamNames: ['runtime'] },
          ],
          errors: 1,
        },
      ],
    });
  },
);
