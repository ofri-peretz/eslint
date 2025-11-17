/**
 * ESLint Rule: no-insecure-redirects
 * Detects open redirect vulnerabilities
 * CWE-601: URL Redirection to Untrusted Site ('Open Redirect')
 * 
 * @see https://cwe.mitre.org/data/definitions/601.html
 * @see https://owasp.org/www-community/vulnerabilities/Unvalidated_Redirects_and_Forwards
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'insecureRedirect'
  | 'whitelistDomains'
  | 'validateRedirect'
  | 'useRelativeUrl';

export interface Options {
  /** Ignore in test files. Default: true */
  ignoreInTests?: boolean;
  
  /** Allowed redirect domains. Default: [] */
  allowedDomains?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if redirect URL is validated
 */
function isRedirectValidated(
  node: TSESTree.CallExpression,
  sourceCode: TSESLint.SourceCode
): boolean {
  // Check if redirect URL is validated before use
  // This is a simplified check - would need control flow analysis
  
  const callText = sourceCode.getText(node);
  
  // Check if URL is from user input (req.query, req.body, req.params)
  const userInputPattern = /\b(req\.(query|body|params)|window\.location|document\.location)\b/;
  
  if (userInputPattern.test(callText)) {
    // Check if there's validation (whitelist check, domain validation, etc.)
    // Simplified - would need proper analysis
    return false;
  }
  
  return true;
}

export const noInsecureRedirects = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-redirects',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects open redirect vulnerabilities',
    },
    hasSuggestions: true,
    messages: {
      insecureRedirect: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Open redirect',
        cwe: 'CWE-601',
        description: 'Unvalidated redirect detected - user-controlled URL',
        severity: 'HIGH',
        fix: 'Whitelist allowed domains or validate redirect target',
        documentationLink: 'https://owasp.org/www-community/vulnerabilities/Unvalidated_Redirects_and_Forwards',
      }),
      whitelistDomains: '✅ Whitelist allowed domains: if (allowedDomains.includes(url.hostname)) { redirect(url) }',
      validateRedirect: '✅ Validate redirect: validateRedirectUrl(userInput) before redirect',
      useRelativeUrl: '✅ Use relative URLs for internal redirects',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreInTests: {
            type: 'boolean',
            default: true,
          },
          allowedDomains: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreInTests: true,
      allowedDomains: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const {
ignoreInTests = true 
}: Options = options || {};

    const filename = context.getFilename();
    const isTestFile = ignoreInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode || context.getSourceCode();

    /**
     * Check redirect calls and assignments
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      // Check for res.redirect, window.location, etc.
      if (node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier') {
        const methodName = node.callee.property.name;
        
        if (['redirect', 'replace', 'assign'].includes(methodName)) {
          // Check if redirect URL is validated
          if (!isRedirectValidated(node, sourceCode)) {
            context.report({
              node,
              messageId: 'insecureRedirect',
              suggest: [
                {
                  messageId: 'whitelistDomains',
                  fix: () => null,
                },
                {
                  messageId: 'validateRedirect',
                  fix: () => null,
                },
                {
                  messageId: 'useRelativeUrl',
                  fix: () => null,
                },
              ],
            });
          }
        }
      }
    }

    /**
     * Check assignment expressions like window.location.href = ...
     */
    function checkAssignmentExpression(node: TSESTree.AssignmentExpression) {
      // Check for window.location.href assignments
      if (node.left.type === 'MemberExpression' &&
          node.left.object.type === 'MemberExpression' &&
          node.left.object.object.type === 'Identifier' &&
          node.left.object.object.name === 'window' &&
          node.left.object.property.type === 'Identifier' &&
          node.left.object.property.name === 'location' &&
          node.left.property.type === 'Identifier' &&
          ['href', 'replace', 'assign'].includes(node.left.property.name)) {

        // Check if assignment value comes from user input
        const rightText = sourceCode.getText(node.right);
        const userInputPattern = /\b(req\.(query|body|params)|window\.location|document\.location)\b/;

        if (userInputPattern.test(rightText)) {
          context.report({
            node,
            messageId: 'insecureRedirect',
            suggest: [
              {
                messageId: 'whitelistDomains',
                fix: () => null,
              },
              {
                messageId: 'validateRedirect',
                fix: () => null,
              },
              {
                messageId: 'useRelativeUrl',
                fix: () => null,
              },
            ],
          });
        }
      }
    }

    return {
      CallExpression: checkCallExpression,
      AssignmentExpression: checkAssignmentExpression,
    };
  },
});

