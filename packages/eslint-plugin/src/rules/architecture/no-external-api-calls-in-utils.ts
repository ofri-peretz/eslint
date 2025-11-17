/**
 * ESLint Rule: no-external-api-calls-in-utils
 * Detects network calls in utility functions
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-1075/
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'externalApiCallInUtils'
  | 'useDependencyInjection'
  | 'extractToService'
  | 'passApiClient';

export interface Options {
  ignoreInTests?: boolean;
  networkMethods?: string[];
  utilityPatterns?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if file is a utility file
 */
function isUtilityFile(filename: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    return regex.test(filename);
  });
}

/**
 * Check if call is a network call
 */
function isNetworkCall(node: TSESTree.CallExpression, networkMethods: string[]): boolean {
  if (node.callee.type === 'Identifier') {
    return networkMethods.includes(node.callee.name);
  }
  
  if (node.callee.type === 'MemberExpression' &&
      node.callee.property.type === 'Identifier') {
    const methodName = node.callee.property.name;
    const objectName = node.callee.object.type === 'Identifier' 
      ? node.callee.object.name 
      : '';
    
    return networkMethods.includes(methodName) ||
           networkMethods.includes(`${objectName}.${methodName}`);
  }
  
  return false;
}

export const noExternalApiCallsInUtils = createRule<RuleOptions, MessageIds>({
  name: 'no-external-api-calls-in-utils',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects network calls in utility functions',
    },
    hasSuggestions: true,
    messages: {
      externalApiCallInUtils: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'External API call in utils',
        description: 'Network call in utility function - breaks testability',
        severity: 'HIGH',
        fix: 'Use dependency injection for network calls',
        documentationLink: 'https://rules.sonarsource.com/javascript/RSPEC-1075/',
      }),
      useDependencyInjection: '✅ Inject API client: function util(apiClient) { return apiClient.get(...) }',
      extractToService: '✅ Extract to service layer: services/apiService.ts',
      passApiClient: '✅ Pass API client as parameter instead of direct call',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
          networkMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['fetch', 'axios', 'request', 'http.get', 'https.get', 'get', 'post', 'put', 'delete', 'patch'],
          },
          utilityPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: ['**/utils/**', '**/helpers/**', '**/lib/**'],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      networkMethods: ['fetch', 'axios', 'request', 'http.get', 'https.get', 'get', 'post', 'put', 'delete', 'patch'],
      utilityPatterns: ['**/utils/**', '**/helpers/**', '**/lib/**'],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
      ignoreInTests = true,
      networkMethods = ['fetch', 'axios', 'request', 'http.get', 'https.get', 'get', 'post', 'put', 'delete', 'patch'],
      utilityPatterns = ['**/utils/**', '**/helpers/**', '**/lib/**'],
    }: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const isUtility = isUtilityFile(filename, utilityPatterns);

    if (!isUtility) {
      return {};
    }

    /**
     * Check for network calls
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      if (isNetworkCall(node, networkMethods)) {
        context.report({
          node,
          messageId: 'externalApiCallInUtils',
          suggest: [
            {
              messageId: 'useDependencyInjection',
              fix: () => null,
            },
            {
              messageId: 'extractToService',
              fix: () => null,
            },
            {
              messageId: 'passApiClient',
              fix: () => null,
            },
          ],
        });
      }
    }

    return {
      CallExpression: checkCallExpression,
    };
  },
});

