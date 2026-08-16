/**
 * VULNERABLE - The taint root is a FUNCTION PARAMETER rather than a request
 * member expression. This is the ordinary shape of a rendering service: the
 * HTTP layer lives in another file and hands the template source down.
 *
 * Semantically identical to vulnerable/01-handlebars-compile.js — attacker-
 * authored template source reaches Handlebars.compile and executes. Only the
 * spelling of where the value came from differs.
 *
 * Positive control for this fixture: replacing `templateSource` with
 * `req.body.template` makes the rule report. Changing only the taint root to a
 * parameter silences it, which is a false negative, not a judgement about
 * exploitability.
 */
const Handlebars = require('handlebars');

class NewsletterRenderer {
  render(templateSource, subscriber) {
    const compiled = Handlebars.compile(templateSource);
    return compiled({ name: subscriber.displayName });
  }
}

module.exports = { NewsletterRenderer };
