/**
 * SAFE - a LOCAL helper named `runInNewContext` that renders a template with a
 * fresh data object. It is not the vm module; the binding proves it. Deciding
 * by the spelling of the callee would report this.
 */
const { renderTemplate } = require('./templating');

function runInNewContext(templateName, context) {
  return renderTemplate(templateName, { ...context });
}

module.exports = function render(req, res) {
  res.send(runInNewContext('invoice', req.body));
};
