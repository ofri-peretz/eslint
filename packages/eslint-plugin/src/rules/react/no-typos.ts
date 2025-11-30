/**
 * ESLint Rule: no-typos
 * Catch common typos
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noTypos';

const COMMON_TYPOS = new Map([
  ['defaulProps', 'defaultProps'],
  ['defaulProps', 'defaultProps'],
  ['defalutProps', 'defaultProps'],
  ['defualtProps', 'defaultProps'],
  ['DefaulProps', 'DefaultProps'],
  ['DefalutProps', 'DefaultProps'],
  ['DefualtProps', 'DefaultProps'],
  ['propTypes', 'propTypes'], // This would catch variations
  ['PropTypes', 'PropTypes'],
  ['componenDidMount', 'componentDidMount'],
  ['componenDidUpdate', 'componentDidUpdate'],
  ['componenWillUnmount', 'componentWillUnmount'],
  ['componenWillMount', 'componentWillMount'],
  ['componenWillReceiveProps', 'componentWillReceiveProps'],
  ['componenWillUpdate', 'componentWillUpdate'],
  ['shoudComponentUpdate', 'shouldComponentUpdate'],
  ['getDerivedStateFromProps', 'getDerivedStateFromProps'],
  ['getSnapshoBeforeUpdate', 'getSnapshotBeforeUpdate'],
  ['UNSAFE_componenWillMount', 'UNSAFE_componentWillMount'],
  ['UNSAFE_componenWillReceiveProps', 'UNSAFE_componentWillReceiveProps'],
  ['UNSAFE_componenWillUpdate', 'UNSAFE_componentWillUpdate'],
]);

export const noTypos = createRule<[], MessageIds>({
  name: 'no-typos',
  meta: {
    type: 'problem',
    docs: {
      description: 'Catch common typos',
    },
    messages: {
      noTypos: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Typo Detected',
        description: 'Common typo in React method/property name',
        severity: 'LOW',
        fix: 'Correct the spelling to match React API',
        documentationLink: 'https://react.dev/reference/react/Component',
      }),
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // Check class property names (PropertyDefinition is used by TypeScript parser)
      PropertyDefinition(node: TSESTree.PropertyDefinition) {
        if (node.key.type === 'Identifier') {
          const name = node.key.name;
          const correction = COMMON_TYPOS.get(name);
          if (correction) {
            context.report({
              node: node.key,
              messageId: 'noTypos',
            });
          }
        }
      },

      // Check method names
      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (node.key.type === 'Identifier') {
          const name = node.key.name;
          const correction = COMMON_TYPOS.get(name);
          if (correction) {
            context.report({
              node: node.key,
              messageId: 'noTypos',
            });
          }
        }
      },

      // Check property access
      MemberExpression(node: TSESTree.MemberExpression) {
        if (node.property.type === 'Identifier') {
          const name = node.property.name;
          const correction = COMMON_TYPOS.get(name);
          if (correction) {
            context.report({
              node: node.property,
              messageId: 'noTypos',
            });
          }
        }
      },
    };
  },
});
