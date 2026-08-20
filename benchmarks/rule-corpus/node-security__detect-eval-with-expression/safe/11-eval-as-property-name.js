/**
 * SAFE (adversarial) - `eval` as an object KEY. The handler table has an entry
 * spelled `eval` because that is the operation's name in the wire protocol; the
 * function it maps to parses a number. A report here decides by spelling.
 */
const HANDLERS = {
  eval: (value) => Number.parseFloat(value),
  trim: (value) => String(value).trim(),
  upper: (value) => String(value).toUpperCase(),
};

module.exports = function applyOp(op, value) {
  const handler = HANDLERS[op] ?? HANDLERS.trim;
  return handler(value);
};
