/**
 * SAFE (adversarial) - webpack's resolver vocabulary calls a module specifier a
 * `request`. Here it is a `const` bound to a string literal: the name matches a
 * taint root, the VALUE is a hard-coded path. A report here decides by spelling
 * rather than by evidence.
 */
const request = './loaders/babel-loader.js';

const loader = require(request);

module.exports = function pitch(source) {
  return loader.call(this, source);
};
