/**
 * VULNERABLE - One binding hop, and nothing on the compile line names a
 * request. A tenant uploads its own e-mail layout; the layout is the template
 * source.
 */
const Handlebars = require('handlebars');

function renderTenantEmail(req, tenant) {
  const layout = req.body.markup;
  const render = Handlebars.compile(layout);
  return render({ tenant });
}

module.exports = { renderTenantEmail };
