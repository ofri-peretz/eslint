/**
 * ESLint Configuration for @angular-eslint/eslint-plugin
 * Angular best practices — 2.25M+ weekly downloads
 */

import angular from "@angular-eslint/eslint-plugin";

export default [
  {
    files: ["**/*.js"],
    plugins: {
      "@angular-eslint": angular,
    },
    rules: {
      ...Object.fromEntries(
        Object.keys(angular.rules).map((rule) => [
          `@angular-eslint/${rule}`,
          "warn",
        ]),
      ),
    },
  },
];
