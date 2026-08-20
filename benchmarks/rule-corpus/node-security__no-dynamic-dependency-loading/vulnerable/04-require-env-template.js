/**
 * VULNERABLE - a template literal whose interpolated segment is an environment
 * variable. `DB_DRIVER=../../../tmp/payload` traverses straight out of the
 * adapters directory; the surrounding literal text constrains nothing.
 */
const adapterName = process.env.DB_DRIVER;

const adapter = require(`./adapters/${adapterName}`);

export function connect(url) {
  return adapter.createPool({ connectionString: url, max: 10 });
}
