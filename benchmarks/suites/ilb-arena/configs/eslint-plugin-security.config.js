/**
 * ESLint Configuration for eslint-plugin-security (incumbent)
 * The most-installed ESLint security plugin with 1.5M+ weekly downloads
 * Now maintained under @eslint-community/eslint-plugin-security
 */

import security from "eslint-plugin-security";

// eslint-plugin-security flat config
export default [
  {
    files: ["**/*.js"],
    plugins: {
      security,
    },
    rules: {
      // All 13 rules from eslint-plugin-security
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "error",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-non-literal-regexp": "error",
      "security/detect-non-literal-require": "error",
      "security/detect-object-injection": "error",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-unsafe-regex": "error",
      "security/detect-bidi-characters": "error",
    },
  },
];
