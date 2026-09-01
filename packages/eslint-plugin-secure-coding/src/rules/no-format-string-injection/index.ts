/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
import {
  createRule,
  isModuleBinding,
  isStaticExpression,
  unwrapTypeSyntax,
  staticString,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, propertyName } from '@interlace/eslint-devkit';

/*
 * `console['log'](fmt, x)` and `req['query'].name` are the same sink and the
 * same source as their dotted spellings. Every gate here required an
 * Identifier property, so 21 of this rule's own true positives went silent
 * when written with a string subscript.
 */
// Temporarily remove complex imports to fix type issues
// import {
//   createSafetyChecker,
//   hasSafeAnnotation,
//   type SecurityRuleOptions,
// } from '@interlace/eslint-devkit';

type MessageIds =
  | 'formatStringInjection'
  | 'userControlledFormatString'
  | 'missingFormatValidation'
  | 'escapeFormatString';

export interface Options {
  /** Functions that use format strings */
  formatFunctions?: string[];

  /** Format specifiers to detect */
  formatSpecifiers?: string[];

  /** Variables that contain user input */
  userInputVariables?: string[];

  /**
   * The `user*` name family this rule treats as user input on top of
   * `userInputVariables`. REPLACES the built-in list; compared
   * case-insensitively as a WHOLE name or a whole dotted SEGMENT.
   * Default: DEFAULT_USER_INPUT_ALIASES
   */
  userInputAliases?: string[];

  /** Extra aliases, ON TOP of the built-ins. Default: [] */
  additionalUserInputAliases?: string[];

  /** Additional function names to consider as sanitizers */
  trustedSanitizers?: string[];

  /**
   * `safeFormatLibraries`, `trustedAnnotations` and `strictMode` used to be
   * declared here, in `meta.schema` and in both copies of the defaults.
   * `create()` destructures only `formatSpecifiers`, `userInputVariables` and
   * `trustedSanitizers`, and nothing else in the body reads them.
   *
   * `strictMode` is the one that mattered: this rule does not use the devkit's
   * `createSafetyChecker` at all (that import is commented out below) but a
   * local `safetyChecker` that hard-codes the `@safe-format` annotation. So
   * `strictMode: true` could not revoke that suppression, and
   * `trustedAnnotations` could not add to it — measured, not inferred:
   * `/* @safe-format *\/ util.format(fmt, req.body.name)` stays QUIET under
   * `strictMode: true`, and `/* @fmt-reviewed *\/` still reports with
   * `trustedAnnotations: ['@fmt-reviewed']`.
   */
}

type RuleOptions = [Options?];

/**
 * The `user*` name family this rule treats as user input, on top of whatever
 * `userInputVariables` declares.
 *
 * WHOLE NAMES, never substrings. The predicate was
 * `lowerName.includes(input.toLowerCase())` over `userInputVariables`, and that
 * list contains `data`, `params`, `request` and `input` — so the following were
 * measured being reported as attacker-controlled format strings, one probe
 * each:
 *
 *   console.error(paymentData, orderId)      // `data` ⊂ paymentData
 *   console.info(validationParams, reqId)    // `params` ⊂ validationParams
 *   util.format(metadata, id)                // `data` ⊂ metadata
 *
 * None of the three is user input, and none is even a format string. Exact
 * membership against a declared list is a contract an option can honour; a
 * substring of one is a coincidence of spelling.
 *
 * Nine English spellings of one convention, so this is a DEFAULT: a codebase
 * that names the request object something else extends it through
 * `additionalUserInputAliases`, and one where `user` is an ordinary domain noun
 * — a user RECORD, not a user's INPUT — drops it through `userInputAliases`.
 * Neither changes that the comparison is whole-name.
 */
const DEFAULT_USER_INPUT_ALIASES = [
  'user',
  'userinput',
  'userdata',
  'userparam',
  'userparams',
  'usermessage',
  'usertemplate',
  'userformat',
  'uservar',
];

