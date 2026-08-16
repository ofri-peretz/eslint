/**
 * SAFE (adversarial) - Correctly escaped code, with the escaper bound to a
 * short local name. `require('escape-string-regexp')` is the same function
 * whether it lands in `escapeStringRegexp` or in `esc`.
 */
const esc = require('escape-string-regexp');
const { escapeRegExp } = require('lodash');

exports.byTitle = function byTitle(req) {
  return new RegExp(esc(req.query.title), 'i');
};

exports.byAuthor = function byAuthor(req) {
  return new RegExp(escapeRegExp(req.query.author), 'i');
};
