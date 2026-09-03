/**
 * VULNERABLE (adversarial wave, false-negative direction) - The same defect as
 * 02 with every identifier the author controls renamed to something bland, and
 * one extra hop between them. Nothing on any line reads as security-relevant.
 *
 * The only thing left that carries meaning is where the value came from. This
 * is the test nobody runs, and the one every name-matching rule fails.
 */
const Handlebars = require('handlebars');

function build(a, b) {
  const payload = a.body.markup;
  const chunk = payload;
  const run = Handlebars.compile(chunk);
  return run(b);
}

function handle(req, res) {
  res.send(build(req, { brand: 'Acme' }));
}

module.exports = { build, handle };
