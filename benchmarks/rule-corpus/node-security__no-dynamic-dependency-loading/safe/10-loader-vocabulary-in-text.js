/**
 * SAFE (adversarial) - `require` and `import` appear here only as data: in
 * strings, in a comment, and as an object property name. Nothing is loaded
 * dynamically. A report would prove the rule reads text rather than call
 * structure.
 *
 * The docs below describe require(userInput) so readers can recognise it.
 */
const HELP = 'do not write require(userInput) or await import(req.query.p)';

const analyzer = {
  require: (name) => ({ kind: 'require', name }),
  import: (name) => ({ kind: 'import', name }),
};

export function explain(name) {
  return { help: HELP, calls: [analyzer.require(name), analyzer.import(name)] };
}
