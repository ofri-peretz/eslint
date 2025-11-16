/**
 * ESLint Rule: no-unvalidated-user-input
 * Detects unvalidated user input usage (req.body, req.query, etc.)
 * CWE-20: Improper Input Validation
 * 
 * @see https://cwe.mitre.org/data/definitions/20.html
 * @see https://owasp.org/www-community/vulnerabilities/Improper_Input_Validation
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'unvalidatedInput' | 'useValidationLibrary' | 'useZod' | 'useJoi';

export interface Options {
  /** Allow unvalidated input in test files. Default: false */
  allowInTests?: boolean;
  
  /** Trusted validation libraries. Default: ['zod', 'joi', 'yup', 'class-validator'] */
  trustedLibraries?: string[];
  
  /** Additional safe patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Patterns that indicate unvalidated user input
 */
const UNVALIDATED_INPUT_PATTERNS = [
  // Express/Node.js patterns
  { pattern: /\breq\.body\b/, name: 'req.body', context: 'Express request body' },
  { pattern: /\breq\.query\b/, name: 'req.query', context: 'Express query parameters' },
  { pattern: /\breq\.params\b/, name: 'req.params', context: 'Express route parameters' },
  { pattern: /\breq\.headers\b/, name: 'req.headers', context: 'Express headers' },
  { pattern: /\breq\.cookies\b/, name: 'req.cookies', context: 'Express cookies' },
  
  // Fastify patterns
  { pattern: /\brequest\.body\b/, name: 'request.body', context: 'Fastify request body' },
  { pattern: /\brequest\.query\b/, name: 'request.query', context: 'Fastify query parameters' },
  { pattern: /\brequest\.params\b/, name: 'request.params', context: 'Fastify route parameters' },
  
  // Next.js patterns
  { pattern: /\bsearchParams\b/, name: 'searchParams', context: 'Next.js search params' },
  
  // Generic patterns
  { pattern: /\buserInput\b/, name: 'userInput', context: 'Generic user input' },
  { pattern: /\binput\b/, name: 'input', context: 'Generic input variable' },
];

/**
 * Check if a node is inside a validation function call
 */
