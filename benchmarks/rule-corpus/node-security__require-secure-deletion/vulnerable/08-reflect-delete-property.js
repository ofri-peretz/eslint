/**
 * VULNERABLE (adversarial) - Reflect.deleteProperty is the delete operator as a
 * function. It is what proxy traps and generic serialisers call, and it does
 * exactly as little scrubbing as `delete`.
 */
function stripSecrets(record) {
  Reflect.deleteProperty(record, 'refresh_token');
  Reflect.deleteProperty(record, 'password');
  return record;
}

module.exports = { stripSecrets };
