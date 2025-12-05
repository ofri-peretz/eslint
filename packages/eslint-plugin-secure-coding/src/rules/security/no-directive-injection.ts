/**
 * ESLint Rule: no-directive-injection
 * Detects directive injection vulnerabilities (CWE-96)
 *
 * Directive injection occurs when user input is used to inject malicious
 * directives into template systems (Angular, Vue, React, etc.). Attackers
 * can inject directives that execute arbitrary code or manipulate the DOM.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe directive usage patterns
 * - Trusted directive sources
 * - JSDoc annotations (@trusted-directive, @safe-template)
 * - Framework-specific safe patterns
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'directiveInjection'
  | 'unsafeDirectiveName'
  | 'dynamicDirectiveCreation'
  | 'templateInjection'
  | 'unsafeComponentBinding'
  | 'userControlledTemplate'
  | 'dangerousInnerHTML'
  | 'untrustedDirectiveSource'
  | 'useTrustedDirectives'
  | 'sanitizeTemplateInput'
  | 'validateDirectiveNames'
  | 'strategyTemplateSanitization'
  | 'strategyContentSecurity'
  | 'strategyInputValidation';

export interface Options extends SecurityRuleOptions {
  /** Trusted directive/component names */
  trustedDirectives?: string[];

  /** Variables that contain user input */
  userInputVariables?: string[];

  /** Frameworks to check for */
  frameworks?: string[];

  /** Allow dynamic directives in specific contexts */
  allowDynamicInComponents?: boolean;
}

type RuleOptions = [Options?];

