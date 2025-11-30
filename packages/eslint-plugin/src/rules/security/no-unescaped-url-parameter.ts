/**
 * ESLint Rule: no-unescaped-url-parameter
 * Detects unescaped URL parameters
 * CWE-79: Cross-site Scripting (XSS)
 * 
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://owasp.org/www-community/attacks/xss/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'unescapedUrlParameter' | 'useEncodeURIComponent' | 'useURLSearchParams';

export interface Options {
  /** Allow unescaped URL parameters in test files. Default: false */
  allowInTests?: boolean;
  
  /** Trusted URL construction libraries. Default: ['url', 'querystring'] */
  trustedLibraries?: string[];
  
  /** Additional safe patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if a node is inside a URL encoding function call
 */
function isInsideEncodingCall(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  trustedLibraries: string[]
): boolean {
  let current: TSESTree.Node | null = node;
  
  while (current) {
    if (current.type === 'CallExpression') {
      const callee = current.callee;
      
      // Check for encodeURIComponent, encodeURI
      if (callee.type === 'Identifier') {
        const calleeName = callee.name;
        if (['encodeURIComponent', 'encodeURI', 'escape'].includes(calleeName)) {
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

/**
 * Check if a node is a URL construction pattern
 */
function isUrlConstruction(node: TSESTree.Node, sourceCode: TSESLint.SourceCode): boolean {
  const text = sourceCode.getText(node);
  
  // Check for URL construction patterns
  const urlPatterns = [
    /\bhttps?:\/\//,  // HTTP/HTTPS URLs
    /\bnew\s+URL\s*\(/,
    /\burl\s*[=:]\s*/,  // url = or url:
    /\burl\s*\+/,  // url +
    /\bwindow\.location/,
    /\blocation\.href/,
    /\bwindow\.open\s*\(/,
    /\?[^=]+=/,  // Query parameters
  ];
  
  return urlPatterns.some(pattern => pattern.test(text));
}

export const noUnescapedUrlParameter = createRule<RuleOptions, MessageIds>({
  name: 'no-unescaped-url-parameter',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects unescaped URL parameters',
    },
    hasSuggestions: true,
    messages: {
      unescapedUrlParameter: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unescaped URL Parameter',
        cwe: 'CWE-79',
        description: 'Unescaped URL parameter detected: {{parameter}}',
        severity: 'HIGH',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/79.html',
      }),
      useEncodeURIComponent: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use encodeURIComponent',
        description: 'Use encodeURIComponent for URL params',
        severity: 'LOW',
        fix: '`https://example.com?q=${encodeURIComponent(param)}`',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent',
      }),
      useURLSearchParams: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use URLSearchParams',
        description: 'Use URLSearchParams for safe URL construction',
        severity: 'LOW',
        fix: 'new URLSearchParams({ q: param }).toString()',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow unescaped URL parameters in test files',
          },
          trustedLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: ['url', 'querystring'],
            description: 'Trusted URL construction libraries',
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
      trustedLibraries: ['url', 'querystring'],
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      trustedLibraries = ['url', 'querystring'],
      ignorePatterns = [],
    } = options as Options;

    const filename = context.getFilename();
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    const sourceCode = context.sourceCode || context.sourceCode;

    function checkTemplateLiteral(node: TSESTree.TemplateLiteral) {
      if (isTestFile) {
        return;
      }

      // Check if this is a URL construction
      if (!isUrlConstruction(node, sourceCode)) {
        return;
      }

      // Check each expression in the template
      for (const expression of node.expressions) {
        const text = sourceCode.getText(expression);
        
        // Check if it matches any ignore pattern
        if (matchesIgnorePattern(text, ignorePatterns)) {
          continue;
        }

        // Check if it's already encoded
        if (isInsideEncodingCall(expression, sourceCode, trustedLibraries)) {
          continue;
        }

        // Check if it's a user input pattern
        const userInputPatterns = [
          /\breq\.(query|params|body|headers|cookies)/,
          /\brequest\.(query|params|body)/,
          /\buserInput\b/i,
          /\binput\b/i,
          /\bsearchParams\b/,
          /\bparam\b/i, // Generic param variable
        ];

        // Check both the expression text and the full template literal
        // This catches nested patterns like req.query.id
        const fullText = sourceCode.getText(node);
        const exprText = sourceCode.getText(expression);
        const isUserInput = userInputPatterns.some(pattern => pattern.test(text)) || 
                           userInputPatterns.some(pattern => pattern.test(fullText)) ||
                           userInputPatterns.some(pattern => pattern.test(exprText)) ||
                           // Also check for nested member expressions like req.query.id
                           (expression.type === 'MemberExpression' && 
                            userInputPatterns.some(pattern => {
                              // Check the full expression including nested properties
                              return pattern.test(exprText);
                            }));

        if (isUserInput) {
          context.report({
            node: expression,
            messageId: 'unescapedUrlParameter',
            data: {
              parameter: text,
              safeAlternative: `Use encodeURIComponent() or URLSearchParams: const url = \`https://example.com?q=\${encodeURIComponent(${text})}\`;`,
            },
            suggest: [
              {
                messageId: 'useEncodeURIComponent',
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                fix: (_fixer: TSESLint.RuleFixer) => null,
              },
              {
                messageId: 'useURLSearchParams',
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                fix: (_fixer: TSESLint.RuleFixer) => null,
              },
            ],
          });
        }
      }
    }

    function checkBinaryExpression(node: TSESTree.BinaryExpression) {
      if (isTestFile) {
        return;
      }

      // Check for string concatenation in URL construction
      if (node.operator === '+') {
        if (!isUrlConstruction(node, sourceCode)) {
          return;
        }

        // Check right side (usually the parameter)
        if (node.right.type !== 'Literal') {
          const rightText = sourceCode.getText(node.right);
          
          // Check if it matches any ignore pattern
          if (matchesIgnorePattern(rightText, ignorePatterns)) {
            return;
          }

          // Check if it's already encoded
          if (isInsideEncodingCall(node.right, sourceCode, trustedLibraries)) {
            return;
          }

          // Check if it's a user input pattern
          const userInputPatterns = [
            /\breq\.(query|params|body)/,
            /\brequest\.(query|params|body)/,
            /\buserInput\b/,
            /\binput\b/,
          ];

          const isUserInput = userInputPatterns.some(pattern => pattern.test(rightText));

          if (isUserInput) {
            context.report({
              node: node.right,
              messageId: 'unescapedUrlParameter',
              data: {
                parameter: rightText,
                safeAlternative: `Use encodeURIComponent(): ${sourceCode.getText(node.left)} + encodeURIComponent(${rightText})`,
              },
              suggest: [
                {
                  messageId: 'useEncodeURIComponent',
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  fix: (_fixer: TSESLint.RuleFixer) => null,
                },
              ],
            });
          }
        }
      }
    }

    return {
      TemplateLiteral: checkTemplateLiteral,
      BinaryExpression: checkBinaryExpression,
    };
  },
});

