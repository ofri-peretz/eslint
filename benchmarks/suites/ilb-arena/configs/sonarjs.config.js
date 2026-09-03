/**
 * ESLint Configuration for eslint-plugin-sonarjs (SonarSource)
 * Comprehensive code quality & security plugin with 269 rules
 * Includes 44+ security-relevant rules (SQL, XSS, secrets, crypto, CSRF, etc.)
 */

import sonarjs from "eslint-plugin-sonarjs";

export default [sonarjs.configs.recommended];
