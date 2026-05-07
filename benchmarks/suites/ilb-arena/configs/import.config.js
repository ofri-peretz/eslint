/**
 * ESLint Configuration for eslint-plugin-import
 * Module resolution, dependency hygiene, import/export validation
 * 2M+ weekly downloads — one of the most popular ESLint plugins
 */

import importPlugin from "eslint-plugin-import";

export default [
  {
    files: ["**/*.js"],
    plugins: {
      import: importPlugin,
    },
    rules: {
      // All major import rules
      "import/no-unresolved": "off", // Skip - requires full module resolution
      "import/named": "off", // Skip - requires full module resolution
      "import/no-dynamic-require": "error",
      "import/no-webpack-loader-syntax": "error",
      "import/no-self-import": "error",
      "import/no-cycle": "error",
      "import/no-useless-path-segments": "error",
      "import/export": "error",
      "import/no-mutable-exports": "error",
      "import/no-commonjs": "warn",
      "import/first": "error",
      "import/no-duplicates": "error",
      "import/order": "error",
    },
  },
];
