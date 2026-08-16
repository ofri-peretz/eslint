/**
 * SAFE - The correct remediation for the canonical sink: the template SOURCE is
 * a literal owned by this file, and only the DATA is attacker-supplied.
 * Handlebars escapes interpolated data by default, so `{{name}}` cannot inject
 * a directive. This is how the library is meant to be used.
 */
const Handlebars = require('handlebars');

const PREVIEW_TEMPLATE = Handlebars.compile(
  '<section class="preview"><h1>{{brand}}</h1><p>{{name}}</p></section>',
);

function renderPreview(req) {
  return PREVIEW_TEMPLATE({ brand: 'Acme', name: req.body.name });
}

module.exports = { renderPreview };
