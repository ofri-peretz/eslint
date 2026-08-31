/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

/**
 * "Is this receiver the Express app or a router?" — asked by name, because
 * nothing structural distinguishes `app.get('/x', h)` from `cache.get(key)`.
 *
 * Express creates the object by CALL — `express()`, `express.Router()` — and
 * whatever the result is assigned to is the consumer's choice. Nothing in the
 * framework blesses `app`; it is a convention in its documentation, and one
 * plenty of codebases spell differently (`server`, `api`, `v1Router`).
 *
 * Three rules each carried a private guess at that convention, and they had
 * already drifted apart:
 *
 *   no-permissive-trust-proxy      app server router express
 *   require-rate-limiting          app router express api apiRouter routes
 *   require-route-authentication   app router express api
 *
 * So `server.set('trust proxy', true)` was reported while
 * `server.get('/x', h)` was not, for no reason a consumer could discover or
 * change. The union of the three is the default, and it is replaceable.
 *
 * @see https://expressjs.com/en/4x/api.html#app
 * @see https://expressjs.com/en/4x/api.html#router
 */
export const DEFAULT_APP_RECEIVER_NAMES: string[] = [
  'app',
  'server',
  'router',
  'express',
  'api',
  'apiRouter',
  'routes',
];

/**
 * The JSON-schema fragment every rule that reads these should expose.
 *
 * Deliberately NOT `as const`: `Record<string, JSONSchema4>` is mutable, and a
 * readonly object is not assignable to it.
 */
export const APP_RECEIVER_SCHEMA: Record<string, JSONSchema4> = {
  appReceiverNames: {
    type: 'array',
    items: { type: 'string' },
    default: [...DEFAULT_APP_RECEIVER_NAMES],
    description:
      'Identifiers that hold the Express app or a router. Replaces the default.',
  },
};

/** Whether `name` is one of the configured app/router receivers. */
export function isAppReceiver(
  name: string,
  appReceiverNames: string[] | undefined,
): boolean {
  const names = appReceiverNames ?? DEFAULT_APP_RECEIVER_NAMES;
  return names.some((candidate) => candidate.toLowerCase() === name.toLowerCase());
}
