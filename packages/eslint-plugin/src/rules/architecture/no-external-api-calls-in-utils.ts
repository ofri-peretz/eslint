/**
 * ESLint Rule: no-external-api-calls-in-utils
 * Detects network calls in utility functions
 * 
 * @see https://rules.sonarsource.com/javascript/RSPEC-1075/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

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
      useDependencyInjection: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Dependency Injection',
        description: 'Inject API client',
        severity: 'LOW',
        fix: 'function util(apiClient) { return apiClient.get(...) }',
        documentationLink: 'https://en.wikipedia.org/wiki/Dependency_injection',
      }),
      extractToService: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Extract to Service',
        description: 'Extract to service layer',
        severity: 'LOW',
        fix: 'Create services/apiService.ts',
        documentationLink: 'https://martinfowler.com/eaaCatalog/serviceLayer.html',
      }),
      passApiClient: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Pass API Client',
        description: 'Pass API client as parameter',
        severity: 'LOW',
        fix: 'function util(apiClient, data) { ... }',
        documentationLink: 'https://en.wikipedia.org/wiki/Dependency_injection',
      }),
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

