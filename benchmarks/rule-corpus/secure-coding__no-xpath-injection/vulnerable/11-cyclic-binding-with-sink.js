/**
 * VULNERABLE (adversarial) - A self-referential binding chain in the same file
 * as a live sink. Written to try to drive the rule's binding walk into
 * unbounded recursion (a crash the harness scores separately) while still
 * carrying a genuine injection, so a silent result cannot be mistaken for a
 * clean one.
 */
const xpath = require('xpath');
const { directory } = require('../lib/directory');

let head = tail;
let tail = head;

exports.byLabel = function byLabel(label) {
  head = label;
  return xpath.select("//staff/member[@label='" + head + "']", directory());
};
