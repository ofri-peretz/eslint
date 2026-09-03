/**
 * SAFE (adversarial) - defaulting non-secret configuration, including keys that
 * mention tokens and secrets because they configure the handling of those
 * things rather than holding one. `TOKEN_TTL_SECONDS` is a duration.
 */
function applyDefaults() {
  process.env.TOKEN_TTL_SECONDS = process.env.TOKEN_TTL_SECONDS || '3600';
  process.env.SECRET_SCAN_MODE = 'warn';
  process.env.LOG_LEVEL = 'info';
}

module.exports = { applyDefaults };
