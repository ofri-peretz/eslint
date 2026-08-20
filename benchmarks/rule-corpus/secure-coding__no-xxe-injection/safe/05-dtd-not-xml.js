/**
 * SAFE - NOMINAL CONTROL. `dtd` here is a Data Transfer Descriptor in a
 * payments integration, and `doctype` is a Handlebars layout flag. Both words
 * belong to XXE's vocabulary and neither is XML.
 */
import { renderInvoiceHtml } from '../lib/invoice-renderer';

export function buildSettlement(dtd, doctype) {
  return renderInvoiceHtml({
    reference: dtd.reference,
    amountMinor: dtd.amountMinor,
    includeDoctype: doctype === 'html5',
  });
}
