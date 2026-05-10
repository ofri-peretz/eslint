"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.expiringTodoComments = void 0;
const eslint_devkit_1 = require("@interlace/eslint-devkit");
const eslint_devkit_2 = require("@interlace/eslint-devkit");
const eslint_devkit_3 = require("@interlace/eslint-devkit");
const eslint_devkit_4 = require("@interlace/eslint-devkit");
exports.expiringTodoComments = (0, eslint_devkit_1.createRule)({
    name: 'expiring-todo-comments',
    meta: {
        type: 'problem',
        docs: {
            url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/expiring-todo-comments.md',
            description: 'Add expiration conditions to TODO comments to prevent forgotten tasks',
        },
        hasSuggestions: false,
        messages: {
            expiringTodoComment: (0, eslint_devkit_2.formatLLMMessage)({
                icon: eslint_devkit_2.MessageIcons.WARNING,
                issueName: 'Expiring TODO Comment',
                description: 'TODO comment has expired condition',
                severity: 'HIGH',
                fix: 'Address the TODO or update/remove the condition',
                documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/expiring-todo-comments.md',
            }),
            invalidTodoCondition: (0, eslint_devkit_2.formatLLMMessage)({
                icon: eslint_devkit_2.MessageIcons.WARNING,
                issueName: 'Invalid TODO Condition',
                description: '{{term}} TODO comment has invalid condition format',
                severity: 'MEDIUM',
                fix: 'Fix the condition format or remove the condition',
                documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/expiring-todo-comments.md',
            }),
            multipleTodoConditions: (0, eslint_devkit_2.formatLLMMessage)({
                icon: eslint_devkit_2.MessageIcons.WARNING,
                issueName: 'Multiple TODO Conditions',
                description: 'TODO comment has multiple conditions',
                severity: 'MEDIUM',
                fix: 'Use only one condition per TODO comment',
                documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/expiring-todo-comments.md',
            }),
        },
        schema: [
            {
                type: 'object',
                properties: {
                    terms: {
                        type: 'array',
                        items: { type: 'string' },
                        default: ['TODO', 'FIXME', 'XXX'],
                    },
                    dateFormat: {
                        type: 'string',
                        default: 'YYYY-MM-DD',
                    },
                },
                additionalProperties: false,
            },
        ],
    },
    defaultOptions: [
        { terms: ['TODO', 'FIXME', 'XXX'], dateFormat: 'YYYY-MM-DD' },
    ],
    create(context) {
        const [options] = context.options;
        const { terms = ['TODO', 'FIXME', 'XXX'] } = options || {};
        // Cache package.json data
        let packageJson = null;
        function loadPackageJson() {
            if (packageJson !== null) {
                return packageJson;
            }
            const packageJsonPath = (0, eslint_devkit_4.resolvePath)(process.cwd(), 'package.json');
            packageJson = (0, eslint_devkit_3.readJsonFileSync)(packageJsonPath);
            return packageJson;
        }
        // oxlint-disable-next-line consistent-function-scoping
        function parseSemver(version) {
            const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
            if (!match)
                return null;
            return {
                major: parseInt(match[1], 10),
                minor: parseInt(match[2], 10),
                patch: parseInt(match[3], 10),
            };
        }
        function compareVersions(version1, version2) {
            const v1 = parseSemver(version1);
            const v2 = parseSemver(version2);
            if (!v1 || !v2)
                return 0;
            if (v1.major !== v2.major)
                return v1.major - v2.major;
            if (v1.minor !== v2.minor)
                return v1.minor - v2.minor;
            return v1.patch - v2.patch;
        }
        // oxlint-disable-next-line consistent-function-scoping
        function checkDateCondition(dateStr) {
            try {
                const conditionDate = new Date(dateStr + 'T00:00:00Z'); // UTC
                const now = new Date();
                return now >= conditionDate;
            }
            catch {
                return false;
            }
        }
        function checkPackageVersionCondition(operator, targetVersion) {
            const pkg = loadPackageJson();
            if (!pkg?.version)
                return false;
            const currentVersion = pkg.version;
            const comparison = compareVersions(currentVersion, targetVersion);
            switch (operator) {
                case '>':
                    return comparison > 0;
                case '>=':
                    return comparison >= 0;
                case '<':
                    return comparison < 0;
                case '<=':
                    return comparison <= 0;
                case '=':
                case '==':
                    return comparison === 0;
                default:
                    return false;
            }
        }
        function checkEngineVersionCondition(engine, operator, targetVersion) {
            if (engine !== 'node')
                return false;
            const pkg = loadPackageJson();
            const nodeVersion = pkg?.engines?.node;
            if (!nodeVersion)
                return false;
            // Simple version comparison for engines
            const currentVersion = nodeVersion.replace(/^[\^~>=<]+/, '');
            const comparison = compareVersions(currentVersion, targetVersion);
            switch (operator) {
                case '>':
                    return comparison > 0;
                case '>=':
                    return comparison >= 0;
                case '<':
                    return comparison < 0;
                case '<=':
                    return comparison <= 0;
                default:
                    return false;
            }
        }
        function checkDependencyCondition(packageName, present) {
            const pkg = loadPackageJson();
            if (!pkg)
                return false;
            const allDeps = {
                ...pkg.dependencies,
                ...pkg.devDependencies,
                ...pkg.peerDependencies,
            };
            const hasPackage = packageName in allDeps;
            return present ? hasPackage : hasPackage;
        }
        // oxlint-disable-next-line consistent-function-scoping
        function parseTodoCondition(commentValue, term) {
            // Match patterns like: TODO [condition]: message
            // or TODO (@author) [condition]: message
            // Also handle block comments with * prefix: * TODO [condition]: message
            const todoRegex = new RegExp(`\\*?\\s*${term}\\s*(?:\\([^)]+\\))?\\s*\\[([^\\]]+)\\]\\s*:\\s*(.+)$`, 'im');
            const match = commentValue.match(todoRegex);
            if (!match)
                return null;
            const conditionStr = match[1];
            const rest = match[2];
            // Split multiple conditions (shouldn't happen, but handle gracefully)
            const conditions = conditionStr.split(/\s*,\s*/);
            return { conditions, rest };
        }
        // oxlint-disable-next-line consistent-function-scoping
        function validateCondition(condition) {
            // Date condition: YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(condition)) {
                return { type: 'date', value: condition };
            }
            // Package version condition: >=1.0.0, >2.0.0, etc.
            const packageVersionMatch = condition.match(/^([><]=?|=|==)\s*([\d.]+)$/);
            if (packageVersionMatch) {
                return {
                    type: 'package-version',
                    operator: packageVersionMatch[1],
                    value: packageVersionMatch[2],
                };
            }
            // Engine version condition: engine:node@>=8, engine:node@>20.0.0
            const engineVersionMatch = condition.match(/^engine:(\w+)@([><]=?)\s*([\d.]+)$/);
            if (engineVersionMatch) {
                const engine = engineVersionMatch[1];
                // Validate engine name
                if (!['node', 'npm', 'yarn', 'pnpm'].includes(engine)) {
                    return null; // Invalid engine, let it be caught as invalid condition
                }
                return {
                    type: 'engine-version',
                    value: `${engine}@${engineVersionMatch[3]}`,
                    operator: engineVersionMatch[2],
                };
            }
            // Dependency condition: +package-name or -package-name
            const depMatch = condition.match(/^([+-])(.+)$/);
            if (depMatch) {
                return {
                    type: 'dependency',
                    value: depMatch[2],
                    operator: depMatch[1],
                };
            }
            return null;
        }
        function checkCondition(condition) {
            const parsed = validateCondition(condition);
            if (!parsed)
                return false;
            switch (parsed.type) {
                case 'date':
                    return checkDateCondition(parsed.value);
                case 'package-version':
                    return parsed.operator
                        ? checkPackageVersionCondition(parsed.operator, parsed.value)
                        : false;
                case 'engine-version': {
                    const [engine, version] = parsed.value.split('@');
                    return parsed.operator
                        ? checkEngineVersionCondition(engine, parsed.operator, version)
                        : false;
                }
                case 'dependency':
                    return checkDependencyCondition(parsed.value, parsed.operator === '+');
                default:
                    return false;
            }
        }
        function checkComment(comment) {
            const commentValue = comment.value;
            for (const term of terms) {
                const parsed = parseTodoCondition(commentValue, term);
                if (!parsed)
                    continue;
                const { conditions, rest } = parsed;
                // Check for multiple conditions
                if (conditions.length > 1) {
                    context.report({
                        loc: comment.loc,
                        messageId: 'multipleTodoConditions',
                        data: {
                            term,
                            conditions: conditions.join(', '),
                        },
                    });
                    continue;
                }
                const condition = conditions[0];
                // Validate condition format
                const parsedCondition = validateCondition(condition);
                if (!parsedCondition) {
                    context.report({
                        loc: comment.loc,
                        messageId: 'invalidTodoCondition',
                        data: {
                            condition,
                            term,
                        },
                    });
                    continue;
                }
                // Check if condition has expired
                if (checkCondition(condition)) {
                    context.report({
                        loc: comment.loc,
                        messageId: 'expiringTodoComment',
                        data: {
                            term,
                            condition,
                            message: rest,
                        },
                    });
                }
                // Only process one term per comment
                break;
            }
        }
        return {
            Program() {
                const sourceCode = context.sourceCode;
                const comments = sourceCode.getAllComments();
                for (const comment of comments) {
                    if (comment.type === 'Line' || comment.type === 'Block') {
                        checkComment(comment);
                    }
                }
            },
        };
    },
});
//# sourceMappingURL=expiring-todo-comments.js.map