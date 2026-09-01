/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

/**
 * "Does this function look like a Lambda handler?" — asked by name, because
 * position cannot answer it.
 *
 * AWS documents the signature as `(event, context, callback)`, and those three
 * ARE its words. But the parameters are POSITIONAL: nothing stops a handler
 * being written `(payload, runtime)`, and plenty are. Three rules carried the
 * same private guess at the abbreviations people use —
 * `['event', 'evt', 'e', 'request', 'req']` — which is our invention, not
 * AWS's, and a codebase that writes `(payload, ctx)` matched none of it.
 *
 * Position alone is not the answer either: `params.length >= 1` would make
 * every one-argument function a Lambda handler. The name is doing real work
 * here, which is exactly why the consumer has to be able to state it.
 *
 * Shared so the three rules cannot drift apart — they had already diverged by
 * one entry (`require-timeout-handling` knew `lambdaContext`; the others did
 * not).
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
 */
export const DEFAULT_EVENT_PARAM_NAMES: string[] = [
  'event',
  'evt',
  'e',
  'request',
  'req',
];

/** The second positional parameter of the AWS handler signature. */
export const DEFAULT_CONTEXT_PARAM_NAMES: string[] = [
  'context',
  'ctx',
  'lambdaContext',
];

/**
 * The JSON-schema fragment every rule that reads these should expose.
 *
 * Deliberately NOT `as const`: `Record<string, JSONSchema4>` is mutable, and a
 * readonly object is not assignable to it. The build caught that, which is
 * what the build is for.
 */
export const HANDLER_PARAM_SCHEMA: Record<string, JSONSchema4> = {
  eventParamNames: {
    type: 'array',
    items: { type: 'string' },
    default: [...DEFAULT_EVENT_PARAM_NAMES],
    description:
      'Parameter names that identify the Lambda event argument. Replaces the default.',
  },
};
