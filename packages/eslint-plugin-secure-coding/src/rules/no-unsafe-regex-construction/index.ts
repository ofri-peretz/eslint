/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unsafe-regex-construction
 * Detects unsafe regex construction patterns (user input without escaping, dynamic flags)
 * CWE-400: Uncontrolled Resource Consumption
 *
 * Extends detect-non-literal-regexp with pattern analysis
 *
 * @see https://cwe.mitre.org/data/definitions/400.html
 * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'unsafeRegexConstruction'
  | 'escapeUserInput'
  | 'validatePattern'
  | 'useSafeLibrary'
  | 'avoidDynamicFlags';

// Inline regex-metacharacter escape, appended to the flagged expression by the
// `escapeUserInput` suggestion fixer. No `escapeRegExp` helper exists in user
// code, so the fix must be self-contained rather than calling one.
// `${}` here are regex metacharacters inside a character class, not a template
// placeholder — the string is a literal `.replace(...)` snippet inserted by the fixer.
// eslint-disable-next-line no-template-curly-in-string
/**
 * Functions the ecosystem actually uses to escape a regex metacharacter set.
 *
 * `escapeRegex` alone was the original default and matched nothing in the
 * corpus: lodash spells it `escapeRegExp`, and the single most-installed
 * implementation is the `escape-string-regexp` package, whose export is
 * `escapeStringRegexp`. A pre-escaped value is inert — reporting it tells the
 * user to fix code that is already correct, and the only remedy on offer is
 * the escape they already applied.
 */
const DEFAULT_TRUSTED_ESCAPING_FUNCTIONS = [
  'escapeRegex',
  'escapeRegExp',
  'escapeStringRegexp',
  'regexpEscape',
  'escape',
  'sanitize',
] as const;

const INLINE_ESCAPE_SUFFIX = '.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")';

export interface Options {
  /** Allow literal string patterns. Default: false */
  allowLiterals?: boolean;

  /** Trusted functions that escape input. Default: {@link DEFAULT_TRUSTED_ESCAPING_FUNCTIONS} */
  trustedEscapingFunctions?: string[];

  /** Maximum pattern length for dynamic regex. Default: 100 */
  maxPatternLength?: number;
}

type RuleOptions = [Options?];

/**
 * Check if a node represents user input (variable, function call, template literal)
 */
/**
 * Where does this pattern come from, if it can be named?
 *
 * Returns the source description, or `null` when the pattern's provenance
 * cannot be attributed.
 *
 * This replaces `isUserInput`, which returned `true` for every CallExpression,
 * MemberExpression and Identifier — it was `isDynamic` under another name, and
 * its own comment recorded the moment it stopped discriminating:
 * "Changed from false to true - safer to flag as user input".
 *
 * The cost of that was not just noise. This rule ships at `error` while
 * `detect-non-literal-regexp` ships at `warn`, and measured over an 8-repo
 * corpus every one of this rule's 41 findings was also reported by that one —
 * a strict subset, the same code called out twice at two severities. Naming the
 * source is what makes the two rules disjoint: this one reports what it can
 * attribute, the generic one reports the rest.
 */
