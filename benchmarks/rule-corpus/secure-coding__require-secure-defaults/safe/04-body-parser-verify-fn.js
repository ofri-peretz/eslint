/**
 * SAFE - NOMINAL CONTROL. body-parser's `verify` option is a FUNCTION, and the
 * one supplied here is a Stripe signature check - a security control being
 * added, not removed. The key name is one of the three this rule watches.
 */
import bodyParser from 'body-parser';
import express from 'express';

import { assertStripeSignature } from '../lib/stripe';

export const app = express();

app.use(
  bodyParser.json({
    verify: (req, res, buf) => assertStripeSignature(req.headers['stripe-signature'], buf),
  }),
);
