/**
 * ESLint Rule: no-missing-cors-check
 * Detects missing CORS validation (wildcard CORS, missing origin check)
 * CWE-346: Origin Validation Error
 * 
 * @see https://cwe.mitre.org/data/definitions/346.html
 * @see https://owasp.org/www-community/attacks/CORS_Misconfiguration
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'missingCorsCheck' | 'useOriginValidation' | 'useCorsMiddleware';

export interface Options {
  /** Allow missing CORS checks in test files. Default: false */
  allowInTests?: boolean;
  
  /** Trusted CORS libraries. Default: ['cors', '@koa/cors', 'express-cors'] */
  trustedLibraries?: string[];
  
  /** Additional safe patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if a node is inside a CORS configuration
 * Currently unused - kept for future use
 * @coverage-note This function is intentionally unused and kept for future enhancements.
 * It cannot be tested directly as it's not called by any code path.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isInsideCorsConfig(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  trustedLibraries: string[]
): boolean {
  let current: TSESTree.Node | null = node;
  
  while (current) {
    // Check for CORS middleware usage
    if (current.type === 'CallExpression') {
      const callee = current.callee;
      
      // Check if it's a CORS middleware call
      if (callee.type === 'Identifier') {
        const calleeName = callee.name.toLowerCase();
        if (['cors', 'use', 'enable'].includes(calleeName)) {
          return true;
        }
      }
      
      // Check if it's a trusted library call
      if (callee.type === 'MemberExpression') {
        const object = callee.object;
        if (object.type === 'Identifier') {
          const objectName = object.name.toLowerCase();
          if (trustedLibraries.some(lib => objectName.includes(lib.toLowerCase()))) {
            return true;
          }
        }
      }
    }
    
    // Check for CORS configuration object
    if (current.type === 'ObjectExpression') {
      const text = sourceCode.getText(current);
      if (/\b(origin|credentials|allowedOrigins|allowedHeaders)\s*:/i.test(text)) {
        // Check if it has proper validation (not just '*')
        if (!/\borigin\s*:\s*['"]\*['"]/i.test(text)) {
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
      return false;
    }
  });
}

export const noMissingCorsCheck = createRule<RuleOptions, MessageIds>({
  name: 'no-missing-cors-check',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects missing CORS validation (wildcard CORS, missing origin check)',
    },
    hasSuggestions: true,
    messages: {
      missingCorsCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing CORS Validation',
        cwe: 'CWE-346',
        description: 'Missing CORS validation detected: {{issue}}',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/346.html',
      }),
      useOriginValidation: '✅ Validate origin: app.use(cors({ origin: (origin, callback) => { if (allowedOrigins.includes(origin)) callback(null, true); else callback(new Error("Not allowed")); } }));',
      useCorsMiddleware: '✅ Use CORS middleware with origin validation: app.use(cors({ origin: allowedOrigins }));',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow missing CORS checks in test files',
          },
          trustedLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Custom CORS libraries to trust (wildcard origins in these libraries will not be reported)',
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
      trustedLibraries: [], // Empty by default - users can add custom CORS libraries they trust
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      trustedLibraries: corsTrustedLibraries = [],
      ignorePatterns = [],
    } = options as Options;
    
    const trustedLibraries = corsTrustedLibraries;

    const filename = context.getFilename();
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    const sourceCode = context.sourceCode || context.getSourceCode();

    function checkLiteral(node: TSESTree.Literal) {
      if (isTestFile) {
        return;
      }

      // Check for wildcard CORS origin
      if (node.value === '*' && typeof node.value === 'string') {
        const text = sourceCode.getText(node);
        
        // Check if it matches any ignore pattern
        if (matchesIgnorePattern(text, ignorePatterns)) {
          return;
        }
        
        // Check if it's in contexts handled by other checkers
        // 1. setHeader/header calls - checkMemberExpression handles these
        // 2. app.use(cors({ origin: "*" })) - checkCallExpression handles these with suggestions
        let shouldSkip = false;
        let current: TSESTree.Node | null = node;
        while (current && current.parent) {
          current = current.parent as TSESTree.Node;
          if (current.type === 'CallExpression') {
            const callText = sourceCode.getText(current);
            // Check if it's a setHeader/header call with Access-Control-Allow-Origin
            // Skip these - checkMemberExpression handles them
            if (/\b(setHeader|header)\s*\(/i.test(callText) && /\bAccess-Control-Allow-Origin\b/i.test(callText)) {
              shouldSkip = true;
              break;
            }
            // Check if it's app.use(cors({ origin: "*" })) - checkCallExpression handles these with suggestions
            if (/\buse\s*\(/i.test(callText) && /\bcors\s*\(/i.test(callText)) {
              // Check if the literal is in an object property named "origin"
              if (node.parent && node.parent.type === 'Property') {
                const prop = node.parent as TSESTree.Property;
                if (prop.key.type === 'Identifier' && prop.key.name === 'origin') {
                  shouldSkip = true;
                  break;
                }
              }
            }
          }
        }
        
        // Skip if it's in a context handled by another checker
        if (shouldSkip) {
          return;
        }
        
        // Check if it's in a CORS-related context
        // Only report if it's actually in a CORS configuration (app.use(cors(...)), etc.)
        // Not just any object with origin: "*"
        let isActualCorsContext = false;
        
        // Check if it's in app.use(cors(...)) or similar
        current = node;
        while (current && current.parent) {
          current = current.parent as TSESTree.Node;
          if (current.type === 'CallExpression') {
            const callText = sourceCode.getText(current);
            // Check if it's a CORS middleware call
            if (/\b(use|cors)\s*\(/i.test(callText) && /\bcors\s*\(/i.test(callText)) {
              isActualCorsContext = true;
              break;
            }
          }
        }
        
        // Also check if it's in an object property with name "origin" or "allowedOrigins"
        // but only if it's in a CORS-related call expression
        if (node.parent && node.parent.type === 'Property') {
          const prop = node.parent as TSESTree.Property;
          if (prop.key.type === 'Identifier') {
            const keyName = prop.key.name.toLowerCase();
            if (keyName === 'origin' || keyName === 'allowedorigins') {
              // Check if this property is in a CORS call context
              let inCorsCall = false;
              let checkNode: TSESTree.Node | null = prop;
              while (checkNode && checkNode.parent) {
                checkNode = checkNode.parent as TSESTree.Node;
                if (checkNode.type === 'CallExpression') {
                  const callText = sourceCode.getText(checkNode);
                  if (/\bcors\s*\(/i.test(callText) || 
                      (/\buse\s*\(/i.test(callText) && /\bcors/i.test(callText))) {
                    inCorsCall = true;
                    break;
                  }
                }
              }
              
              if (inCorsCall) {
                // Always report wildcard CORS origin - it's never safe
                context.report({
                  node,
                  messageId: 'missingCorsCheck',
                  data: {
                    issue: 'Wildcard CORS origin (*) allows all origins',
                    safeAlternative: 'Use origin validation: app.use(cors({ origin: (origin, callback) => { if (allowedOrigins.includes(origin)) callback(null, true); else callback(new Error("Not allowed")); } } }));',
                  },
                  suggest: [
                    {
                      messageId: 'useOriginValidation',
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      fix: (_fixer: TSESLint.RuleFixer) => null,
                    },
                  ],
                });
                return;
              }
            }
          }
        }
        
        // Only report if it's in an actual CORS context
        if (isActualCorsContext) {
          // Always report wildcard CORS origin - it's never safe
          context.report({
            node,
            messageId: 'missingCorsCheck',
            data: {
              issue: 'Wildcard CORS origin (*) allows all origins',
              safeAlternative: 'Use origin validation: app.use(cors({ origin: (origin, callback) => { if (allowedOrigins.includes(origin)) callback(null, true); else callback(new Error("Not allowed")); } } }));',
            },
            suggest: [
              {
                messageId: 'useOriginValidation',
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                fix: (_fixer: TSESLint.RuleFixer) => null,
              },
            ],
          });
        }
      }
    }

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) {
        return;
      }

      // Check for app.use(cors({ origin: "*" })) or similar
      if (node.callee.type === 'MemberExpression') {
        const property = node.callee.property;
        if (property.type === 'Identifier' && property.name === 'use') {
          // Check if CORS is being used
          const text = sourceCode.getText(node);
          
          // Check if it matches any ignore pattern
          if (matchesIgnorePattern(text, ignorePatterns)) {
            return;
          }

          // Check if it's a CORS middleware call
          // Check for cors() or trusted library calls
          const firstArg = node.arguments.length > 0 ? node.arguments[0] : null;
          let isCorsCall = /\bcors\s*\(/i.test(text);
          if (!isCorsCall && firstArg && firstArg.type === 'CallExpression' && firstArg.callee.type === 'Identifier') {
            const callee = firstArg.callee;
            const calleeName = callee.name.toLowerCase();
            // Check if it's the standard 'cors' library or a trusted library
            isCorsCall = calleeName === 'cors' || trustedLibraries.some(lib => {
              return calleeName.includes(lib.toLowerCase());
            });
          }
          
          // Check if it's a trusted library - skip if explicitly trusted
          let isTrustedLibrary = false;
          if (firstArg && firstArg.type === 'CallExpression' && firstArg.callee.type === 'Identifier') {
            const calleeName = firstArg.callee.name.toLowerCase();
            isTrustedLibrary = trustedLibraries.some(lib => calleeName.includes(lib.toLowerCase()));
          }
          
          if (isTrustedLibrary) {
            return; // Trusted library, skip
          }
          
          // Check if it's a CORS call
          if (/\bcors\s*\(/i.test(text) || isCorsCall) {
            // Check arguments for wildcard origin
            // For app.use(cors({ origin: "*" })), we need to check the arguments to cors(), not app.use()
            const corsCallArg = firstArg && firstArg.type === 'CallExpression' ? firstArg : null;
            const argsToCheck = corsCallArg ? corsCallArg.arguments : node.arguments;
            
            for (const arg of argsToCheck) {
              if (arg.type === 'ObjectExpression') {
                // Check for origin property with wildcard value
                for (const prop of arg.properties) {
                  if (prop.type === 'Property' && 
                      prop.key.type === 'Identifier' && 
                      prop.key.name === 'origin' &&
                      prop.value.type === 'Literal' &&
                      prop.value.value === '*') {
                    context.report({
                      node: prop.value,
                      messageId: 'missingCorsCheck',
                      data: {
                        issue: 'Wildcard CORS origin (*) allows all origins',
                        safeAlternative: 'Use origin validation: app.use(cors({ origin: (origin, callback) => { if (allowedOrigins.includes(origin)) callback(null, true); else callback(new Error("Not allowed")); } } }));',
                      },
                      suggest: [
                        {
                          messageId: 'useOriginValidation',
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          fix: (_fixer: TSESLint.RuleFixer) => null,
                        },
                      ],
                    });
                  }
                }
              } else if (arg.type === 'Identifier') {
                // Check if this identifier was assigned an object literal with origin: "*"
                // For cases like: const config = { origin: "*" }; app.use(cors(config));
                const varName = arg.name;
                // Traverse the AST to find the variable declaration
                let current: TSESTree.Node | null = node;
                while (current) {
                  if (current.type === 'Program' || current.type === 'FunctionDeclaration' || current.type === 'FunctionExpression' || current.type === 'ArrowFunctionExpression') {
                    // Search for variable declarations in this scope
                    const scopeBody = current.type === 'Program' ? current.body : 
                                     (current.type === 'FunctionDeclaration' || current.type === 'FunctionExpression' || current.type === 'ArrowFunctionExpression') ? 
                                     (current.body.type === 'BlockStatement' ? current.body.body : []) : [];
                    
                    for (const stmt of scopeBody) {
                      if (stmt.type === 'VariableDeclaration') {
                        for (const declarator of stmt.declarations) {
                          if (declarator.id.type === 'Identifier' && declarator.id.name === varName && declarator.init) {
                            // Check if init is an object literal with origin: "*"
                            if (declarator.init.type === 'ObjectExpression') {
                              for (const prop of declarator.init.properties) {
                                if (prop.type === 'Property' && 
                                    prop.key.type === 'Identifier' && 
                                    prop.key.name === 'origin' &&
                                    prop.value.type === 'Literal' &&
                                    prop.value.value === '*') {
                                  context.report({
                                    node: arg,
                                    messageId: 'missingCorsCheck',
                                    data: {
                                      issue: 'Wildcard CORS origin (*) allows all origins',
                                      safeAlternative: 'Use origin validation: app.use(cors({ origin: (origin, callback) => { if (allowedOrigins.includes(origin)) callback(null, true); else callback(new Error("Not allowed")); } } }));',
                                    },
                                    suggest: [
                                      {
                                        messageId: 'useOriginValidation',
                                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                        fix: (_fixer: TSESLint.RuleFixer) => null,
                                      },
                                    ],
                                  });
                                  return; // Found and reported, exit
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                    break; // Only check the immediate scope
                  }
                  if (current.parent) {
                    current = current.parent as TSESTree.Node;
                  } else {
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }

    function checkMemberExpression(node: TSESTree.MemberExpression) {
      if (isTestFile) {
        return;
      }

      // Check for Access-Control-Allow-Origin header without validation
      if (node.property.type === 'Identifier') {
        const propertyName = node.property.name;
        
        if (propertyName === 'setHeader' || propertyName === 'header') {
          // Check if it matches any ignore pattern
          const text = sourceCode.getText(node);
          if (matchesIgnorePattern(text, ignorePatterns)) {
            return;
          }

          // Check if it's setting CORS headers
          // Need to check the full call expression, not just the member expression
          const parent = node.parent;
          if (parent && parent.type === 'CallExpression') {
            const callText = sourceCode.getText(parent);
            if (/\bAccess-Control-Allow-Origin\b/i.test(callText)) {
              // Check if the value is a wildcard
              const args = parent.arguments;
              if (args.length >= 2 && args[1].type === 'Literal' && args[1].value === '*') {
                context.report({
                  node: args[1],
                  messageId: 'missingCorsCheck',
                  data: {
                    issue: 'Wildcard CORS header allows all origins',
                    safeAlternative: 'Validate origin before setting header: res.setHeader("Access-Control-Allow-Origin", allowedOrigins.includes(origin) ? origin : "null");',
                  },
                  suggest: [
                    {
                      messageId: 'useOriginValidation',
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
    }

    return {
      Literal: checkLiteral,
      CallExpression: checkCallExpression,
      MemberExpression: checkMemberExpression,
    };
  },
});

