/**
 * ESLint Configuration for eslint-plugin-no-unsanitized (Mozilla)
 * DOM XSS prevention — innerHTML, document.write, etc.
 */

import noUnsanitized from "eslint-plugin-no-unsanitized";

export default [
  {
    files: ["**/*.js"],
    plugins: {
      "no-unsanitized": noUnsanitized,
    },
    rules: {
      "no-unsanitized/method": "error",
      "no-unsanitized/property": "error",
    },
  },
];
