// Generated for the Interlace `vulnerable-app` demo.
// Loads every flagship-rule's plugin in `recommended` mode so the demo
// fixtures fire the expected violations.

import secureCoding from 'eslint-plugin-secure-coding';
import browserSecurity from 'eslint-plugin-browser-security';
import pgPlugin from 'eslint-plugin-pg';
import mongoPlugin from 'eslint-plugin-mongodb-security';
import jwtPlugin from 'eslint-plugin-jwt';
import vercelAi from 'eslint-plugin-vercel-ai-security';
import importNext from 'eslint-plugin-import-next';
import reactA11y from 'eslint-plugin-react-a11y';
import reactFeatures from 'eslint-plugin-react-features';

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
