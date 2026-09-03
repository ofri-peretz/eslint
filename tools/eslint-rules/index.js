/**
 * Local ESLint Plugin for monorepo-specific rules
 * 
 * These rules enforce repository-wide conventions that aren't appropriate
 * for published packages but are essential for CI/CD and development workflow.
 */

const requireVitestWatchFalse = require('./require-vitest-watch-false');
const changelogFormat = require('./changelog-format');

module.exports = {
  meta: {
    name: 'eslint-plugin-local',
    version: '1.0.0',
  },
  rules: {
    'require-vitest-watch-false': requireVitestWatchFalse,
    'changelog-format': changelogFormat,
  },
  configs: {
    recommended: {
      plugins: ['local'],
      rules: {
        'local/require-vitest-watch-false': 'error',
        'local/changelog-format': 'error',
      },
    },
  },
};
