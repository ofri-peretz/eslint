/**
 * VULNERABLE - String concatenation instead of a separate argument. Same leak,
 * one AST node deeper: the argument is a BinaryExpression whose right operand
 * is the member access.
 */
export function notifyCustomer(customer, template) {
  console.log('Contacting customer at ' + customer.emailAddress);
  return template.render(customer);
}
