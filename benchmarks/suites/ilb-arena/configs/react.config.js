/**
 * ESLint Configuration for eslint-plugin-react
 * 103 React rules including security-relevant: no-danger, jsx-no-target-blank
 */

import react from "eslint-plugin-react";

export default [
  {
    files: ["**/*.js"],
    plugins: {
      react,
    },
    rules: {
      // Security-relevant React rules
      "react/no-danger": "error",
      "react/jsx-no-target-blank": "error",
      "react/iframe-missing-sandbox": "error",
      "react/no-danger-with-children": "error",
      "react/jsx-no-script-url": "error",
    },
    settings: {
      react: {
        version: "18",
      },
    },
  },
];
