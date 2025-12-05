/**
 * ESLint Rule: no-unsafe-deserialization
 * Detects unsafe deserialization of untrusted data (CWE-502)
 *
 * Unsafe deserialization occurs when untrusted data is deserialized in a way that
 * allows attackers to execute arbitrary code or manipulate application logic.
 * This includes:
 * - Using dangerous deserialization libraries
 * - eval() or Function() on untrusted data
 * - YAML/XML parsers that can execute code
 * - Unsafe use of serialization libraries
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe deserialization patterns
 * - Input validation and sanitization
 * - JSDoc annotations (@safe, @validated)
 * - Trusted deserialization libraries
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'unsafeDeserialization'
  | 'dangerousEvalUsage'
  | 'unsafeYamlParsing'
  | 'dangerousFunctionConstructor'
  | 'untrustedDeserializationInput'
  | 'useSafeDeserializer'
  | 'validateBeforeDeserialization'
  | 'avoidEval'
  | 'strategySafeLibraries'
  | 'strategyInputValidation'
  | 'strategySandboxing';

export interface Options extends SecurityRuleOptions {
  /** Dangerous deserialization functions to detect */
  dangerousFunctions?: string[];

  /** Safe deserialization libraries */
  safeLibraries?: string[];

  /** Functions that validate input before deserialization */
  validationFunctions?: string[];
}

type RuleOptions = [Options?];

