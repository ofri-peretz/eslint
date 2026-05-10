"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AST_NODE_TYPES = exports.ESLintUtils = exports.toSARIF = exports.severityToCVSS = exports.getSecurityBenchmarks = exports.MessageIcons = exports.OWASP_2021_TO_2025 = exports.OWASP_SERVERLESS_DETAILS = exports.OWASP_2021_DETAILS = exports.OWASP_2025_DETAILS = exports.OWASP_DETAILS = exports.CWE_COMPLIANCE_MAPPING = exports.CWE_MAPPING = exports.CVSS_RANGES = void 0;
const tslib_1 = require("tslib");
/**
 * @interlace/eslint-devkit
 *
 * Core utilities for creating TypeScript ESLint plugins
 * Inspired by typescript-eslint's infrastructure
 *
 * This package provides:
 * - Rule creator utilities
 * - AST utilities
 * - Type utilities
 * - LLM message formatting with enterprise security benchmarks
 * - OWASP Top 10, CVSS, CWE mappings
 * - SARIF output for security tool integration
 * - Custom message templates for organizations
 */
// Rule creation utilities
// Side-effect import: extends `@typescript-eslint/utils` `RuleMetaDataDocs`
// with Interlace fields (cwe + cvss) so plugin authors can populate them
// without per-rule `@ts-expect-error`. See ./types/meta-augmentation.ts.
require("./types/meta-augmentation");
tslib_1.__exportStar(require("./rule-creation"), exports);
// AST utilities
tslib_1.__exportStar(require("./ast/ast-utils"), exports);
// Type utilities
tslib_1.__exportStar(require("./types/type-utils"), exports);
// LLM messaging utilities
tslib_1.__exportStar(require("./messaging"), exports);
// Security utilities
tslib_1.__exportStar(require("./security"), exports);
// Node utilities
tslib_1.__exportStar(require("./node"), exports);
// Resolver and dependency analysis utilities
tslib_1.__exportStar(require("./resolver"), exports);
// Other utilities
tslib_1.__exportStar(require("./aria-definitions"), exports);
var messaging_1 = require("./messaging");
Object.defineProperty(exports, "CVSS_RANGES", { enumerable: true, get: function () { return messaging_1.CVSS_RANGES; } });
Object.defineProperty(exports, "CWE_MAPPING", { enumerable: true, get: function () { return messaging_1.CWE_MAPPING; } });
Object.defineProperty(exports, "CWE_COMPLIANCE_MAPPING", { enumerable: true, get: function () { return messaging_1.CWE_COMPLIANCE_MAPPING; } });
Object.defineProperty(exports, "OWASP_DETAILS", { enumerable: true, get: function () { return messaging_1.OWASP_DETAILS; } });
Object.defineProperty(exports, "OWASP_2025_DETAILS", { enumerable: true, get: function () { return messaging_1.OWASP_2025_DETAILS; } });
Object.defineProperty(exports, "OWASP_2021_DETAILS", { enumerable: true, get: function () { return messaging_1.OWASP_2021_DETAILS; } });
Object.defineProperty(exports, "OWASP_SERVERLESS_DETAILS", { enumerable: true, get: function () { return messaging_1.OWASP_SERVERLESS_DETAILS; } });
Object.defineProperty(exports, "OWASP_2021_TO_2025", { enumerable: true, get: function () { return messaging_1.OWASP_2021_TO_2025; } });
Object.defineProperty(exports, "MessageIcons", { enumerable: true, get: function () { return messaging_1.MessageIcons; } });
Object.defineProperty(exports, "getSecurityBenchmarks", { enumerable: true, get: function () { return messaging_1.getSecurityBenchmarks; } });
Object.defineProperty(exports, "severityToCVSS", { enumerable: true, get: function () { return messaging_1.severityToCVSS; } });
Object.defineProperty(exports, "toSARIF", { enumerable: true, get: function () { return messaging_1.toSARIF; } });
/**
 * Re-export commonly used types and utilities from @typescript-eslint/utils
 */
var utils_1 = require("@typescript-eslint/utils");
Object.defineProperty(exports, "ESLintUtils", { enumerable: true, get: function () { return utils_1.ESLintUtils; } });
Object.defineProperty(exports, "AST_NODE_TYPES", { enumerable: true, get: function () { return utils_1.AST_NODE_TYPES; } });
