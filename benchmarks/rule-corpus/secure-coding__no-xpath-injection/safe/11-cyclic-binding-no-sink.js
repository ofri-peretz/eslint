/**
 * SAFE (adversarial) - The same self-referential binding chain as
 * vulnerable/11, with no evaluator anywhere. Positive control for that fixture:
 * if the rule crashes here it is the binding walk, not the sink.
 */
let head = tail;
let tail = head;

exports.rotate = function rotate(value) {
  head = value;
  tail = head;
  return { head, tail };
};
