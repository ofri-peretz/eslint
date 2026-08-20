/**
 * SAFE (adversarial) - Every `//` and `/*` in this file is a glob, a
 * protocol-relative URL or a comment. `/*` in XPath is a whole location step;
 * in a glob it continues past the star.
 */
const glob = require('fast-glob');

exports.schemaFiles = function schemaFiles(root) {
  return glob.sync([`${root}/**/*.graphql`, `${root}/*.extension.toml`]);
};

exports.cdnHref = function cdnHref(host, asset) {
  return '//' + host + '/assets/' + asset;
};
