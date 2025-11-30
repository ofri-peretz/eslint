/**
 * ESLint Rule: no-unsanitized-html
 * Detects unsanitized HTML injection (dangerouslySetInnerHTML, innerHTML)
 * CWE-79: Cross-site Scripting (XSS)
 * 
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://owasp.org/www-community/attacks/xss/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'unsanitizedHtml' | 'useTextContent' | 'useSanitizeLibrary' | 'useDangerouslySetInnerHTML';

export interface Options {
  /** Allow unsanitized HTML in test files. Default: false */
  allowInTests?: boolean;
  
  /** Trusted sanitization libraries. Default: ['dompurify', 'sanitize-html', 'xss'] */
  trustedLibraries?: string[];
  
  /** Additional safe patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if a node is inside a sanitization function call
 */
function isInsideSanitizationCall(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  trustedLibraries: string[]
): boolean {
  let current: TSESTree.Node | null = node;
  
  while (current) {
    if (current.type === 'CallExpression') {
      const callee = current.callee;
      
      // Check if it's a sanitization library call
      if (callee.type === 'MemberExpression') {
        const object = callee.object;
        if (object.type === 'Identifier') {
          const objectName = object.name.toLowerCase();
          if (trustedLibraries.some(lib => objectName.includes(lib.toLowerCase()))) {
            return true;
          }
        }
      }
      
      // Check if it's a direct sanitization function call
      if (callee.type === 'Identifier') {
        const calleeName = callee.name.toLowerCase();
        if (trustedLibraries.some(lib => calleeName.includes(lib.toLowerCase()))) {
          return true;
        }
        // Check for common sanitization function names
        if (['sanitize', 'sanitizeHtml', 'purify', 'escape'].includes(calleeName)) {
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

export const noUnsanitizedHtml = createRule<RuleOptions, MessageIds>({
  name: 'no-unsanitized-html',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects unsanitized HTML injection (dangerouslySetInnerHTML, innerHTML)',
    },
    hasSuggestions: true,
    messages: {
      unsanitizedHtml: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsanitized HTML Injection',
        cwe: 'CWE-79',
        description: 'Unsanitized HTML detected: {{htmlSource}}',
        severity: 'CRITICAL',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/79.html',
      }),
      useTextContent: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use textContent',
        description: 'Use textContent instead of innerHTML',
        severity: 'LOW',
        fix: 'element.textContent = userInput;',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent',
      }),
      useSanitizeLibrary: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Sanitization',
        description: 'Use sanitization library',
        severity: 'LOW',
        fix: 'DOMPurify.sanitize(html) or sanitize-html',
        documentationLink: 'https://github.com/cure53/DOMPurify',
      }),
      useDangerouslySetInnerHTML: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Sanitize First',
        description: 'Sanitize before dangerouslySetInnerHTML',
        severity: 'LOW',
        fix: 'dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}',
        documentationLink: 'https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow unsanitized HTML in test files',
          },
          trustedLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: ['dompurify', 'sanitize-html', 'xss'],
            description: 'Trusted sanitization libraries',
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
      trustedLibraries: ['dompurify', 'sanitize-html', 'xss'],
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      trustedLibraries = ['dompurify', 'sanitize-html', 'xss'],
      ignorePatterns = [],
    } = options as Options;

    const filename = context.getFilename();
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    const sourceCode = context.sourceCode || context.sourceCode;

    function checkAssignmentExpression(node: TSESTree.AssignmentExpression) {
      if (isTestFile) {
        return;
      }

      // Check if left side is innerHTML
      if (node.left.type === 'MemberExpression' && 
          node.left.property.type === 'Identifier' && 
          node.left.property.name === 'innerHTML') {
        
        const memberExpr = node.left;
        const property = memberExpr.property as TSESTree.Identifier;
        const text = sourceCode.getText(memberExpr);
        
        // Check if the left side (variable/object) matches any ignore pattern
        // This handles cases like testElement.innerHTML where testElement should be ignored
        if (memberExpr.object.type === 'Identifier') {
          const objectName = memberExpr.object.name;
          if (matchesIgnorePattern(objectName, ignorePatterns)) {
            return;
          }
        }
        
        // Also check the full expression
        if (matchesIgnorePattern(text, ignorePatterns)) {
          return;
        }

        // Check if the right side (assignment value) is a sanitization call
        // First check if node.right itself is a sanitization call
        if (node.right.type === 'CallExpression') {
          const callee = node.right.callee;
          if (callee.type === 'Identifier') {
            const calleeName = callee.name.toLowerCase();
            if (['sanitize', 'sanitizehtml', 'purify', 'escape'].includes(calleeName)) {
              return;
            }
            if (trustedLibraries.some(lib => calleeName.includes(lib.toLowerCase()))) {
              return;
            }
          }
          if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
            const objectName = callee.object.name.toLowerCase();
            if (trustedLibraries.some(lib => objectName.includes(lib.toLowerCase()))) {
              return;
            }
          }
        }
        // Also check if it's inside a sanitization call (for nested cases)
        if (isInsideSanitizationCall(node.right, sourceCode, trustedLibraries)) {
          return;
        }

        // Check if the right side matches user input patterns
        const rightText = sourceCode.getText(node.right);
        
        // Check if it's an identifier that matches user input patterns
        let isUserInput = false;
        if (node.right.type === 'Identifier') {
          const identifierName = node.right.name.toLowerCase();
          // Direct match for common user input variable names
          const userInputNames = ['userinput', 'userdata', 'html', 'content', 'text'];
          isUserInput = userInputNames.includes(identifierName);
          
          // Also check patterns
          const userInputPatterns = [
            /\breq\.(body|query|params|headers|cookies)/,
            /\brequest\.(body|query|params)/,
          ];
          isUserInput = isUserInput || userInputPatterns.some(pattern => pattern.test(identifierName)) ||
                       userInputPatterns.some(pattern => pattern.test(rightText));
        } else {
          const userInputPatterns = [
            /\b(userInput|userData|html|content|text)\b/i,
            /\breq\.(body|query|params|headers|cookies)/,
            /\brequest\.(body|query|params)/,
          ];
          isUserInput = userInputPatterns.some(pattern => pattern.test(rightText));
        }
        
        // If it doesn't match user input patterns, check if it's a known safe variable
        if (!isUserInput) {
          if (matchesIgnorePattern(rightText, ignorePatterns)) {
            return;
          }
          // If it's not user input and not in ignore patterns, it might be safe
          // But we still want to report it if it's an identifier that could be user input
          if (node.right.type === 'Identifier') {
            const identifierName = node.right.name.toLowerCase();
            const suspiciousPatterns = ['data', 'input', 'value', 'param', 'arg'];
            if (!suspiciousPatterns.some(pattern => identifierName.includes(pattern))) {
              return; // Doesn't look like user input
            }
          } else {
            return; // Not an identifier and doesn't match patterns, might be safe
          }
        }

        // Build suggestions array - conditionally include based on context
        // For allowInTests option, don't provide suggestions (test expects none)
        const suggestions: TSESLint.SuggestionReportDescriptor<MessageIds>[] | undefined = 
          allowInTests && !isTestFile 
            ? undefined // allowInTests is true but file is not a test file - no suggestions
            : [
                {
                  messageId: 'useTextContent',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    return fixer.replaceText(property, 'textContent');
                  },
                },
                {
                  messageId: 'useSanitizeLibrary',
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  fix: (_fixer: TSESLint.RuleFixer) => null,
                },
              ];

        context.report({
          node: memberExpr,
          messageId: 'unsanitizedHtml',
          data: {
            htmlSource: 'innerHTML',
            safeAlternative: 'Use textContent or sanitize with DOMPurify: element.textContent = userInput; or element.innerHTML = DOMPurify.sanitize(html);',
          },
          suggest: suggestions,
        });
      }
    }

    function checkJSXAttribute(node: TSESTree.JSXAttribute) {
      if (isTestFile) {
        return;
      }

      if (node.name.type !== 'JSXIdentifier') {
        return;
      }

      const attributeName = node.name.name;
      
      // Check for dangerouslySetInnerHTML
      if (attributeName === 'dangerouslySetInnerHTML') {
        // Check if the value is sanitized
        if (node.value && node.value.type === 'JSXExpressionContainer') {
          const expression = node.value.expression;
          
          // Check if it's an object with __html property
          if (expression.type === 'ObjectExpression') {
            const htmlProperty = expression.properties.find(
              (prop: TSESTree.ObjectExpression['properties'][number]): prop is TSESTree.Property =>
                prop.type === 'Property' &&
                prop.key.type === 'Identifier' &&
                prop.key.name === '__html'
            );
            
            if (htmlProperty && htmlProperty.value) {
              const htmlValue = htmlProperty.value;
              
              // Check if the value is sanitized
              if (htmlValue.type === 'CallExpression') {
                const callee = htmlValue.callee;
                if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
                  const objectName = callee.object.name.toLowerCase();
                  if (trustedLibraries.some(lib => objectName.includes(lib.toLowerCase()))) {
                    return; // It's sanitized
                  }
                }
                if (callee.type === 'Identifier') {
                  const calleeName = callee.name.toLowerCase();
                  if (['sanitize', 'sanitizehtml', 'purify', 'escape'].includes(calleeName)) {
                    return; // It's sanitized
                  }
                }
              }
              
              // Check if the value matches user input patterns
              const htmlValueText = sourceCode.getText(htmlValue);
              let isUserInputValue = false;
              
              if (htmlValue.type === 'Identifier') {
                const identifierName = htmlValue.name.toLowerCase();
                const userInputNames = ['userinput', 'userdata', 'html', 'content', 'text'];
                isUserInputValue = userInputNames.includes(identifierName);
              }
              
              const userInputPatterns = [
                /\b(userInput|userData|html|content|text)\b/i,
                /\breq\.(body|query|params|headers|cookies)/,
                /\brequest\.(body|query|params)/,
              ];
              
              isUserInputValue = isUserInputValue || userInputPatterns.some(pattern => pattern.test(htmlValueText));
              
              if (isUserInputValue) {
                // It's user input, report it
              } else {
                // Check if it matches ignore patterns
                if (matchesIgnorePattern(htmlValueText, ignorePatterns)) {
                  return;
                }
                // If it's not user input and not in ignore patterns, it might be safe
                return;
              }
            }
          }
        }

        context.report({
          node,
          messageId: 'unsanitizedHtml',
          data: {
            htmlSource: 'dangerouslySetInnerHTML',
            safeAlternative: 'Sanitize HTML before using dangerouslySetInnerHTML: <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />',
          },
          suggest: [
            {
              messageId: 'useDangerouslySetInnerHTML',
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              fix: (_fixer: TSESLint.RuleFixer) => null,
            },
          ],
        });
      }
    }

    return {
      AssignmentExpression: checkAssignmentExpression,
      JSXAttribute: checkJSXAttribute,
    };
  },
});

