/**
 * ESLint Configuration for eslint-plugin-security-node
 * Security-focused plugin with 22 rules covering SQL injection,
 * command injection, NoSQL injection, timing attacks, and more.
 * @see https://www.npmjs.com/package/eslint-plugin-security-node
 */

import securityNode from "eslint-plugin-security-node";

// Convert legacy recommended config to flat config
const rules = {};
for (const [key, value] of Object.entries(
  securityNode.configs.recommended.rules,
)) {
  rules[key] = value;
}

export default [
  {
    plugins: {
      "security-node": securityNode,
    },
    rules,
  },
];
