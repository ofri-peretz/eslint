/**
 * VULNERABLE - a rules engine compiling predicates with the Function
 * constructor. `new Function` is eval with a different spelling: the body is
 * source text, compiled in the global scope.
 */
const rules = require('./rules.json');

function compilePredicate(expression) {
  return new Function('facts', 'return ' + expression + ';');
}

module.exports = function evaluateRules(facts) {
  return rules
    .map((rule) => compilePredicate(rule.when))
    .filter((predicate) => predicate(facts));
};
