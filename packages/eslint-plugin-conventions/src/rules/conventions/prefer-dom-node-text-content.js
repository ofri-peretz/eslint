"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.preferDomNodeTextContent = void 0;
const eslint_devkit_1 = require("@interlace/eslint-devkit");
const eslint_devkit_2 = require("@interlace/eslint-devkit");
exports.preferDomNodeTextContent = (0, eslint_devkit_1.createRule)({
    name: 'prefer-dom-node-text-content',
    meta: {
        type: 'suggestion',
        docs: {
            url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/prefer-dom-node-text-content.md',
            description: 'Prefer textContent over innerText for better performance and reliability',
        },
        hasSuggestions: true,
        messages: {
            preferDomNodeTextContent: (0, eslint_devkit_2.formatLLMMessage)({
                icon: eslint_devkit_2.MessageIcons.PERFORMANCE,
                issueName: 'DOM Text Access',
                description: 'Use textContent instead of innerText',
                severity: 'MEDIUM',
                fix: 'Replace innerText with textContent',
                documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-dom-node-text-content.md',
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
        // oxlint-disable-next-line consistent-function-scoping
        function isInAllowedContext() {
            // For simplicity, we'll skip the allow option for now
            return false;
        }
        function isLikelyDomElement(node) {
            const obj = node.object;
            // Check if it's a variable/identifier that might be a DOM element
            if (obj.type === 'Identifier') {
                const name = obj.name;
                // Common DOM element variable names
                if (name.match(/^(element|el|div|span|node|ref|dom|elem)$/i)) {
                    return true;
                }
                // Variables that end with common DOM suffixes
                if (name.match(/(Element|Node|Ref)$/)) {
                    return true;
                }
            }
            // Check for DOM method calls like document.querySelector, getElementById, etc.
            if (obj.type === 'CallExpression' &&
                obj.callee.type === 'MemberExpression') {
                const methodName = obj.callee.property?.name;
                if (methodName &&
                    [
                        'querySelector',
                        'querySelectorAll',
                        'getElementById',
                        'getElementsByClassName',
                        'getElementsByTagName',
                        'createElement',
                    ].includes(methodName)) {
                    return true;
                }
            }
            // Check for property access on known DOM objects
            if (obj.type === 'MemberExpression') {
                const propName = obj.property?.name;
                if (propName &&
                    [
                        'current',
                        'children',
                        'childNodes',
                        'parentNode',
                        'element',
                    ].includes(propName)) {
                    return true;
                }
            }
            // Check for 'this.element' pattern
            if (obj.type === 'MemberExpression' &&
                obj.object.type === 'ThisExpression' &&
                obj.property.type === 'Identifier' &&
                obj.property.name === 'element') {
                return true;
            }
            return false;
        }
        // oxlint-disable-next-line consistent-function-scoping
        function isInnerTextAccess(node) {
            // Check if this is accessing .innerText property
            if (node.property.type === 'Identifier' &&
                node.property.name === 'innerText') {
                return true;
            }
            // Also check computed property access like element["innerText"]
            if (node.computed &&
                node.property.type === 'Literal' &&
                node.property.value === 'innerText') {
                return true;
            }
            return false;
        }
        return {
            MemberExpression(node) {
                if (isInnerTextAccess(node) &&
                    isLikelyDomElement(node) &&
                    !isInAllowedContext()) {
                    context.report({
                        node,
                        messageId: 'preferDomNodeTextContent',
                        data: {
                            current: 'innerText',
                            fix: 'textContent',
                        },
                        suggest: [
                            {
                                messageId: 'preferDomNodeTextContent',
                                data: {
                                    replacement: 'textContent',
                                    suggestion: 'Replace with textContent',
                                },
                                fix(fixer) {
                                    if (node.property.type === 'Identifier') {
                                        return fixer.replaceText(node.property, 'textContent');
                                    }
                                    else if (node.property.type === 'Literal' &&
                                        node.property.value === 'innerText') {
                                        return fixer.replaceText(node.property, '"textContent"');
                                    }
                                    return null;
                                },
                            },
                        ],
                    });
                }
            },
        };
    },
});
//# sourceMappingURL=prefer-dom-node-text-content.js.map