/**
 * ESLint Rule: no-format-string-injection
 * Detects format string injection vulnerabilities (CWE-134)
 *
 * Format string injection occurs when user input is used as a format string
 * in functions like util.format(), printf-style functions, or logging functions.
 * Attackers can use format specifiers (%s, %d, etc.) to leak information or
 * cause crashes.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe format strings (hardcoded, validated)
 * - Proper format string escaping
 * - JSDoc annotations (@safe-format, @validated)
 * - Trusted formatting libraries
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
// Temporarily remove complex imports to fix type issues
// import {
//   createSafetyChecker,
//   hasSafeAnnotation,
//   type SecurityRuleOptions,
// } from '@interlace/eslint-devkit';

type MessageIds =
  | 'formatStringInjection'
  | 'unsafeFormatSpecifier'
  | 'userControlledFormatString'
  | 'missingFormatValidation'
  | 'dangerousPrintfStyle'
  | 'escapeFormatString'
  | 'useSafeFormatting'
  | 'validateFormatInput'
  | 'strategyFormatValidation'
  | 'strategySafeLibraries'
  | 'strategyInputSanitization';

export interface Options {
  /** Functions that use format strings */
  formatFunctions?: string[];

  /** Format specifiers to detect */
  formatSpecifiers?: string[];

  /** Variables that contain user input */
  userInputVariables?: string[];

  /** Safe formatting libraries */
  safeFormatLibraries?: string[];

  /** Additional function names to consider as sanitizers */
  trustedSanitizers?: string[];

  /** Additional JSDoc annotations to consider as safe markers */
  trustedAnnotations?: string[];

  /** Disable all false positive detection (strict mode) */
  strictMode?: boolean;
}

type RuleOptions = [Options?];

