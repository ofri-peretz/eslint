/**
 * SAFE (adversarial) - js-yaml's loader constrained to the JSON schema, which
 * has no `!!js/function`, `!!js/regexp` or `!!js/undefined` tag. This is the
 * remediation js-yaml's own migration guide gives for v3's `safeLoad`.
 *
 * JUDGEMENT: safe. The sink is present and the input IS untrusted; what makes
 * it safe is the schema, which is the only mitigation that actually works here.
 */
const yaml = require('js-yaml');

exports.parseManifest = function parseManifest(req) {
  return yaml.load(req.body.manifest, { schema: yaml.JSON_SCHEMA });
};
