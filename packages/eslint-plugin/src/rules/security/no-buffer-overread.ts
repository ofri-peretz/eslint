/**
 * ESLint Rule: no-buffer-overread
 * Detects buffer access beyond bounds (CWE-126)
 *
 * Buffer overread occurs when reading from buffers beyond their allocated
 * length, potentially leading to information disclosure, crashes, or
 * other security issues.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe buffer access patterns
 * - Bounds checking operations
 * - JSDoc annotations (@safe, @validated)
 * - Input validation functions
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@forge-js/eslint-plugin-utils';

type MessageIds =
  | 'bufferOverread'
  | 'unsafeBufferAccess'
  | 'missingBoundsCheck'
  | 'negativeBufferIndex'
  | 'userControlledBufferIndex'
  | 'unsafeBufferSlice'
  | 'bufferLengthNotChecked'
  | 'useSafeBufferAccess'
  | 'validateBufferIndices'
  | 'checkBufferBounds'
  | 'strategyBoundsChecking'
  | 'strategyInputValidation'
  | 'strategySafeBuffers';

export interface Options extends SecurityRuleOptions {
  /** Buffer methods to check for bounds safety */
  bufferMethods?: string[];

  /** Functions that validate buffer indices */
  boundsCheckFunctions?: string[];

  /** Buffer types to monitor */
  bufferTypes?: string[];
}

type RuleOptions = [Options?];


