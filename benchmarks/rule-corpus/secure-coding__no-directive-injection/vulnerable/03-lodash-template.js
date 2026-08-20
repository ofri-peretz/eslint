/**
 * VULNERABLE - lodash's `_.template` compiles its argument into a function, so
 * `<% %>` in the query string is executed code. This is the shape of the
 * lodash template RCE advisories.
 */
const _ = require('lodash');

function compileWidget(req) {
  return _.template(req.query.tpl);
}

module.exports = { compileWidget };
