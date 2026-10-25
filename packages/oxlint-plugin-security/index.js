'use strict';
// oxlint-plugin-security: eslint-plugin-security's `security/<rule>` IDs, backed
// by Interlace rules. No logic lives here — every ID's source is mapping.json
// (docs/intents/oxlint-plugin-security-drop-in, R2/R3).
const mapping = require('./mapping.json');
const { version } = require('./package.json');

const sources = {
  'secure-coding': () => require('eslint-plugin-secure-coding'),
  'node-security': () => require('eslint-plugin-node-security'),
};

const rules = {};
for (const [id, entry] of Object.entries(mapping.rules)) {
  if (entry.retired) {
    rules[id] = {
      meta: {
        deprecated: true,
        docs: { description: entry.reason },
        schema: [],
      },
      create: () => ({}),
    };
    continue;
  }
  const target = sources[entry.plugin]().rules[entry.rule];
  // Unchanged rule object unless the mapping pins options; then only
  // meta.defaultOptions differs, which ESLint (>= 9.15) and oxlint both honour.
  rules[id] = entry.defaultOptions
    ? {
        ...target,
        meta: { ...target.meta, defaultOptions: entry.defaultOptions },
      }
    : target;
}

const plugin = {
  meta: { name: 'oxlint-plugin-security', version },
  rules,
  configs: {},
};
const recommendedRules = Object.fromEntries(
  Object.keys(rules).map((id) => [`security/${id}`, 'warn']),
);
plugin.configs.recommended = {
  name: 'security/recommended',
  plugins: { security: plugin },
  rules: recommendedRules,
};
plugin.configs['recommended-legacy'] = {
  plugins: ['security'],
  rules: recommendedRules,
};

module.exports = plugin;
