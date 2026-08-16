/**
 * VULNERABLE (adversarial wave) - Express's own `app.route()` chaining API,
 * copied from the Express 4 routing guide. Three unauthenticated methods on the
 * admin token surface.
 *
 * The registration call's object is `app.route('/admin/tokens')`, a
 * CallExpression rather than an Identifier, so nothing here matches the
 * "object is a router-shaped identifier" shape at all.
 */
import express from 'express';

import { createToken, listTokens, revokeToken } from '../services/tokens.js';

export const app = express();

app
  .route('/admin/tokens')
  .get(listTokens)
  .post(createToken)
  .delete(revokeToken);