export const noUnsafeDeserialization = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-deserialization',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects unsafe deserialization of untrusted data',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      unsafeDeserialization: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Deserialization',
        cwe: 'CWE-502',
        description: 'Unsafe deserialization of untrusted data detected',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/502.html',
      }),
      dangerousEvalUsage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous eval() Usage',
        cwe: 'CWE-502',
        description: 'eval() used for deserialization (code execution vulnerability)',
        severity: 'CRITICAL',
        fix: 'Use JSON.parse() or safe deserialization libraries',
        documentationLink: 'https://cwe.mitre.org/data/definitions/502.html',
      }),
      unsafeYamlParsing: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe YAML Parsing',
        cwe: 'CWE-502',
        description: 'YAML parsing may execute code during deserialization',
        severity: 'HIGH',
        fix: 'Use yaml.safeLoad() or disable code execution',
        documentationLink: 'https://www.npmjs.com/package/js-yaml#loadstr---options-',
      }),
      dangerousFunctionConstructor: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous Function Constructor',
        cwe: 'CWE-502',
        description: 'Function constructor used with untrusted data',
        severity: 'CRITICAL',
        fix: 'Avoid Function constructor with user input',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function',
      }),
      untrustedDeserializationInput: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Untrusted Deserialization Input',
        cwe: 'CWE-502',
        description: 'Deserializing untrusted input without validation',
        severity: 'HIGH',
        fix: 'Validate and sanitize input before deserialization',
        documentationLink: 'https://cwe.mitre.org/data/definitions/502.html',
      }),
      useSafeDeserializer: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Safe Deserializer',
        description: 'Use safe deserialization libraries',
        severity: 'LOW',
        fix: 'Use JSON.parse, safe-json-parse, or validated libraries',
        documentationLink: 'https://www.npmjs.com/package/safe-json-parse',
      }),
      validateBeforeDeserialization: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Before Deserialization',
        description: 'Validate input before deserialization',
        severity: 'LOW',
        fix: 'Implement input validation and length limits',
        documentationLink: 'https://cwe.mitre.org/data/definitions/502.html',
      }),
      avoidEval: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Avoid eval()',
        description: 'Never use eval() for deserialization',
        severity: 'LOW',
        fix: 'Use JSON.parse() for data, vm.Script for code when absolutely necessary',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval',
      }),
      strategySafeLibraries: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Safe Libraries Strategy',
        description: 'Use deserialization libraries with built-in safety',
        severity: 'LOW',
        fix: 'Use JSON.parse, js-yaml.safeLoad, or protobuf libraries',
        documentationLink: 'https://www.npmjs.com/package/js-yaml',
      }),
      strategyInputValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Input Validation Strategy',
        description: 'Validate input before any deserialization',
        severity: 'LOW',
        fix: 'Implement schema validation and length limits',
        documentationLink: 'https://cwe.mitre.org/data/definitions/502.html',
      }),
      strategySandboxing: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Sandboxing Strategy',
        description: 'Execute deserialization in sandboxed environment',
        severity: 'LOW',
        fix: 'Use vm module or worker threads for untrusted deserialization',
        documentationLink: 'https://nodejs.org/api/vm.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          dangerousFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['eval', 'Function', 'setTimeout', 'setInterval', 'unserialize', 'deserialize', 'parseUnsafe'],
          },
          safeLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: ['JSON', 'safe-json-parse', 'js-yaml.safeLoad', 'protobuf', 'msgpack'],
          },
          validationFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validateInput', 'sanitizeData', 'checkSchema', 'validateSchema'],
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as safe deserializers',
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
      dangerousFunctions: ['eval', 'Function', 'setTimeout', 'setInterval', 'unserialize', 'deserialize', 'parseUnsafe'],
      safeLibraries: ['JSON', 'safe-json-parse', 'js-yaml.safeLoad', 'protobuf', 'msgpack'],
      validationFunctions: ['validateInput', 'sanitizeData', 'checkSchema', 'validateSchema'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      dangerousFunctions = ['eval', 'Function', 'setTimeout', 'setInterval', 'unserialize', 'deserialize', 'parseUnsafe'],
      validationFunctions = ['validateInput', 'sanitizeData', 'checkSchema', 'validateSchema'],
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

    // Track variables that have been validated/sanitized
    const validatedVariables = new Set<string>();
    // Track variables that contain untrusted data
    const untrustedVariables = new Set<string>();

    /**
     * Check if this is a dangerous deserialization function
     */
    const isDangerousDeserialization = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // Check for dangerous function calls
      if (callee.type === 'Identifier' && dangerousFunctions.includes(callee.name)) {
        return true;
      }

      // Check for member expressions like yaml.load, serialize.unserialize
      if (callee.type === 'MemberExpression') {
        const memberName = callee.property.type === 'Identifier' ? callee.property.name : '';
        const objectName = callee.object.type === 'Identifier' ? callee.object.name : '';

        // Check dangerous methods
        if (dangerousFunctions.includes(memberName)) {
          return true;
        }

        // Check dangerous libraries
        if (['yaml', 'js-yaml', 'node-serialize', 'serialize-javascript'].includes(objectName.toLowerCase()) &&
            ['load', 'parse', 'unserialize', 'deserialize'].includes(memberName)) {
          return true;
        }
      }

      // Check for require() calls with dangerous libraries
      if (callee.type === 'Identifier' && callee.name === 'require') {
        const args = node.arguments;
        if (args.length > 0 && args[0].type === 'Literal' && typeof args[0].value === 'string') {
          const moduleName = args[0].value.toLowerCase();
          if (['node-serialize', 'serialize-javascript', 'yaml', 'js-yaml'].includes(moduleName)) {
            return true;
          }
        }
      }

      return false;
    };

    /**
     * Check if input comes from untrusted source
     */
    const isUntrustedInput = (inputNode: TSESTree.Node): boolean => {
      // Check for MemberExpression patterns like req.body, req.query, etc.
      if (inputNode.type === 'MemberExpression') {
        if (inputNode.object.type === 'Identifier' && inputNode.object.name === 'req') {
          return true;
        }
        if (inputNode.object.type === 'MemberExpression' &&
            inputNode.object.object.type === 'Identifier' &&
            inputNode.object.object.name === 'req') {
          return true;
        }
      }

      if (inputNode.type === 'Identifier') {
        // Check if this variable has been marked as untrusted
        if (untrustedVariables.has(inputNode.name)) {
          return true;
        }

        // Only consider variables untrusted if they actually come from req.* patterns
        // Don't flag generic variable names like 'input', 'data', etc.
        // unless they have been explicitly marked as untrusted

        // Check if it comes from function parameters (these are potentially untrusted)
        let current: TSESTree.Node | undefined = inputNode;
        while (current) {
          if (current.type === 'FunctionDeclaration' ||
              current.type === 'FunctionExpression' ||
              current.type === 'ArrowFunctionExpression') {
            const func = current as TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression;
            if (func.params.some(param => {
              if (param.type === 'Identifier') {
                return param.name === inputNode.name;
              }
              return false;
            })) {
              return true; // Function parameters are untrusted
            }
          }
          current = current.parent as TSESTree.Node;
        }
      }

      return false;
    };

    /**
     * Check if input has been validated
     */
    const isInputValidated = (inputNode: TSESTree.Node): boolean => {
      let current: TSESTree.Node | undefined = inputNode;

      while (current) {
        if (current.type === 'CallExpression' &&
            current.callee.type === 'Identifier' &&
            validationFunctions.includes(current.callee.name)) {
          return true;
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check if this is a safe deserialization library
     */
    const isSafeLibrary = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      if (callee.type === 'MemberExpression') {
        const objectName = callee.object.type === 'Identifier' ? callee.object.name : '';
        const memberName = callee.property.type === 'Identifier' ? callee.property.name : '';

        // Check for safe patterns
        if (objectName === 'JSON' && memberName === 'parse') {
          return true;
        }
        if (objectName === 'yaml' && memberName === 'safeLoad') {
          return true;
        }
        if (objectName === 'js-yaml' && memberName === 'safeLoad') {
          return true;
        }
      }

      return false;
    };

    return {
      // Track variable assignments from untrusted sources
      VariableDeclaration(node: TSESTree.VariableDeclaration) {
        for (const declarator of node.declarations) {
          if (declarator.id.type === 'Identifier' && declarator.init) {
            // Check if the initializer comes from an untrusted source
            if (isUntrustedInput(declarator.init)) {
              untrustedVariables.add(declarator.id.name);
            }

            // Check if it's assigned from fs operations or other untrusted sources
            if (declarator.init.type === 'CallExpression') {
              const callee = declarator.init.callee;
              if (callee.type === 'MemberExpression' &&
                  callee.object.type === 'Identifier' &&
                  callee.object.name === 'fs' &&
                  callee.property.type === 'Identifier' &&
                  ['readFile', 'readFileSync'].includes(callee.property.name)) {
                untrustedVariables.add(declarator.id.name);
              }
            }
          }
        }
      },

      // Track assignment expressions
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type === 'Identifier' && isUntrustedInput(node.right)) {
          untrustedVariables.add(node.left.name);
        }
      },

      // Check dangerous function calls
      CallExpression(node: TSESTree.CallExpression) {
        if (isDangerousDeserialization(node)) {
          const args = node.arguments;
          const hasUntrustedInput = args.some(arg => isUntrustedInput(arg));

          if (hasUntrustedInput) {
            // Check for specific dangerous patterns
            const callee = node.callee;
            const calleeText = sourceCode.getText(callee);

            if (calleeText === 'eval') {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node,
                messageId: 'dangerousEvalUsage',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
                suggest: [
                  {
                    messageId: 'useSafeDeserializer',
                    fix: (fixer) => {
                      // Suggest replacing eval with JSON.parse
                      return fixer.replaceText(node, `JSON.parse(${sourceCode.getText(node.arguments[0])})`);
                    }
                  },
                ],
              });
            } else if (calleeText === 'Function') {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node,
                messageId: 'dangerousFunctionConstructor',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            } else if (calleeText.includes('yaml') || calleeText.includes('YAML')) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node,
                messageId: 'unsafeYamlParsing',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            } else {
              // Generic unsafe deserialization
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node,
                messageId: 'unsafeDeserialization',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                  severity: 'HIGH',
                  safeAlternative: 'Use JSON.parse() or validated safe deserialization libraries',
                },
              });
            }
          }
        }

        // Check for untrusted input in potentially safe functions
        if (isSafeLibrary(node)) {
          const args = node.arguments;
          const hasUntrustedInput = args.some(arg => {
            // Check if it's validated
            if (arg.type === 'Identifier' && validatedVariables.has(arg.name)) {
              return false;
            }
            return isUntrustedInput(arg) && !isInputValidated(arg);
          });

          if (hasUntrustedInput) {
            // Even JSON.parse can be unsafe if used on complex objects that get eval'd later
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'untrustedDeserializationInput',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
              suggest: [
                {
                  messageId: 'validateBeforeDeserialization',
                  fix: () => null
                },
              ],
            });
          }
        }
      },

      // Check for dangerous require/import patterns
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init) {
          return;
        }

        // Track variables assigned from validation functions
        if (node.id.type === 'Identifier' &&
            node.init.type === 'CallExpression' &&
            node.init.callee.type === 'Identifier' &&
            (validationFunctions.includes(node.init.callee.name) || trustedSanitizers.includes(node.init.callee.name))) {
          validatedVariables.add(node.id.name);
        }

        // Check for require/import of dangerous libraries
        if (node.init.type === 'CallExpression' &&
            node.init.callee.type === 'Identifier' &&
            node.init.callee.name === 'require') {

          const requireArg = node.init.arguments[0];
          if (requireArg?.type === 'Literal' && typeof requireArg.value === 'string') {
            const moduleName = requireArg.value;

            if (['node-serialize', 'serialize-javascript', 'js-yaml', 'yaml'].includes(moduleName)) {
              // Check if this variable is used unsafely later
              if (node.id.type === 'Identifier') {
                const varName = node.id.name;

                // Look ahead to see if this library is used dangerously
                // This is a simplified check - in practice, we'd need more sophisticated analysis
                let current: TSESTree.Node | undefined = node.parent;
                while (current) {
                  if (current.type === 'CallExpression') {
                    const callee = current.callee;
                    if (callee.type === 'MemberExpression' &&
                        callee.object.type === 'Identifier' &&
                        callee.object.name === varName &&
                        ['unserialize', 'deserialize', 'load', 'parse'].includes(
                          callee.property.type === 'Identifier' ? callee.property.name : ''
                        )) {
                      // FALSE POSITIVE REDUCTION
                      if (safetyChecker.isSafe(current, context)) {
                        break;
                      }

                      context.report({
                        node: current,
                        messageId: 'unsafeDeserialization',
                        data: {
                          filePath: filename,
                          line: String(node.loc?.start.line ?? 0),
                          severity: 'CRITICAL',
                          safeAlternative: 'Avoid using this library or use safe alternatives',
                        },
                      });
                      break;
                    }
                  }
                  current = current.parent as TSESTree.Node;
                }
              }
            }
          }
        }
      }
    };
  },
});
