"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_USER_INPUT_PATTERNS = exports.SAFE_ORM_PATTERNS = exports.SAFE_ANNOTATIONS = exports.VALIDATION_PATTERNS = exports.SANITIZATION_FUNCTIONS = void 0;
exports.isSanitizationCall = isSanitizationCall;
exports.isSanitizedInput = isSanitizedInput;
exports.hasSafeAnnotation = hasSafeAnnotation;
exports.isOrmMethodCall = isOrmMethodCall;
exports.isParameterizedQuery = isParameterizedQuery;
exports.isInputSafe = isInputSafe;
exports.createSafetyChecker = createSafetyChecker;
exports.shouldSkipForSafety = shouldSkipForSafety;
exports.findAncestor = findAncestor;
exports.isInsideLoop = isInsideLoop;
exports.isInsideFunction = isInsideFunction;
exports.getContainingFunction = getContainingFunction;
exports.isUserInputIdentifier = isUserInputIdentifier;
exports.isUserInputExpression = isUserInputExpression;
exports.meetsSeverityThreshold = meetsSeverityThreshold;
exports.getEffectiveSeverity = getEffectiveSeverity;
exports.shouldReportSeverity = shouldReportSeverity;
exports.formatComplianceTags = formatComplianceTags;
exports.buildTicketUrl = buildTicketUrl;
exports.getDocumentationUrl = getDocumentationUrl;
exports.enhanceMessageData = enhanceMessageData;
/**
 * Common sanitization function names
 * These functions are typically used to sanitize/escape user input
 */
exports.SANITIZATION_FUNCTIONS = [
    // General sanitization
    'sanitize',
    'sanitizeInput',
    'sanitizeHtml',
    'sanitizeString',
    'sanitizeUrl',
    'sanitizeEmail',
    'sanitizePath',
    'sanitizeQuery',
    'sanitizeOutput',
    'clean',
    'cleanInput',
    'purify',
    'DOMPurify',
    // Escaping
    'escape',
    'escapeHtml',
    'escapeString',
    'escapeSql',
    'escapeRegExp',
    'escapeShell',
    'htmlEscape',
    'sqlEscape',
    // Encoding
    'encode',
    'encodeURIComponent',
    'encodeURI',
    'htmlEncode',
    'urlEncode',
    'base64Encode',
    // Validation (implies the value was checked)
    'validate',
    'validateInput',
    'validateEmail',
    'validateUrl',
    'validateId',
    'validateUuid',
    'isValid',
    'isValidEmail',
    'isValidUrl',
    'assertValid',
    // Type coercion (safe transformations)
    'parseInt',
    'parseFloat',
    'Number',
    'Boolean',
    'String',
    'BigInt',
    // Common library functions
    'xss', // xss library
    'filterXSS',
    'strip_tags', // PHP-style
    'stripTags',
    'bleach', // Python bleach library pattern
    'validator', // validator.js
];
/**
 * Common validation library method patterns
 * Format: objectName.methodName
 */
exports.VALIDATION_PATTERNS = [
    // validator.js patterns
    'validator.escape',
    'validator.isEmail',
    'validator.isURL',
    'validator.isUUID',
    'validator.isAlphanumeric',
    'validator.isInt',
    'validator.isFloat',
    'validator.trim',
    'validator.normalizeEmail',
    'validator.whitelist',
    'validator.blacklist',
    // Zod patterns
    'z.string',
    'z.number',
    'z.boolean',
    'z.array',
    'z.object',
    'schema.parse',
    'schema.safeParse',
    // Yup patterns
    'yup.string',
    'yup.number',
    'string().email',
    'string().url',
    'string().uuid',
    // Joi patterns
    'Joi.string',
    'Joi.number',
    'joi.string',
    'joi.number',
    // class-validator patterns
    'IsEmail',
    'IsUrl',
    'IsUUID',
    'IsString',
    'IsNumber',
    'IsNotEmpty',
    // DOMPurify
    'DOMPurify.sanitize',
    'purify.sanitize',
    // Express-validator
    'body().escape',
    'body().trim',
    'body().isEmail',
    'param().escape',
    'query().escape',
    'check().escape',
    'validationResult',
    'matchedData',
];
/**
 * Safe JSDoc annotations that indicate the value has been validated/sanitized
 */
exports.SAFE_ANNOTATIONS = [
    '@safe',
    '@safe-loop',
    '@validated',
    '@sanitized',
    '@trusted',
    '@escaped',
    '@clean',
    '@verified',
    '@timing-safe',
];
/**
 * ORM method patterns that are considered safe (use parameterized queries internally)
 */
