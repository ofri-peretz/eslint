/**
 * Security Utilities - Shared helpers for reducing false positives in security rules
 * 
 * This module provides common detection for:
 * 1. Sanitization/validation function calls
 * 2. Safe patterns (ORMs, parameterized queries)
 * 3. JSDoc annotations (@safe, @validated, @sanitized)
 * 
 * @example
 * ```typescript
 * import { 
 *   isSanitizedInput, 
 *   hasSafeAnnotation,
 *   isOrmMethodCall 
 * } from '../../utils/security-utils';
 * 
 * // Skip reporting if input is sanitized
 * if (isSanitizedInput(node, context)) {
 *   return; // Not a vulnerability - input was sanitized
 * }
 * ```
 */
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';

/**
 * Common sanitization function names
 * These functions are typically used to sanitize/escape user input
 */
export const SANITIZATION_FUNCTIONS = [
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
export const VALIDATION_PATTERNS = [
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
export const SAFE_ANNOTATIONS = [
  '@safe',
  '@validated',
  '@sanitized',
  '@trusted',
  '@escaped',
  '@clean',
  '@verified',
];

/**
 * ORM method patterns that are considered safe (use parameterized queries internally)
 */
export const SAFE_ORM_PATTERNS = [
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
export function isSanitizationCall(
  node: TSESTree.Node,
  customFunctions: string[] = []
): boolean {
  const allFunctions = [...SANITIZATION_FUNCTIONS, ...customFunctions];
  
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    
    // Direct function call: sanitize(input)
    if (callee.type === 'Identifier') {
      return allFunctions.includes(callee.name);
    }
    
    // Method call: DOMPurify.sanitize(input)
    if (callee.type === 'MemberExpression') {
      // Get the full method path (e.g., "DOMPurify.sanitize")
      const methodPath = getMemberExpressionPath(callee);
      
      // Check against validation patterns
      if (VALIDATION_PATTERNS.some(pattern => methodPath.includes(pattern))) {
        return true;
      }
      
      // Check if the method name itself is a sanitization function
      if (callee.property.type === 'Identifier') {
        return allFunctions.includes(callee.property.name);
      }
    }
  }
  
  return false;
}

/**
 * Get the full path of a member expression (e.g., "a.b.c")
 */
function getMemberExpressionPath(node: TSESTree.MemberExpression): string {
  const parts: string[] = [];
  
  let current: TSESTree.Node = node;
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
export function isSanitizedInput(
  node: TSESTree.Node,
  context: TSESLint.RuleContext<string, unknown[]>,
  customFunctions: string[] = []
): boolean {
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
      const variable = scope.variables.find(v => v.name === node.name);
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
export function hasSafeAnnotation(
  node: TSESTree.Node,
  context: TSESLint.RuleContext<string, unknown[]>,
  customAnnotations: string[] = []
): boolean {
  const allAnnotations = [...SAFE_ANNOTATIONS, ...customAnnotations];
  const sourceCode = context.sourceCode;
  
  // Find the containing function/method
  let current: TSESTree.Node | undefined = node;
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression' ||
      current.type === 'MethodDefinition'
    ) {
      // Check for JSDoc comments
      const comments = sourceCode.getCommentsBefore(current);
      for (const comment of comments) {
        if (comment.type === 'Block' && comment.value.startsWith('*')) {
          // JSDoc comment
          const commentText = comment.value.toLowerCase();
          if (allAnnotations.some(ann => commentText.includes(ann.toLowerCase()))) {
            return true;
          }
        }
      }
      
      // Also check inline comments
      const leadingComments = sourceCode.getCommentsBefore(current);
      for (const comment of leadingComments) {
        const commentText = comment.value.toLowerCase();
        if (allAnnotations.some(ann => commentText.includes(ann.toLowerCase()))) {
          return true;
        }
      }
    }
    
    current = current.parent as TSESTree.Node | undefined;
  }
  
  // Check for inline comments on the node itself
  const nodeComments = sourceCode.getCommentsBefore(node);
  for (const comment of nodeComments) {
    const commentText = comment.value.toLowerCase();
    if (allAnnotations.some(ann => commentText.includes(ann.toLowerCase()))) {
      return true;
    }
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
export function isOrmMethodCall(
  node: TSESTree.Node,
  context: TSESLint.RuleContext<string, unknown[]>,
  customPatterns: string[] = []
): boolean {
  const allPatterns = [...SAFE_ORM_PATTERNS, ...customPatterns];
  const sourceCode = context.sourceCode;
  
  if (node.type === 'CallExpression') {
    const callText = sourceCode.getText(node);
    
    // Check if the call matches any safe ORM pattern
    if (allPatterns.some(pattern => callText.includes(pattern))) {
      return true;
    }
    
    // Check if it's a chained method call on a known ORM
    if (node.callee.type === 'MemberExpression') {
      const methodPath = getMemberExpressionPath(node.callee);
      
      // Check for common ORM object names
      const ormNames = ['prisma', 'sequelize', 'knex', 'db', 'repository', 'model'];
      if (ormNames.some(orm => methodPath.toLowerCase().startsWith(orm))) {
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
export function isParameterizedQuery(
  queryText: string
): boolean {
  // Check for common parameterized query placeholders
  const placeholderPatterns = [
    /\?/,                    // MySQL/SQLite style: ?
    /\$\d+/,                 // PostgreSQL style: $1, $2
    /:\w+/,                  // Named parameters: :id, :name
    /@\w+/,                  // SQL Server style: @id
  ];
  
  return placeholderPatterns.some(pattern => pattern.test(queryText));
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
export function isInputSafe(
  node: TSESTree.Node,
  context: TSESLint.RuleContext<string, unknown[]>,
  options: {
    customSanitizers?: string[];
    customAnnotations?: string[];
    customOrmPatterns?: string[];
  } = {}
): boolean {
  const { customSanitizers = [], customAnnotations = [], customOrmPatterns = [] } = options;
  
  // Check for sanitization
  if (isSanitizedInput(node, context, customSanitizers)) {
    return true;
  }
  
  // Check for safe annotations
  if (hasSafeAnnotation(node, context, customAnnotations)) {
    return true;
  }
  
  // Check parent call for ORM patterns
  let current: TSESTree.Node | undefined = node;
  while (current) {
    if (current.type === 'CallExpression') {
      if (isOrmMethodCall(current, context, customOrmPatterns)) {
        return true;
      }
    }
    current = current.parent as TSESTree.Node | undefined;
  }
  
  return false;
}

/**
 * Options interface for security rules that want to use these utilities
 */
export interface SecurityRuleOptions {
  /** Additional function names to consider as sanitizers */
  trustedSanitizers?: string[];
  
  /** Additional JSDoc annotations to consider as safe markers */
  trustedAnnotations?: string[];
  
  /** Additional ORM patterns to consider safe */
  trustedOrmPatterns?: string[];
  
  /** Disable all false positive detection (strict mode) */
  strictMode?: boolean;
}

/**
 * Apply security rule options to configure safety checking
 */
export function createSafetyChecker(options: SecurityRuleOptions = {}) {
  const {
    trustedSanitizers = [],
    trustedAnnotations = [],
    trustedOrmPatterns = [],
    strictMode = false,
  } = options;
  
  return {
    /**
     * Check if input should be considered safe (skip reporting)
     */
    isSafe(
      node: TSESTree.Node,
      context: TSESLint.RuleContext<string, unknown[]>
    ): boolean {
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
    isSanitized(
      node: TSESTree.Node,
      context: TSESLint.RuleContext<string, unknown[]>
    ): boolean {
      if (strictMode) return false;
      return isSanitizedInput(node, context, trustedSanitizers);
    },
    
    /**
     * Check specifically for safe annotations
     */
    hasAnnotation(
      node: TSESTree.Node,
      context: TSESLint.RuleContext<string, unknown[]>
    ): boolean {
      if (strictMode) return false;
      return hasSafeAnnotation(node, context, trustedAnnotations);
    },
  };
}

