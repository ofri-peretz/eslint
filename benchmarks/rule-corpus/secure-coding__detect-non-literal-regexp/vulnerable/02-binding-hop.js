/**
 * One binding hop, then a template literal.
 *
 * The value is copied into a `const` before it reaches the constructor, which is
 * how nearly every real handler is written. A `const` binding is NOT evidence of
 * a constant value — the initialiser is what decides, and here it is the network.
 */
import express from 'express';

import { customerRepository } from '../repositories/customer-repository.js';

export const router = express.Router();

router.get('/customers', async (req, res) => {
  const term = req.query.q;
  const contains = new RegExp(`.*${term}.*`, 'i');

  const customers = await customerRepository.all();
  res.json(customers.filter((customer) => contains.test(customer.companyName)));
});
