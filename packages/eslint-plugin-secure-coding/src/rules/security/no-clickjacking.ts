/**
 * ESLint Rule: no-clickjacking
 * Detects clickjacking vulnerabilities (CWE-1021)
 *
 * Clickjacking tricks users into clicking on invisible or disguised elements
 * by overlaying them with transparent frames. This rule detects missing
 * protections against clickjacking attacks.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe iframe usage patterns
 * - Trusted frame sources
 * - JSDoc annotations (@trusted-frame, @safe-iframe)
 * - Frame-busting protections
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'clickjackingVulnerability'
  | 'missingFrameBusting'
  | 'unsafeIframeUsage'
  | 'missingXFrameOptions'
  | 'missingCspFrameAncestors'
  | 'transparentFrameOverlay'
  | 'frameManipulation'
  | 'implementFrameBusting'
  | 'useXFrameOptions'
  | 'setCspFrameAncestors'
  | 'strategyFrameProtection'
  | 'strategyContentSecurity'
  | 'strategyUserInteraction';

export interface Options extends SecurityRuleOptions {
  /** Trusted iframe sources */
  trustedSources?: string[];

  /** Require frame-busting code */
  requireFrameBusting?: boolean;

  /** Detect transparent overlays */
  detectTransparentOverlays?: boolean;
}

type RuleOptions = [Options?];

