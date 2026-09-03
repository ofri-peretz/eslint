/**
 * VULNERABLE - One binding hop. The tenant-configurable layout string is read
 * off the request body, held in a local, and handed to sprintf-js as the
 * template. sprintf's positional specifiers (`%1$s`) let the caller re-order
 * and re-read every argument.
 */
const { sprintf } = require('sprintf-js');

function renderInvoiceLine(req, customer) {
  const layout = req.body.layout;
  return sprintf(layout, customer.email, customer.billingToken);
}

module.exports = { renderInvoiceLine };
