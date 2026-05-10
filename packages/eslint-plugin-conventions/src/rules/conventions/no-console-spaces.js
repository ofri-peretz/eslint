"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.noConsoleSpaces = void 0;
const eslint_devkit_1 = require("@interlace/eslint-devkit");
const eslint_devkit_2 = require("@interlace/eslint-devkit");
exports.noConsoleSpaces = (0, eslint_devkit_1.createRule)({
    name: 'no-console-spaces',
    meta: {
        type: 'problem',
        docs: {
            url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/no-console-spaces.md',
            description: 'Prevent leading/trailing space between console.log parameters',
        },
        fixable: 'code',
        hasSuggestions: true,
        messages: {
            noConsoleSpaces: (0, eslint_devkit_2.formatLLMMessage)({
                icon: eslint_devkit_2.MessageIcons.WARNING,
                issueName: 'Console Spaces',
                description: 'Remove leading/trailing spaces in console method parameters',
                severity: 'MEDIUM',
                fix: 'Remove spaces from console method arguments',
                documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-console-spaces.md',
            }),
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        // Console methods that join parameters with spaces
        const consoleMethods = new Set([
            'log',
            'debug',
            'info',
            'warn',
            'error',
            'table',
            'trace',
            'group',
            'groupCollapsed',
        ]);
        // oxlint-disable-next-line consistent-function-scoping
        function isInAllowedContext() {
            // For simplicity, we'll skip the allow option for now
            return false;
        }
        function isConsoleMethodCall(node) {
            // Check if this is a call to a console method
            if (node.callee.type === 'MemberExpression' &&
                node.callee.object.type === 'Identifier' &&
                node.callee.object.name === 'console' &&
                node.callee.property.type === 'Identifier' &&
                consoleMethods.has(node.callee.property.name)) {
                return true;
            }
            return false;
        }
        // oxlint-disable-next-line consistent-function-scoping
        function getConsoleMethodName(node) {
            // Safe extraction of console method name
            if (node.callee.type === 'MemberExpression' &&
                node.callee.property.type === 'Identifier') {
                return node.callee.property.name;
            }
            return 'console';
        }
        // oxlint-disable-next-line consistent-function-scoping
        function hasLeadingOrTrailingSpaces(text) {
            // Check if string starts or ends with whitespace, but not if it's only whitespace
            // Only flag if there's actual content with leading/trailing spaces
            const trimmed = text.trim();
            return trimmed.length > 0 && /^\s|\s$/.test(text);
        }
        // oxlint-disable-next-line consistent-function-scoping
        function hasLeadingOrTrailingSpacesInTemplate(text) {
            // For template literals, even whitespace-only quasis should be flagged
            return /^\s|\s$/.test(text);
        }
        return {
            CallExpression(node) {
                if (isConsoleMethodCall(node) && !isInAllowedContext()) {
                    // Check each argument for leading/trailing spaces
                    for (const arg of node.arguments) {
                        if (arg.type === 'Literal' && typeof arg.value === 'string') {
                            if (hasLeadingOrTrailingSpaces(arg.value)) {
                                context.report({
                                    node: arg,
                                    messageId: 'noConsoleSpaces',
                                    data: {
                                        method: getConsoleMethodName(node),
                                        arg: arg.value,
                                    },
                                    fix(fixer) {
                                        const trimmed = arg.value.trim();
                                        return fixer.replaceText(arg, `'${trimmed}'`);
                                    },
                                });
                            }
                        }
                        else if (arg.type === 'TemplateLiteral') {
                            // Check template literal quasi values for leading/trailing spaces
                            let hasSpacesInTemplate = false;
                            for (const quasi of arg.quasis) {
                                if (hasLeadingOrTrailingSpacesInTemplate(quasi.value.raw)) {
                                    hasSpacesInTemplate = true;
                                    break;
                                }
                            }
                            if (hasSpacesInTemplate) {
                                context.report({
                                    node: arg,
                                    messageId: 'noConsoleSpaces',
                                    data: {
                                        method: getConsoleMethodName(node),
                                        arg: 'template literal with spaces',
                                    },
                                    // Template literals are harder to fix automatically
                                    fix: null,
                                });
                            }
                        }
                    }
                }
            },
        };
    },
});
//# sourceMappingURL=no-console-spaces.js.map