exports.SAFE_ORM_PATTERNS = [
    // Prisma
    'prisma.',
    '.findUnique(',
    '.findFirst(',
    '.findMany(',
    '.create(',
    '.createMany(',
    '.update(',
    '.updateMany(',
    '.upsert(',
    '.delete(',
    '.deleteMany(',
    '.aggregate(',
    '.groupBy(',
    '.count(',
    // TypeORM
    '.createQueryBuilder(',
    '.getRepository(',
    '.find(',
    '.findOne(',
    '.findOneBy(',
    '.save(',
    '.remove(',
    '.softDelete(',
    // Sequelize
    'Model.findAll',
    'Model.findOne',
    'Model.findByPk',
    'Model.create',
    'Model.update',
    'Model.destroy',
    // Knex (when using builder pattern)
    '.where(',
    '.andWhere(',
    '.orWhere(',
    '.whereIn(',
    '.whereNotIn(',
    '.whereBetween(',
    '.insert(',
    '.returning(',
    // Mongoose
    '.findById(',
    '.findByIdAndUpdate(',
    '.findByIdAndDelete(',
    '.find({',
    '.findOne({',
    '.updateOne({',
    '.updateMany({',
    '.deleteOne({',
    '.deleteMany({',
];
/**
 * Check if a node represents a call to a sanitization function
 *
 * @example
 * ```typescript
 * // Returns true for:
 * sanitize(userInput)
 * escape(userInput)
 * DOMPurify.sanitize(html)
 * validator.escape(input)
 * ```
 */
function isSanitizationCall(node, customFunctions = []) {
    const allFunctions = new Set([...exports.SANITIZATION_FUNCTIONS, ...customFunctions]);
    if (node.type === 'CallExpression') {
        const callee = node.callee;
        // Direct function call: sanitize(input)
        if (callee.type === 'Identifier') {
            return allFunctions.has(callee.name);
        }
        // Method call: DOMPurify.sanitize(input)
        if (callee.type === 'MemberExpression') {
            // Get the full method path (e.g., "DOMPurify.sanitize")
            const methodPath = getMemberExpressionPath(callee);
            // Check against validation patterns
            if (exports.VALIDATION_PATTERNS.some((pattern) => methodPath.includes(pattern))) {
                return true;
            }
            // Check if the method name itself is a sanitization function
            if (callee.property.type === 'Identifier') {
                return allFunctions.has(callee.property.name);
            }
        }
    }
    return false;
}
/**
 * Get the full path of a member expression (e.g., "a.b.c")
 */
function getMemberExpressionPath(node) {
    const parts = [];
    let current = node;
    while (current.type === 'MemberExpression') {
        if (current.property.type === 'Identifier') {
            parts.unshift(current.property.name);
        }
        current = current.object;
    }
    if (current.type === 'Identifier') {
        parts.unshift(current.name);
    }
    return parts.join('.');
}
/**
 * Check if a variable was assigned from a sanitization call
 * Traces back through variable assignments to find sanitization
 *
 * @example
 * ```typescript
 * const clean = sanitize(userInput);
 * db.query(`SELECT * FROM users WHERE name = '${clean}'`);
 * // ^ This should NOT be flagged - clean was sanitized
 * ```
 */
