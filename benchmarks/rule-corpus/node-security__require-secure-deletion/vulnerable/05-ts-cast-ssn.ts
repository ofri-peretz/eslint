/**
 * VULNERABLE - TypeScript. The row type does not declare the column, so the
 * cast is required to delete it. PII under CWE-459 exactly as a credential is:
 * unbinding the property leaves the value in the buffer the driver decoded.
 */
interface CustomerRow {
  id: string;
  email: string;
}

export function exportCustomer(row: CustomerRow): CustomerRow {
  delete (row as CustomerRow & { ssn?: string }).ssn;
  return row;
}