export const noFormatStringInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-format-string-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-format-string-injection.md',
      description: 'Detects format string injection vulnerabilities',
      cwe: 'CWE-134',
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
      // `unsafeFormatSpecifier` ("User input may contain format specifiers")
      // was reported only where the format string was a constant literal —
      // the case where a user's specifiers are NOT interpreted. With that
      // report removed the message had no remaining path, so it is gone too.
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

      escapeFormatString: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Escape Format String',
        description: 'Escape format specifiers in user input',
        severity: 'LOW',
        fix: 'Replace % with %% in user input',
        documentationLink:
          'https://nodejs.org/api/util.html#utilformatformat-args',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          formatFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'util.format',
              'console.log',
              'console.error',
              'console.warn',
              'sprintf',
              'printf',
              'vsprintf',
            ],
            description: 'Functions whose first argument is a format string',
          },
          formatSpecifiers: {
            type: 'array',
            items: { type: 'string' },
            default: ['%s', '%d', '%i', '%f', '%j', '%o', '%O', '%c', '%%'],
            description: 'Format specifiers recognised in a format string',
          },
          userInputVariables: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'req',
              'request',
              'body',
              'query',
              'params',
              'input',
              'data',
              'userInput',
            ],
            description: 'Variable names treated as user-controlled input',
          },
          userInputAliases: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_USER_INPUT_ALIASES,
            description:
              'The user-input name family recognised on top of `userInputVariables`, compared case-insensitively as a whole name or a whole dotted segment — never as a substring. Replaces the built-in list.',
          },
          additionalUserInputAliases: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Extra user-input aliases, on top of `userInputAliases`.',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional function names to consider as format string sanitizers',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      formatFunctions: [
        'util.format',
        'console.log',
        'console.error',
        'console.warn',
        'sprintf',
        'printf',
        'vsprintf',
      ],
      formatSpecifiers: ['%s', '%d', '%i', '%f', '%j', '%o', '%O', '%c', '%%'],
      userInputVariables: [
        'req',
        'request',
        'body',
        'query',
        'params',
        'input',
        'data',
        'userInput',
      ],
      userInputAliases: DEFAULT_USER_INPUT_ALIASES,
      additionalUserInputAliases: [],
      trustedSanitizers: [
        'validateFormat',
        'sanitizeFormat',
        'escapeFormat',
        'cleanFormat',
        'sanitizeFormatString',
        'validate',
        'sanitize',
        'escape',
        'clean',
      ],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const defaultOptions: Options = {
      formatFunctions: [
        'util.format',
        'console.log',
        'console.error',
        'console.warn',
        'sprintf',
        'printf',
        'vsprintf',
      ],
      formatSpecifiers: ['%s', '%d', '%i', '%f', '%j', '%o', '%O', '%c', '%%'],
      userInputVariables: [
        'req',
        'request',
        'body',
        'query',
        'params',
        'input',
        'data',
        'userInput',
      ],
      userInputAliases: DEFAULT_USER_INPUT_ALIASES,
      additionalUserInputAliases: [],
      trustedSanitizers: [
        'validateFormat',
        'sanitizeFormat',
        'escapeFormat',
        'cleanFormat',
        'sanitizeFormatString',
        'validate',
        'sanitize',
        'escape',
        'clean',
      ],
    };

    const options: Required<Options> = {
      ...defaultOptions,
      ...context.options[0],
    } as Required<Options>;
    const {
      formatSpecifiers,
      userInputVariables,
      userInputAliases,
      additionalUserInputAliases,
      trustedSanitizers,
    } = options;
    const filename = context.filename;

    // Create safety checker for false positive detection (simplified implementation)
    // One defect, one finding. ESLint visits a VariableDeclarator before its own `init`,
    // so a specifier-bearing template assigned to a variable was reported twice — once by
    // the VariableDeclarator handler and again by the TemplateLiteral visitor. Mirrors the
    // `handledMemberExpressions` pattern in detect-object-injection.
    const reportedTemplates = new WeakSet<TSESTree.Node>();

    const safetyChecker = {
      isSafe: (
        safeNode: TSESTree.Node,
        ruleCtx: TSESLint.RuleContext<MessageIds, RuleOptions>,
      ) => {
        // Check for JSDoc @safe-format annotation
        const comments = ruleCtx.sourceCode.getCommentsBefore(safeNode);
        for (const comment of comments) {
          if (
            comment.type === 'Block' &&
            comment.value.includes('@safe-format')
          ) {
            return true;
          }
        }

        // For CallExpression nodes, check if first argument is safe
        if (
          safeNode.type === 'CallExpression' &&
          safeNode.arguments.length > 0
        ) {
          const firstArg = safeNode.arguments[0];
          if (
            firstArg.type === 'Identifier' &&
            validatedVariables.has(firstArg.name)
          ) {
            return true;
          }
        }

        return false;
      },
    };

    /**
     * Is this identifier one the project declared as user input?
     *
     * Two vocabularies, both matched as WHOLE NAMES and both configurable:
     * `userInputVariables` (the project's own declarations) and
     * `userInputAliases` / `additionalUserInputAliases` (the `user*` family,
     * documented on `DEFAULT_USER_INPUT_ALIASES` above).
     */
    const declaredUserInput: ReadonlySet<string> = new Set(
      [
        ...userInputVariables,
        ...userInputAliases,
        ...additionalUserInputAliases,
      ].map((name) => name.toLowerCase()),
    );

    const isUserInput = (varName: string): boolean =>
      declaredUserInput.has(varName.toLowerCase());

    /**
     * The same question for a dotted path, asked one SEGMENT at a time.
     *
     * `request.body.layout` is user input because a whole segment of it is
     * `request`; `paymentData.total` is not, because no segment of it is any
     * declared name. Comparing the joined path as one string is what let
     * `metadata.id` through.
     */
    const isUserInputPath = (path: string): boolean =>
      path.split('.').some((segment) => isUserInput(segment));

    /**
     * Check if a node represents user input (including member expressions)
     */
    const isUserInputNode = (rawNode: TSESTree.Node): boolean => {
      // `req.query.pattern as string` is `req.query.pattern`. The cast is
      // erased before anything runs, and Express + TypeScript forces one at
      // nearly every query-parameter read (`string | string[] | ParsedQs`), so
      // leaving the wrapper on meant the typed half of the ecosystem went
      // unreported while the untyped half did not.
      const node = unwrapTypeSyntax(rawNode);

      // `flag ? DEFAULT_FORMAT : req.query.fmt` and `req.query.fmt ?? DEFAULT`
      // both put the request value in the format position on at least one path.
      // A finding that a reviewer can defeat by adding a fallback is not a
      // finding, and both spellings are what a "make it configurable" commit
      // produces.
      if (node.type === 'ConditionalExpression') {
        return (
          isUserInputNode(node.consequent) || isUserInputNode(node.alternate)
        );
      }
      if (node.type === 'LogicalExpression') {
        return isUserInputNode(node.left) || isUserInputNode(node.right);
      }

      if (node.type === 'Identifier') {
        return isUserInput(node.name) || dangerousVariables.has(node.name);
      }

      if (node.type === 'MemberExpression') {
        // Check patterns like req.query.*, req.body.*, req.params.*, etc.
        if (
          node.object.type === 'MemberExpression' &&
          node.object.object.type === 'Identifier' &&
          node.object.object.name === 'req' &&
          // @vocabulary Express request API
          ['query', 'body', 'params', 'param'].includes(
            propertyName(node.object) ?? '',
          )
        ) {
          return true;
        }

        // Check patterns like req.*
        if (node.object.type === 'Identifier' && node.object.name === 'req') {
          return true;
        }

        // Check other user input patterns
        const fullName = getMemberExpressionName(node);
        return isUserInputPath(fullName);
      }

      return false;
    };

    /**
     * Get the full name of a member expression (e.g., req.query.format)
     */
    // oxlint-disable-next-line consistent-function-scoping
    const getMemberExpressionName = (
      node: TSESTree.MemberExpression,
    ): string => {
      const own = propertyName(node);
      if (node.object.type === 'Identifier') {
        if (own !== null) {
          return `${node.object.name}.${own}`;
        }
      } else if (node.object.type === 'MemberExpression') {
        const objectName = getMemberExpressionName(node.object);
        if (own !== null) {
          return `${objectName}.${own}`;
        }
      }
      return '';
    };

    /**
     * Check if a string contains format specifiers
     */
    const containsFormatSpecifiers = (text: string): boolean => {
      return formatSpecifiers.some((specifier) => text.includes(specifier));
    };

    /**
     * Check if a call expression uses format functions
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isConsoleMethod = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;
      return (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'console' &&
        // @vocabulary console API
        //
        // `propertyName(...) as string` rather than `?? ''`: no input reaches
        // THIS console test with an unresolvable key — a dynamic
        // `console[k](...)` is filtered before it arrives — so the fallback
        // was a branch nothing could exercise. `includes(undefined)` is false
        // regardless.
        ['log', 'error', 'warn', 'info', 'debug'].includes(
          propertyName(callee) as string,
        )
      );
    };

    const isFormatFunctionCall = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // Check for util.format
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'util' &&
        propertyName(callee) === 'format'
      ) {
        return true;
      }

      // `const { format } = require('node:util')` / `import { format } from 'util'`
      // — the idiomatic import, and the shape that made the sink disappear:
      // matching the spelling `util.format` meant the rule saw a call to
      // something named `format` and had no opinion about it. Resolved through
      // the binding instead of the receiver's name, so `const { format: fmt }`
      // and `node:util` both count and a local helper called `format` does not.
      if (
        callee.type === 'Identifier' &&
        isModuleBinding(callee, context.sourceCode.getScope(callee), 'util', [
          'format',
        ])
      ) {
        return true;
      }

      // Check for console methods
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'console' &&
        // @vocabulary console API
        ['log', 'error', 'warn', 'info', 'debug'].includes(
          propertyName(callee) ?? '',
        )
      ) {
        return true;
      }

      // Check for sprintf/printf functions
      if (
        callee.type === 'Identifier' &&
        ['sprintf', 'printf', 'vsprintf'].includes(callee.name)
      ) {
        return true;
      }

      return false;
    };

    // Track variables that have been validated/sanitized
    const validatedVariables = new Set<string>();
    const dangerousVariables = new Set<string>();

    /**
     * Is the format string a constant this file can read?
     *
     * CWE-134 is "the FORMAT STRING is attacker-controlled". It is not
     * "an argument substituted into a constant format string is
     * attacker-controlled" — `util.format` and `console.log` substitute
     * arguments verbatim and never re-scan them for specifiers, so
     * `util.format('%s', req.body.format)` prints the user's `%d` as the
     * literal text `%d`. That call is the RECOMMENDED mitigation, and this
     * rule used to report it (see the note at the CallExpression report
     * site).
     *
     * Resolved through scope rather than by name, so `const fmt = 'User: %s'`
     * one line up counts, and a parameter or a re-assigned binding does not.
     */
    const isStaticFormatString = (fmtNode: TSESTree.Node): boolean =>
      isStaticExpression({
        node: fmtNode,
        scope: context.sourceCode.getScope(fmtNode),
      });

    /**
     * Check if input has been validated/sanitized
     */
    const isInputValidated = (inputNode: TSESTree.Node): boolean => {
      // Check if this is a validated variable
      if (
        inputNode.type === 'Identifier' &&
        validatedVariables.has(inputNode.name)
      ) {
        return true;
      }

      let current: TSESTree.Node | undefined = inputNode;

      while (current) {
        if (
          current.type === 'CallExpression' &&
          current.callee.type === 'Identifier' &&
          trustedSanitizers.includes(current.callee.name)
        ) {
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
    function containsFormatSpecifiersInExpression(
      expr: TSESTree.BinaryExpression,
    ): boolean {
      const left = staticString(expr.left);
      if (left !== null && containsFormatSpecifiers(left)) {
        return true;
      }
      const right = staticString(expr.right);
      if (right !== null && containsFormatSpecifiers(right)) {
        return true;
      }
      if (
        expr.left.type === 'BinaryExpression' &&
        containsFormatSpecifiersInExpression(expr.left)
      ) {
        return true;
      }
      if (
        expr.right.type === 'BinaryExpression' &&
        containsFormatSpecifiersInExpression(expr.right)
      ) {
        return true;
      }
      return false;
    }

    function hasUserInputInExpression(
      expr: TSESTree.BinaryExpression,
    ): boolean {
      if (isUserInputNode(expr.left)) {
        return true;
      }
      if (isUserInputNode(expr.right)) {
        return true;
      }
      if (
        expr.left.type === 'BinaryExpression' &&
        hasUserInputInExpression(expr.left)
      ) {
        return true;
      }
      if (
        expr.right.type === 'BinaryExpression' &&
        hasUserInputInExpression(expr.right)
      ) {
        return true;
      }
      return false;
    }

    return {
      // Check call expressions for format function usage
      CallExpression: function (node: TSESTree.CallExpression) {
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
        const isFormatFromUserInput =
          isUserInputNode(formatArg) ||
          (formatArg.type === 'Identifier' &&
            dangerousVariables.has(formatArg.name)) ||
          (formatArg.type === 'BinaryExpression' &&
            hasUserInputInExpression(formatArg));

        // `console.*` was excluded outright, on the stated grounds that console methods
        // "don't use the first arg as a format template". They do: Node's console runs its
        // first argument through util.format whenever further arguments follow, so
        // `console.log(userText, sessionToken)` lets a `%s` in userText consume the token.
        // With a SINGLE argument there is nothing to substitute and it stays safe — which is
        // the distinction the blanket exclusion was missing in both directions.
        const consoleSubstitutes = isConsoleMethod(node) && args.length > 1;

        if (
          isFormatFromUserInput &&
          (!isConsoleMethod(node) || consoleSubstitutes)
        ) {
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
          const hasUserInput = formatArg.expressions.some(
            (expr: TSESTree.Expression) => isUserInputNode(expr),
          );

          if (hasUserInput) {
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
                safeAlternative:
                  'Use hardcoded format strings or validate template input',
              },
            });
            return;
          }
        } else if (
          formatArg.type === 'BinaryExpression' &&
          formatArg.operator === '+'
        ) {
          const hasUserInput = hasUserInputInExpression(formatArg);
          if (hasUserInput) {
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
        const fmtArg = args[0];
        const isFormatSafe =
          isInputValidated(fmtArg) ||
          (fmtArg.type === 'Identifier' && validatedVariables.has(fmtArg.name));

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
          const staticText = staticString(firstArg);
          if (staticText !== null) {
            if (containsFormatSpecifiers(staticText)) {
              hasSpecifiersInFormat = true;
            }
          } else if (firstArg.type === 'Identifier') {
            // Check if the identifier name suggests it contains format specifiers
            const varName = firstArg.name.toLowerCase();
            if (
              varName.includes('format') ||
              varName.includes('template') ||
              varName.includes('pattern')
            ) {
              hasSpecifiersInFormat = true;
            }
          }

          // Special case: For console.log/console.error with single argument, don't flag
          // console.log(userMessage) is equivalent to console.log("%s", userMessage) but is generally safe
          if (
            !hasSpecifiersInFormat &&
            args.length === 2 &&
            isConsoleMethod(node)
          ) {
            // Don't report
          } else if (
            hasSpecifiersInFormat &&
            hasUserInputInArgs &&
            // THE FIX, and it removes a false positive this suite used to
            // assert as correct behaviour.
            //
            // Three fixtures pinned the safe pattern as the vulnerability:
            //
            //   console.log('Format: %s', userMessage)
            //   util.format('%s', req.body.format)
            //   const formatStr = 'User: %s, Data: %j';
            //   util.format(formatStr, user, data)
            //
            // In every one the format string is a constant and the untrusted
            // value is an ARGUMENT. That is CWE-134's remediation, not
            // CWE-134: substituted values are emitted verbatim, so a `%d`
            // inside `req.body.format` reaches the output as the two
            // characters `%d`. The offered suggestion made it worse — it
            // rewrote the argument to `.replace(/%/g, '%%')`, doubling every
            // literal percent sign in the user's data.
            //
            // A constant format string is now out of scope for this site.
            // The genuine finding — an attacker-controlled format string — is
            // still reported here when the first argument does not resolve to
            // a constant, and by the `userControlledFormatString` path.
            !isStaticFormatString(firstArg)
          ) {
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: node,
              messageId: 'missingFormatValidation',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
              suggest: [
                {
                  messageId: 'escapeFormatString',
                  fix: (fixer: TSESLint.RuleFixer) => {
                    const arg = node.arguments
                      .slice(1)
                      .find((a) => isUserInputNode(a))!;
                    return fixer.insertTextAfter(arg, '.replace(/%/g, "%%")');
                  },
                },
              ],
            });
          }
        }
      },

      // Check string literals for format specifiers with user input context
      Literal: function (node: TSESTree.Literal) {
        if (!hasFormatSpecifiers(node)) {
          return;
        }

        // Only check literals that are dynamically constructed or come from user input
        // Hardcoded string literals with format specifiers are safe when used properly
        const text = node.value as string;

        // Check if this literal is constructed from user input (e.g., concatenation)
        let current: TSESTree.Node | undefined = node;
        let isFromUserInput = false;

        // Walk up to find if this literal is part of a concatenation or template with user input.
        // Every path that sets `isFromUserInput = true` is immediately followed by `break`,
        // so the negation in the loop condition is dead (CodeQL: `js/useless-conditional`).
        while (current) {
          if (
            current.type === 'BinaryExpression' &&
            current.operator === '+' &&
            (current.left === node || current.right === node)
          ) {
            // Check if the other side contains user input
            const otherSide =
              current.left === node ? current.right : current.left;
            if (
              otherSide.type === 'Identifier' &&
              isUserInput(otherSide.name)
            ) {
              isFromUserInput = true;
              break;
            }
          }
          if (
            current.type === 'VariableDeclarator' &&
            current.init === node.parent &&
            current.id.type === 'Identifier'
          ) {
            // console.log('DEBUG: Checking variable declarator', current.id.name);

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

        // Walk up to find if this is passed to a format function. Every path that sets
        // `isInDangerousContext = true` is followed by `break`, so the negation in the
        // condition is dead (CodeQL: `js/useless-conditional`).
        while (current) {
          if (
            current.type === 'CallExpression' &&
            isFormatFunctionCall(current)
          ) {
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
      TemplateLiteral: function (node: TSESTree.TemplateLiteral) {
        // Check if template literal is used as format string
        let templateCurrent: TSESTree.Node | undefined = node;
        let isFormatString = false;

        while (templateCurrent) {
          if (
            templateCurrent.type === 'CallExpression' &&
            isFormatFunctionCall(templateCurrent)
          ) {
            const args = templateCurrent.arguments;
            if (args.length > 0 && args[0] === node) {
              isFormatString = true;
              break;
            }
          }
          templateCurrent = templateCurrent.parent as TSESTree.Node;
        }

        if (isFormatString) {
          // Template literal used as format string - let CallExpression visitor handle this
          // to avoid duplicate reporting
          return;
        }

        // Check if template literal contains user input and is used dangerously
        const hasUserInput = node.expressions.some(
          (expr: TSESTree.Expression) => isUserInputNode(expr),
        );

        if (hasUserInput) {
          // Check if this template is assigned to a variable that could be used as format string
          let assignCurrent: TSESTree.Node | undefined = node;
          let isAssignedToVariable = false;

          while (assignCurrent) {
            if (assignCurrent.type === 'VariableDeclarator') {
              isAssignedToVariable = true;
              break;
            }
            assignCurrent = assignCurrent.parent as TSESTree.Node;
          }

          // A template with NO format specifier cannot be a format-string injection: there
          // is nothing for `%s`/`%d` to consume. Without this gate the branch fired on
          // every `const x = `...${req.foo}...`` in existence — e.g.
          // `fs.createReadStream(`./uploads/${req.params.id}`)`, which is a path, not a
          // format string, and belongs to the path-traversal rules instead.
          // Read the specifiers off the AST, not the printed source: a specifier can only
          // live in a static quasi (an interpolated `%s` is a VALUE being formatted, not a
          // format directive), and `sourceCode.getText` is unavailable under the mock
          // contexts the coverage suite uses.
          const carriesFormatSpecifier = node.quasis.some((quasi) => {
            const raw = quasi.value.raw;
            return options.formatSpecifiers.some((spec) => raw.includes(spec));
          });

          if (isAssignedToVariable && carriesFormatSpecifier) {
            if (
              safetyChecker.isSafe(node, context) ||
              reportedTemplates.has(node)
            ) {
              return;
            }

            context.report({
              node,
              messageId: 'formatStringInjection',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
                severity: 'HIGH',
                safeAlternative:
                  'Extract user input from template and validate separately',
              },
            });
          }
        }
      },

      /**
       * `const { fmt } = req.query` / `const [first] = req.body.patterns`.
       *
       * The declarator visitor below returns immediately unless the id is a
       * plain Identifier, so destructuring — the idiomatic way an Express
       * handler reads its query and body — carried the taint nowhere and
       * `util.format(fmt, token)` two lines later was silent. Every name the
       * pattern binds comes from the same tainted initialiser, and the scope
       * manager already knows which names those are.
       */
      'VariableDeclarator[id.type!="Identifier"]': function (
        node: TSESTree.VariableDeclarator,
      ) {
        if (!node.init || !isUserInputNode(node.init)) return;
        for (const variable of context.sourceCode.getDeclaredVariables(node)) {
          dangerousVariables.add(variable.name);
        }
      },

      /**
       * `let fmt = 'user=%s'; fmt = req.query.fmt;`
       *
       * A re-assignment is not a declaration, so nothing tracked it: the
       * binding was judged on the literal it was declared with and stayed
       * trusted for the rest of the file. A `let` whose writes are all literals
       * is still untouched — only a write of user input marks it.
       */
      AssignmentExpression: function (node: TSESTree.AssignmentExpression) {
        if (node.left.type !== 'Identifier') return;
        if (isUserInputNode(node.right)) {
          dangerousVariables.add(node.left.name);
        }
      },

      // Check variable assignments that might create format strings
      VariableDeclarator: function (node: TSESTree.VariableDeclarator) {
        if (!node.init || node.id.type !== 'Identifier') {
          return;
        }

        const varName = node.id.name;

        // Track variables that are assigned the result of sanitization functions
        if (
          node.init.type === 'CallExpression' &&
          node.init.callee.type === 'Identifier' &&
          trustedSanitizers.includes(node.init.callee.name)
        ) {
          validatedVariables.add(varName);
        }

        // Track variables that are assigned user input (dangerous)
        if (
          isUserInputNode(node.init) ||
          (node.init.type === 'BinaryExpression' &&
            hasUserInputInExpression(node.init)) ||
          // A template literal interpolating user input carries that input forward.
          (node.init.type === 'TemplateLiteral' &&
            node.init.expressions.some((expr: TSESTree.Expression) =>
              isUserInputNode(expr),
            ))
        ) {
          dangerousVariables.add(varName);
        }

        const varNameLower = varName.toLowerCase();

        if (
          !varNameLower.includes('format') &&
          !varNameLower.includes('template') &&
          !varNameLower.includes('fmt') &&
          !varNameLower.includes('str')
        ) {
          return;
        }

        // Check if assigned value contains format specifiers and user input
        if (node.init.type === 'TemplateLiteral') {
          const hasSpecifiers = node.init.quasis.some(
            (quasi: TSESTree.TemplateElement) =>
              containsFormatSpecifiers(quasi.value.raw),
          );
          const hasUserInput = node.init.expressions.some(
            (expr: TSESTree.Expression) => isUserInputNode(expr),
          );

          if (hasSpecifiers && hasUserInput) {
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            reportedTemplates.add(node.init);
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
        if (
          node.init.type === 'BinaryExpression' &&
          node.init.operator === '+'
        ) {
          const hasSpecifiers = containsFormatSpecifiersInExpression(node.init);
          const hasUserInput = hasUserInputInExpression(node.init);

          if (hasSpecifiers && hasUserInput) {
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
      },
    };
  },
});
