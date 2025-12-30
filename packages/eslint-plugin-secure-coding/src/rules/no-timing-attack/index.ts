/**
 * ESLint Rule: no-timing-attack
 * Detects timing attack vulnerabilities (CWE-208)
 *
 * Timing attacks exploit the time it takes for operations to complete to leak
 * sensitive information. This is particularly dangerous in authentication code
 * where attackers can use timing differences to guess passwords, tokens, or
 * other secrets.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Authentication-related functions and variables
 * - Secret/sensitive data handling
 * - JSDoc annotations (@timing-safe, @constant-time)
 * - Safe comparison libraries (crypto.timingSafeEqual)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'timingAttack'
  | 'insecureStringComparison'
  | 'earlyReturnLeakage'
  | 'useTimingSafeEqual'
  | 'useConstantTimeComparison'
  | 'avoidEarlyReturns'
  | 'strategyTimingSafe'
  | 'strategyConstantTime'
  | 'strategyConsistentTiming';

export interface Options extends SecurityRuleOptions {
  /** Functions that are considered authentication-related */
  authFunctions?: string[];

  /** Variables that contain sensitive/auth data */
  sensitiveVariables?: string[];

  /** Allow early returns in non-sensitive contexts */
  allowEarlyReturns?: boolean;
}

type RuleOptions = [Options?];