export const noDirectiveInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-directive-injection',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects directive injection vulnerabilities in templates',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      directiveInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Directive Injection',
        cwe: 'CWE-96',
        description: 'User input injected into directive or template',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      unsafeDirectiveName: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Directive Name',
        cwe: 'CWE-96',
        description: 'Directive name controlled by user input',
        severity: 'CRITICAL',
        fix: 'Use hardcoded directive names or validate against whitelist',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      dynamicDirectiveCreation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dynamic Directive Creation',
        cwe: 'CWE-96',
        description: 'Dynamic creation of directives from user input',
        severity: 'HIGH',
        fix: 'Validate directive names against trusted list',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      templateInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Template Injection',
        cwe: 'CWE-96',
        description: 'User input injected into template content',
        severity: 'HIGH',
        fix: 'Sanitize template input or use safe rendering',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      unsafeComponentBinding: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Component Binding',
        cwe: 'CWE-96',
        description: 'Dynamic component binding with user input',
        severity: 'HIGH',
        fix: 'Use component whitelist or validate component names',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      userControlledTemplate: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'User Controlled Template',
        cwe: 'CWE-96',
        description: 'Template content controlled by user input',
        severity: 'CRITICAL',
        fix: 'Sanitize template input before compilation',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      dangerousInnerHTML: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous innerHTML',
        cwe: 'CWE-96',
        description: 'innerHTML set with user-controlled content',
        severity: 'HIGH',
        fix: 'Use textContent or sanitize HTML content',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML',
      }),
      untrustedDirectiveSource: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Untrusted Directive Source',
        cwe: 'CWE-96',
        description: 'Directive loaded from untrusted source',
        severity: 'MEDIUM',
        fix: 'Load directives from trusted, verified sources',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      useTrustedDirectives: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Trusted Directives',
        description: 'Use only trusted, verified directives',
        severity: 'LOW',
        fix: 'Maintain whitelist of allowed directives',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      sanitizeTemplateInput: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Sanitize Template Input',
        description: 'Sanitize user input before template processing',
        severity: 'LOW',
        fix: 'Use DOMPurify or equivalent sanitization',
        documentationLink: 'https://github.com/cure53/DOMPurify',
      }),
      validateDirectiveNames: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Directive Names',
        description: 'Validate directive names against whitelist',
        severity: 'LOW',
        fix: 'Check directive names before dynamic creation',
        documentationLink: 'https://cwe.mitre.org/data/definitions/96.html',
      }),
      strategyTemplateSanitization: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Template Sanitization Strategy',
        description: 'Implement template input sanitization',
        severity: 'LOW',
        fix: 'Sanitize all user input before template processing',
        documentationLink: 'https://owasp.org/www-community/xss-filter-evasion-cheatsheet',
      }),
      strategyContentSecurity: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Content Security Strategy',
        description: 'Use CSP to restrict directive execution',
        severity: 'LOW',
        fix: 'Implement strict CSP with script-src restrictions',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
      }),
      strategyInputValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Input Validation Strategy',
        description: 'Validate all template inputs',
        severity: 'LOW',
        fix: 'Use schema validation for template inputs',
        documentationLink: 'https://joi.dev/',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          trustedDirectives: {
            type: 'array',
            items: { type: 'string' },
            default: ['ngIf', 'ngFor', 'ngClass', 'v-if', 'v-for', 'v-bind', 'v-on'],
          },
          userInputVariables: {
            type: 'array',
            items: { type: 'string' },
            default: ['req', 'request', 'body', 'query', 'params', 'input', 'data', 'userInput'],
          },
          frameworks: {
            type: 'array',
            items: { type: 'string' },
            default: ['angular', 'vue', 'react', 'svelte'],
          },
          allowDynamicInComponents: {
            type: 'boolean',
            default: false,
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as template sanitizers',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as safe markers',
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
      trustedDirectives: ['ngIf', 'ngFor', 'ngClass', 'v-if', 'v-for', 'v-bind', 'v-on'],
      userInputVariables: ['req', 'request', 'body', 'query', 'params', 'input', 'data', 'userInput'],
      frameworks: ['angular', 'vue', 'react', 'svelte'],
      allowDynamicInComponents: false,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      userInputVariables = ['req', 'request', 'body', 'query', 'params', 'input', 'data', 'userInput'],
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

    /**
     * Check if a variable contains user input
     */
    const isUserInput = (varName: string): boolean => {
      return userInputVariables.some(input => varName.includes(input));
    };

    return {
      // Check JSX attributes for directive injection
      JSXAttribute(node: TSESTree.JSXAttribute) {
        const attrName = node.name;
        const attrValue = node.value;

        // Check for dangerouslySetInnerHTML
        if (attrName.type === 'JSXIdentifier' && attrName.name === 'dangerouslySetInnerHTML') {
          if (attrValue && attrValue.type === 'JSXExpressionContainer') {
            const expression = attrValue.expression;

            // Check if the expression contains user input
            const expressionText = sourceCode.getText(expression);
            if (userInputVariables.some(input => expressionText.includes(input))) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: attrValue,
                messageId: 'dangerousInnerHTML',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for dynamic directive names (Angular/Vue style)
        if (attrName.type === 'JSXNamespacedName') {
          // Handle namespaced attributes like v-bind: or ng-
          const namespace = attrName.namespace.name;

          if ((namespace === 'v' || namespace === 'ng') && attrValue) {
            if (attrValue.type === 'JSXExpressionContainer') {
              const expression = attrValue.expression;

              // Check if directive value comes from user input
              if (expression.type === 'Identifier' && isUserInput(expression.name)) {
                // FALSE POSITIVE REDUCTION
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node: attrValue,
                  messageId: 'directiveInjection',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                    severity: 'HIGH',
                    safeAlternative: 'Use hardcoded directive values or validate user input',
                  },
                });
              }
            }
          }
        }

        // Check for dynamic component binding (React/Angular)
        if (attrName.type === 'JSXIdentifier') {
          const attrNameStr = attrName.name;

          // Check for is="" (dynamic component in Vue/Angular)
          if (attrNameStr === 'is' && attrValue) {
            if (attrValue.type === 'JSXExpressionContainer') {
              const expression = attrValue.expression;

              if (expression.type === 'Identifier' && isUserInput(expression.name)) {
                // FALSE POSITIVE REDUCTION
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node: attrValue,
                  messageId: 'unsafeComponentBinding',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                },
                });
              }
            }
          }
        }
      },

      // Check for innerHTML assignments
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const left = node.left;
        const right = node.right;

        // Check for element.innerHTML = userInput
        if (left.type === 'MemberExpression' &&
            left.property.type === 'Identifier' &&
            left.property.name === 'innerHTML') {

          // Check if right side contains user input
          const rightText = sourceCode.getText(right);
          if (userInputVariables.some(input => rightText.includes(input))) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: right,
              messageId: 'dangerousInnerHTML',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check for template compilation with user input
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for template compilation functions
        if (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier') {

          const methodName = callee.property.name;
          const objectName = callee.object.type === 'Identifier' ? callee.object.name : '';

          // Template compilation functions
          if (['compile', 'template', '$compile', '$interpolate'].includes(methodName) ||
              (objectName === 'Handlebars' && methodName === 'compile') ||
              (objectName === '_' && methodName === 'template')) {

            const args = node.arguments;
            if (args.length > 0) {
              const templateArg = args[0];

              // Check if template comes from user input
              if (templateArg.type === 'Identifier' && isUserInput(templateArg.name)) {
                // FALSE POSITIVE REDUCTION
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node: templateArg,
                  messageId: 'userControlledTemplate',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
              }
            }
          }

          // Check for Vue.js v-html directive
          if (objectName === 'Vue' && methodName === 'directive') {
            const args = node.arguments;
            if (args.length >= 2) {
              const directiveName = args[0];

              if (directiveName.type === 'Identifier' && isUserInput(directiveName.name)) {
                // FALSE POSITIVE REDUCTION
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node: directiveName,
                  messageId: 'unsafeDirectiveName',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
              }
            }
          }
        }

        // Check for Angular directive creation
        if (callee.type === 'Identifier' && callee.name === 'directive') {
          const args = node.arguments;
          if (args.length >= 2) {
            const directiveName = args[0];

            if (directiveName.type === 'Identifier' && isUserInput(directiveName.name)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node: directiveName,
                messageId: 'dynamicDirectiveCreation',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      },

      // Check template literals for injection
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        // Check if template literal is used dangerously
        let current: TSESTree.Node | undefined = node;
        let isInDangerousContext = false;

        while (current && !isInDangerousContext) {
          if (current.type === 'JSXExpressionContainer') {
            // Check parent JSX element
            const jsxElement = current.parent?.parent;
            if (jsxElement?.type === 'JSXElement') {
              const openingElement = jsxElement.openingElement;
              for (const attr of openingElement.attributes) {
                if (attr.type === 'JSXAttribute' &&
                    attr.name.type === 'JSXIdentifier' &&
                    attr.name.name === 'dangerouslySetInnerHTML') {
                  isInDangerousContext = true;
                  break;
                }
              }
            }
          } else if (current.type === 'AssignmentExpression') {
            // Check for innerHTML assignment
            const left = current.left;
            if (left.type === 'MemberExpression' &&
                left.property.type === 'Identifier' &&
                left.property.name === 'innerHTML') {
              isInDangerousContext = true;
              break;
            }
          }
          current = current.parent as TSESTree.Node;
        }

        if (isInDangerousContext) {
          // Check if template contains user input
          const hasUserInput = node.expressions.some((expr: TSESTree.Expression) =>
            (expr.type === 'Identifier' && isUserInput(expr.name)) ||
            (expr.type === 'MemberExpression' &&
             expr.object.type === 'Identifier' &&
             isUserInput(expr.object.name))
          );

          if (hasUserInput) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'templateInjection',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
                severity: 'HIGH',
                safeAlternative: 'Sanitize template input before insertion',
              },
            });
          }
        }
      }
    };
  },
});