export const noBufferOverread = createRule<RuleOptions, MessageIds>({
  name: 'no-buffer-overread',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects buffer access beyond bounds',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      bufferOverread: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Buffer Overread',
        cwe: 'CWE-126',
        description: 'Buffer access beyond allocated bounds',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/126.html',
      }),
      unsafeBufferAccess: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Buffer Access',
        cwe: 'CWE-126',
        description: 'Buffer accessed without bounds validation',
        severity: 'HIGH',
        fix: 'Add bounds check before buffer access',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      missingBoundsCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Bounds Check',
        cwe: 'CWE-126',
        description: 'Buffer operation missing bounds validation',
        severity: 'MEDIUM',
        fix: 'Validate indices before buffer operations',
        documentationLink: 'https://cwe.mitre.org/data/definitions/126.html',
      }),
      negativeBufferIndex: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Negative Buffer Index',
        cwe: 'CWE-126',
        description: 'Negative index used for buffer access',
        severity: 'MEDIUM',
        fix: 'Ensure buffer indices are non-negative',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      userControlledBufferIndex: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'User Controlled Buffer Index',
        cwe: 'CWE-126',
        description: 'Buffer accessed with user-controlled index',
        severity: 'HIGH',
        fix: 'Validate user input before using as buffer index',
        documentationLink: 'https://cwe.mitre.org/data/definitions/126.html',
      }),
      unsafeBufferSlice: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Buffer Slice',
        cwe: 'CWE-126',
        description: 'Buffer slice with unvalidated indices',
        severity: 'MEDIUM',
        fix: 'Validate slice start/end indices',
        documentationLink: 'https://nodejs.org/api/buffer.html#bufslicestart-end',
      }),
      bufferLengthNotChecked: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Buffer Length Not Checked',
        cwe: 'CWE-126',
        description: 'Buffer length not validated before access',
        severity: 'MEDIUM',
        fix: 'Check buffer.length before operations',
        documentationLink: 'https://nodejs.org/api/buffer.html#buflength',
      }),
      useSafeBufferAccess: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Safe Buffer Access',
        description: 'Use bounds-checked buffer access methods',
        severity: 'LOW',
        fix: 'Use buffer.read*() with offset validation or safe wrapper functions',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      validateBufferIndices: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Buffer Indices',
        description: 'Validate buffer indices before use',
        severity: 'LOW',
        fix: 'Check 0 <= index < buffer.length',
        documentationLink: 'https://cwe.mitre.org/data/definitions/126.html',
      }),
      checkBufferBounds: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Check Buffer Bounds',
        description: 'Always check buffer bounds',
        severity: 'LOW',
        fix: 'Validate buffer operations against buffer.length',
        documentationLink: 'https://nodejs.org/api/buffer.html#buflength',
      }),
      strategyBoundsChecking: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Bounds Checking Strategy',
        description: 'Implement comprehensive bounds checking',
        severity: 'LOW',
        fix: 'Validate all buffer indices and lengths before operations',
        documentationLink: 'https://cwe.mitre.org/data/definitions/126.html',
      }),
      strategyInputValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Input Validation Strategy',
        description: 'Validate user input used as buffer indices',
        severity: 'LOW',
        fix: 'Sanitize and validate all user input before buffer operations',
        documentationLink: 'https://nodejs.org/api/buffer.html',
      }),
      strategySafeBuffers: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Safe Buffer Strategy',
        description: 'Use safe buffer wrapper libraries',
        severity: 'LOW',
        fix: 'Use libraries that provide bounds-checked buffer operations',
        documentationLink: 'https://www.npmjs.com/package/safe-buffer',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          bufferMethods: {
            type: 'array',
            items: { type: 'string' },
            default: ['readUInt8', 'readUInt16LE', 'readUInt32LE', 'readInt8', 'readInt16LE', 'readInt32LE', 'writeUInt8', 'writeUInt16LE', 'writeUInt32LE', 'slice', 'copy'],
          },
          boundsCheckFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validateIndex', 'checkBounds', 'safeIndex', 'validateBufferIndex'],
          },
          bufferTypes: {
            type: 'array',
            items: { type: 'string' },
            default: ['Buffer', 'Uint8Array', 'ArrayBuffer', 'DataView'],
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as buffer index validators',
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
      bufferMethods: ['readUInt8', 'readUInt16LE', 'readUInt32LE', 'readInt8', 'readInt16LE', 'readInt32LE', 'writeUInt8', 'writeUInt16LE', 'writeUInt32LE', 'slice', 'copy'],
      boundsCheckFunctions: ['validateIndex', 'checkBounds', 'safeIndex', 'validateBufferIndex'],
      bufferTypes: ['Buffer', 'Uint8Array', 'ArrayBuffer', 'DataView'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      bufferMethods = ['readUInt8', 'readUInt16LE', 'readUInt32LE', 'readInt8', 'readInt16LE', 'readInt32LE', 'writeUInt8', 'writeUInt16LE', 'writeUInt32LE', 'slice', 'copy'],
      boundsCheckFunctions = ['validateIndex', 'checkBounds', 'safeIndex', 'validateBufferIndex'],
      bufferTypes = ['Buffer', 'Uint8Array', 'ArrayBuffer', 'DataView'],
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

    // Track buffer variables
    const bufferVars = new Set<string>();

    /**
     * Check if variable is a buffer type
     */
    const isBufferType = (varName: string): boolean => {
      return bufferVars.has(varName) ||
             bufferTypes.some(type => varName.toLowerCase().includes(type.toLowerCase()));
    };

    /**
     * Check if index is user-controlled
     */
    const isUserControlledIndex = (indexNode: TSESTree.Node): boolean => {
      if (indexNode.type === 'Identifier') {
        const varName = indexNode.name.toLowerCase();
        return ['req', 'request', 'query', 'params', 'input', 'user', 'offset', 'index'].some(keyword =>
          varName.includes(keyword)
        );
      }
      return false;
    };

    /**
     * Check if index has been validated
     */
    const isIndexValidated = (indexNode: TSESTree.Node): boolean => {
      // If it's a literal number, check if it's non-negative
      if (indexNode.type === 'Literal' && typeof indexNode.value === 'number') {
        return indexNode.value >= 0;
      }

      // If it's an identifier, check if it comes from a bounds check function
      if (indexNode.type === 'Identifier') {
        let current: TSESTree.Node | undefined = indexNode;

        // Walk up the AST to find where this variable was assigned
        while (current) {
          // Check if we're in a variable declaration
          if (current.type === 'VariableDeclarator' &&
              current.id.type === 'Identifier' &&
              current.id.name === indexNode.name &&
              current.init) {

            const init = current.init;

            // Check if assigned from a bounds check function
            if (init.type === 'CallExpression' &&
                init.callee.type === 'Identifier' &&
                boundsCheckFunctions.includes(init.callee.name)) {
              return true;
            }

            // Check if assigned from Math.min/max with buffer.length
            if (init.type === 'CallExpression' &&
                init.callee.type === 'MemberExpression' &&
                init.callee.object.type === 'Identifier' &&
                init.callee.object.name === 'Math' &&
                init.callee.property.type === 'Identifier' &&
                (init.callee.property.name === 'min' || init.callee.property.name === 'max')) {
              return true;
            }

            break;
          }

          // Check if it's a parameter in a function - assume validated if it's a function param
          if (current.type === 'FunctionDeclaration' ||
              current.type === 'FunctionExpression' ||
              current.type === 'ArrowFunctionExpression') {
            const params = current.params;
            for (const param of params) {
              if (param.type === 'Identifier' && param.name === indexNode.name) {
                return true; // Function parameters are assumed validated
              }
            }
          }

          current = current.parent as TSESTree.Node;
        }
      }

      // Check if it's a call to a bounds check function directly
      if (indexNode.type === 'CallExpression' &&
          indexNode.callee.type === 'Identifier' &&
          boundsCheckFunctions.includes(indexNode.callee.name)) {
        return true;
      }

      return false;
    };

    /**
     * Check if there's a bounds check in the current scope
     */
    const hasBoundsCheck = (bufferName: string, indexNode: TSESTree.Node): boolean => {
      // Look for bounds checks in the current function scope
      let current: TSESTree.Node | undefined = indexNode;

      while (current) {
        // Check if we're in a function
        if (current.type === 'FunctionDeclaration' ||
            current.type === 'FunctionExpression' ||
            current.type === 'ArrowFunctionExpression') {
          break;
        }

        // Look for if statements that check bounds
        if (current.type === 'IfStatement') {
          const condition = current.test;
          const conditionText = sourceCode.getText(condition).toLowerCase();

          // Check for bounds checking patterns
          if (conditionText.includes(`${bufferName}.length`) &&
              (conditionText.includes('<') || conditionText.includes('<=') ||
               conditionText.includes('>') || conditionText.includes('>=') ||
               conditionText.includes('&&') || conditionText.includes('||'))) {
            return true;
          }
        }

        // Look for variable declarations that might be bounds checks
        if (current.type === 'VariableDeclaration') {
          for (const declarator of current.declarations) {
            if (declarator.init) {
              const initText = sourceCode.getText(declarator.init).toLowerCase();
              if (initText.includes(`${bufferName}.length`) &&
                  (initText.includes('math.min') || initText.includes('math.max') ||
                   initText.includes('mathmin') || initText.includes('mathmax'))) {
                return true;
              }
            }
          }
        }

        // Look for return statements or early returns that might indicate bounds checking
        if (current.type === 'ReturnStatement' && current.argument) {
          const returnText = sourceCode.getText(current.argument).toLowerCase();
          if (returnText.includes(`${bufferName}.length`)) {
            return true;
          }
        }

        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check if index could be negative
     */
    const couldBeNegative = (indexNode: TSESTree.Node): boolean => {
      // Check for literal negative numbers
      // Check for literal negative numbers
      if (indexNode.type === 'Literal' && typeof indexNode.value === 'number') {
        return indexNode.value < 0;
      }

      // Check for unary minus expressions like -1, -10, etc.
      if (indexNode.type === 'UnaryExpression' &&
          indexNode.operator === '-' &&
          indexNode.argument.type === 'Literal' &&
          typeof indexNode.argument.value === 'number') {
        return true; // -N is always negative for positive N
      }

      // Check for binary expressions that could be negative like userInput - 10
      if (indexNode.type === 'BinaryExpression' && indexNode.operator === '-') {
        // userInput - 10 could be negative, we can't be sure statically
        return true; // Conservative: assume it could be negative
      }

      // For variables, we can't be sure, but we can check for obvious patterns
      if (indexNode.type === 'Identifier') {
        // Check if this variable is assigned a negative value somewhere
        // This is a simplified check - in practice we'd need more sophisticated analysis
        let current: TSESTree.Node | undefined = indexNode;

        while (current) {
          if (current.type === 'VariableDeclarator' && current.init) {
            if (current.init.type === 'Literal' &&
                typeof current.init.value === 'number' &&
                current.init.value < 0) {
              return true;
            }
            // Check for unary minus assignments
            if (current.init.type === 'UnaryExpression' &&
                current.init.operator === '-' &&
                current.init.argument.type === 'Literal' &&
                typeof current.init.argument.value === 'number') {
              return true;
            }
          }
          current = current.parent as TSESTree.Node;
        }
      }

      return false;
    };

    return {
      // Track buffer variable declarations
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type === 'Identifier' && node.init) {
          const varName = node.id.name;

          // Check if assigned a buffer type
          if (node.init.type === 'NewExpression' &&
              node.init.callee.type === 'Identifier' &&
              bufferTypes.includes(node.init.callee.name)) {
            bufferVars.add(varName);
          }

          // Check if assigned a buffer method result
          if (node.init.type === 'CallExpression') {
            const callee = node.init.callee;
            if (callee.type === 'MemberExpression' &&
                callee.property.type === 'Identifier' &&
                bufferMethods.includes(callee.property.name)) {
              bufferVars.add(varName);
            }
          }

          // Check variable name patterns
          if (bufferTypes.some(type => varName.toLowerCase().includes(type.toLowerCase()))) {
            bufferVars.add(varName);
          }
        }
      },

      // Check member expressions (buffer[index], buffer.method())
      MemberExpression(node: TSESTree.MemberExpression) {
        // Check for buffer[index] access
        if (node.computed && node.object.type === 'Identifier') {
          const bufferName = node.object.name;
          const indexNode = node.property;

          if (isBufferType(bufferName)) {
            // Check for negative indices
            if (couldBeNegative(indexNode)) {
              context.report({
                node,
                messageId: 'negativeBufferIndex',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
              return;
            }

            // Check for user-controlled indices without validation
            if (isUserControlledIndex(indexNode) && !isIndexValidated(indexNode)) {
              // Check if there's a bounds check in scope
              if (!hasBoundsCheck(bufferName, indexNode)) {
                // FALSE POSITIVE REDUCTION
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                context.report({
                  node,
                  messageId: 'userControlledBufferIndex',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
                return;
              }
            }

            // Check if there's any bounds validation
            if (!hasBoundsCheck(bufferName, indexNode) && !isIndexValidated(indexNode)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              context.report({
                node,
                messageId: 'unsafeBufferAccess',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for buffer method calls that need bounds checking
        if (node.property.type === 'Identifier' &&
            bufferMethods.includes(node.property.name) &&
            node.object.type === 'Identifier' &&
            isBufferType(node.object.name)) {

          // This is a parent of a CallExpression, we'll check it there
        }
      },

      // Check buffer method calls
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for buffer.slice() calls
        if (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'slice' &&
            callee.object.type === 'Identifier' &&
            isBufferType(callee.object.name)) {

          const args = node.arguments;

          // Check slice arguments
          for (const arg of args) {
            if (isUserControlledIndex(arg) && !isIndexValidated(arg)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                continue;
              }

              context.report({
                node: arg,
                messageId: 'unsafeBufferSlice',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }

        // Check for buffer read/write methods
        if (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            bufferMethods.includes(callee.property.name) &&
            callee.object.type === 'Identifier' &&
            isBufferType(callee.object.name)) {

          const args = node.arguments;

          // Check offset/length arguments
          for (const arg of args) {
            if (isUserControlledIndex(arg) && !isIndexValidated(arg)) {
              // FALSE POSITIVE REDUCTION
              if (safetyChecker.isSafe(node, context)) {
                continue;
              }

              context.report({
                node: arg,
                messageId: 'missingBoundsCheck',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      },

      // Check binary expressions that might involve buffer operations
      BinaryExpression(node: TSESTree.BinaryExpression) {
        // Look for patterns like buffer.length - something that might indicate bounds checking
        const leftText = sourceCode.getText(node.left);
        const rightText = sourceCode.getText(node.right);

        if (leftText.includes('.length') || rightText.includes('.length')) {
          // This might be a bounds check - we could analyze this further
        }
      }
    };
  },
});
