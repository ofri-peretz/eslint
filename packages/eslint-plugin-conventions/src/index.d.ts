/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
import type { TSESLint } from '@interlace/eslint-devkit';
export declare const rules: {
    'no-commented-code': TSESLint.RuleModule<"commentedCode" | "removeCode" | "useVersionControl", [(import("./rules/conventions/no-commented-code").Options | undefined)?], unknown, TSESLint.RuleListener> & {
        name: string;
    };
    'expiring-todo-comments': TSESLint.RuleModule<"expiringTodoComment" | "invalidTodoCondition" | "multipleTodoConditions", [(import("./rules/conventions/expiring-todo-comments").Options | undefined)?], unknown, TSESLint.RuleListener> & {
        name: string;
    };
    'prefer-code-point': TSESLint.RuleModule<"preferCodePoint", [], unknown, TSESLint.RuleListener> & {
        name: string;
    };
    'prefer-dom-node-text-content': TSESLint.RuleModule<"preferDomNodeTextContent", [], unknown, TSESLint.RuleListener> & {
        name: string;
    };
    'no-console-spaces': TSESLint.RuleModule<"noConsoleSpaces", [], unknown, TSESLint.RuleListener> & {
        name: string;
    };
    'no-deprecated-api': TSESLint.RuleModule<"deprecatedAPI" | "useReplacement", [(import("./rules/deprecation/no-deprecated-api").Options | undefined)?], unknown, TSESLint.RuleListener> & {
        name: string;
    };
    'prefer-dependency-version-strategy': TSESLint.RuleModule<"preferStrategy" | "invalidStrategy", [(import("./rules/conventions/prefer-dependency-version-strategy").Options | undefined)?], unknown, TSESLint.RuleListener> & {
        name: string;
    };
    'filename-case': TSESLint.RuleModule<"filenameCase", [(import("./rules/conventions/filename-case").Options | undefined)?], unknown, TSESLint.RuleListener> & {
        name: string;
    };
    'consistent-existence-index-check': TSESLint.RuleModule<"consistentExistenceCheck", [(import("./rules/conventions/consistent-existence-index-check").Options | undefined)?], unknown, TSESLint.RuleListener> & {
        name: string;
    };
    'no-json-schema-tags': TSESLint.RuleModule<"jsonSchemaTag" | "moveToDescription", [(import("./rules/conventions/no-json-schema-tags").Options | undefined)?], unknown, TSESLint.RuleListener> & {
        name: string;
    };
    'require-data-testid': TSESLint.RuleModule<"missingDataTestId" | "dynamicDataTestId", [(import("./rules/conventions/require-data-testid").Options | undefined)?], unknown, TSESLint.RuleListener> & {
        name: string;
    };
};
export declare const plugin: {
    meta: {
        name: string;
        version: string;
    };
    rules: {
        'no-commented-code': TSESLint.RuleModule<"commentedCode" | "removeCode" | "useVersionControl", [(import("./rules/conventions/no-commented-code").Options | undefined)?], unknown, TSESLint.RuleListener> & {
            name: string;
        };
        'expiring-todo-comments': TSESLint.RuleModule<"expiringTodoComment" | "invalidTodoCondition" | "multipleTodoConditions", [(import("./rules/conventions/expiring-todo-comments").Options | undefined)?], unknown, TSESLint.RuleListener> & {
            name: string;
        };
        'prefer-code-point': TSESLint.RuleModule<"preferCodePoint", [], unknown, TSESLint.RuleListener> & {
            name: string;
        };
        'prefer-dom-node-text-content': TSESLint.RuleModule<"preferDomNodeTextContent", [], unknown, TSESLint.RuleListener> & {
            name: string;
        };
        'no-console-spaces': TSESLint.RuleModule<"noConsoleSpaces", [], unknown, TSESLint.RuleListener> & {
            name: string;
        };
        'no-deprecated-api': TSESLint.RuleModule<"deprecatedAPI" | "useReplacement", [(import("./rules/deprecation/no-deprecated-api").Options | undefined)?], unknown, TSESLint.RuleListener> & {
            name: string;
        };
        'prefer-dependency-version-strategy': TSESLint.RuleModule<"preferStrategy" | "invalidStrategy", [(import("./rules/conventions/prefer-dependency-version-strategy").Options | undefined)?], unknown, TSESLint.RuleListener> & {
            name: string;
        };
        'filename-case': TSESLint.RuleModule<"filenameCase", [(import("./rules/conventions/filename-case").Options | undefined)?], unknown, TSESLint.RuleListener> & {
            name: string;
        };
        'consistent-existence-index-check': TSESLint.RuleModule<"consistentExistenceCheck", [(import("./rules/conventions/consistent-existence-index-check").Options | undefined)?], unknown, TSESLint.RuleListener> & {
            name: string;
        };
        'no-json-schema-tags': TSESLint.RuleModule<"jsonSchemaTag" | "moveToDescription", [(import("./rules/conventions/no-json-schema-tags").Options | undefined)?], unknown, TSESLint.RuleListener> & {
            name: string;
        };
        'require-data-testid': TSESLint.RuleModule<"missingDataTestId" | "dynamicDataTestId", [(import("./rules/conventions/require-data-testid").Options | undefined)?], unknown, TSESLint.RuleListener> & {
            name: string;
        };
    };
};
export declare const configs: {
    recommended: {
        plugins: {
            conventions: {
                meta: {
                    name: string;
                    version: string;
                };
                rules: {
                    'no-commented-code': TSESLint.RuleModule<"commentedCode" | "removeCode" | "useVersionControl", [(import("./rules/conventions/no-commented-code").Options | undefined)?], unknown, TSESLint.RuleListener> & {
                        name: string;
                    };
                    'expiring-todo-comments': TSESLint.RuleModule<"expiringTodoComment" | "invalidTodoCondition" | "multipleTodoConditions", [(import("./rules/conventions/expiring-todo-comments").Options | undefined)?], unknown, TSESLint.RuleListener> & {
                        name: string;
                    };
                    'prefer-code-point': TSESLint.RuleModule<"preferCodePoint", [], unknown, TSESLint.RuleListener> & {
                        name: string;
                    };
                    'prefer-dom-node-text-content': TSESLint.RuleModule<"preferDomNodeTextContent", [], unknown, TSESLint.RuleListener> & {
                        name: string;
                    };
                    'no-console-spaces': TSESLint.RuleModule<"noConsoleSpaces", [], unknown, TSESLint.RuleListener> & {
                        name: string;
                    };
                    'no-deprecated-api': TSESLint.RuleModule<"deprecatedAPI" | "useReplacement", [(import("./rules/deprecation/no-deprecated-api").Options | undefined)?], unknown, TSESLint.RuleListener> & {
                        name: string;
                    };
                    'prefer-dependency-version-strategy': TSESLint.RuleModule<"preferStrategy" | "invalidStrategy", [(import("./rules/conventions/prefer-dependency-version-strategy").Options | undefined)?], unknown, TSESLint.RuleListener> & {
                        name: string;
                    };
                    'filename-case': TSESLint.RuleModule<"filenameCase", [(import("./rules/conventions/filename-case").Options | undefined)?], unknown, TSESLint.RuleListener> & {
                        name: string;
                    };
                    'consistent-existence-index-check': TSESLint.RuleModule<"consistentExistenceCheck", [(import("./rules/conventions/consistent-existence-index-check").Options | undefined)?], unknown, TSESLint.RuleListener> & {
                        name: string;
                    };
                    'no-json-schema-tags': TSESLint.RuleModule<"jsonSchemaTag" | "moveToDescription", [(import("./rules/conventions/no-json-schema-tags").Options | undefined)?], unknown, TSESLint.RuleListener> & {
                        name: string;
                    };
                    'require-data-testid': TSESLint.RuleModule<"missingDataTestId" | "dynamicDataTestId", [(import("./rules/conventions/require-data-testid").Options | undefined)?], unknown, TSESLint.RuleListener> & {
                        name: string;
                    };
                };
            };
        };
        rules: {
            'conventions/no-commented-code': "warn";
            'conventions/expiring-todo-comments': "warn";
            'conventions/no-deprecated-api': "warn";
        };
    };
};
export default plugin;
