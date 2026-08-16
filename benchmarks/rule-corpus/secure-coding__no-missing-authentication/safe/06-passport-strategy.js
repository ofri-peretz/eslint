/**
 * SAFE - Sensitive routes guarded by Passport, written the way the Passport
 * docs write it. The JWT strategy is verified before the handler runs.
 */
import express from 'express';
import passport from 'passport';

import { listOrders, refundOrder } from '../services/orders.js';

export const app = express();

app.get('/api/orders', passport.authenticate('jwt', { session: false }), listOrders);
app.post('/api/orders/:id/refund', passport.authenticate('jwt', { session: false }), refundOrder);
