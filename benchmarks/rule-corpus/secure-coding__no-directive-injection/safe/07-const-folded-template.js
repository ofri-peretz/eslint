/**
 * SAFE - Interpolation that folds to literals written in this file. The
 * template string is built dynamically, but every part of it is a constant
 * declared here, so no attacker value can reach the compiler.
 *
 * Adversarial intent: a rule that reports on "template literal reaches
 * compile()" without resolving the bindings will fire here.
 */
const Handlebars = require('handlebars');

const BRAND = 'Acme';
const HEADING_TAG = 'h1';

const source = `<${HEADING_TAG}>${BRAND}</${HEADING_TAG}><p>{{message}}</p>`;

function renderBanner(message) {
  const render = Handlebars.compile(source);
  return render({ message });
}

module.exports = { renderBanner };
