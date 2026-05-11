/**
 * ESLint Configuration for eslint-plugin-jsx-a11y
 * 39 accessibility rules for JSX
 */

import jsxA11y from "eslint-plugin-jsx-a11y";

export default [
  {
    files: ["**/*.js"],
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...Object.fromEntries(
        Object.keys(jsxA11y.rules).map((rule) => [`jsx-a11y/${rule}`, "error"]),
      ),
    },
  },
];
