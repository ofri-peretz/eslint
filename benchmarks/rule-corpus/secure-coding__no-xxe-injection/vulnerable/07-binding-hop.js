/**
 * VULNERABLE - One binding hop. The tainted document is read into a local named
 * for WHAT IT IS (a purchase order) rather than for where it came from. Nothing
 * about the exposure changed between this file and 03; only the spelling did.
 */
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ processEntities: true });

export function importPurchaseOrder(req) {
  const purchaseOrder = req.body.document;
  return parser.parse(purchaseOrder);
}
