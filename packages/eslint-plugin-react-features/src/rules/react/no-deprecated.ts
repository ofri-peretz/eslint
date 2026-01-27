/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-deprecated
 * Prevent using deprecated React methods
 * 
 * Maintenance: Helps with React upgrades and migration
 * @see https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-deprecated.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'deprecated';

type RuleOptions = [];

// Deprecated React APIs (React 16+)
const DEPRECATED_APIS: Record<string, { replacement: string; since: string }> = {
  // React methods
  'React.createClass': { replacement: 'class extends React.Component', since: 'React 16' },
  'React.PropTypes': { replacement: 'import PropTypes from "prop-types"', since: 'React 15.5' },
  'React.findDOMNode': { replacement: 'refs', since: 'React 16.3' },
  
  // ReactDOM methods
  'ReactDOM.render': { replacement: 'createRoot().render()', since: 'React 18' },
  'ReactDOM.hydrate': { replacement: 'hydrateRoot()', since: 'React 18' },
  'ReactDOM.unmountComponentAtNode': { replacement: 'root.unmount()', since: 'React 18' },
  'ReactDOM.findDOMNode': { replacement: 'refs', since: 'React 16.3' },
  
  // Lifecycle methods (deprecated in strict mode)
  'componentWillMount': { replacement: 'componentDidMount or constructor', since: 'React 16.3' },
  'componentWillReceiveProps': { replacement: 'static getDerivedStateFromProps', since: 'React 16.3' },
  'componentWillUpdate': { replacement: 'getSnapshotBeforeUpdate', since: 'React 16.3' },
  'UNSAFE_componentWillMount': { replacement: 'componentDidMount or constructor', since: 'React 17' },
  'UNSAFE_componentWillReceiveProps': { replacement: 'static getDerivedStateFromProps', since: 'React 17' },
  'UNSAFE_componentWillUpdate': { replacement: 'getSnapshotBeforeUpdate', since: 'React 17' },
};

export const noDeprecated = createRule<RuleOptions, MessageIds>({
  name: 'no-deprecated',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent using deprecated React methods',
    },
    messages: {
      deprecated: formatLLMMessage({
        icon: MessageIcons.DEPRECATION,
        issueName: 'Deprecated React API',
        description: '"{{name}}" is deprecated since {{since}}',
        severity: 'MEDIUM',
        fix: 'Use {{replacement}} instead',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/no-deprecated.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Track lifecycle methods in class components
    let inClassComponent = false;

    function checkMemberExpression(node: TSESTree.MemberExpression): void {
      if (node.object.type !== 'Identifier') return;
      if (node.property.type !== 'Identifier') return;

      const fullName = `${node.object.name}.${node.property.name}`;
      const deprecation = DEPRECATED_APIS[fullName];

      if (deprecation) {
        context.report({
          node,
          messageId: 'deprecated',
          data: {
            name: fullName,
            replacement: deprecation.replacement,
            since: deprecation.since,
          },
        });
      }
    }

    function checkLifecycleMethod(node: TSESTree.MethodDefinition | TSESTree.PropertyDefinition): void {
      if (!inClassComponent) return;
      if (node.key.type !== 'Identifier') return;

      const methodName = node.key.name;
      const deprecation = DEPRECATED_APIS[methodName];

      if (deprecation) {
        context.report({
          node,
          messageId: 'deprecated',
          data: {
            name: methodName,
            replacement: deprecation.replacement,
            since: deprecation.since,
          },
        });
      }
    }

    return {
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        // Check if this extends React.Component or React.PureComponent
        if (!node.superClass) return;
        
        if (node.superClass.type === 'MemberExpression') {
          if (node.superClass.object.type === 'Identifier' && 
              node.superClass.object.name === 'React' &&
              node.superClass.property.type === 'Identifier' &&
              (node.superClass.property.name === 'Component' || 
               node.superClass.property.name === 'PureComponent')) {
            inClassComponent = true;
          }
        } else if (node.superClass.type === 'Identifier') {
          if (node.superClass.name === 'Component' || node.superClass.name === 'PureComponent') {
            inClassComponent = true;
          }
        }
      },

      'ClassDeclaration:exit'() {
        inClassComponent = false;
      },

      ClassExpression(node: TSESTree.ClassExpression) {
        if (!node.superClass) return;
        
        if (node.superClass.type === 'MemberExpression') {
          if (node.superClass.object.type === 'Identifier' && 
              node.superClass.object.name === 'React' &&
              node.superClass.property.type === 'Identifier' &&
              (node.superClass.property.name === 'Component' || 
               node.superClass.property.name === 'PureComponent')) {
            inClassComponent = true;
          }
        } else if (node.superClass.type === 'Identifier') {
          if (node.superClass.name === 'Component' || node.superClass.name === 'PureComponent') {
            inClassComponent = true;
          }
        }
      },

      'ClassExpression:exit'() {
        inClassComponent = false;
      },

      MemberExpression: checkMemberExpression,
      MethodDefinition: checkLifecycleMethod,
      PropertyDefinition: checkLifecycleMethod,
    };
  },
});
