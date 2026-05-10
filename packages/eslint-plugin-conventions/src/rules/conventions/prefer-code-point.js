"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.preferCodePoint = void 0;
const eslint_devkit_1 = require("@interlace/eslint-devkit");
const eslint_devkit_2 = require("@interlace/eslint-devkit");
exports.preferCodePoint = (0, eslint_devkit_1.createRule)({
    name: 'prefer-code-point',
    meta: {
        type: 'suggestion',
        docs: {
            url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/prefer-code-point.md',
            description: 'Prefer codePointAt over charCodeAt for proper Unicode character handling',
        },
        messages: {
            preferCodePoint: (0, eslint_devkit_2.formatLLMMessage)({
                icon: eslint_devkit_2.MessageIcons.WARNING,
                issueName: 'Prefer codePointAt',
                description: 'Use codePointAt instead of charCodeAt for Unicode safety',
                severity: 'MEDIUM',
                fix: 'Replace charCodeAt() with codePointAt()',
                documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-code-point.md',
            }),
        },
        schema: [
            {
                type: 'object',
                properties: {},
                additionalProperties: false,
            },
        ],
    },
    defaultOptions: [],
    create(context) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars, consistent-function-scoping
        function isInAllowedContext(node) {
            // For simplicity, we'll skip the allow option for now
            // This would require more complex logic to check comments/code context
            return false;
        }
        // oxlint-disable-next-line consistent-function-scoping
        function shouldIgnoreCall(node) {
            // The unicorn rule flags ALL charCodeAt calls, but allows some contexts
            if (node.callee.type === 'MemberExpression') {
                // Allow optional chaining
                if (node.callee.optional) {
                    return true;
                }
                // Allow computed property access where the property is a variable (not literal)
                // This means obj[method] is ignored, but obj['charCodeAt'] is still flagged
                if (node.callee.computed &&
                    node.callee.property.type === 'Identifier') {
                    return true;
                }
            }
            return false;
        }
        // oxlint-disable-next-line consistent-function-scoping
        function isCharCodeAtCall(node) {
            // Check if this is a call to charCodeAt method
            if (node.callee.type === 'MemberExpression') {
                // Direct property access: obj.charCodeAt
                if (node.callee.property.type === 'Identifier' &&
                    node.callee.property.name === 'charCodeAt') {
                    return true;
                }
                // Computed property access: obj['charCodeAt']
                if (node.callee.computed &&
                    node.callee.property.type === 'Literal' &&
                    node.callee.property.value === 'charCodeAt') {
                    return true;
                }
            }
            return false;
        }
        return {
            CallExpression(node) {
                if (isCharCodeAtCall(node) &&
                    !isInAllowedContext(node) &&
                    !shouldIgnoreCall(node)) {
                    context.report({
                        node,
                        messageId: 'preferCodePoint',
                        data: {
                            current: 'charCodeAt()',
                            fix: 'codePointAt()',
                        },
                    });
                }
            },
        };
    },
});
//# sourceMappingURL=prefer-code-point.js.map