export const noClickjacking = createRule<RuleOptions, MessageIds>({
  name: 'no-clickjacking',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects clickjacking vulnerabilities and missing frame protections',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      clickjackingVulnerability: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Clickjacking Vulnerability',
        cwe: 'CWE-1021',
        description: 'Clickjacking protection missing',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      }),
      missingFrameBusting: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Frame Busting',
        cwe: 'CWE-1021',
        description: 'No frame-busting code to prevent clickjacking',
        severity: 'HIGH',
        fix: 'Add frame-busting JavaScript to prevent framing',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      }),
      unsafeIframeUsage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe iframe Usage',
        cwe: 'CWE-1021',
        description: 'iframe may enable clickjacking attacks',
        severity: 'MEDIUM',
        fix: 'Add X-Frame-Options or CSP frame-ancestors protection',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      }),
      missingXFrameOptions: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing X-Frame-Options',
        cwe: 'CWE-1021',
        description: 'X-Frame-Options header not set',
        severity: 'HIGH',
        fix: 'Set X-Frame-Options: DENY or SAMEORIGIN',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
      }),
      missingCspFrameAncestors: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing CSP frame-ancestors',
        cwe: 'CWE-1021',
        description: 'CSP frame-ancestors directive not configured',
        severity: 'HIGH',
        fix: 'Add frame-ancestors to Content-Security-Policy',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors',
      }),
      transparentFrameOverlay: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Transparent Frame Overlay',
        cwe: 'CWE-1021',
        description: 'Transparent elements may hide clickjacking attacks',
        severity: 'MEDIUM',
        fix: 'Use frame-busting or CSP protections',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      }),
      frameManipulation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Frame Manipulation',
        cwe: 'CWE-1021',
        description: 'Code attempts to manipulate parent frames',
        severity: 'LOW',
        fix: 'Implement proper frame communication or prevent framing',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      }),
      implementFrameBusting: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Implement Frame Busting',
        description: 'Add JavaScript to prevent framing',
        severity: 'LOW',
        fix: 'if (top != self) top.location = location;',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      }),
      useXFrameOptions: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use X-Frame-Options',
        description: 'Set X-Frame-Options HTTP header',
        severity: 'LOW',
        fix: 'X-Frame-Options: DENY',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
      }),
      setCspFrameAncestors: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Set CSP frame-ancestors',
        description: 'Configure CSP frame-ancestors directive',
        severity: 'LOW',
        fix: 'frame-ancestors \'self\' https://trusted.com',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors',
      }),
      strategyFrameProtection: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Frame Protection Strategy',
        description: 'Implement multiple layers of frame protection',
        severity: 'LOW',
        fix: 'Use X-Frame-Options, CSP, and frame-busting together',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      }),
      strategyContentSecurity: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Content Security Strategy',
        description: 'Use CSP for comprehensive frame control',
        severity: 'LOW',
        fix: 'Implement strict CSP with frame-ancestors',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP',
      }),
      strategyUserInteraction: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'User Interaction Strategy',
        description: 'Protect user interactions from framing attacks',
        severity: 'LOW',
        fix: 'Validate user intent for sensitive actions',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          trustedSources: {
            type: 'array',
            items: { type: 'string' },
            default: ['self', 'same-origin'],
          },
          requireFrameBusting: {
            type: 'boolean',
            default: true,
          },
          detectTransparentOverlays: {
            type: 'boolean',
            default: true,
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as frame protectors',
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
      trustedSources: ['self', 'same-origin'],
      requireFrameBusting: true,
      detectTransparentOverlays: true,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      trustedSources = ['self', 'same-origin'],
      requireFrameBusting = true,
      detectTransparentOverlays = true,
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

    // Track if frame-busting code is present
    let hasFrameBusting = false;

    /**
     * Check if source is trusted
     */
    const isTrustedSource = (source: string): boolean => {
      return trustedSources.some(trusted =>
        source.includes(trusted) ||
        (trusted === 'self' && (source === 'self' || source.startsWith('/'))) ||
        (trusted === 'same-origin' && source === 'same-origin')
      );
    };

    /**
     * Check if this is frame-busting code
     */
    const isFrameBustingCode = (node: TSESTree.IfStatement): boolean => {
      const test = node.test;
      const testText = sourceCode.getText(test).toLowerCase();

      // Look for common frame-busting patterns
      return testText.includes('top != self') ||
             testText.includes('top !== self') ||
             testText.includes('window.top !== window.self') ||
             testText.includes('parent != self') ||
             testText.includes('top.location') ||
             testText.includes('self.location');
    };

    /**
     * Check for transparent/invisible elements that could hide clickjacking
     */
    const hasTransparentStyles = (styleText: string): boolean => {
      const styles = styleText.toLowerCase();
      return styles.includes('opacity: 0') ||
             styles.includes('opacity:0') ||
             styles.includes('visibility: hidden') ||
             styles.includes('display: none') ||
             styles.includes('z-index: -1') ||
             styles.includes('position: absolute') && styles.includes('top: 0') && styles.includes('left: 0');
    };

    return {
      // Check for frame-busting code
      IfStatement(node: TSESTree.IfStatement) {
        if (isFrameBustingCode(node)) {
          hasFrameBusting = true;
        }
      },

      // Check iframe elements (in JSX/TSX)
      JSXElement(node: TSESTree.JSXElement) {
        if (node.openingElement.name.type === 'JSXIdentifier' &&
            node.openingElement.name.name === 'iframe') {

          // Check iframe attributes
          const attributes = node.openingElement.attributes;
          let hasSrc = false;
          let srcValue = '';

          for (const attr of attributes) {
            if (attr.type === 'JSXAttribute' &&
                attr.name.type === 'JSXIdentifier' &&
                attr.name.name === 'src' &&
                attr.value) {

              hasSrc = true;
              if (attr.value.type === 'Literal' && typeof attr.value.value === 'string') {
                srcValue = attr.value.value;
              }
            }
          }

          if (hasSrc && srcValue && !isTrustedSource(srcValue)) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: node.openingElement,
              messageId: 'unsafeIframeUsage',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check for frame manipulation code
      MemberExpression(node: TSESTree.MemberExpression) {
        // Look for top.location or window.top manipulation
        if (node.object.type === 'Identifier' &&
            (node.object.name === 'top' || node.object.name === 'window')) {

          if (node.property.type === 'Identifier' &&
              (node.property.name === 'location' || node.property.name === 'top')) {

            // Check if this is being assigned or compared
            let current: TSESTree.Node | undefined = node;
            let isFrameManipulation = false;

            // Walk up to see if this is an assignment or comparison
            while (current && !isFrameManipulation) {
              if (current.type === 'AssignmentExpression' &&
                  current.left === node) {
                isFrameManipulation = true;
                break;
              }
              if (current.type === 'BinaryExpression' &&
                  (current.left === node || current.right === node)) {
                // Comparison like top != self
                const operator = current.operator;
                if (operator === '!=' || operator === '!==' ||
                    operator === '==' || operator === '===') {
                  // This might be frame-busting code
                  break;
                }
                isFrameManipulation = true;
                break;
              }
              current = current.parent as TSESTree.Node;
            }

            if (isFrameManipulation) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node,
                messageId: 'frameManipulation',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      },

      // Check for CSS that could hide clickjacking attacks
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string' && detectTransparentOverlays) {
          // Check if this looks like CSS
          const text = node.value.toLowerCase();

          if ((text.includes('style=') || text.includes('css')) &&
              hasTransparentStyles(text)) {

            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'transparentFrameOverlay',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check template literals for CSS
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        if (detectTransparentOverlays) {
          const text = sourceCode.getText(node).toLowerCase();

          if (text.includes('style') && hasTransparentStyles(text)) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'transparentFrameOverlay',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // At the end of the file, check if frame-busting is required but missing
      'Program:exit'() {
        if (requireFrameBusting && !hasFrameBusting) {
          // Check if this file likely needs frame protection (has UI elements)
          const fileContent = sourceCode.getText();
          const hasUIElements = /\b(button|input|form|a|div)\b/i.test(fileContent) ||
                               fileContent.includes('onClick') ||
                               fileContent.includes('onSubmit');

          if (hasUIElements) {
            context.report({
              node: context.sourceCode.ast,
              messageId: 'missingFrameBusting',
              data: {
                filePath: filename,
                line: '1',
              },
            });
          }
        }
      }
    };
  },
});