export const noTimingAttack = createRule<RuleOptions, MessageIds>({
  name: 'no-timing-attack',
  meta: {
    type: 'problem',
    deprecated: true,
    replacedBy: ['@see eslint-plugin-crypto/no-timing-unsafe-compare'],
    docs: {
      description: 'Detects timing attack vulnerabilities in authentication code',
    },
    fixable: 'code',
    messages: {
      timingAttack: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Timing Attack Vulnerability',
        cwe: 'CWE-208',
        description: 'Timing attack possible - execution time reveals secret information',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/208.html',
      }),
      insecureStringComparison: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure String Comparison',
        cwe: 'CWE-208',
        description: 'String comparison may leak timing information',
        severity: 'HIGH',
        fix: 'Use crypto.timingSafeEqual() for comparing secrets',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptotimingsafeequal',
      }),
      earlyReturnLeakage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Early Return Timing Leak',
        cwe: 'CWE-208',
        description: 'Early return may leak information through timing',
        severity: 'MEDIUM',
        fix: 'Process all inputs consistently to avoid timing differences',
        documentationLink: 'https://cwe.mitre.org/data/definitions/208.html',
      }),
      useTimingSafeEqual: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Timing Safe Equal',
        description: 'Use crypto.timingSafeEqual for constant-time comparison',
        severity: 'LOW',
        fix: 'crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptotimingsafeequal',
      }),
      useConstantTimeComparison: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Constant Time Comparison',
        description: 'Implement constant-time comparison algorithm',
        severity: 'LOW',
        fix: 'Compare all bytes regardless of content',
        documentationLink: 'https://en.wikipedia.org/wiki/Timing_attack',
      }),
      avoidEarlyReturns: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Avoid Early Returns',
        description: 'Avoid early returns in security-sensitive code',
        severity: 'LOW',
        fix: 'Process all inputs before making decisions',
        documentationLink: 'https://cwe.mitre.org/data/definitions/208.html',
      }),
      strategyTimingSafe: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Timing Safe Strategy',
        description: 'Use built-in timing-safe comparison functions',
        severity: 'LOW',
        fix: 'Use crypto.timingSafeEqual or equivalent library functions',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptotimingsafeequal',
      }),
      strategyConstantTime: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Constant Time Strategy',
        description: 'Implement custom constant-time comparison',
        severity: 'LOW',
        fix: 'Compare all characters/bytes with consistent timing',
        documentationLink: 'https://en.wikipedia.org/wiki/Timing_attack',
      }),
      strategyConsistentTiming: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Consistent Timing Strategy',
        description: 'Ensure consistent execution time for all inputs',
        severity: 'LOW',
        fix: 'Pad inputs or use fixed-time operations',
        documentationLink: 'https://cwe.mitre.org/data/definitions/208.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          authFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['authenticate', 'login', 'verifyPassword', 'checkToken', 'validateCredentials'],
          },
          sensitiveVariables: {
            type: 'array',
            items: { type: 'string' },
            default: ['password', 'token', 'secret', 'key', 'credentials', 'auth'],
          },
          allowEarlyReturns: {
            type: 'boolean',
            default: false,
            description: 'Allow early returns outside security-sensitive contexts'
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as timing-safe',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as timing-safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      authFunctions: ['authenticate', 'login', 'verifyPassword', 'checkToken', 'validateCredentials'],
      sensitiveVariables: ['password', 'token', 'secret', 'key', 'credentials', 'auth'],
      allowEarlyReturns: false,
      trustedSanitizers: ['sanitize'],
      trustedAnnotations: ['@timing-safe'],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      authFunctions = ['authenticate', 'login', 'verifyPassword', 'checkToken', 'validateCredentials'],
      sensitiveVariables = ['password', 'token', 'secret', 'key', 'credentials', 'auth'],
      allowEarlyReturns = false,
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode || context.sourceCode;
    const filename = context.filename || context.getFilename();

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    // Pre-compute Set for O(1) lookups (performance optimization)
    const sensitiveVarSet = new Set(sensitiveVariables.map(s => s.toLowerCase()));
    const authFunctionSet = new Set(authFunctions.map(f => f.toLowerCase()));

    // Track variables that contain sensitive data
    const sensitiveVars = new Set<string>();

    /**
     * Check if a variable name indicates sensitive/auth data
     * Uses Set-based lookup for O(1) performance
     */
    const isSensitiveVariable = (varName: string): boolean => {
      const lowerName = varName.toLowerCase();
      // Check if any sensitive keyword is a substring
      for (const sensitive of sensitiveVarSet) {
        if (lowerName.includes(sensitive)) return true;
      }
      return false;
    };

    // Pre-compute auth patterns set for O(1) lookups
    const authPatternSet = new Set(['auth', 'login', 'verify', 'token', 'password', 'credential', 'authenticate']);

    /**
     * Check if we're in an authentication/security context
     * Uses Set-based lookups for O(1) performance
     */
    const isInAuthContext = (node: TSESTree.Node): boolean => {
      // Check if we're inside an authentication function
      let current: TSESTree.Node | undefined = node;
      /* c8 ignore start -- defensive auth context detection */
      while (current) {
        if (current.type === AST_NODE_TYPES.FunctionDeclaration || current.type === AST_NODE_TYPES.FunctionExpression || current.type === AST_NODE_TYPES.ArrowFunctionExpression) {
          const funcName = (current as { id?: { name?: string } }).id?.name;
          if (funcName) {
            const lowerName = funcName.toLowerCase();
            // Check exact matches first (O(1) with Set)
            if (authFunctionSet.has(lowerName)) {
              return true;
            }
            // Check pattern matches for common auth function names
            for (const pattern of authPatternSet) {
              if (lowerName.includes(pattern)) return true;
            }
          }
        }
        if (current.type === AST_NODE_TYPES.CallExpression) {
          const callee = current.callee;
          if (callee.type === AST_NODE_TYPES.Identifier) {
            const lowerName = callee.name.toLowerCase();
            if (authFunctionSet.has(lowerName)) {
              return true;
            }
            // Check pattern matches
            for (const pattern of authPatternSet) {
              if (lowerName.includes(pattern)) return true;
            }
          }
        }
        current = current.parent as TSESTree.Node;
      }

      // NOTE: Removed sensitiveVars.size check - it was causing false positives
      // by flagging every function when ANY sensitive variable exists in the file.
      // Instead, we now check sensitive data involvement at the specific point of use.
      return false;
      /* c8 ignore stop */
    };

    /**
     * Check if a comparison is timing-safe
     */
    const isTimingSafeComparison = (node: TSESTree.BinaryExpression): boolean => {
      // Check for crypto.timingSafeEqual calls
      let current: TSESTree.Node | undefined = node;
      while (current) {
        if (current.type === AST_NODE_TYPES.CallExpression) {
          const callee = current.callee;
          if (
            callee.type === AST_NODE_TYPES.MemberExpression &&
            callee.object.type === AST_NODE_TYPES.Identifier &&
            callee.object.name === 'crypto' &&
            callee.property.type === AST_NODE_TYPES.Identifier &&
            callee.property.name === 'timingSafeEqual'
          ) {
            return true;
          }
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check if we're inside a function that uses crypto.timingSafeEqual.
     * Length checks before timingSafeEqual are necessary and safe.
     * 
     * Pattern:
     * function safeCompare(a, b) {
     *   if (a.length !== b.length) return false;  // <-- This is SAFE
     *   return crypto.timingSafeEqual(a, b);
     * }
     */
    const isInTimingSafeEqualContext = (node: TSESTree.Node): boolean => {
      // Find enclosing function
      let funcNode: TSESTree.Node | undefined = node;
      while (funcNode) {
        if (
          funcNode.type === AST_NODE_TYPES.FunctionDeclaration ||
          funcNode.type === AST_NODE_TYPES.FunctionExpression ||
          funcNode.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          break;
        }
        funcNode = funcNode.parent;
      }
      
      if (!funcNode) {
        return false;
      }
      
      // Check if the function body contains crypto.timingSafeEqual
      const funcText = sourceCode.getText(funcNode);
      if (funcText.includes('timingSafeEqual')) {
        return true;
      }
      
      // Also check for common timing-safe comparison library patterns
      const timingSafePatterns = [
        'scmp', // secure-compare
        'safe-compare',
        'constant-time',
        'constantTimeCompare',
      ];
      
      if (timingSafePatterns.some(pattern => funcText.includes(pattern))) {
        return true;
      }
      
      return false;
    };

    /**
     * Check if a comparison involves only non-sensitive data like length checks
     */
    const isLengthOrNumericComparison = (node: TSESTree.BinaryExpression): boolean => {
      const leftText = sourceCode.getText(node.left);
      const rightText = sourceCode.getText(node.right);
      
      // Check for .length comparisons
      if (leftText.includes('.length') || rightText.includes('.length')) {
        return true;
      }
      
      // Check for numeric literal comparisons
      if (node.left.type === AST_NODE_TYPES.Literal && typeof node.left.value === 'number') {
        return true;
      }
      if (node.right.type === AST_NODE_TYPES.Literal && typeof node.right.value === 'number') {
        return true;
      }
      
      return false;
    };


    /**
     * Check if early return is in a security-sensitive context
     */
    const isEarlyReturnInAuthContext = (node: TSESTree.ReturnStatement): boolean => {
      // If early returns are explicitly allowed, don't flag them
      if (allowEarlyReturns) {
        /* c8 ignore next */
        return false;
      }

      return isInAuthContext(node);
    };

    return {
      // Track sensitive variable declarations
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type === 'Identifier' && isSensitiveVariable(node.id.name)) {
          sensitiveVars.add(node.id.name);
        }

        // Also check if the variable is assigned sensitive data
        if (node.init && node.id.type === 'Identifier') {
          const initText = sourceCode.getText(node.init).toLowerCase();
          if (sensitiveVariables.some(sensitive => initText.includes(sensitive))) {
            sensitiveVars.add(node.id.name);
          }
        }
      },

      // Check binary expressions for insecure comparisons
      BinaryExpression(node: TSESTree.BinaryExpression) {
        if (node.operator !== '===' && node.operator !== '==' && 
            node.operator !== '!==' && node.operator !== '!=') {
          return;
        }

        // Skip if already using timing-safe comparison
        if (isTimingSafeComparison(node)) {
          return;
        }

        // FALSE POSITIVE REDUCTION: Skip length/numeric comparisons in timing-safe contexts
        // Pattern: if (a.length !== b.length) return false; before crypto.timingSafeEqual
        if (isInTimingSafeEqualContext(node) && isLengthOrNumericComparison(node)) {
          return;
        }

        // FALSE POSITIVE REDUCTION: Skip if annotated as safe
        if (safetyChecker.isSafe(node, context)) {
          return;
        }

        // Check if either side involves sensitive data
        const leftText = sourceCode.getText(node.left).toLowerCase();
        const rightText = sourceCode.getText(node.right).toLowerCase();

        const involvesSensitiveData = [leftText, rightText].some(text =>
          sensitiveVariables.some(sensitive => text.toLowerCase().includes(sensitive.toLowerCase()))
        );

        if (!involvesSensitiveData && !isInAuthContext(node)) {
          return;
        }

        context.report({
          node,
          messageId: 'insecureStringComparison',
          data: {
            filePath: filename,
            line: String(node.loc?.start.line ?? 0),
          },
        });
      },

      // Check for early returns that could leak timing information
      ReturnStatement(node: TSESTree.ReturnStatement) {
        // FALSE POSITIVE REDUCTION: Skip if annotated as safe
        if (safetyChecker.isSafe(node, context)) {
          return;
        }

        // FALSE POSITIVE REDUCTION: Skip if inside a function using timingSafeEqual
        // Length check early returns are necessary and safe before timingSafeEqual
        if (isInTimingSafeEqualContext(node)) {
          return;
        }

        if (!isEarlyReturnInAuthContext(node)) {
          return;
        }

        // Look for conditional returns (if/else returns)
        let current: TSESTree.Node | undefined = node;
        let isConditionalReturn = false;

        while (current && !isConditionalReturn) {
          if (current.type === 'IfStatement') {
            isConditionalReturn = true;
            break;
          }
          current = current.parent as TSESTree.Node;
        }

        if (!isConditionalReturn) {
          return;
        }

        // Check if this return involves sensitive data
        const returnText = sourceCode.getText(node).toLowerCase();
        const involvesSensitiveData = sensitiveVariables.some(sensitive =>
          returnText.includes(sensitive)
        );

        if (!involvesSensitiveData && !isInAuthContext(node)) {
          return;
        }

        context.report({
          node,
          messageId: 'earlyReturnLeakage',
          data: {
            filePath: filename,
            line: String(node.loc?.start.line ?? 0),
          },
        });
      },

      // Check function calls for timing-sensitive operations
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for insecure comparison functions
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          ['equals', 'compare', 'matches'].includes(callee.property.name)
        ) {
          // Skip known timing-safe libraries
          const objectName = callee.object.type === 'Identifier' ? callee.object.name : null;
          if (objectName) {
            // Known timing-safe comparison libraries
            const timingSafeLibraries = ['bcrypt', 'crypto'];
            if (timingSafeLibraries.includes(objectName) && callee.property.name === 'compare') {
              return; // bcrypt.compare and crypto.compare are timing-safe
            }
          }

          // Check if arguments involve sensitive data
          const argsText = node.arguments
            .map((arg: TSESTree.CallExpressionArgument) => sourceCode.getText(arg).toLowerCase())
            .join(' ');
          const involvesSensitiveData = sensitiveVariables.some(sensitive =>
            argsText.includes(sensitive)
          );

        if (involvesSensitiveData || isInAuthContext(node)) {
          // FALSE POSITIVE REDUCTION: Skip if annotated as safe
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

            context.report({
              node,
              messageId: 'timingAttack',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
                severity: 'HIGH',
                safeAlternative: 'Use constant-time comparison functions',
              },
            });
          }
        }
      }
    };
  },
});
