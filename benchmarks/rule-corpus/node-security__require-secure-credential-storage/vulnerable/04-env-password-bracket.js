/**
 * VULNERABLE - the same environment write in bracket notation, which is what
 * you get when the key is assembled or when a linter rule pushed the author to
 * quote it. process.env['DB_PASSWORD'] names exactly the same slot.
 */
function applyDatabaseConfig(config) {
  process.env['DB_PASSWORD'] = config.database.password;
  process.env.DB_HOST = config.database.host;
}

module.exports = { applyDatabaseConfig };
