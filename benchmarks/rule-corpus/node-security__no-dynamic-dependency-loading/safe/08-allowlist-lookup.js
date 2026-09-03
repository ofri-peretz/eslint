/**
 * SAFE (adversarial) - the CORRECT remediation for vulnerable/03. The set of
 * loadable modules is a frozen object literal of static specifiers, the key is
 * checked with `Object.hasOwn` before use, and the failure path throws. The
 * caller chooses among four modules written in this file and can reach nothing
 * else - `ADAPTERS[name]` is one of exactly four literals, whatever `name` is.
 */
const ADAPTERS = Object.freeze({
  postgres: './adapters/postgres.js',
  mysql: './adapters/mysql.js',
  sqlite: './adapters/sqlite.js',
  memory: './adapters/memory.js',
});

export function loadAdapter(name) {
  if (!Object.hasOwn(ADAPTERS, name)) {
    throw new Error(`unknown adapter: ${name}`);
  }
  return require(ADAPTERS[name]);
}
