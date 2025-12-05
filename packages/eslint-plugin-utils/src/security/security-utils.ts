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
import type { TSESTree, TSESLint } from '@typescript-eslint/utils';

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
      const variable = scope.variables.find((v: { name: string }) => v.name === node.name);
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

  // Check for inline comments directly before the node and its ancestors
  let current: TSESTree.Node | undefined = node;
  while (current) {
    const comments = sourceCode.getCommentsBefore(current);
    for (const comment of comments) {
      const commentText = comment.value.toLowerCase();
      if (allAnnotations.some(ann => commentText.includes(ann.toLowerCase()))) {
        return true;
      }
    }

    // Stop at function boundaries to avoid checking unrelated comments
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression' ||
      current.type === 'MethodDefinition'
    ) {
      break;
    }

    current = current.parent as TSESTree.Node | undefined;
  }

  // Find the containing function/method and check its JSDoc comments
  current = node;
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
      break; // Only check the innermost function
    }

    current = current.parent as TSESTree.Node | undefined;
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
/**
 * Compliance framework identifiers
 */
export type ComplianceFramework = 
  | 'SOC2'
  | 'HIPAA' 
  | 'PCI-DSS'
  | 'GDPR'
  | 'ISO27001'
  | 'NIST-CSF'
  | 'OWASP-ASVS'
  | 'FEDRAMP'
  | string; // Allow custom compliance identifiers

/**
 * Severity level override options
 */
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/**
 * Severity override configuration
 */
export interface SeverityOverride {
  /**
   * Override the default severity level for this rule
   * @example 'CRITICAL'
   */
  level?: SeverityLevel;

  /**
   * Override based on pattern matching
   * @example { 'user-input': 'CRITICAL', 'internal-api': 'MEDIUM' }
   */
  patterns?: Record<string, SeverityLevel>;

  /**
   * Minimum severity to report (filters out lower severity issues)
   * @example 'MEDIUM' - only report MEDIUM, HIGH, CRITICAL
   */
  minSeverity?: SeverityLevel;
}

/**
 * Compliance context for security rules
 */
export interface ComplianceContext {
  /**
   * Additional compliance frameworks this rule applies to
   * These are added to the auto-detected frameworks
   * @example ['COMPANY-SEC-001', 'TEAM-POLICY-A']
   */
  frameworks?: ComplianceFramework[];

  /**
   * Ticket/issue tracking integration
   * When violations are found, include link to create ticket
   */
  ticketTemplate?: {
    /** Template URL with placeholders */
    url: string;
    /** Template for ticket summary */
    summary?: string;
    /** Default priority for tickets */
    priority?: 'Critical' | 'High' | 'Medium' | 'Low';
    /** Additional labels to apply */
    labels?: string[];
  };

  /**
   * Documentation link override for organization-specific docs
   */
  documentationUrl?: string;

  /**
   * Risk owner or team responsible for this category
   */
  riskOwner?: string;

  /**
   * Custom metadata for enterprise integration
   */
  metadata?: Record<string, string>;
}

export interface SecurityRuleOptions {
  /** Additional function names to consider as sanitizers */
  trustedSanitizers?: string[];
  
  /** Additional JSDoc annotations to consider as safe markers */
  trustedAnnotations?: string[];
  
  /** Additional ORM patterns to consider safe */
  trustedOrmPatterns?: string[];
  
  /** Disable all false positive detection (strict mode) */
  strictMode?: boolean;

  /**
   * Override the default severity for this rule
   * 
   * @example
   * ```javascript
   * // Simple override
   * { severity: { level: 'CRITICAL' } }
   * 
   * // Pattern-based override
   * { severity: { patterns: { 'user-input': 'CRITICAL', 'admin-api': 'HIGH' } } }
   * 
   * // Filter low severity
   * { severity: { minSeverity: 'MEDIUM' } }
   * ```
   */
  severity?: SeverityOverride;

  /**
   * Compliance context for enterprise security reporting
   * 
   * @example
   * ```javascript
   * {
   *   compliance: {
   *     frameworks: ['HIPAA', 'SOC2', 'COMPANY-SEC-001'],
   *     ticketTemplate: {
   *       url: 'https://jira.company.com/create?summary={{summary}}&priority={{priority}}',
   *       priority: 'Critical',
   *       labels: ['security', 'automated'],
   *     },
   *     documentationUrl: 'https://wiki.company.com/security/sql-injection',
   *     riskOwner: 'security-team@company.com',
   *   }
   * }
   * ```
   */
  compliance?: ComplianceContext;
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

// ============================================================================
// SEVERITY AND COMPLIANCE HELPERS
// ============================================================================

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

/**
 * Check if a severity level meets or exceeds a minimum threshold
 */
export function meetsSeverityThreshold(
  severity: SeverityLevel,
  minSeverity: SeverityLevel
): boolean {
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
export function getEffectiveSeverity(
  defaultSeverity: SeverityLevel,
  override?: SeverityOverride,
  context?: { pattern?: string }
): SeverityLevel {
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
export function shouldReportSeverity(
  severity: SeverityLevel,
  override?: SeverityOverride
): boolean {
  if (!override?.minSeverity) {
    return true;
  }
  return meetsSeverityThreshold(severity, override.minSeverity);
}

/**
 * Build compliance tags string for error messages
 */
export function formatComplianceTags(
  defaultFrameworks: ComplianceFramework[],
  complianceContext?: ComplianceContext
): string {
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
export function buildTicketUrl(
  template: ComplianceContext['ticketTemplate'],
  data: {
    summary: string;
    description?: string;
    cwe?: string;
    file?: string;
    line?: number;
  }
): string | undefined {
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
export function getDocumentationUrl(
  defaultUrl: string,
  complianceContext?: ComplianceContext
): string {
  return complianceContext?.documentationUrl ?? defaultUrl;
}

/**
 * Create enhanced message data with compliance context
 */
export function enhanceMessageData(
  baseData: Record<string, unknown>,
  options: SecurityRuleOptions,
  context: {
    defaultFrameworks?: ComplianceFramework[];
    summary?: string;
    description?: string;
    cwe?: string;
    file?: string;
    line?: number;
  }
): Record<string, unknown> {
  const complianceContext = options.compliance;

  return {
    ...baseData,
    complianceTags: formatComplianceTags(
      context.defaultFrameworks ?? [],
      complianceContext
    ),
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

