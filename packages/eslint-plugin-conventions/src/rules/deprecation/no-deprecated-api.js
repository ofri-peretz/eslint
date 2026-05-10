"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.noDeprecatedApi = void 0;
const eslint_devkit_1 = require("@interlace/eslint-devkit");
const eslint_devkit_2 = require("@interlace/eslint-devkit");
exports.noDeprecatedApi = (0, eslint_devkit_2.createRule)({
    name: 'no-deprecated-api',
    meta: {
        type: 'problem',
        docs: {
            url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/no-deprecated-api.md',
            description: 'Prevent usage of deprecated APIs with migration context',
            cwe: 'CWE-1078',
            cvss: 7.5,
        },
        fixable: 'code',
        hasSuggestions: true,
        messages: {
            // 🎯 Token optimization: 44% reduction (48→27 tokens) - removes verbose labels
            deprecatedAPI: (0, eslint_devkit_1.formatLLMMessage)({
                icon: eslint_devkit_1.MessageIcons.DEPRECATION,
                issueName: 'Deprecated API',
                cwe: 'CWE-1078',
                description: 'Deprecated API detected',
                severity: 'HIGH',
                fix: 'Migrate to recommended alternative with timeline guidance',
                documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference',
            }),
            useReplacement: (0, eslint_devkit_1.formatLLMMessage)({
                icon: eslint_devkit_1.MessageIcons.INFO,
                issueName: 'Use Replacement',
                description: 'Replace with recommended API',
                severity: 'LOW',
                fix: 'Replace with {{replacement}}',
                documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference',
            }),
        },
        schema: [
            {
                type: 'object',
                properties: {
                    apis: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' },
                                replacement: { type: 'string' },
                                deprecatedSince: { type: 'string' },
                                removalDate: { type: 'string' },
                                reason: { type: 'string' },
                                migrationGuide: { type: 'string' },
                            },
                            required: ['name', 'replacement', 'deprecatedSince', 'reason'],
                        },
                    },
                    warnDaysBeforeRemoval: {
                        type: 'number',
                        default: 90,
                    },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions: [
        {
            apis: [],
            warnDaysBeforeRemoval: 90,
        },
    ],
    create(context) {
        const options = context.options[0] || {};
        const { apis = [], warnDaysBeforeRemoval = 90 } = options || {};
        // Early return if no deprecated APIs configured
        if (!apis || apis.length === 0) {
            return {};
        }
        /**
         * Calculate days until removal
         */
        // oxlint-disable-next-line consistent-function-scoping
        const calculateDaysRemaining = (removalDate) => {
            if (!removalDate)
                return null;
            const removal = new Date(removalDate);
            const now = new Date();
            const diff = removal.getTime() - now.getTime();
            return Math.ceil(diff / (1000 * 60 * 60 * 24));
        };
        /**
         * Determine urgency level
         */
        const getUrgencyLevel = (daysRemaining) => {
            if (daysRemaining === null)
                return 'low';
            if (daysRemaining < 0)
                return 'critical'; // Already past removal date!
            if (daysRemaining < 30)
                return 'critical';
            if (daysRemaining < warnDaysBeforeRemoval)
                return 'high';
            return 'medium';
        };
        return {
            // Check member expressions (e.g., obj.deprecatedMethod())
            MemberExpression(node) {
                if (node.property.type !== 'Identifier')
                    return;
                const apiName = node.property.name;
                const deprecatedApi = apis.find((api) => api.name === apiName);
                if (!deprecatedApi)
                    return;
                const daysRemaining = calculateDaysRemaining(deprecatedApi.removalDate);
                const urgency = getUrgencyLevel(daysRemaining);
                context.report({
                    node,
                    messageId: 'deprecatedAPI',
                    data: {
                        apiName: deprecatedApi.name,
                        replacement: deprecatedApi.replacement,
                        deprecatedSince: deprecatedApi.deprecatedSince,
                        daysRemaining: String(daysRemaining ?? 'Unknown'),
                        urgency: urgency.toUpperCase(),
                        migrationGuide: deprecatedApi.migrationGuide || 'See documentation',
                    },
                    suggest: [
                        {
                            messageId: 'useReplacement',
                            data: { replacement: deprecatedApi.replacement },
                            fix: (fixer) => {
                                return fixer.replaceText(node.property, deprecatedApi.replacement);
                            },
                        },
                    ],
                });
            },
            // Check call expressions (e.g., deprecatedFunction())
            CallExpression(node) {
                if (node.callee.type !== 'Identifier')
                    return;
                const apiName = node.callee.name;
                const deprecatedApi = apis.find((api) => api.name === apiName);
                if (!deprecatedApi)
                    return;
                const daysRemaining = calculateDaysRemaining(deprecatedApi.removalDate);
                const urgency = getUrgencyLevel(daysRemaining);
                context.report({
                    node,
                    messageId: 'deprecatedAPI',
                    data: {
                        apiName: deprecatedApi.name,
                        replacement: deprecatedApi.replacement,
                        deprecatedSince: deprecatedApi.deprecatedSince,
                        daysRemaining: String(daysRemaining ?? 'Unknown'),
                        urgency: urgency.toUpperCase(),
                        migrationGuide: deprecatedApi.migrationGuide || 'See documentation',
                    },
                    suggest: [
                        {
                            messageId: 'useReplacement',
                            data: { replacement: deprecatedApi.replacement },
                            fix: (fixer) => {
                                return fixer.replaceText(node.callee, deprecatedApi.replacement);
                            },
                        },
                    ],
                });
            },
        };
    },
});
//# sourceMappingURL=no-deprecated-api.js.map