/**
 * ESLint Rule: no-privilege-escalation
 * Detects potential privilege escalation vulnerabilities
 * CWE-269: Improper Privilege Management
 * 
 * @see https://cwe.mitre.org/data/definitions/269.html
 * @see https://owasp.org/www-community/vulnerabilities/Improper_Access_Control
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'privilegeEscalation' | 'addRoleCheck';

export interface Options {
  /** Allow privilege escalation patterns in test files. Default: false */
  allowInTests?: boolean;
  
  /** Test file pattern regex string. Default: '\\.(test|spec)\\.(ts|tsx|js|jsx)$' */
  testFilePattern?: string;
  
  /** Role check patterns to recognize. Default: ['hasRole', 'checkRole', 'isAdmin', 'isAuthorized'] */
  roleCheckPatterns?: string[];
  
  /** User input patterns that should be validated. Default: ['req.body', 'req.query', 'req.params'] */
  userInputPatterns?: string[];
  
  /** Additional patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Common role check patterns
 */
const DEFAULT_ROLE_CHECK_PATTERNS = [
  'hasRole',
  'checkRole',
  'isAdmin',
  'isAuthorized',
  'hasPermission',
  'checkPermission',
  'verifyRole',
  'requireRole',
];

/**
 * Common user input patterns
 */
const DEFAULT_USER_INPUT_PATTERNS = [
  /\breq\.(body|query|params)\b/,
  /\brequest\.(body|query|params)\b/,
  /\buserInput\b/,
  /\binput\b/,
];

/**
 * Check if a string matches any ignore pattern
 */
function matchesIgnorePattern(text: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    } catch {
      // Invalid regex - treat as literal string match
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  });
}

/**
 * Check if a node contains user input patterns
 */
function containsUserInput(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  userInputPatterns: RegExp[]
): boolean {
  const text = sourceCode.getText(node);
  return userInputPatterns.some(pattern => pattern.test(text));
}

/**
 * Check if a node is inside a role check call
 */
function isInsideRoleCheck(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  roleCheckPatterns: string[]
): boolean {
  let current: TSESTree.Node | null = node;
  
  while (current) {
    // Check if current is inside an IfStatement with role check in condition
    if (current.parent && current.parent.type === 'IfStatement') {
      const ifStmt = current.parent as TSESTree.IfStatement;
      const conditionText = sourceCode.getText(ifStmt.test);
      
      // Check if condition contains role check patterns
      if (roleCheckPatterns.some(pattern => 
        conditionText.toLowerCase().includes(pattern.toLowerCase())
      )) {
        return true;
      }
      
      // Check if condition is a CallExpression with role check
      if (ifStmt.test.type === 'CallExpression') {
        const callExpr = ifStmt.test;
        const callee = callExpr.callee;
        
        if (callee.type === 'Identifier') {
          const calleeName = callee.name.toLowerCase();
          if (roleCheckPatterns.some(pattern => calleeName.includes(pattern.toLowerCase()))) {
            return true;
          }
        }
        
        if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
          const propertyName = callee.property.name.toLowerCase();
          if (roleCheckPatterns.some(pattern => propertyName.includes(pattern.toLowerCase()))) {
            return true;
          }
        }
      }
    }
    
    // Check if current is inside a ConditionalExpression (ternary) with role check
    if (current.parent && current.parent.type === 'ConditionalExpression') {
      const condExpr = current.parent as TSESTree.ConditionalExpression;
      const testText = sourceCode.getText(condExpr.test);
      
      // Check if test contains role check patterns
      if (roleCheckPatterns.some(pattern => 
        testText.toLowerCase().includes(pattern.toLowerCase())
      )) {
        return true;
      }
      
      // Check if test is a CallExpression with role check
      if (condExpr.test.type === 'CallExpression') {
        const callExpr = condExpr.test;
        const callee = callExpr.callee;
        
        if (callee.type === 'Identifier') {
          const calleeName = callee.name.toLowerCase();
          if (roleCheckPatterns.some(pattern => calleeName.includes(pattern.toLowerCase()))) {
            return true;
          }
        }
      }
    }
    
    // Check if current is inside a CallExpression with role check
    if (current.parent && current.parent.type === 'CallExpression') {
      const callExpr = current.parent as TSESTree.CallExpression;
      const callee = callExpr.callee;
      
      if (callee.type === 'Identifier') {
        const calleeName = callee.name.toLowerCase();
        if (roleCheckPatterns.some(pattern => calleeName.includes(pattern.toLowerCase()))) {
          return true;
        }
      }
      
      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        const propertyName = callee.property.name.toLowerCase();
        if (roleCheckPatterns.some(pattern => propertyName.includes(pattern.toLowerCase()))) {
          return true;
        }
      }
    }
    
    // Traverse up the AST
    if ('parent' in current && current.parent) {
      current = current.parent as TSESTree.Node;
    } else {
      break;
    }
  }
  
  return false;
}

