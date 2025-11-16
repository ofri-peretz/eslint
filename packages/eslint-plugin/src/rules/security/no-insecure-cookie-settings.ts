/**
 * ESLint Rule: no-insecure-cookie-settings
 * Detects insecure cookie configurations (missing httpOnly, secure, sameSite flags)
 * CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute
 * 
 * @see https://cwe.mitre.org/data/definitions/614.html
 * @see https://owasp.org/www-community/HttpOnly
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'insecureCookieSettings' | 'addSecureFlags';

export interface Options {
  /** Allow insecure cookies in test files. Default: false */
  allowInTests?: boolean;
  
  /** Cookie library patterns to recognize. Default: ['cookie', 'js-cookie', 'universal-cookie'] */
  cookieLibraries?: string[];
  
  /** Additional safe patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if a node is inside a cookie configuration
 */
function isInsideCookieConfig(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode
): boolean {
  let current: TSESTree.Node | null = node;
  
  // Traverse up the parent chain
  while (current && 'parent' in current && current.parent) {
    current = current.parent as TSESTree.Node;
    
    // Check for cookie-related method calls
    if (current.type === 'CallExpression') {
      const callExpr = current as TSESTree.CallExpression;
      
      // Check for res.cookie() calls
      if (callExpr.callee.type === 'MemberExpression') {
        const memberExpr = callExpr.callee;
        if (memberExpr.property.type === 'Identifier' && memberExpr.property.name === 'cookie') {
          // Check if the node is an argument of this call
          if (callExpr.arguments.some((arg: TSESTree.Node) => arg === node || (arg.type === 'ObjectExpression' && sourceCode.getText(arg).includes(sourceCode.getText(node))))) {
            return true;
          }
        }
      }
      
      // Check for other cookie-related calls using text matching
      const callText = sourceCode.getText(current);
      if (/\b(cookie|setCookie|res\.cookie|document\.cookie)\b/i.test(callText)) {
        // Check if node is part of this call
        const nodeText = sourceCode.getText(node);
        if (callText.includes(nodeText)) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Check if an object expression has secure cookie settings
 */
function hasSecureCookieSettings(
  node: TSESTree.ObjectExpression,
  sourceCode: TSESLint.SourceCode
): { hasHttpOnly: boolean; hasSecure: boolean; hasSameSite: boolean } {
  const text = sourceCode.getText(node);
  
  // Check for httpOnly flag (case-insensitive)
  const hasHttpOnly = /\bhttpOnly\s*:\s*(true|'true'|"true")/i.test(text);
  
  // Check for secure flag (case-insensitive)
  const hasSecure = /\bsecure\s*:\s*(true|'true'|"true")/i.test(text);
  
  // Check for sameSite flag (should be 'strict', 'lax', or 'none')
  const hasSameSite = /\bsameSite\s*:\s*['"](strict|lax|none)['"]/i.test(text);
  
  return { hasHttpOnly, hasSecure, hasSameSite };
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

export const noInsecureCookieSettings = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-cookie-settings',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects insecure cookie configurations (missing httpOnly, secure, sameSite flags)',
    },
    hasSuggestions: true,
    messages: {
      insecureCookieSettings: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure Cookie Configuration',
        cwe: 'CWE-614',
        description: 'Insecure cookie settings detected: {{issue}}',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/614.html',
      }),
      addSecureFlags: '✅ Set secure flags: { httpOnly: true, secure: true, sameSite: "strict" }',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow insecure cookies in test files',
          },
          cookieLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Cookie library patterns to recognize',
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
      cookieLibraries: [],
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      ignorePatterns = [],
    } = options as Options;

    const filename = context.getFilename();
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    const sourceCode = context.sourceCode || context.getSourceCode();

    function checkObjectExpression(node: TSESTree.ObjectExpression) {
      if (isTestFile) {
        return;
      }

      // Check if this ObjectExpression is the third argument of a cookie call
      // First, check if parent is directly a CallExpression
      if (node.parent && node.parent.type === 'CallExpression') {
        const parentCall = node.parent as TSESTree.CallExpression;
        const callee = parentCall.callee;
        
        // Check if it's a cookie call
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'cookie'
        ) {
          // Check if this node is the third argument (index 2)
          // Use both reference check and range check for reliability
          const thirdArg = parentCall.arguments.length >= 3 ? parentCall.arguments[2] : null;
          const isThirdArg = thirdArg && (
            thirdArg === node || 
            (thirdArg.type === 'ObjectExpression' && 
             thirdArg.range[0] === node.range[0] && 
             thirdArg.range[1] === node.range[1])
          );
          
          if (isThirdArg) {
            // This is the direct third argument of res.cookie() - skip here
            // checkCallExpression will handle this case to avoid double reporting
            return;
          }
        }
      }
      
      // If not handled above, check if it's inside a cookie config using helper
      if (!isInsideCookieConfig(node, sourceCode)) {
        return;
      }
      
      // If it's inside a cookie config, check it
      const text = sourceCode.getText(node);
      
      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(text, ignorePatterns)) {
        return;
      }

      const { hasHttpOnly, hasSecure, hasSameSite } = hasSecureCookieSettings(node, sourceCode);
      
      const issues: string[] = [];
      if (!hasHttpOnly) {
        issues.push('missing httpOnly flag');
      }
      if (!hasSecure) {
        issues.push('missing secure flag');
      }
      if (!hasSameSite) {
        issues.push('missing sameSite flag');
      }

      if (issues.length > 0) {
        const issueDescription = issues.join(', ');
        const safeAlternative = 'Set httpOnly: true, secure: true, sameSite: "strict"';

        context.report({
          node,
          messageId: 'insecureCookieSettings',
          data: {
            issue: issueDescription,
            safeAlternative,
          },
          suggest: [
            {
              messageId: 'addSecureFlags',
              fix(fixer: TSESLint.RuleFixer) {
                // Find the last property in the object
                const properties = node.properties;
                if (properties.length === 0) {
                  // Empty object - add all flags
                  return fixer.replaceText(node, '{ httpOnly: true, secure: true, sameSite: "strict" }');
                }

                const lastProperty = properties[properties.length - 1];
                const lastPropertyText = sourceCode.getText(lastProperty);
                const needsComma = !lastPropertyText.trim().endsWith(',');
                
                const fixes: TSESLint.RuleFix[] = [];
                const insertPosition = lastProperty.range[1];
                
                if (!hasHttpOnly) {
                  fixes.push(
                    fixer.insertTextAfterRange(
                      [insertPosition, insertPosition],
                      `${needsComma ? ',' : ''}\n  httpOnly: true`
                    )
                  );
                }
                if (!hasSecure) {
                  const httpOnlyFix = !hasHttpOnly ? ',\n  ' : (needsComma ? ',' : '');
                  fixes.push(
                    fixer.insertTextAfterRange(
                      [insertPosition, insertPosition],
                      `${httpOnlyFix}secure: true`
                    )
                  );
                }
                if (!hasSameSite) {
                  const previousFix = (!hasHttpOnly || !hasSecure) ? ',\n  ' : (needsComma ? ',' : '');
                  fixes.push(
                    fixer.insertTextAfterRange(
                      [insertPosition, insertPosition],
                      `${previousFix}sameSite: "strict"`
                    )
                  );
                }
                
                return fixes;
              },
            },
          ],
        });
      }
    }

    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isTestFile) {
        return;
      }

      const callee = node.callee;
      const callText = sourceCode.getText(node);
      
      // Check if it matches any ignore pattern
      if (matchesIgnorePattern(callText, ignorePatterns)) {
        return;
      }

      // Check for res.cookie() calls
      if (
        callee.type === 'MemberExpression' &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'cookie'
      ) {
        // Check if third argument (options) is provided
        if (node.arguments.length < 3) {
          context.report({
            node,
            messageId: 'insecureCookieSettings',
            data: {
              issue: 'missing cookie options with httpOnly, secure, and sameSite flags',
              safeAlternative: 'Add options object: res.cookie(name, value, { httpOnly: true, secure: true, sameSite: "strict" })',
            },
            suggest: [
              {
                messageId: 'addSecureFlags',
                fix(fixer: TSESLint.RuleFixer) {
                  // Add options as third argument
                  const lastArg = node.arguments[node.arguments.length - 1];
                  const insertPosition = lastArg.range[1];
                  return fixer.insertTextAfterRange(
                    [insertPosition, insertPosition],
                    `, { httpOnly: true, secure: true, sameSite: "strict" }`
                  );
                },
              },
            ],
          });
          return; // Don't check ObjectExpression for this case
        }
        
        // If third argument exists and is an ObjectExpression, check it here
        // This handles the case where ObjectExpression visitor might not catch it
        if (node.arguments.length >= 3 && node.arguments[2].type === 'ObjectExpression') {
          const optionsArg = node.arguments[2] as TSESTree.ObjectExpression;
          const text = sourceCode.getText(optionsArg);
          
          // Check if it matches any ignore pattern
          if (!matchesIgnorePattern(text, ignorePatterns)) {
            const { hasHttpOnly, hasSecure, hasSameSite } = hasSecureCookieSettings(optionsArg, sourceCode);
            
            const issues: string[] = [];
            if (!hasHttpOnly) {
              issues.push('missing httpOnly flag');
            }
            if (!hasSecure) {
              issues.push('missing secure flag');
            }
            if (!hasSameSite) {
              issues.push('missing sameSite flag');
            }

            if (issues.length > 0) {
              const issueDescription = issues.join(', ');
              const safeAlternative = 'Set httpOnly: true, secure: true, sameSite: "strict"';

              context.report({
                node: optionsArg,
                messageId: 'insecureCookieSettings',
                data: {
                  issue: issueDescription,
                  safeAlternative,
                },
                suggest: [
                  {
                    messageId: 'addSecureFlags',
                    fix(fixer) {
                      // Find the last property in the object
                      const properties = optionsArg.properties;
                      if (properties.length === 0) {
                        // Empty object - add all flags
                        return fixer.replaceText(optionsArg, '{ httpOnly: true, secure: true, sameSite: "strict" }');
                      }

                      const lastProperty = properties[properties.length - 1];
                      const lastPropertyText = sourceCode.getText(lastProperty);
                      const needsComma = !lastPropertyText.trim().endsWith(',');
                      
                      const fixes: TSESLint.RuleFix[] = [];
                      const insertPosition = lastProperty.range[1];
                      
                      if (!hasHttpOnly) {
                        fixes.push(
                          fixer.insertTextAfterRange(
                            [insertPosition, insertPosition],
                            `${needsComma ? ',' : ''}\n  httpOnly: true`
                          )
                        );
                      }
                      if (!hasSecure) {
                        const httpOnlyFix = !hasHttpOnly ? ',\n  ' : (needsComma ? ',' : '');
                        fixes.push(
                          fixer.insertTextAfterRange(
                            [insertPosition, insertPosition],
                            `${httpOnlyFix}secure: true`
                          )
                        );
                      }
                      if (!hasSameSite) {
                        const previousFix = (!hasHttpOnly || !hasSecure) ? ',\n  ' : (needsComma ? ',' : '');
                        fixes.push(
                          fixer.insertTextAfterRange(
                            [insertPosition, insertPosition],
                            `${previousFix}sameSite: "strict"`
                          )
                        );
                      }
                      
                      return fixes;
                    },
                  },
                ],
              });
            }
          }
        }
      }
    }

    function checkAssignmentExpression(node: TSESTree.AssignmentExpression) {
      if (isTestFile) {
        return;
      }

      // Check for document.cookie assignments
      if (
        node.left.type === 'MemberExpression' &&
        node.left.object.type === 'Identifier' &&
        node.left.object.name === 'document' &&
        node.left.property.type === 'Identifier' &&
        node.left.property.name === 'cookie'
      ) {
        const text = sourceCode.getText(node);
        
        // Check if it matches any ignore pattern
        if (matchesIgnorePattern(text, ignorePatterns)) {
          return;
        }

        context.report({
          node,
          messageId: 'insecureCookieSettings',
          data: {
            issue: 'using document.cookie directly (cannot set httpOnly flag)',
            safeAlternative: 'Use server-side cookie setting with httpOnly: true, secure: true, sameSite: "strict"',
          },
        });
      }
    }

    return {
      ObjectExpression: checkObjectExpression,
      CallExpression: checkCallExpression,
      AssignmentExpression: checkAssignmentExpression,
    };
  },
});

