/**
 * VULNERABLE (adversarial wave) - The "make it configurable" commit: the
 * request-supplied template is kept and a default is added beside it. One
 * branch of the ternary is still the attacker's template source.
 */
const Handlebars = require('handlebars');

const DEFAULT_LAYOUT = '<p>{{message}}</p>';

function renderNotice(req, model) {
  const render = Handlebars.compile(req.query.custom ? req.body.layout : DEFAULT_LAYOUT);
  return render(model);
}

module.exports = { renderNotice };
