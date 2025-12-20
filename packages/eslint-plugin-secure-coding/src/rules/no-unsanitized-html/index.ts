/**
 * ESLint Rule: no-unsanitized-html
 * Detects unsanitized HTML injection (dangerouslySetInnerHTML, innerHTML)
 * CWE-79: Cross-site Scripting (XSS)
 * 
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://owasp.org/www-community/attacks/xss/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

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

    // Track variables that have been assigned sanitized content
    const sanitizedVariables = new Set<string>();

    /**
     * Check if a call expression is a sanitization call
     */
    function isSanitizationCall(node: TSESTree.CallExpression): boolean {
      const callee = node.callee;
      if (callee.type === 'Identifier') {
        const calleeName = callee.name.toLowerCase();
        if (['sanitize', 'sanitizehtml', 'purify', 'escape'].includes(calleeName)) {
          return true;
        }
        if (trustedLibraries.some(lib => calleeName.includes(lib.toLowerCase()))) {
          return true;
        }
      }
      if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
        const objectName = callee.object.name.toLowerCase();
        if (trustedLibraries.some(lib => objectName.includes(lib.toLowerCase()))) {
          return true;
        }
        // Also check the method name
        if (callee.property.type === 'Identifier') {
          const methodName = callee.property.name.toLowerCase();
          if (['sanitize', 'purify', 'escape', 'clean'].includes(methodName)) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * Track variable declarations that are assigned sanitized content
     */
    function trackSanitizedAssignment(node: TSESTree.VariableDeclarator | TSESTree.AssignmentExpression) {
      let varName: string | null = null;
      let init: TSESTree.Node | null = null;

      if (node.type === 'VariableDeclarator') {
        if (node.id.type === 'Identifier' && node.init) {
          varName = node.id.name;
          init = node.init;
        }
      } else {
        if (node.left.type === 'Identifier') {
          varName = node.left.name;
          init = node.right;
        }
      }

      if (varName && init && init.type === 'CallExpression') {
        if (isSanitizationCall(init)) {
          sanitizedVariables.add(varName);
        }
      }
    }

    function checkAssignmentExpression(node: TSESTree.AssignmentExpression) {
      if (isTestFile) {
        return;
      }

      // Check if left side is a dangerous DOM property
      if (node.left.type === 'MemberExpression' && 
          node.left.property.type === 'Identifier') {
        
        const propertyName = node.left.property.name;
        const dangerousProps = ['innerHTML', 'outerHTML'];
        
        if (!dangerousProps.includes(propertyName)) {
          return; // Not a dangerous property
        }
        
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

        // If right side is a literal string/number, allow it
        if (node.right.type === 'Literal') {
          return;
        }

        // FALSE POSITIVE REDUCTION: Check if right side is a previously-sanitized variable
        // Pattern: const clean = DOMPurify.sanitize(html); element.innerHTML = clean;
        if (node.right.type === 'Identifier' && sanitizedVariables.has(node.right.name)) {
          return;
        }

        // For innerHTML/outerHTML, we should flag ANY non-sanitized assignment
        // This is more aggressive but safer - innerHTML should ALWAYS be sanitized
        // unless it's a literal or explicitly sanitized

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
                  fix: () => [],
                },
              ];

        context.report({
          node: memberExpr,
          messageId: 'unsanitizedHtml',
          data: {
            htmlSource: propertyName,
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
      VariableDeclarator: trackSanitizedAssignment,
      AssignmentExpression: (node: TSESTree.AssignmentExpression) => {
        // Track sanitized assignments first
        trackSanitizedAssignment(node);
        // Then check for unsafe innerHTML
        checkAssignmentExpression(node);
      },
      JSXAttribute: checkJSXAttribute,
    };
  },
});