export const noPrivilegeEscalation = createRule<RuleOptions, MessageIds>({
  name: 'no-privilege-escalation',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects potential privilege escalation vulnerabilities',
    },
    hasSuggestions: true,
    messages: {
      privilegeEscalation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Privilege Escalation',
        cwe: 'CWE-269',
        description: 'Potential privilege escalation: {{issue}} - user input used without role validation',
        severity: 'HIGH',
        fix: 'Add role check before using user input: if (!hasRole(user, requiredRole)) throw new Error("Unauthorized");',
        documentationLink: 'https://cwe.mitre.org/data/definitions/269.html',
      }),
      addRoleCheck: '✅ Add role check before using user input for privilege operations',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow privilege escalation patterns in test files',
          },
          testFilePattern: {
            type: 'string',
            default: '\\.(test|spec)\\.(ts|tsx|js|jsx)$',
            description: 'Test file pattern regex string',
          },
          roleCheckPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_ROLE_CHECK_PATTERNS,
            description: 'Role check patterns to recognize',
          },
          userInputPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional user input patterns to check (regex strings)',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      testFilePattern: '\\.(test|spec)\\.(ts|tsx|js|jsx)$',
      roleCheckPatterns: DEFAULT_ROLE_CHECK_PATTERNS,
      userInputPatterns: [],
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      testFilePattern = '\\.(test|spec)\\.(ts|tsx|js|jsx)$',
      roleCheckPatterns = DEFAULT_ROLE_CHECK_PATTERNS,
      userInputPatterns: additionalUserInputPatterns = [],
      ignorePatterns = [],
    } = options as Options;

    const filename = context.getFilename();
    const testFileRegex = new RegExp(testFilePattern);
    const isTestFile = allowInTests && testFileRegex.test(filename);
    const sourceCode = context.sourceCode || context.getSourceCode();

    // Combine default and additional user input patterns
    const userInputPatterns = [
      ...DEFAULT_USER_INPUT_PATTERNS,
      ...additionalUserInputPatterns.map(pattern => new RegExp(pattern, 'i')),
    ];

    /**
     * Check AssignmentExpression for privilege escalation
     */
    function checkAssignmentExpression(node: TSESTree.AssignmentExpression) {
      if (isTestFile) {
        return;
      }

      // Check for role assignment from user input
      // Pattern: user.role = req.body.role
      if (node.left.type === 'MemberExpression' && 
          node.left.property.type === 'Identifier') {
        const propertyName = node.left.property.name.toLowerCase();
        
        // Check if it's a role/permission related property
        if (['role', 'permission', 'privilege', 'access', 'level'].includes(propertyName)) {
          const text = sourceCode.getText(node);
          
          // Check if it matches any ignore pattern
          if (matchesIgnorePattern(text, ignorePatterns)) {
            return;
          }

          // Check if right side contains user input
          if (containsUserInput(node.right, sourceCode, userInputPatterns)) {
            // Check if it's inside a role check
            if (!isInsideRoleCheck(node, sourceCode, roleCheckPatterns)) {
              context.report({
                node: node,
                messageId: 'privilegeEscalation',
                data: {
                  issue: `Role assignment from user input: ${sourceCode.getText(node.left)} = ${sourceCode.getText(node.right)}`,
                },
                suggest: [
                  {
                    messageId: 'addRoleCheck',
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    fix: (_fixer: TSESLint.RuleFixer) => null,
                  },
                ],
              });
            }
          }
        }
      }
    }

    /**
     * Check CallExpression for privilege operations with user input
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) {
        return;
      }

      // Check for privilege-related function calls with user input
      const callee = node.callee;
      let isPrivilegeOperation = false;
      let operationName = '';

      if (callee.type === 'Identifier') {
        const calleeName = callee.name.toLowerCase();
        if (['setrole', 'grant', 'revoke', 'elevate', 'promote'].some(op => 
          calleeName.includes(op)
        )) {
          isPrivilegeOperation = true;
          operationName = callee.name;
        }
      }

      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        const propertyName = callee.property.name.toLowerCase();
        if (['setrole', 'grant', 'revoke', 'elevate', 'promote', 'updateRole'].some(op => 
          propertyName.includes(op)
        )) {
          isPrivilegeOperation = true;
          operationName = propertyName;
        }
      }

      if (isPrivilegeOperation) {
        const text = sourceCode.getText(node);
        
        // Check if it matches any ignore pattern
        if (matchesIgnorePattern(text, ignorePatterns)) {
          return;
        }

        // Check if any argument contains user input
        for (const arg of node.arguments) {
          if (containsUserInput(arg, sourceCode, userInputPatterns)) {
            // Check if it's inside a role check
            if (!isInsideRoleCheck(node, sourceCode, roleCheckPatterns)) {
              context.report({
                node: node,
                messageId: 'privilegeEscalation',
                data: {
                  issue: `Privilege operation (${operationName}) with user input without role validation`,
                },
                suggest: [
                  {
                    messageId: 'addRoleCheck',
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    fix: (_fixer: TSESLint.RuleFixer) => null,
                  },
                ],
              });
              return; // Report once per call
            }
          }
        }
      }
    }

    return {
      AssignmentExpression: checkAssignmentExpression,
      CallExpression: checkCallExpression,
    };
  },
});
