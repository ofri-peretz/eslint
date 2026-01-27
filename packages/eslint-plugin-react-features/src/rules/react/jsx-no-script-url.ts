/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-no-script-url
 * Forbid javascript: URLs in JSX
 * 
 * Security: Prevents XSS attacks through javascript: protocol (CWE-79)
 * @see https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-script-url.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'noScriptUrl';

type ComponentConfig = {
  name: string;
  props: string[];
};

type Options = {
  includeFromSettings?: boolean;
};

type RuleOptions = [ComponentConfig[]?, Options?];

// Attributes that commonly accept URLs
const URL_PROPS = ['href', 'src', 'action', 'formAction', 'data', 'poster', 'background'];

export const jsxNoScriptUrl = createRule<RuleOptions, MessageIds>({
  name: 'jsx-no-script-url',
  meta: {
    type: 'problem',
    docs: {
      description: 'Forbid javascript: URLs',
    },
    messages: {
      noScriptUrl: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'javascript: URL',
        cwe: 'CWE-79',
        description: 'javascript: URLs are a security risk and can lead to XSS attacks',
        severity: 'CRITICAL',
        fix: 'Use an onClick handler instead or a proper href',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/jsx-no-script-url.md',
      }),
    },
    schema: [
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            props: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'props'],
          additionalProperties: false,
        },
      },
      {
        type: 'object',
        properties: {
          includeFromSettings: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [[], {}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [componentConfigs = []]) {
    // Build a map of component -> props to check
    const componentPropsMap = new Map<string, Set<string>>();
    
    // Add custom component configurations
    for (const config of componentConfigs) {
      componentPropsMap.set(config.name, new Set(config.props));
    }

    function isJavaScriptUrl(value: string): boolean {
      // Match javascript: protocol (case insensitive, with optional whitespace)
      return /^\s*javascript:/i.test(value);
    }

    function checkAttribute(node: TSESTree.JSXAttribute, elementName: string): void {
      if (node.name.type !== 'JSXIdentifier') return;
      
      const propName = node.name.name;
      
      // Check if this is a URL prop for standard elements
      const isUrlProp = URL_PROPS.includes(propName);
      
      // Check if this is a configured custom component prop
      const customProps = componentPropsMap.get(elementName);
      const isCustomProp = customProps?.has(propName);

      if (!isUrlProp && !isCustomProp) return;

      if (!node.value) return;

      // Check literal string values
      if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
        if (isJavaScriptUrl(node.value.value)) {
          context.report({
            node,
            messageId: 'noScriptUrl',
          });
        }
      }

      // Check JSX expression with template literal or string
      if (node.value.type === 'JSXExpressionContainer') {
        const expr = node.value.expression;
        
        if (expr.type === 'Literal' && typeof expr.value === 'string') {
          if (isJavaScriptUrl(expr.value)) {
            context.report({
              node,
              messageId: 'noScriptUrl',
            });
          }
        }

        if (expr.type === 'TemplateLiteral' && expr.quasis.length > 0) {
          // Check if the template literal starts with javascript:
          const firstQuasi = expr.quasis[0];
          if (firstQuasi && isJavaScriptUrl(firstQuasi.value.raw)) {
            context.report({
              node,
              messageId: 'noScriptUrl',
            });
          }
        }
      }
    }

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        let elementName: string;
        
        if (node.name.type === 'JSXIdentifier') {
          elementName = node.name.name;
        } else if (node.name.type === 'JSXMemberExpression') {
          // Handle Component.SubComponent
          elementName = context.sourceCode.getText(node.name);
        } else {
          return;
        }

        for (const attr of node.attributes) {
          if (attr.type === 'JSXAttribute') {
            checkAttribute(attr, elementName);
          }
        }
      },
    };
  },
});
