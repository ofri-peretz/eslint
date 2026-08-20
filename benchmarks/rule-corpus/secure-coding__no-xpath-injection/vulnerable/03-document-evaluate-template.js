/**
 * VULNERABLE - The DOM's own evaluator, driven by a path parameter. Template
 * interpolation is string concatenation with nicer syntax; the predicate is
 * still open.
 */
import { Router } from 'express';
import { invoiceDocument } from '../lib/invoices';

export const router = Router();

router.get('/invoices/:id/lines', (req, res) => {
  const doc = invoiceDocument();
  const result = doc.evaluate(
    `//invoice[@id="${req.params.id}"]/line`,
    doc,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null,
  );
  res.json({ count: result.snapshotLength });
});
