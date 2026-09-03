/**
 * SAFE - A `let` whose every write is a literal owned by this file. The
 * variable is reassigned, so a naive "is it a const?" test fails, but no write
 * introduces attacker data.
 *
 * Adversarial intent: the counterpart of a `let` reassigned from the network.
 * Mutability is not taint; the writes decide.
 */
const Handlebars = require('handlebars');

function renderReceipt(locale, data) {
  let source = '<p>{{total}}</p>';
  if (locale === 'fr') {
    source = '<p>Total : {{total}}</p>';
  } else if (locale === 'de') {
    source = '<p>Summe: {{total}}</p>';
  }
  return Handlebars.compile(source)(data);
}

module.exports = { renderReceipt };
