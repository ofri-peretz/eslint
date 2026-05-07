/**
 * ESLint Configuration for eslint-plugin-no-secrets
 * Secret detection via cryptographic entropy analysis + pattern matching
 * 2 rules: no-secrets, no-pattern-match
 */

import noSecrets from "eslint-plugin-no-secrets";

export default [
  {
    files: ["**/*.js"],
    plugins: {
      "no-secrets": noSecrets,
    },
    rules: {
      "no-secrets/no-secrets": "error",
    },
  },
];
