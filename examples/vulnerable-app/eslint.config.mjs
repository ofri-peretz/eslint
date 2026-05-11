// Generated for the Interlace `vulnerable-app` demo.
// Loads every flagship-rule's plugin in `recommended` mode so the demo
// fixtures fire the expected violations.

import secureCoding from '@interlace/eslint-plugin-secure-coding';
import browserSecurity from '@interlace/eslint-plugin-browser-security';
import pgPlugin from '@interlace/eslint-plugin-pg';
import mongoPlugin from '@interlace/eslint-plugin-mongodb-security';
import jwtPlugin from '@interlace/eslint-plugin-jwt';
import vercelAi from '@interlace/eslint-plugin-vercel-ai-security';
import importNext from '@interlace/eslint-plugin-import-next';
import reactA11y from '@interlace/eslint-plugin-react-a11y';
import reactFeatures from '@interlace/eslint-plugin-react-features';

const plugins = {
  'secure-coding':       secureCoding,
  'browser-security':    browserSecurity,
  'pg':                  pgPlugin,
  'mongodb-security':    mongoPlugin,
  'jwt':                 jwtPlugin,
  'vercel-ai-security':  vercelAi,
  'import-next':         importNext,
  'react-a11y':          reactA11y,
  'react-features':      reactFeatures,
};

const recommendedRules = Object.entries(plugins).reduce((acc, [_, p]) => ({ ...acc, ...(p.configs?.recommended?.rules ?? {}) }), {});

export default [
  {
    files: ['**/*.{js,mjs,cjs,jsx}'],
    plugins,
    rules: recommendedRules,
  },
  {
    files: ['**/*.{jsx,tsx}'],
    plugins,
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: recommendedRules,
  },
];