function isSanitizedInput(node, context, customFunctions = []) {
    // If it's a direct sanitization call, it's safe
    if (isSanitizationCall(node, customFunctions)) {
        return true;
    }
    // If it's an identifier, check if it was assigned from a sanitization call
    if (node.type === 'Identifier') {
        const scope = context.sourceCode.getScope?.(node) ??
            (context.getScope ? context.getScope() : null);
        if (scope) {
            // Find the variable
            const variable = scope.variables.find((v) => v.name === node.name);
            if (variable) {
                // Check each definition
                for (const def of variable.defs) {
                    if (def.node.type === 'VariableDeclarator' && def.node.init) {
                        if (isSanitizationCall(def.node.init, customFunctions)) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}
/**
 * Check if a node or its parent function has a safe JSDoc annotation
 *
 * @example
 * ```typescript
 * /** @safe - Input validated by middleware *\/
 * function processInput(input) {
 *   db.query(`SELECT * FROM users WHERE name = '${input}'`);
 * }
 * ```
 */
function hasSafeAnnotation(node, context, customAnnotations = []) {
    const allAnnotations = [...exports.SAFE_ANNOTATIONS, ...customAnnotations];
    const sourceCode = context.sourceCode;
    // Check for inline comments directly before the node and its ancestors
    let current = node;
    while (current) {
        const comments = sourceCode.getCommentsBefore(current);
        for (const comment of comments) {
            const commentText = comment.value.toLowerCase();
            if (allAnnotations.some((ann) => commentText.includes(ann.toLowerCase()))) {
                return true;
            }
        }
        // Stop at function boundaries to avoid checking unrelated comments
        if (current.type === 'FunctionDeclaration' ||
            current.type === 'FunctionExpression' ||
            current.type === 'ArrowFunctionExpression' ||
            current.type === 'MethodDefinition') {
            break;
        }
        current = current.parent;
    }
    // Find the containing function/method and check its JSDoc comments
    current = node;
    while (current) {
        if (current.type === 'FunctionDeclaration' ||
            current.type === 'FunctionExpression' ||
            current.type === 'ArrowFunctionExpression' ||
            current.type === 'MethodDefinition') {
            // Check for JSDoc comments
            const comments = sourceCode.getCommentsBefore(current);
            for (const comment of comments) {
                if (comment.type === 'Block' && comment.value.startsWith('*')) {
                    // JSDoc comment
                    const commentText = comment.value.toLowerCase();
                    if (allAnnotations.some((ann) => commentText.includes(ann.toLowerCase()))) {
                        return true;
                    }
                }
            }
            // Also check inline comments
            const leadingComments = sourceCode.getCommentsBefore(current);
            for (const comment of leadingComments) {
                const commentText = comment.value.toLowerCase();
                if (allAnnotations.some((ann) => commentText.includes(ann.toLowerCase()))) {
                    return true;
                }
            }
            break; // Only check the innermost function
        }
        current = current.parent;
    }
    return false;
}
/**
 * Check if a call expression is using an ORM's safe methods
 *
 * @example
 * ```typescript
 * // Returns true - ORM handles parameterization
 * prisma.user.findMany({ where: { name: userInput } });
 * userRepository.createQueryBuilder().where('name = :name', { name: userInput });
 * ```
 */
function isOrmMethodCall(node, context, customPatterns = []) {
    const allPatterns = [...exports.SAFE_ORM_PATTERNS, ...customPatterns];
    const sourceCode = context.sourceCode;
    if (node.type === 'CallExpression') {
        const callText = sourceCode.getText(node);
        // Check if the call matches any safe ORM pattern
        if (allPatterns.some((pattern) => callText.includes(pattern))) {
            return true;
        }
        // Check if it's a chained method call on a known ORM
        if (node.callee.type === 'MemberExpression') {
            const methodPath = getMemberExpressionPath(node.callee);
            // Check for common ORM object names
            const ormNames = [
                'prisma',
                'sequelize',
                'knex',
                'db',
                'repository',
                'model',
            ];
            if (ormNames.some((orm) => methodPath.toLowerCase().startsWith(orm))) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Check if a query uses parameterized placeholders
 *
 * @example
 * ```typescript
 * // Returns true - parameterized
 * db.query('SELECT * FROM users WHERE id = ?', [userId]);
 * db.query('SELECT * FROM users WHERE id = $1', [userId]);
 * db.query('SELECT * FROM users WHERE id = :id', { id: userId });
 * ```
 */
function isParameterizedQuery(queryText) {
    // Check for common parameterized query placeholders
    const placeholderPatterns = [
        /\?/, // MySQL/SQLite style: ?
        /\$\d+/, // PostgreSQL style: $1, $2
        /:\w+/, // Named parameters: :id, :name
        /@\w+/, // SQL Server style: @id
    ];
    return placeholderPatterns.some((pattern) => pattern.test(queryText));
}
/**
 * Combined check: is the input safe from injection?
 *
 * This function combines all safety checks:
 * 1. Sanitization function calls
 * 2. Safe JSDoc annotations
 * 3. ORM method calls
 * 4. Type-constrained values (when available)
 *
 * @example
 * ```typescript
 * if (isInputSafe(node, context)) {
 *   return; // Don't report - input is safe
 * }
 * ```
 */
function isInputSafe(node, context, options = {}) {
    const { customSanitizers = [], customAnnotations = [], customOrmPatterns = [], } = options;
    // Check for sanitization
    if (isSanitizedInput(node, context, customSanitizers)) {
        return true;
    }
    // For binary expressions, check if left or right side is sanitized
    if (node.type === 'BinaryExpression') {
        if (isSanitizedInput(node.left, context, customSanitizers) ||
            isSanitizedInput(node.right, context, customSanitizers)) {
            return true;
        }
    }
    // Check for safe annotations
    if (hasSafeAnnotation(node, context, customAnnotations)) {
        return true;
    }
    // Check parent call for ORM patterns
    let current = node;
    while (current) {
        if (current.type === 'CallExpression') {
            if (isOrmMethodCall(current, context, customOrmPatterns)) {
                return true;
            }
        }
        current = current.parent;
    }
    return false;
}
/**
 * Apply security rule options to configure safety checking
 */
function createSafetyChecker(options = {}) {
    const { trustedSanitizers = [], trustedAnnotations = [], trustedOrmPatterns = [], strictMode = false, } = options;
    return {
        /**
         * Check if input should be considered safe (skip reporting)
         */
        isSafe(node, context) {
            if (strictMode) {
                return false; // In strict mode, never consider anything safe
            }
            return isInputSafe(node, context, {
                customSanitizers: trustedSanitizers,
                customAnnotations: trustedAnnotations,
                customOrmPatterns: trustedOrmPatterns,
            });
        },
        /**
         * Check specifically for sanitization
         */
        isSanitized(node, context) {
            if (strictMode)
                return false;
            return isSanitizedInput(node, context, trustedSanitizers);
        },
        /**
         * Check specifically for safe annotations
         */
        hasAnnotation(node, context) {
            if (strictMode)
                return false;
            return hasSafeAnnotation(node, context, trustedAnnotations);
        },
    };
}
/**
 * Wrapper function to check if a node should be skipped due to safety checks.
 * This consolidates the common pattern used across 75+ locations in security rules:
 *
 * ```typescript
 * // Instead of this (3-5 lines each, 75+ occurrences):
 * /* c8 ignore start -- safetyChecker requires JSDoc annotations not testable via RuleTester *\/
 * if (safetyChecker.isSafe(node, context)) {
 *   return;
 * }
 * /* c8 ignore stop *\/
 *
 * // Use this (1 line):
 * if (shouldSkipForSafety(safetyChecker, node, context)) return;
 * ```
 *
 * @example
 * ```typescript
 * const safetyChecker = createSafetyChecker(options);
 *
 * CallExpression(node) {
 *   // Early return if the node is safe
 *   if (shouldSkipForSafety(safetyChecker, node, context)) return;
 *
 *   // Continue with detection logic...
 * }
 * ```
 */
/* c8 ignore start -- safetyChecker requires JSDoc annotations not testable via RuleTester */
function shouldSkipForSafety(safetyChecker, node, context) {
    return safetyChecker.isSafe(node, context);
}
/* c8 ignore stop */
// ============================================================================
// AST TRAVERSAL UTILITIES
// ============================================================================
/**
 * Loop node types for checking if inside a loop
 */
const LOOP_NODE_TYPES = new Set([
    'ForStatement',
    'WhileStatement',
    'DoWhileStatement',
    'ForInStatement',
    'ForOfStatement',
]);
/**
 * Function node types for finding function boundaries
 */
const FUNCTION_NODE_TYPES = new Set([
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'MethodDefinition',
]);
/**
 * Find an ancestor node matching a predicate, with bounded traversal depth.
 * This prevents infinite loops and ensures O(1) bounded performance.
 *
 * @example
 * ```typescript
 * // Find the containing function
 * const containingFn = findAncestor(node, n => FUNCTION_NODE_TYPES.has(n.type));
 *
 * // Find if inside a loop
 * const loopAncestor = findAncestor(node, n => LOOP_NODE_TYPES.has(n.type));
 * if (loopAncestor) {
 *   // Node is inside a loop
 * }
 * ```
 */
function findAncestor(node, predicate, maxDepth = 20) {
    let current = node.parent;
    let depth = 0;
    while (current && depth < maxDepth) {
        if (predicate(current)) {
            return current;
        }
        current = current.parent;
        depth++;
    }
    return null;
}
/**
 * Check if a node is inside a loop (for, while, do-while, for-in, for-of).
 *
 * @example
 * ```typescript
 * if (isInsideLoop(node)) {
 *   context.report({
 *     node,
 *     messageId: 'resourceAllocationInLoop',
 *   });
 * }
 * ```
 */
function isInsideLoop(node) {
    return findAncestor(node, n => LOOP_NODE_TYPES.has(n.type)) !== null;
}
/**
 * Check if a node is inside a function (for scope analysis).
 */
function isInsideFunction(node) {
    return findAncestor(node, n => FUNCTION_NODE_TYPES.has(n.type)) !== null;
}
/**
 * Get the containing function node, or null if not inside a function.
 */
function getContainingFunction(node) {
    return findAncestor(node, n => FUNCTION_NODE_TYPES.has(n.type));
}
// ============================================================================
// USER INPUT DETECTION UTILITIES
// ============================================================================
/**
 * Default user input variable patterns
 */
exports.DEFAULT_USER_INPUT_PATTERNS = [
    'req', 'request', 'body', 'query', 'params',
    'input', 'data', 'userInput', 'userData',
    'args', 'argv', 'env', 'process.env',
];
/**
 * Check if a variable name suggests user input
 *
 * @example
 * ```typescript
 * if (isUserInputIdentifier('reqBody', DEFAULT_USER_INPUT_PATTERNS)) {
 *   // This variable name suggests user input
 * }
 * ```
 */
function isUserInputIdentifier(name, patterns = exports.DEFAULT_USER_INPUT_PATTERNS) {
    const lowerName = name.toLowerCase();
    return patterns.some(pattern => lowerName.includes(pattern.toLowerCase()));
}
/**
 * Check if an expression contains user input references
 *
 * @example
 * ```typescript
 * if (isUserInputExpression(node, sourceCode, ['req', 'userInput'])) {
 *   context.report({ node, messageId: 'userControlledInput' });
 * }
 * ```
 */
function isUserInputExpression(expression, sourceCode, patterns = exports.DEFAULT_USER_INPUT_PATTERNS) {
    const exprText = sourceCode.getText(expression);
    return patterns.some(pattern => exprText.includes(pattern));
}
// ============================================================================
// SEVERITY AND COMPLIANCE HELPERS
// ============================================================================
const SEVERITY_ORDER = {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    LOW: 2,
    INFO: 1,
};
/**
 * Check if a severity level meets or exceeds a minimum threshold
 */
function meetsSeverityThreshold(severity, minSeverity) {
    return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[minSeverity];
}
/**
 * Get the effective severity level based on options and context
 *
 * @example
 * ```typescript
 * const effectiveSeverity = getEffectiveSeverity('HIGH', options.severity, {
 *   pattern: 'user-input', // optional context for pattern matching
 * });
 * ```
 */
function getEffectiveSeverity(defaultSeverity, override, context) {
    if (!override) {
        return defaultSeverity;
    }
    // Pattern-based override takes precedence
    if (context?.pattern && override.patterns?.[context.pattern]) {
        return override.patterns[context.pattern];
    }
    // Simple level override
    if (override.level) {
        return override.level;
    }
    return defaultSeverity;
}
/**
 * Check if an issue should be reported based on severity threshold
 */
function shouldReportSeverity(severity, override) {
    if (!override?.minSeverity) {
        return true;
    }
    return meetsSeverityThreshold(severity, override.minSeverity);
}
/**
 * Build compliance tags string for error messages
 */
function formatComplianceTags(defaultFrameworks, complianceContext) {
    const allFrameworks = [
        ...defaultFrameworks,
        ...(complianceContext?.frameworks ?? []),
    ];
    if (allFrameworks.length === 0) {
        return '';
    }
    // Limit to 4 frameworks for message brevity
    const display = allFrameworks.slice(0, 4);
    return `[${display.join(',')}]`;
}
/**
 * Build ticket URL from template
 */
function buildTicketUrl(template, data) {
    if (!template?.url) {
        return undefined;
    }
    let url = template.url;
    // Replace placeholders
    url = url.replace(/\{\{summary\}\}/g, encodeURIComponent(data.summary));
    url = url.replace(/\{\{description\}\}/g, encodeURIComponent(data.description ?? ''));
    url = url.replace(/\{\{priority\}\}/g, template.priority ?? 'Medium');
    url = url.replace(/\{\{labels\}\}/g, (template.labels ?? []).join(','));
    url = url.replace(/\{\{cwe\}\}/g, data.cwe ?? '');
    url = url.replace(/\{\{file\}\}/g, encodeURIComponent(data.file ?? ''));
    url = url.replace(/\{\{line\}\}/g, String(data.line ?? 0));
    return url;
}
/**
 * Get documentation URL with fallback to organization-specific docs
 */
function getDocumentationUrl(defaultUrl, complianceContext) {
    return complianceContext?.documentationUrl ?? defaultUrl;
}
/**
 * Create enhanced message data with compliance context
 */
function enhanceMessageData(baseData, options, context) {
    const complianceContext = options.compliance;
    return {
        ...baseData,
        complianceTags: formatComplianceTags(context.defaultFrameworks ?? [], complianceContext),
        ticketUrl: buildTicketUrl(complianceContext?.ticketTemplate, {
            summary: context.summary ?? String(baseData['description'] ?? ''),
            description: context.description,
            cwe: context.cwe,
            file: context.file,
            line: context.line,
        }),
        riskOwner: complianceContext?.riskOwner ?? '',
        ...complianceContext?.metadata,
    };
}
