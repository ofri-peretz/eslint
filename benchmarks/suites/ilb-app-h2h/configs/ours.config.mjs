// Our plugins are imported by relative path to the LOCAL BUILD, never by package name,
// so nothing resolves through node_modules and nothing touches the registry.
// root = four levels up from configs/
import secureCoding from '../../../../packages/eslint-plugin-secure-coding/dist/src/index.js';
import nodeSecurity from '../../../../packages/eslint-plugin-node-security/dist/src/index.js';
import expressSecurity from '../../../../packages/eslint-plugin-express-security/dist/src/index.js';
import mongodbSecurity from '../../../../packages/eslint-plugin-mongodb-security/dist/src/index.js';
import { base } from './shared.mjs';

export const plugins = {
  secureCoding,
  nodeSecurity,
  expressSecurity,
  mongodbSecurity,
};

// B: the three presets a user who followed our docs would enable for a Node/Express app.
export const B = [
  ...base,
  secureCoding.configs.recommended,
  nodeSecurity.configs.recommended,
  expressSecurity.configs.recommended,
];

// C: B plus the driver plugin that matches the app's database layer (NodeGoat: MongoDB).
export const C = {
  nodegoat: [...B, mongodbSecurity.configs.recommended],
};
