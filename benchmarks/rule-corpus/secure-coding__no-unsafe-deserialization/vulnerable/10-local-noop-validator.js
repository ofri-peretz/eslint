/**
 * VULNERABLE (adversarial) - A LOCAL function wearing a trusted name.
 * `validateInput` here only checks that the value is a string; it validates
 * nothing about the YAML tags inside it, so `!!js/function` passes straight
 * through to the loader.
 */
const yaml = require('js-yaml');

function validateInput(value) {
  if (typeof value !== 'string') throw new TypeError('expected a string');
  return value;
}

exports.parseManifest = function parseManifest(req) {
  const manifest = validateInput(req.body.manifest);
  return yaml.load(manifest);
};
