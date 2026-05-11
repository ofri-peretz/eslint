/**
 * Interlace Quality Fleet Configuration
 *
 * Uses top-level rule names to avoid ESLint 9 nested namespace resolution issues.
 * 7 quality plugins: maintainability, reliability, operability,
 * conventions, modularity, modernization, import-next
 */

import maintainability from "eslint-plugin-maintainability";
import reliability from "eslint-plugin-reliability";
import operability from "eslint-plugin-operability";
import conventions from "eslint-plugin-conventions";
import modularity from "eslint-plugin-modularity";
import modernization from "eslint-plugin-modernization";
import importNext from "eslint-plugin-import-next";
// node-security carries deprecated-API rules with quality-fleet relevance
// (e.g. `no-deprecated-buffer` for `new Buffer()` — Quality bench needs it
// to score `prob_new_buffer` correctly).
import nodeSecurity from "eslint-plugin-node-security";

export default [
  // import-next recommended config (works out of the box)
  importNext.configs.recommended,

  // All other quality plugins with manual registration using top-level rule names
  {
    files: ["**/*.js"],
    plugins: {
      maintainability,
      reliability,
      operability,
      conventions,
      modularity,
      modernization,
      "node-security": nodeSecurity,
    },
    rules: {
      // Maintainability (8 rules)
      "maintainability/cognitive-complexity": "warn",
      "maintainability/identical-functions": "warn",
      "maintainability/max-parameters": "warn",
      "maintainability/no-lonely-if": "warn",
      "maintainability/no-nested-ternary": "warn",
      "maintainability/consistent-function-scoping": "warn",
      "maintainability/no-unreadable-iife": "warn",
      "maintainability/nested-complexity-hotspots": "warn",

      // Reliability (8 rules)
      "reliability/no-unhandled-promise": "error",
      "reliability/no-silent-errors": "error",
      "reliability/no-missing-error-context": "warn",
      "reliability/error-message": "warn",
      "reliability/no-missing-null-checks": "warn",
      "reliability/no-unsafe-type-narrowing": "warn",
      "reliability/require-network-timeout": "warn",
      "reliability/no-await-in-loop": "warn",

      // Operability (6 rules)
      "operability/no-console-log": "warn",
      "operability/no-process-exit": "error",
      "operability/no-debug-code-in-production": "error",
      "operability/no-verbose-error-messages": "warn",
      "operability/require-code-minification": "warn",
      "operability/require-data-minimization": "warn",

      // Conventions (9 rules)
      "conventions/no-commented-code": "warn",
      "conventions/expiring-todo-comments": "warn",
      "conventions/prefer-code-point": "warn",
      "conventions/prefer-dom-node-text-content": "warn",
      "conventions/no-console-spaces": "warn",
      "conventions/no-deprecated-api": "warn",
      "conventions/prefer-dependency-version-strategy": "warn",
      "conventions/filename-case": "warn",
      "conventions/consistent-existence-index-check": "warn",

      // Modularity (5 rules)
      "modularity/ddd-anemic-domain-model": "warn",
      "modularity/ddd-value-object-immutability": "warn",
      "modularity/enforce-naming": "warn",
      "modularity/enforce-rest-conventions": "warn",
      "modularity/no-external-api-calls-in-utils": "warn",

      // Modernization (3 rules)
      "modernization/no-instanceof-array": "warn",
      "modernization/prefer-at": "warn",
      "modernization/prefer-event-target": "warn",

      // node-security: only the deprecated-API rules that overlap with
      // the quality fleet's "deprecated patterns" concern. Pure security
      // rules from this plugin stay in the security bench.
      "node-security/no-deprecated-buffer": "error",
    },
  },
];
