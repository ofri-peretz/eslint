/**
 * SAFE - `://` in a URI carries the same `//` the descendant axis does, and a
 * path join carries `/`. Neither is XPath. Shopify's `gid://` builders were 7 of
 * this rule's 9 findings across the wild corpus.
 */
const path = require('node:path');

exports.bulkOperationGid = function bulkOperationGid(id) {
  return `gid://shopify/BulkOperation/${id}`;
};

exports.absoluteUrl = function absoluteUrl(req) {
  return req.protocol + '://' + req.get('host') + req.originalUrl;
};

exports.relative = function relative(baseDir, fullPath) {
  return fullPath.replace(baseDir + '/', '').replace(path.sep, '/');
};
