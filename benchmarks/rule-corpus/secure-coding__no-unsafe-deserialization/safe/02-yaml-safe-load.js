/**
 * SAFE - The correct remediation for the js-yaml sink: `safeLoad` binds the
 * default schema, which has no `!!js/function` tag, so no code path exists.
 */
const yaml = require('js-yaml');

exports.parseManifest = function parseManifest(req) {
  return yaml.safeLoad(req.body.manifest);
};
