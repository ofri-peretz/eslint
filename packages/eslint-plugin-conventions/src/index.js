"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.configs = exports.plugin = exports.rules = void 0;
// Conventions rules
const no_commented_code_1 = require("./rules/conventions/no-commented-code");
const expiring_todo_comments_1 = require("./rules/conventions/expiring-todo-comments");
const prefer_code_point_1 = require("./rules/conventions/prefer-code-point");
const prefer_dom_node_text_content_1 = require("./rules/conventions/prefer-dom-node-text-content");
const no_console_spaces_1 = require("./rules/conventions/no-console-spaces");
const no_deprecated_api_1 = require("./rules/deprecation/no-deprecated-api");
const prefer_dependency_version_strategy_1 = require("./rules/conventions/prefer-dependency-version-strategy");
const filename_case_1 = require("./rules/conventions/filename-case");
const consistent_existence_index_check_1 = require("./rules/conventions/consistent-existence-index-check");
const no_json_schema_tags_1 = require("./rules/conventions/no-json-schema-tags");
const require_data_testid_1 = require("./rules/conventions/require-data-testid");
exports.rules = {
    'no-commented-code': no_commented_code_1.noCommentedCode,
    'expiring-todo-comments': expiring_todo_comments_1.expiringTodoComments,
    'prefer-code-point': prefer_code_point_1.preferCodePoint,
    'prefer-dom-node-text-content': prefer_dom_node_text_content_1.preferDomNodeTextContent,
    'no-console-spaces': no_console_spaces_1.noConsoleSpaces,
    'no-deprecated-api': no_deprecated_api_1.noDeprecatedApi,
    'prefer-dependency-version-strategy': prefer_dependency_version_strategy_1.preferDependencyVersionStrategy,
    'filename-case': filename_case_1.filenameCase,
    'consistent-existence-index-check': consistent_existence_index_check_1.consistentExistenceIndexCheck,
    'no-json-schema-tags': no_json_schema_tags_1.noJsonSchemaTags,
    'require-data-testid': require_data_testid_1.requireDataTestId,
};
exports.plugin = {
    meta: {
        name: 'eslint-plugin-conventions',
        version: '4.0.7',
    },
    rules: exports.rules,
};
exports.configs = {
    recommended: {
        plugins: {
            conventions: exports.plugin,
        },
        rules: {
            'conventions/no-commented-code': 'warn',
            'conventions/expiring-todo-comments': 'warn',
            'conventions/no-deprecated-api': 'warn',
        },
    },
};
exports.default = exports.plugin;
//# sourceMappingURL=index.js.map