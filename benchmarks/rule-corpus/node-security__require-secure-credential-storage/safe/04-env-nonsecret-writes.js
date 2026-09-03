/**
 * SAFE - the two things a process.env write is nearly always used for. Neither
 * value is a credential and neither is worth a finding; reporting here is what
 * makes a rule get switched off.
 */
function configureTestEnvironment(port) {
  process.env.NODE_ENV = 'test';
  process.env.PORT = String(port);
  process.env.TZ = 'UTC';
}

module.exports = { configureTestEnvironment };