function taintSource(node: TSESTree.Node, depth = 0): string | null {
  if (depth > 6) return null;

  if (node.type === 'TemplateLiteral') {
    for (const expression of node.expressions) {
      const found = taintSource(expression, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return (
      taintSource(node.left as TSESTree.Node, depth + 1) ??
      taintSource(node.right, depth + 1)
    );
  }

  if (node.type === 'AwaitExpression') {
    return taintSource(node.argument, depth + 1);
  }

  if (node.type === 'MemberExpression') {
    // Walk to the root of `req.query.pattern` and judge that.
    let root: TSESTree.Node = node;
    const properties: string[] = [];
    while (root.type === 'MemberExpression') {
      if (root.property.type === 'Identifier') properties.unshift(root.property.name);
      root = root.object;
    }
    if (root.type === 'Identifier') {
      if (REQUEST_ROOTS.has(root.name) && properties.some((p) => REQUEST_PROPERTIES.has(p))) {
        return `${root.name}.${properties.join('.')}`;
      }
      if (root.name === 'process' && properties[0] === 'argv') {
        return 'process.argv';
      }
    }
    return null;
  }

  if (node.type === 'CallExpression') {
    const callee = node.callee;
    if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
      // Reading a file or a response body yields bytes from outside the program.
      if (READER_METHODS.has(callee.property.name)) {
        return callee.property.name;
      }
    }
    if (callee.type === 'Identifier' && READER_METHODS.has(callee.name)) {
      return callee.name;
    }
    for (const arg of node.arguments) {
      if (arg.type === 'SpreadElement') continue;
      const found = taintSource(arg, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  return null;
}

/** Identifier roots that denote an inbound request. */
const REQUEST_ROOTS: ReadonlySet<string> = new Set([
  'req', 'request', 'ctx', 'event', 'message',
]);

/** Properties of a request that carry caller-supplied data. */
const REQUEST_PROPERTIES: ReadonlySet<string> = new Set([
  'query', 'params', 'body', 'headers', 'url', 'path', 'cookies', 'data',
]);

/** Calls whose result is bytes from outside the program. */
const READER_METHODS: ReadonlySet<string> = new Set([
  'readFile', 'readFileSync', 'text', 'json', 'arrayBuffer', 'formData', 'blob',
]);

/**
 * Check if a node is escaped (wrapped in an escaping function)
 */
function isEscaped(
  node: TSESTree.Node,
  trustedFunctions: string[],
  sourceCode: TSESLint.SourceCode,
): boolean {
  // Check if the node itself is a call to a trusted escaping function
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
    const functionName = node.callee.name;
    if (trustedFunctions.includes(functionName)) {
      return true;
    }
  }

  // Also check if it's wrapped in a trusted function call (for complex cases).
  // `current` is only assigned from `node` (truthy on entry) or `parent` after
  // an explicit `if (!parent) break;`, so it's never null at the loop check
  // (CodeQL: `js/useless-conditional` on the `current &&` test).
  let current: TSESTree.Node = node;
  let depth = 0;
  const maxDepth = 5; // Prevent infinite loops

  while (depth < maxDepth) {
    const parent =
      sourceCode.getNodeByRangeIndex?.(current.range[0] - 1) ||
      (current as TSESTree.Node).parent;

    if (!parent) break;

    if (
      parent.type === 'CallExpression' &&
      parent.callee.type === 'Identifier'
    ) {
      const functionName = parent.callee.name;
      if (trustedFunctions.includes(functionName)) {
        return true;
      }
    }

    current = parent as TSESTree.Node;
    depth++;
  }

  return false;
}

/**
 * Check if regex flags are dynamic
 */
/**
 * Is this argument the `.source` of an existing RegExp — i.e. a clone rather than a new
 * pattern?
 *
 * `new RegExp(re.source, re.flags)` and `new RegExp(re.source + '$', re.flags)` re-compile a
 * pattern the engine already accepted. There is no new attacker surface: whoever controlled
 * the original controls the copy, and nothing else changed. Reported as "dynamic flags" it
 * was a false positive on Mongoose's `cloneRegExp` and Fastify's route normaliser.
 */
function isRegexClone(node: TSESTree.Node): boolean {
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'source'
  ) {
    return true;
  }
  // `re.source + '$'` — anchoring a cloned pattern is still a clone.
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return isRegexClone(node.left) || isRegexClone(node.right);
  }
  return false;
}

function hasDynamicFlags(
  node: TSESTree.CallExpression | TSESTree.NewExpression,
): boolean {
  // Check second argument (flags)
  if (node.arguments.length > 1) {
    const flagsNode = node.arguments[1];
    // Flags built at runtime are the concern here regardless of provenance —
    // `new RegExp(p, item.flags)` can silently add `g`/`y` and change matching
    // semantics. A string literal is fine.
    return !(flagsNode.type === 'Literal' && typeof flagsNode.value === 'string');
  }

  return false;
}

/**
 * Extract pattern from RegExp construction
 */
function extractPattern(
  node: TSESTree.CallExpression | TSESTree.NewExpression,
  sourceCode: TSESLint.SourceCode,
  trustedFunctions: string[],
): {
  patternNode: TSESTree.Node | null;
  isUserInput: boolean;
  taintedBy: string | null;
  isEscaped: boolean;
} {
  const patternNode = node.arguments.length > 0 ? node.arguments[0] : null;

  if (!patternNode) {
    return { patternNode: null, isUserInput: false, taintedBy: null, isEscaped: false };
  }

  const taintedBy = taintSource(patternNode);
  const isUserInputValue = taintedBy !== null;
  // Default trusted functions + user configured ones
  const allTrustedFunctions = [
    ...new Set([
      ...DEFAULT_TRUSTED_ESCAPING_FUNCTIONS,
      'RegExp.escape',
      ...trustedFunctions,
    ]),
  ];

  const isEscapedValue = isEscaped(
    patternNode,
    allTrustedFunctions,
    sourceCode,
  );

  return {
    patternNode,
    isUserInput: isUserInputValue,
    taintedBy,
    isEscaped: isEscapedValue,
  };
}

export const noUnsafeRegexConstruction = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-regex-construction',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unsafe-regex-construction.md',
      description:
        'Detects unsafe regex construction patterns (user input without escaping, dynamic flags)',
      cwe: 'CWE-400',
      cvss: 7.5,
    },
    hasSuggestions: true,
    messages: {
      unsafeRegexConstruction: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe regex construction',
        cwe: 'CWE-400',
        description: '{{issue}}: {{details}}',
        severity: 'HIGH',
        fix: '{{fix}}',
        documentationLink:
          'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
      escapeUserInput: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Escape User Input',
        description: 'Escape user input for regex',
        severity: 'LOW',
        // oxlint-disable-next-line no-template-curly-in-string
        fix: 'input.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping',
      }),
      validatePattern: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Pattern',
        description: 'Validate pattern against whitelist',
        severity: 'LOW',
        fix: 'Validate pattern before creating RegExp',
        documentationLink:
          'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
      useSafeLibrary: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use safe-regex',
        description: 'Use safe-regex library for validation',
        severity: 'LOW',
        fix: 'if (safeRegex(pattern)) { new RegExp(pattern) }',
        documentationLink: 'https://github.com/substack/safe-regex',
      }),
      avoidDynamicFlags: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Static Flags',
        description: 'Use static flags instead of dynamic',
        severity: 'LOW',
        fix: 'new RegExp(pattern, "gi") with static flags',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowLiterals: {
            type: 'boolean',
            default: true,
            description: 'Allow literal string patterns',
          },
          trustedEscapingFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_TRUSTED_ESCAPING_FUNCTIONS],
            description: 'Trusted functions that escape input',
          },
          maxPatternLength: {
            type: 'number',
            default: 100,
            minimum: 1,
            description: 'Maximum pattern length for dynamic regex',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowLiterals: true,
      trustedEscapingFunctions: [...DEFAULT_TRUSTED_ESCAPING_FUNCTIONS],
      maxPatternLength: 100,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    // `options` is always an object here (defaulted by the destructuring
    // parameter above), so a second `|| {}` fallback could never fire —
    // removed as dead code.
    const {
      allowLiterals = true,
      maxPatternLength = 100,
      trustedEscapingFunctions = [...DEFAULT_TRUSTED_ESCAPING_FUNCTIONS],
    }: Options = options;

    const sourceCode = context.sourceCode;

    /**
     * Check RegExp constructor calls
     */
    function checkRegExpCall(
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ) {
      // Check for RegExp constructor
      const isRegExpCall =
        (node.type === 'CallExpression' &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'RegExp') ||
        (node.type === 'NewExpression' &&
          node.callee.type === 'Identifier' &&
          node.callee.name === 'RegExp');

      if (!isRegExpCall) {
        return;
      }

      const {
        patternNode,
        isUserInput: isUserInputValue,
        isEscaped: isEscapedValue,
      } = extractPattern(node, sourceCode, trustedEscapingFunctions);

      if (!patternNode) {
        return;
      }

      // Check for literal strings
      if (
        patternNode.type === 'Literal' &&
        typeof patternNode.value === 'string'
      ) {
        // Even literals can be unsafe if they're very long - check this regardless of allowLiterals
        const patternLength = patternNode.value.length;
        if (patternLength > maxPatternLength) {
          context.report({
            node: patternNode,
            messageId: 'unsafeRegexConstruction',
            data: {
              issue: 'Pattern too long',
              details: `Pattern length (${patternLength}) exceeds maximum (${maxPatternLength})`,
              fix: 'Split into smaller patterns or validate length',
            },
            suggest: [
              {
                messageId: 'validatePattern',
                fix: () => null,
              },
            ],
          });
          return;
        }

        if (!allowLiterals) {
          // If we reach here, allowLiterals is false, so treat as unsafe
          context.report({
            node: patternNode,
            messageId: 'unsafeRegexConstruction',
            data: {
              issue: 'Literal regex pattern',
              details:
                'Literal regex patterns should be avoided for security. Use variables instead.',
              fix: 'Use a variable or RegExp constructor with a string variable',
            },
            suggest: [
              {
                messageId: 'validatePattern',
                fix: () => null,
              },
            ],
          });
          return;
        }
      }

      // Check for user input without escaping
      if (isUserInputValue && !isEscapedValue) {
        const patternText = context.sourceCode.getText(patternNode);
        context.report({
          node: patternNode,
          messageId: 'unsafeRegexConstruction',
          data: {
            issue: 'User input in regex without escaping',
            details:
              'User input in regex pattern can lead to ReDoS or injection attacks',
            fix: 'Escape special characters before using in regex',
          },
          suggest: [
            {
              messageId: 'escapeUserInput',
              // Append an inline regex-metacharacter escape so special chars are neutralized.
              // Parenthesize patternText first: it's spliced in as-is (could be any
              // expression, e.g. a lower-precedence one), so `.replace(...)` must bind
              // to the whole expression, not just its last operand.
              fix: (fixer) =>
                fixer.replaceText(
                  patternNode,
                  `(${patternText})${INLINE_ESCAPE_SUFFIX}`,
                ),
            },
            {
              messageId: 'validatePattern',
              fix: () => null,
            },
            {
              messageId: 'useSafeLibrary',
              fix: () => null,
            },
          ],
        });
      }

      // Check for dynamic flags
      if (hasDynamicFlags(node) && !isRegexClone(patternNode)) {
        context.report({
          node,
          messageId: 'unsafeRegexConstruction',
          data: {
            issue: 'Dynamic regex flags',
            details:
              'Dynamic flags can lead to unexpected behavior or security issues',
            fix: 'Use static flags instead of dynamic flags',
          },
          suggest: [
            {
              messageId: 'avoidDynamicFlags',
              fix: () => null,
            },
          ],
        });
      }
    }

    return {
      CallExpression: checkRegExpCall,
      NewExpression: checkRegExpCall,
    };
  },
});
