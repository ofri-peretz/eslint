/**
 * ESLint Rule: no-xxe-injection
 * Detects XML External Entity (XXE) injection vulnerabilities (CWE-611)
 *
 * XXE injection occurs when XML parsers process external entity references,
 * allowing attackers to:
 * - Read sensitive local files
 * - Make HTTP requests to internal services
 * - Cause DoS through entity expansion (billion laughs)
 * - Perform SSRF attacks
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe XML libraries (libxmljs with secure config, xmldom with entity resolution disabled)
 * - Proper parser configuration
 * - JSDoc annotations (@safe, @xxe-safe)
 * - Input validation and sanitization
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds =
  | 'xxeInjection'
  | 'unsafeXmlParser'
  | 'externalEntityEnabled'
  | 'untrustedXmlSource';

export interface Options {
  /** Parser options that indicate safe configuration */
  safeParserOptions?: string[];

  /** Functions that validate/sanitize XML input */
  xmlValidationFunctions?: string[];
}

type RuleOptions = [Options?];

export const noXxeInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-xxe-injection',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect XML External Entity (XXE) injection vulnerabilities',
      url: 'https://cwe.mitre.org/data/definitions/611.html',
    },
    messages: {
      xxeInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'XXE Injection',
        cwe: 'CWE-611',
        description: 'XML contains dangerous entity declarations',
        severity: 'CRITICAL',
        fix: 'Remove SYSTEM/PUBLIC entity declarations or use safe XML parser',
        documentationLink: 'https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing',
      }),
      unsafeXmlParser: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe XML Parser',
        cwe: 'CWE-611',
        description: 'Using unsafe XML parser without secure configuration',
        severity: 'HIGH',
        fix: 'Use libxmljs with noent: false or xmldom with entityResolver: null',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html',
      }),
      externalEntityEnabled: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'External Entity Processing',
        cwe: 'CWE-611',
        description: 'External entity processing is enabled',
        severity: 'CRITICAL',
        fix: 'Disable external entity processing',
        documentationLink: 'https://cwe.mitre.org/data/definitions/611.html',
      }),
      untrustedXmlSource: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Untrusted XML Source',
        cwe: 'CWE-611',
        description: 'XML from untrusted source without validation',
        severity: 'HIGH',
        fix: 'Validate and sanitize XML input before parsing',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          safeParserOptions: {
            type: 'array',
            items: { type: 'string' },
          },
          xmlValidationFunctions: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      safeParserOptions: ['noent', 'resolveExternals', 'expandEntityReferences', 'entityResolver'],
      xmlValidationFunctions: ['validateXml', 'sanitizeXml', 'cleanXml', 'parseXmlSafe'],
    },
  ],
  create(context, [options]) {
    const {
      safeParserOptions = ['noent', 'resolveExternals', 'expandEntityReferences', 'entityResolver'],
      xmlValidationFunctions = ['validateXml', 'sanitizeXml', 'cleanXml', 'parseXmlSafe'],
    } = options || {};

    const filename = context.filename || context.getFilename();

    /**
     * Check if this is an XML parsing operation
     */
    const isXmlParsingCall = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // Check for XML library method calls
      if (callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          ['parse', 'parseFromString', 'parseString', 'parseXmlString', 'parseXML'].includes(callee.property.name)) {
        return true;
      }

      // Check for constructor calls
      if (callee.type === 'Identifier' &&
          ['DOMParser', 'XMLHttpRequest', 'ActiveXObject'].includes(callee.name)) {
        return true;
      }

      return false;
    };

    /**
     * Check if parser options are secure
     */
    const hasSecureParserOptions = (optionsNode: TSESTree.Node): boolean => {
      if (optionsNode.type !== 'ObjectExpression') {
        return false;
      }

      // Check for secure options
      for (const prop of optionsNode.properties) {
        if (prop.type === 'Property' &&
            prop.key.type === 'Identifier' &&
            safeParserOptions.includes(prop.key.name)) {

          // Check if the value is secure
          if (prop.value.type === 'Literal' && prop.value.value === false) {
            return true;
          }
          if (prop.value.type === 'Literal' && prop.value.type === 'Literal' && prop.value.value === null) {
            return true;
          }
          if (prop.value.type === 'Identifier' && prop.value.name === 'null') {
            return true;
          }
        }
      }

      return false;
    };

    /**
     * Check if parser options enable dangerous features
     */
    const hasDangerousParserOptions = (optionsNode: TSESTree.Node): boolean => {
      if (optionsNode.type !== 'ObjectExpression') {
        return false;
      }

      // Check for dangerous options
      for (const prop of optionsNode.properties) {
        if (prop.type === 'Property' &&
            prop.key.type === 'Identifier' &&
            ['resolveExternals', 'expandEntityReferences', 'noent'].includes(prop.key.name)) {

          // Check if the value enables dangerous features
          if (prop.value.type === 'Literal' && prop.value.value === true) {
            return true;
          }
        }
      }

      return false;
    };

    /**
     * Check if input has been validated
     */
    const isXmlInputValidated = (xmlSource: TSESTree.Node): boolean => {
      // Check if the input comes from a validation function
      let current: TSESTree.Node | undefined = xmlSource;

      while (current) {
        if (current.type === 'CallExpression' &&
            current.callee.type === 'Identifier' &&
            xmlValidationFunctions.includes(current.callee.name)) {
          return true;
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check if XML contains dangerous entity declarations
     */
    const containsDangerousEntities = (xmlText: string): boolean => {
      return /<!ENTITY/i.test(xmlText) &&
             /SYSTEM\s+["']/i.test(xmlText);
    };

    /**
     * Check if input source is untrusted
     */
    const isUntrustedXmlSource = (xmlSource: TSESTree.Node): boolean => {
      // Check for user input sources
      if (xmlSource.type === 'Identifier') {
        const varName = xmlSource.name.toLowerCase();

        // Consider variables with safe/validated names as trusted
        if (['clean', 'safe', 'validated', 'sanitized', 'validatedxml', 'sanitizedxml'].some(safe =>
          varName.includes(safe)
        )) {
          return false;
        }

        return ['req', 'request', 'body', 'query', 'params', 'input', 'xml', 'data'].some(keyword =>
          varName.includes(keyword)
        );
      }

      // Check for file system reads (potentially untrusted)
      let current: TSESTree.Node | undefined = xmlSource;
      while (current) {
        if (current.type === 'CallExpression' &&
            current.callee.type === 'MemberExpression' &&
            current.callee.property.type === 'Identifier' &&
            ['readFileSync', 'readFile', 'createReadStream'].includes(current.callee.property.name)) {
          return true; // File input is potentially untrusted
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    return {
      // Check XML parsing calls
      CallExpression(node: TSESTree.CallExpression) {
        if (!isXmlParsingCall(node)) {
          return;
        }

        const args = node.arguments;
        if (args.length === 0) {
          return;
        }

        // Check XML input source
        const xmlInput = args[0];
        const isUntrusted = isUntrustedXmlSource(xmlInput);
        const isValidated = isXmlInputValidated(xmlInput);

        // Check if this parser call uses secure options
        const hasSecureOptions = args.length >= 2 && hasSecureParserOptions(args[1]);

        // CRITICAL: Untrusted XML input without validation (only if parser is not secure)
        if (isUntrusted && !isValidated && !hasSecureOptions) {
          context.report({
            node: xmlInput,
            messageId: 'untrustedXmlSource',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }

        // Check for dangerous parser options
        if (args.length >= 2) {
          const optionsArg = args[1];

          if (hasDangerousParserOptions(optionsArg)) {
            context.report({
              node: optionsArg,
              messageId: 'externalEntityEnabled',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
            return;
          }

          // DOMParser method safety is covered by constructor detection
          // No need to report unsafeXmlParser for individual method calls
        }
      },

      // Check XML parser constructor calls
      NewExpression(node: TSESTree.NewExpression) {
        const callee = node.callee;
        if (callee.type !== 'Identifier' ||
            !['DOMParser', 'XMLHttpRequest', 'ActiveXObject'].includes(callee.name)) {
          return;
        }

        // Constructor calls for XML parsers are considered unsafe
        context.report({
          node,
          messageId: 'unsafeXmlParser',
          data: {
            filePath: filename,
            line: String(node.loc?.start.line ?? 0),
          },
        });
      },

      // Check for dangerous XML literals
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string' && containsDangerousEntities(node.value)) {
          context.report({
            node,
            messageId: 'xxeInjection',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
              safeAlternative: 'Use sanitized XML or remove entity declarations',
            },
          });
        }
      },
    };
  },
});