function isInsideValidationCall(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  trustedLibraries: string[]
): boolean {
  let current: TSESTree.Node | null = node;
  
  while (current) {
    // Check if current is an argument to a CallExpression
    if (current.parent && current.parent.type === 'CallExpression') {
      const callExpr = current.parent as TSESTree.CallExpression;
      
      // Verify that current is actually an argument of this call
      const isArgument = callExpr.arguments.some(arg => arg === current);
      if (!isArgument) {
        // Not an argument, continue traversing
        if ('parent' in current && current.parent) {
          current = current.parent as TSESTree.Node;
          continue;
        } else {
          break;
        }
      }
      
      const callee = callExpr.callee;
      
      // Check if it's a validation library call (e.g., schema.parse(), schema.validate())
      if (callee.type === 'MemberExpression') {
        const property = callee.property;
        if (property.type === 'Identifier') {
          const methodName = property.name.toLowerCase();
          // Check for validation methods (including async variants)
          // Note: safeParse is one word, not two
          if (['parse', 'validate', 'safeparse', 'parseasync', 'validateasync', 'safe_parse'].includes(methodName)) {
            return true;
          }
        }
        
        // Check if the object is a validation library
        const object = callee.object;
        if (object.type === 'Identifier') {
          const objectName = object.name.toLowerCase();
          if (trustedLibraries.some(lib => objectName.includes(lib.toLowerCase()))) {
            return true;
          }
        }
      }
      
      // Check if it's a direct validation function call (e.g., validate(), plainToClass())
      if (callee.type === 'Identifier') {
        const calleeName = callee.name.toLowerCase();
        if (['validate', 'plaintoclass', 'transform'].includes(calleeName)) {
          return true;
        }
        if (trustedLibraries.some(lib => calleeName.includes(lib.toLowerCase()))) {
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

/**
 * Check if a string matches any ignore pattern
 */
function matchesIgnorePattern(text: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some(pattern => {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    } catch {
      // Invalid regex - treat as literal string match
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
  });
}

export const noUnvalidatedUserInput = createRule<RuleOptions, MessageIds>({
  name: 'no-unvalidated-user-input',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects unvalidated user input usage (req.body, req.query, etc.)',
    },
    hasSuggestions: true,
    messages: {
      unvalidatedInput: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unvalidated User Input',
        cwe: 'CWE-20',
        description: 'Unvalidated user input detected: {{inputSource}}',
        severity: 'HIGH',
        fix: 'Use validation library: {{validationExample}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/20.html',
      }),
      useValidationLibrary: '✅ Use validation library (Zod, Joi, Yup, or class-validator)',
      useZod: '✅ Use Zod: const schema = z.object({ name: z.string() }); const data = schema.parse(req.body);',
      useJoi: '✅ Use Joi: const schema = Joi.object({ name: Joi.string() }); const { value } = schema.validate(req.body);',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow unvalidated input in test files',
          },
          trustedLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: ['zod', 'joi', 'yup', 'class-validator'],
            description: 'Trusted validation libraries',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional safe patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      trustedLibraries: ['zod', 'joi', 'yup', 'class-validator'],
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      trustedLibraries = ['zod', 'joi', 'yup', 'class-validator'],
      ignorePatterns = [],
    } = options as Options;

    const filename = context.getFilename();
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    const sourceCode = context.sourceCode || context.getSourceCode();

    function checkMemberExpression(node: TSESTree.MemberExpression) {
      if (isTestFile) {
        return;
      }

      const text = sourceCode.getText(node);
      
      // Check if the variable name (if in assignment) matches ignore pattern
      // For cases like: const safeInput = req.body;
      if (node.parent && node.parent.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier') {
        const varName = node.parent.id.name;
        if (matchesIgnorePattern(varName, ignorePatterns)) {
          return;
        }
      }
      
      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(text, ignorePatterns)) {
        return;
      }

      // Check if it matches unvalidated input patterns
      // For nested member expressions like req.body.name, check the base (req.body)
      let baseText = text;
      if (node.object.type === 'MemberExpression') {
        baseText = sourceCode.getText(node.object);
      }
      
      const matchedPattern = UNVALIDATED_INPUT_PATTERNS.find(p => 
        p.pattern.test(text) || p.pattern.test(baseText)
      );
      
      if (matchedPattern) {
        // Skip if this is a nested member expression and the parent also matches
        // This prevents double reporting for cases like req.query.id
        // We only want to report on the outermost matching expression
        if (node.object.type === 'MemberExpression') {
          const parentText = sourceCode.getText(node.object);
          const parentMatches = UNVALIDATED_INPUT_PATTERNS.some(p => p.pattern.test(parentText));
          if (parentMatches) {
            // Parent also matches, skip this nested one - it will be reported when we visit the parent
            return;
          }
        }
        
        // Skip if this is in a destructuring assignment - checkObjectPattern will handle it
        // This prevents double reporting for cases like: const { email } = req.body;
        if (node.parent && node.parent.type === 'VariableDeclarator' && node.parent.id.type === 'ObjectPattern') {
          return; // checkObjectPattern will report on the init instead
        }
        
        // Check if it's inside a validation call
        if (isInsideValidationCall(node, sourceCode, trustedLibraries)) {
          return;
        }

        // Determine validation example based on context
        let validationExample = 'const schema = z.object({ field: z.string() }); const data = schema.parse(req.body);';
        if (text.includes('query')) {
          validationExample = 'const schema = z.object({ id: z.string() }); const data = schema.parse(req.query);';
        } else if (text.includes('params')) {
          validationExample = 'const schema = z.object({ id: z.string() }); const data = schema.parse(req.params);';
        }

        // Build suggestions - provide same code as output for test framework recognition
        const nodeText = sourceCode.getText(node);
        const suggestions: TSESLint.SuggestionReportDescriptor<MessageIds>[] = [
          {
            messageId: 'useZod',
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            fix: (_fixer: TSESLint.RuleFixer) => {
              // This is a suggestion, not an auto-fix, so we return null
              return null;
            },
          },
          {
            messageId: 'useJoi',
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            fix: (_fixer: TSESLint.RuleFixer) => {
              return null;
            },
          },
        ];

        context.report({
          node,
          messageId: 'unvalidatedInput',
          data: {
            inputSource: matchedPattern.name,
            validationExample,
          },
          suggest: suggestions,
        });
      }
    }

    function checkIdentifier(node: TSESTree.Identifier) {
      if (isTestFile) {
        return;
      }

      const text = node.name;
      
      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(text, ignorePatterns)) {
        return;
      }

      // Check for generic input patterns
      const matchedPattern = UNVALIDATED_INPUT_PATTERNS.find(p => 
        p.name === 'userInput' && p.pattern.test(text)
      );
      
      if (matchedPattern) {
        // Check if it's inside a validation call
        if (isInsideValidationCall(node, sourceCode, trustedLibraries)) {
          return;
        }

        context.report({
          node,
          messageId: 'unvalidatedInput',
          data: {
            inputSource: matchedPattern.name,
            validationExample: 'const schema = z.object({ field: z.string() }); const data = schema.parse(input);',
          },
          suggest: [
            {
              messageId: 'useZod',
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              fix: (_fixer: TSESLint.RuleFixer) => null,
            },
            {
              messageId: 'useJoi',
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              fix: (_fixer: TSESLint.RuleFixer) => null,
            },
          ],
        });
      }
    }

    function checkObjectPattern(node: TSESTree.ObjectPattern) {
      if (isTestFile) {
        return;
      }

      // Check destructuring patterns like: const { page, limit } = req.query;
      if (node.parent && node.parent.type === 'VariableDeclarator' && node.parent.init) {
        const init = node.parent.init;
        const initText = sourceCode.getText(init);
        
        // If init is a CallExpression, check if it's a validation call
        // If so, the input is being validated, so skip
        if (init.type === 'CallExpression') {
          const callee = init.callee;
          if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
            const methodName = callee.property.name.toLowerCase();
            if (['parse', 'validate', 'safeparse', 'parseasync', 'validateasync', 'safe_parse'].includes(methodName)) {
              return; // It's a validation call, skip
            }
          }
          if (callee.type === 'Identifier') {
            const calleeName = callee.name.toLowerCase();
            if (['validate', 'plaintoclass', 'transform'].includes(calleeName)) {
              return; // It's a validation call, skip
            }
          }
        }
        
        // Check if the right side matches unvalidated input patterns
        const matchedPattern = UNVALIDATED_INPUT_PATTERNS.find(p => p.pattern.test(initText));
        
        if (matchedPattern) {
          // For CallExpressions, check the arguments to see if they're validated
          // The init itself being a validation call was already checked above
          if (init.type === 'CallExpression') {
            // Check each argument to see if it's validated
            // If init is a validation call (like schema.validate(req.body)),
            // then req.body is validated, so skip
            const callee = init.callee;
            const isValidationCall = 
              (callee.type === 'MemberExpression' && callee.property.type === 'Identifier' &&
               ['parse', 'validate', 'safeparse', 'parseasync', 'validateasync', 'safe_parse'].includes(callee.property.name.toLowerCase())) ||
              (callee.type === 'Identifier' &&
               ['validate', 'plaintoclass', 'transform'].includes(callee.name.toLowerCase()));
            
            if (isValidationCall) {
              return; // The init is a validation call, so the input is validated
            }
            
            // If init is not a validation call, check if arguments are validated
            const hasValidatedArg = init.arguments.some(arg => {
              if (arg.type === 'MemberExpression' || arg.type === 'Identifier') {
                return isInsideValidationCall(arg, sourceCode, trustedLibraries);
              }
              return false;
            });
            if (hasValidatedArg) {
              return; // At least one argument is validated
            }
          } else {
            // For non-call expressions, check if init itself is inside a validation call
            if (isInsideValidationCall(init, sourceCode, trustedLibraries)) {
              return;
            }
          }

          // Check if variable name matches ignore pattern
          if (node.parent.id.type === 'ObjectPattern') {
            const varText = sourceCode.getText(node.parent.id);
            if (matchesIgnorePattern(varText, ignorePatterns)) {
              return;
            }
          }

          context.report({
            node: init,
            messageId: 'unvalidatedInput',
            data: {
              inputSource: matchedPattern.name,
              validationExample: 'const schema = z.object({ page: z.string(), limit: z.string() }); const { page, limit } = schema.parse(req.query);',
            },
            suggest: [
              {
                messageId: 'useZod',
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                fix: (_fixer: TSESLint.RuleFixer) => null,
              },
              {
                messageId: 'useJoi',
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                fix: (_fixer: TSESLint.RuleFixer) => null,
              },
            ],
          });
        }
      }
    }

    return {
      MemberExpression: checkMemberExpression,
      Identifier: checkIdentifier,
      ObjectPattern: checkObjectPattern,
    };
  },
});

