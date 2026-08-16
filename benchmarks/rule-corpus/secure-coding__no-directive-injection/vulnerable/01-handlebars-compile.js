/**
 * VULNERABLE - The canonical CWE-96 shape, written the way Handlebars' own
 * documentation writes compilation. The template SOURCE is attacker-supplied,
 * so `{{#with "s" as |string|}}...constructor...{{/with}}` reaches the compiler
 * and executes: server-side template injection, not XSS.
 */
const Handlebars = require('handlebars');

function renderPreview(req) {
  const render = Handlebars.compile(req.body.template);
  return render({ brand: 'Acme' });
}

module.exports = { renderPreview };
