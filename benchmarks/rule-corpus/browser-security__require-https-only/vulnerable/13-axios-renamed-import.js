/**
 * VULNERABLE - ADVERSARIAL. The axios default export bound to a different local
 * name. This is a plain `import` rename, not an exotic shape — a rule that
 * matches the receiver's spelling misses every codebase that calls it `http`.
 */
import http from 'axios';

export function loadInvoices() {
  return http.get('http://api.acme-corp.io/v1/invoices');
}
