/**
 * VULNERABLE (adversarial) - the environment reached through a `const` alias.
 * `const env = process.env` is extremely common in config modules, and the
 * write through it mutates the same object.
 */
const env = process.env;

function adoptRotatedKey(rotation) {
  env.SERVICE_API_KEY = rotation.newKey;
}

module.exports = { adoptRotatedKey };
