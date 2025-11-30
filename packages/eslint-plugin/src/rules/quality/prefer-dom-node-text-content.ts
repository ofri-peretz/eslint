/**
 * ESLint Rule: prefer-dom-node-text-content
 * Prefer textContent over innerText for DOM node text access
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'preferDomNodeTextContent';

type RuleOptions = [];

export const preferDomNodeTextContent = createRule<RuleOptions, MessageIds>({
  name: 'prefer-dom-node-text-content',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer textContent over innerText for better performance and reliability',
    },
    hasSuggestions: true,
    messages: {
      preferDomNodeTextContent: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'DOM Text Access',
        description: 'Use textContent instead of innerText',
        severity: 'MEDIUM',
        fix: 'Replace innerText with textContent',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/prefer-dom-node-text-content.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [],

  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    function isInAllowedContext(): boolean {
      // For simplicity, we'll skip the allow option for now
      return false;
    }

    function isLikelyDomElement(node: TSESTree.MemberExpression): boolean {
      const obj = node.object;

      // Check if it's a variable/identifier that might be a DOM element
      if (obj.type === 'Identifier') {
        const name = obj.name;
        // Common DOM element variable names
        if (name.match(/^(element|el|div|span|node|ref|dom|elem)$/i)) {
          return true;
        }
        // Variables that end with common DOM suffixes
        if (name.match(/(Element|Node|Ref)$/)) {
          return true;
        }
      }

      // Check for DOM method calls like document.querySelector, getElementById, etc.
      if (obj.type === 'CallExpression' && obj.callee.type === 'MemberExpression') {
        const methodName = (obj.callee.property as TSESTree.Identifier)?.name;
        if (methodName && ['querySelector', 'querySelectorAll', 'getElementById', 'getElementsByClassName', 'getElementsByTagName', 'createElement'].includes(methodName)) {
          return true;
        }
      }

      // Check for property access on known DOM objects
      if (obj.type === 'MemberExpression') {
        const propName = (obj.property as TSESTree.Identifier)?.name;
        if (propName && ['current', 'children', 'childNodes', 'parentNode', 'element'].includes(propName)) {
          return true;
        }
      }

      // Check for 'this.element' pattern
      if (obj.type === 'MemberExpression' &&
          obj.object.type === 'ThisExpression' &&
          obj.property.type === 'Identifier' &&
          obj.property.name === 'element') {
        return true;
      }

      return false;
    }

    function isInnerTextAccess(node: TSESTree.MemberExpression): boolean {
      // Check if this is accessing .innerText property
      if (node.property.type === 'Identifier' && node.property.name === 'innerText') {
        return true;
      }
      // Also check computed property access like element["innerText"]
      if (node.computed && node.property.type === 'Literal' && node.property.value === 'innerText') {
        return true;
      }
      return false;
    }

    return {
      MemberExpression(node: TSESTree.MemberExpression) {
        if (isInnerTextAccess(node) && isLikelyDomElement(node) && !isInAllowedContext()) {
          context.report({
            node,
            messageId: 'preferDomNodeTextContent',
            data: {
              current: 'innerText',
              fix: 'textContent',
            },
            suggest: [
              {
                messageId: 'preferDomNodeTextContent',
                data: {
                  replacement: 'textContent',
                  suggestion: 'Replace with textContent',
                },
                fix(fixer: TSESLint.RuleFixer) {
                  if (node.property.type === 'Identifier') {
                    return fixer.replaceText(node.property, 'textContent');
                  } else if (node.property.type === 'Literal' && node.property.value === 'innerText') {
                    return fixer.replaceText(node.property, '"textContent"');
                  }
                  return null;
                },
              },
            ],
          });
        }
      },
    };
  },
});
