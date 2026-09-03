/**
 * VULNERABLE - a `let` whose declaration looks constant and whose reassignment
 * does not. The binding starts as a literal and is then overwritten from the
 * environment, so the value that reaches `require` is whatever the environment
 * says. Reading only the initializer would call this safe.
 */
let transportModule = './transports/stdout.js';

if (process.env.LOG_TRANSPORT) {
  transportModule = process.env.LOG_TRANSPORT;
}

const transport = require(transportModule);

export function createLogger(level) {
  return transport.build({ level });
}
