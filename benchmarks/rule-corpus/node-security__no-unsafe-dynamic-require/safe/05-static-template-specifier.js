/**
 * SAFE - a template literal with no substitutions. Backticks are a quoting
 * style, not runtime assembly.
 */
const locale = require(`./locales/en-US.json`);

module.exports = function t(key) {
  return locale[key] ?? key;
};
