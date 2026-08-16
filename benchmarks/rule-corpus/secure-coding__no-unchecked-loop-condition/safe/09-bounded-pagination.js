/**
 * SAFE - A page walk whose bound is computed from a count the server owns.
 * `totalPages` is derived from a database count and `pageSize` is a module
 * constant, so the loop is bounded before it starts.
 */
import { countInvoices, fetchInvoicePage } from '../repositories/invoice-repository.js';

const pageSize = 100;

export async function exportInvoices(accountId) {
  const total = await countInvoices(accountId);
  const totalPages = Math.ceil(total / pageSize);
  const invoices = [];
  let page = 0;
  while (page < totalPages && pageSize > 0) {
    invoices.push(...(await fetchInvoicePage(accountId, page, pageSize)));
    page += 1;
  }
  return invoices;
}
