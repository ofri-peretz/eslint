/**
 * SAFE - ordinary prototype-based JavaScript.
 *
 * Verified: this does NOT touch Object.prototype. It is in essentially every
 * pre-class codebase, and it is why the pollution predicate cannot be "a step
 * named prototype" — only `prototype` reached THROUGH `constructor` escapes
 * this function's own prototype into the shared one.
 */
function Widget(name) {
  this.name = name;
}
Widget.prototype.render = function render() {
  return this.name;
};
module.exports = Widget;
