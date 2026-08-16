/**
 * SAFE (adversarial) - JSON reviving under names that look like the dangerous
 * ones. `deserialize` here is this module's own JSON wrapper, and `parseState`
 * is a plain JSON.parse. Neither can execute anything.
 */
exports.deserialize = function deserialize(raw) {
  return JSON.parse(raw);
};

exports.parseState = function parseState(req) {
  return JSON.parse(req.body.state ?? '{}');
};