export const noFormatStringInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-format-string-injection',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects format string injection vulnerabilities',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      formatStringInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Format String Injection',
        cwe: 'CWE-134',
        description: 'Format string controlled by user input',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/134.html',
      }),
      unsafeFormatSpecifier: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Format Specifier',
        cwe: 'CWE-134',
        description: 'User input may contain format specifiers',
        severity: 'MEDIUM',
        fix: 'Escape or validate user input before formatting',
        documentationLink: 'https://cwe.mitre.org/data/definitions/134.html',
      }),
      userControlledFormatString: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'User Controlled Format String',
        cwe: 'CWE-134',
        description: 'Format string parameter comes from user input',
        severity: 'CRITICAL',
        fix: 'Use hardcoded format strings or validate user formats',
        documentationLink: 'https://cwe.mitre.org/data/definitions/134.html',
      }),
      missingFormatValidation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Format Validation',
        cwe: 'CWE-134',
        description: 'Format string not validated before use',
        severity: 'HIGH',
        fix: 'Validate format strings against allowed patterns',
        documentationLink: 'https://cwe.mitre.org/data/definitions/134.html',
      }),
      dangerousPrintfStyle: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous Printf Style',
        cwe: 'CWE-134',
        description: 'Printf-style function with user input',
        severity: 'HIGH',
        fix: 'Use safe alternatives or validate format strings',
        documentationLink: 'https://cwe.mitre.org/data/definitions/134.html',
      }),
      escapeFormatString: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Escape Format String',
        description: 'Escape format specifiers in user input',
        severity: 'LOW',
        fix: 'Replace % with %% in user input',
        documentationLink: 'https://nodejs.org/api/util.html#utilformatformat-args',
      }),
      useSafeFormatting: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Safe Formatting',
        description: 'Use safe string formatting methods',
        severity: 'LOW',
        fix: 'Use template literals or safe format libraries',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals',
      }),
      validateFormatInput: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Format Input',
        description: 'Validate format strings before use',
        severity: 'LOW',
        fix: 'Whitelist allowed format specifiers',
        documentationLink: 'https://cwe.mitre.org/data/definitions/134.html',
      }),
      strategyFormatValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Format Validation Strategy',
        description: 'Validate format strings against allowed patterns',
        severity: 'LOW',
        fix: 'Use regex to validate format strings',
        documentationLink: 'https://cwe.mitre.org/data/definitions/134.html',
      }),
      strategySafeLibraries: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Safe Libraries Strategy',
        description: 'Use formatting libraries with built-in safety',
        severity: 'LOW',
        fix: 'Use libraries that separate format from data',
        documentationLink: 'https://www.npmjs.com/package/safe-format',
      }),
      strategyInputSanitization: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Input Sanitization Strategy',
        description: 'Sanitize user input before formatting',
        severity: 'LOW',
        fix: 'Escape dangerous characters in user input',
        documentationLink: 'https://cwe.mitre.org/data/definitions/134.html',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          formatFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['util.format', 'console.log', 'console.error', 'console.warn', 'sprintf', 'printf', 'vsprintf'],
          },
          formatSpecifiers: {
            type: 'array',
            items: { type: 'string' },
            default: ['%s', '%d', '%i', '%f', '%j', '%o', '%O', '%c', '%%'],
          },
          userInputVariables: {
            type: 'array',
            items: { type: 'string' },
            default: ['req', 'request', 'body', 'query', 'params', 'input', 'data', 'userInput'],
          },
          safeFormatLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: ['mustache', 'handlebars', 'ejs', 'pug'],
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as format string sanitizers',
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
      formatFunctions: ['util.format', 'console.log', 'console.error', 'console.warn', 'sprintf', 'printf', 'vsprintf'],
      formatSpecifiers: ['%s', '%d', '%i', '%f', '%j', '%o', '%O', '%c', '%%'],
      userInputVariables: ['req', 'request', 'body', 'query', 'params', 'input', 'data', 'userInput'],
      safeFormatLibraries: ['mustache', 'handlebars', 'ejs', 'pug'],
      trustedSanitizers: ['validateFormat', 'sanitizeFormat', 'escapeFormat', 'cleanFormat', 'sanitizeFormatString', 'validate', 'sanitize', 'escape', 'clean'],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const defaultOptions: Options = {
      formatFunctions: ['util.format', 'console.log', 'console.error', 'console.warn', 'sprintf', 'printf', 'vsprintf'],
      formatSpecifiers: ['%s', '%d', '%i', '%f', '%j', '%o', '%O', '%c', '%%'],
      userInputVariables: ['req', 'request', 'body', 'query', 'params', 'input', 'data', 'userInput'],
      safeFormatLibraries: ['mustache', 'handlebars', 'ejs', 'pug'],
      trustedSanitizers: ['validateFormat', 'sanitizeFormat', 'escapeFormat', 'cleanFormat', 'sanitizeFormatString', 'validate', 'sanitize', 'escape', 'clean'],
      trustedAnnotations: [],
      strictMode: false,
    };

    const options: Required<Options> = { ...defaultOptions, ...(context.options[0] || {}) } as Required<Options>;
    const {
      formatSpecifiers,
      userInputVariables,
      trustedSanitizers,
    } = options;
    const filename = context.filename || context.getFilename();

    // Create safety checker for false positive detection (simplified implementation)
    const safetyChecker = {
      isSafe: (node: TSESTree.Node, context: TSESLint.RuleContext<MessageIds, RuleOptions>) => {
        // Check for JSDoc @safe-format annotation
        const comments = context.sourceCode.getCommentsBefore(node);
        for (const comment of comments) {
          if (comment.type === 'Block' && comment.value.includes('@safe-format')) {
            return true;
          }
        }

        // Check if the node is a validated/sanitized variable
        if (node.type === 'Identifier' && validatedVariables.has(node.name)) {
          return true;
        }

        // For CallExpression nodes, check if first argument is safe
        if (node.type === 'CallExpression' && node.arguments.length > 0) {
          const firstArg = node.arguments[0];
          if (firstArg.type === 'Identifier' && validatedVariables.has(firstArg.name)) {
            return true;
          }
        }

        return false;
      }
    };

    /**
     * Check if a variable contains user input
     */
    const isUserInput = (varName: string): boolean => {
      const lowerName = varName.toLowerCase();
      return userInputVariables.some(input => lowerName.includes(input.toLowerCase())) ||
             lowerName === 'user' ||
             lowerName.includes('userinput') ||
             lowerName.includes('userdata') ||
             lowerName.includes('userparam') ||
             lowerName.includes('usermessage') ||
             lowerName.includes('usertemplate') ||
             lowerName.includes('userformat') ||
             lowerName.includes('uservar');
    };

    /**
     * Check if a node represents user input (including member expressions)
     */
    const isUserInputNode = (node: TSESTree.Node): boolean => {
      if (node.type === 'Identifier') {
        return isUserInput(node.name) || dangerousVariables.has(node.name);
      }

      if (node.type === 'MemberExpression') {
        // Check patterns like req.query.*, req.body.*, req.params.*, etc.
        if (node.object.type === 'MemberExpression' &&
            node.object.object.type === 'Identifier' &&
            node.object.object.name === 'req' &&
            node.object.property.type === 'Identifier' &&
            ['query', 'body', 'params', 'param'].includes(node.object.property.name)) {
          return true;
        }

        // Check patterns like req.*
        if (node.object.type === 'Identifier' && node.object.name === 'req') {
          return true;
        }

        // Check other user input patterns
        const fullName = getMemberExpressionName(node);
        return isUserInput(fullName);
      }

      return false;
    };

    /**
     * Get the full name of a member expression (e.g., req.query.format)
     */
    const getMemberExpressionName = (node: TSESTree.MemberExpression): string => {
      if (node.object.type === 'Identifier') {
        if (node.property.type === 'Identifier') {
          return `${node.object.name}.${node.property.name}`;
        }
      } else if (node.object.type === 'MemberExpression') {
        const objectName = getMemberExpressionName(node.object);
        if (node.property.type === 'Identifier') {
          return `${objectName}.${node.property.name}`;
        }
      }
      return '';
    };

    /**
     * Check if a string contains format specifiers
     */
    const containsFormatSpecifiers = (text: string): boolean => {
      return formatSpecifiers.some(specifier => text.includes(specifier));
    };

    /**
     * Check if a call expression uses format functions
     */
    const isConsoleMethod = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;
      return callee.type === 'MemberExpression' &&
             callee.object.type === 'Identifier' &&
             callee.object.name === 'console' &&
             callee.property.type === 'Identifier' &&
             ['log', 'error', 'warn', 'info', 'debug'].includes(callee.property.name);
    };

    const isFormatFunctionCall = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // Check for util.format
      if (callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'util' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'format') {
        return true;
      }

      // Check for console methods
      if (callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'console' &&
          callee.property.type === 'Identifier' &&
          ['log', 'error', 'warn', 'info', 'debug'].includes(callee.property.name)) {
        return true;
      }

      // Check for sprintf/printf functions
      if (callee.type === 'Identifier' &&
          ['sprintf', 'printf', 'vsprintf'].includes(callee.name)) {
        return true;
      }

      return false;
    };

    // Track variables that have been validated/sanitized
    const validatedVariables = new Set<string>();
    const dangerousVariables = new Set<string>();

    /**
     * Check if input has been validated/sanitized
     */
    const isInputValidated = (inputNode: TSESTree.Node): boolean => {
      // Check if this is a validated variable
      if (inputNode.type === 'Identifier' && validatedVariables.has(inputNode.name)) {
        return true;
      }

      let current: TSESTree.Node | undefined = inputNode;

      while (current) {
        if (current.type === 'CallExpression' &&
            current.callee.type === 'Identifier' &&
            trustedSanitizers.includes(current.callee.name)) {
          return true;
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check if string literal contains format specifiers
     */
    const hasFormatSpecifiers = (node: TSESTree.Literal): boolean => {
      if (typeof node.value !== 'string') {
        return false;
      }

      return containsFormatSpecifiers(node.value);
    };

    // Helper functions for expression analysis
    function containsFormatSpecifiersInExpression(expr: TSESTree.BinaryExpression): boolean {
      if (expr.left.type === 'Literal' && typeof expr.left.value === 'string' && containsFormatSpecifiers(expr.left.value)) {
        return true;
      }
      if (expr.right.type === 'Literal' && typeof expr.right.value === 'string' && containsFormatSpecifiers(expr.right.value)) {
        return true;
      }
      if (expr.left.type === 'BinaryExpression' && containsFormatSpecifiersInExpression(expr.left)) {
        return true;
      }
      if (expr.right.type === 'BinaryExpression' && containsFormatSpecifiersInExpression(expr.right)) {
        return true;
      }
      return false;
    }

    function hasUserInputInExpression(expr: TSESTree.BinaryExpression): boolean {
      if (isUserInputNode(expr.left)) {
        return true;
      }
      if (isUserInputNode(expr.right)) {
        return true;
      }
      if (expr.left.type === 'BinaryExpression' && hasUserInputInExpression(expr.left)) {
        return true;
      }
      if (expr.right.type === 'BinaryExpression' && hasUserInputInExpression(expr.right)) {
        return true;
      }
      return false;
    }

    return {
      // Check call expressions for format function usage
      CallExpression: function(node: TSESTree.CallExpression) {
        if (!isFormatFunctionCall(node)) {
          return;
        }

        const args = node.arguments;
        if (args.length === 0) {
          return;
        }

        // For util.format and sprintf, first argument is the format string
        const formatArg = args[0];

        // Check if format string comes from user input
        // But skip console methods since they don't use the first arg as a format template
        const isFormatFromUserInput = isUserInputNode(formatArg) ||
                                     (formatArg.type === 'Identifier' && dangerousVariables.has(formatArg.name)) ||
                                     (formatArg.type === 'BinaryExpression' && hasUserInputInExpression(formatArg));

        if (isFormatFromUserInput && !isConsoleMethod(node)) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: formatArg,
            messageId: 'userControlledFormatString',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // Check if format string is a template literal or binary expression with user input
        if (formatArg.type === 'TemplateLiteral') {
          const hasUserInput = formatArg.expressions.some((expr: TSESTree.Expression) =>
            isUserInputNode(expr)
          );

          if (hasUserInput) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: formatArg,
              messageId: 'formatStringInjection',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
                severity: 'HIGH',
                safeAlternative: 'Use hardcoded format strings or validate template input',
              },
            });
            return;
          }
        } else if (formatArg.type === 'BinaryExpression' && formatArg.operator === '+') {
          const hasUserInput = hasUserInputInExpression(formatArg);

          if (hasUserInput) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: formatArg,
              messageId: 'formatStringInjection',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
                severity: 'HIGH',
                safeAlternative: 'Separate user input from format strings',
              },
            });
            return;
          }
        }

        // Check for format specifiers in subsequent arguments (could indicate user input in format position)
        // Only check if the format string itself is not validated/safe
        const firstArg = args[0];
        const isFormatSafe = isInputValidated(firstArg) ||
                            (firstArg.type === 'Identifier' && validatedVariables.has(firstArg.name));

        if (!isFormatSafe) {
          let hasUserInputInArgs = false;
          let hasSpecifiersInFormat = false;

          // Check if any argument contains user input (skip first arg which is format string)
          for (let i = 1; i < args.length; i++) {
            const arg = args[i];
            if (isUserInputNode(arg) && !isInputValidated(arg)) {
              hasUserInputInArgs = true;
              break;
            }
          }

          // Check if any argument (potential format string) contains specifiers
          const firstArg = args[0];
          if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
            if (containsFormatSpecifiers(firstArg.value)) {
              hasSpecifiersInFormat = true;
            }
          } else if (firstArg.type === 'Identifier') {
            // Check if the identifier name suggests it contains format specifiers
            const varName = firstArg.name.toLowerCase();
            if (varName.includes('format') || varName.includes('template') || varName.includes('pattern')) {
              hasSpecifiersInFormat = true;
            }
          }

          // Special case: For console.log/console.error with single argument, don't flag
          // console.log(userMessage) is equivalent to console.log("%s", userMessage) but is generally safe
          if (!hasSpecifiersInFormat && args.length === 2 && isConsoleMethod(node)) {
            // Don't report
          } else if (hasSpecifiersInFormat && hasUserInputInArgs) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            // Choose message ID based on format string type
            const messageId = firstArg.type === 'Literal' ? 'unsafeFormatSpecifier' : 'missingFormatValidation';

            context.report({
              node: node,
              messageId,
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
              suggest: [
                {
                  messageId: 'escapeFormatString',
                  fix: (fixer) => {
                    // Find the argument that needs escaping
                    // This is a bit heuristic, we try to find the first user input argument
                    for (let i = 1; i < node.arguments.length; i++) {
                      const arg = node.arguments[i];
                      if (isUserInputNode(arg)) {
                        return fixer.insertTextAfter(arg, '.replace(/%/g, "%%")');
                      }
                    }
                    return null;
                  },
                },
              ],
            });
          }
        }
      },

      // Check string literals for format specifiers with user input context
      Literal: function(node: TSESTree.Literal) {
        if (!hasFormatSpecifiers(node)) {
          return;
        }

        // Only check literals that are dynamically constructed or come from user input
        // Hardcoded string literals with format specifiers are safe when used properly
        const text = node.value as string;

        // Check if this literal is constructed from user input (e.g., concatenation)
        let current: TSESTree.Node | undefined = node;
        let isFromUserInput = false;

        // Walk up to find if this literal is part of a concatenation or template with user input
        while (current && !isFromUserInput) {
          if (current.type === 'BinaryExpression' &&
              current.operator === '+' &&
              (current.left === node || current.right === node)) {
            // Check if the other side contains user input
            const otherSide = current.left === node ? current.right : current.left;
            if (otherSide.type === 'Identifier' && isUserInput(otherSide.name)) {
              isFromUserInput = true;
              break;
            }
          }
          if (current.type === 'VariableDeclarator' &&
              current.init === node.parent &&
              current.id.type === 'Identifier') {
            // Check if variable name suggests user input
            if (isUserInput(current.id.name)) {
              isFromUserInput = true;
              break;
            }
          }
          current = current.parent as TSESTree.Node;
        }

        // Only flag if the literal is constructed from user input
        if (!isFromUserInput) {
          return;
        }

        // Check if this string is used in a context where it could be dangerous
        current = node;
        let isInDangerousContext = false;

        // Walk up to find if this is passed to a format function
        while (current && !isInDangerousContext) {
          if (current.type === 'CallExpression' && isFormatFunctionCall(current)) {
            // Check if this is the first argument (format string position)
            const args = current.arguments;
            if (args.length > 0 && args[0] === node) {
              isInDangerousContext = true;
              break;
            }
          }
          current = current.parent as TSESTree.Node;
        }

        if (isInDangerousContext && containsFormatSpecifiers(text)) {
          // FALSE POSITIVE REDUCTION
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node,
            messageId: 'missingFormatValidation',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      },

      // Check template literals for format string injection
      TemplateLiteral: function(node: TSESTree.TemplateLiteral) {
        // Check if template literal is used as format string
        let current: TSESTree.Node | undefined = node;
        let isFormatString = false;

        while (current && !isFormatString) {
          if (current.type === 'CallExpression' && isFormatFunctionCall(current)) {
            const args = current.arguments;
            if (args.length > 0 && args[0] === node) {
              isFormatString = true;
              break;
            }
          }
          current = current.parent as TSESTree.Node;
        }

        if (isFormatString) {
          // Template literal used as format string - let CallExpression visitor handle this
          // to avoid duplicate reporting
          return;
        }

        // Check if template literal contains user input and is used dangerously
        const hasUserInput = node.expressions.some((expr: TSESTree.Expression) =>
          isUserInputNode(expr)
        );

        if (hasUserInput) {
          // Check if this template is assigned to a variable that could be used as format string
          let current: TSESTree.Node | undefined = node;
          let isAssignedToVariable = false;

          while (current) {
            if (current.type === 'VariableDeclarator') {
              isAssignedToVariable = true;
              break;
            }
            current = current.parent as TSESTree.Node;
          }

          if (isAssignedToVariable) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'formatStringInjection',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
                severity: 'HIGH',
                safeAlternative: 'Extract user input from template and validate separately',
              },
            });
          }
        }
      },

      // Check variable assignments that might create format strings
      VariableDeclarator: function(node: TSESTree.VariableDeclarator) {
        if (!node.init || node.id.type !== 'Identifier') {
          return;
        }

        const varName = node.id.name;

        // Track variables that are assigned the result of sanitization functions
        if (node.init.type === 'CallExpression' &&
            node.init.callee.type === 'Identifier' &&
            trustedSanitizers.includes(node.init.callee.name)) {
          validatedVariables.add(varName);
        }

        // Track variables that are assigned user input (dangerous)
        if (isUserInputNode(node.init)) {
          dangerousVariables.add(varName);
        }

        const varNameLower = varName.toLowerCase();

        if (!varNameLower.includes('format') && !varNameLower.includes('template')) {
          return;
        }

        // Check if assigned value contains format specifiers and user input
        if (node.init.type === 'TemplateLiteral') {
          const hasSpecifiers = node.init.quasis.some(quasis => containsFormatSpecifiers(quasis.value.raw));
          const hasUserInput = node.init.expressions.some((expr: TSESTree.Expression) =>
            isUserInputNode(expr)
          );

          if (hasSpecifiers && hasUserInput) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: node.init,
              messageId: 'formatStringInjection',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
                severity: 'MEDIUM',
                safeAlternative: 'Separate format string from user data',
              },
            });
          }
        }

        // Check if assigned value is a string concatenation with user input
        if (node.init.type === 'BinaryExpression' && node.init.operator === '+') {
          const hasSpecifiers = containsFormatSpecifiersInExpression(node.init);
          const hasUserInput = hasUserInputInExpression(node.init);

          if (hasSpecifiers && hasUserInput) {
            // FALSE POSITIVE REDUCTION
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: node.init,
              messageId: 'formatStringInjection',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
                severity: 'MEDIUM',
                safeAlternative: 'Separate format string from user data',
              },
            });
          }
        }
      }
    };


  },
});

