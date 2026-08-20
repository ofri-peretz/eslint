/**
 * VULNERABLE (partial mitigation, judged honestly) - A truthiness guard is not a
 * type check. `{}`, `[]` and `{"$ne":null}` are all truthy, so every object
 * payload sails past `if (accountId)` and reaches the ORM as an operator. It
 * rejects only the empty string and `undefined`, which was never the threat.
 */
import { Invoice } from '../models/invoice';

export async function fetchInvoices(req, res) {
  const accountId = req.query.accountId;
  if (accountId) {
    const invoices = await Invoice.find({ account: accountId });
    return res.json(invoices);
  }
  return res.status(400).json({ error: 'accountId required' });
}
