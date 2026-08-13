/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: detect-non-literal-regexp
 * Detects RegExp(variable), which might allow an attacker to DOS your server with a long-running regular expression
 * LLM-optimized with comprehensive ReDoS prevention guidance
 *
 * @see https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
 * @see https://cwe.mitre.org/data/definitions/400.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'regexpReDoS'
  | 'useStaticRegex'
  | 'validateInput'
  | 'useRegexLibrary'
  | 'addTimeout'
  | 'escapeUserInput';

export interface Options {
  /**
   * Allow literal string regex patterns — `new RegExp('^[a-z]+$')`.
   * Default: true. A rule named "non-literal" reporting a literal by default
   * contradicted its own contract. Set false to prefer `/…/` literal syntax.
   */
  allowLiterals?: boolean;
  
  /** Additional RegExp creation patterns to check */
  additionalPatterns?: string[];
  
  /** Maximum allowed pattern length for dynamic regex */
  maxPatternLength?: number;
}

type RuleOptions = [Options?];

/**
 * RegExp creation patterns and their security implications
 */
interface RegExpPattern {
  pattern: string;
  dangerous: boolean;
  vulnerability: 'redos' | 'injection' | 'performance';
  safeAlternative: string;
  example: { bad: string; good: string };
  effort: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const REGEXP_PATTERNS: RegExpPattern[] = [
  {
    pattern: 'new RegExp\\(.*\\)',
    dangerous: true,
    vulnerability: 'redos',
    safeAlternative: 'Pre-defined RegExp constants',
    example: {
      bad: 'new RegExp(userInput)',
      good: 'const PATTERNS = { email: /^[a-zA-Z0-9]+$/ }; PATTERNS[userChoice]'
    },
    effort: '10-15 minutes',
    riskLevel: 'high'
  },
  {
    pattern: 'RegExp\\(.*\\)',
    dangerous: true,
    vulnerability: 'redos',
    safeAlternative: 'Static RegExp literals or validated patterns',
    example: {
      bad: 'RegExp(userPattern)',
      // oxlint-disable-next-line no-template-curly-in-string
      good: 'const safePattern = userPattern.replace(/[.*+?^${}()|[\\]\\\\]/g, \'\\\\$&\'); new RegExp(`^${safePattern}$`)'
    },
    effort: '15-20 minutes',
    riskLevel: 'high'
  },
  {
    pattern: '/.*\\*\\*.*|.*\\+\\+.*|.*\\?\\?/',
    dangerous: true,
    vulnerability: 'redos',
    safeAlternative: 'Avoid nested quantifiers, use atomic groups',
    example: {
      bad: '/(a+)+b/', // ReDoS vulnerable
      good: '/(?>a+)b/', // Atomic group (if supported) or restructure
    },
    effort: '20-30 minutes',
    riskLevel: 'critical'
  }
];

/**
 * String/array methods that turn constant inputs into a constant output.
 *
 * Deliberately short: every entry has to be a pure transformation whose result
 * depends on nothing but its receiver and arguments. `map`/`filter` take a
 * callback and are excluded — the callback could read anything.
 */
const CONSTANT_PRESERVING_METHODS: ReadonlySet<string> = new Set([
  'join',
  'concat',
  'toUpperCase',
  'toLowerCase',
  'trim',
  'slice',
  'repeat',
]);

/**
 * Can the program determine this value before any input arrives?
 *
 * The rule previously asked only "is this a string literal?", so
 * `new RegExp('\\{' + i + '\\}')` over a loop counter and
 * `new RegExp(`${SUPPORTED_EXTS.join('|')}$`)` over a module constant were
 * both reported as attacker-controlled ReDoS. Neither is: nothing outside the
 * program can change what those patterns compile to. That single question
 * accounted for most of this rule's 49 corpus findings.
 *
 * Resolution is intentionally conservative — anything it cannot follow to a
 * literal (a parameter, an import, a property of an unknown object) is NOT
 * treated as constant, so unknown provenance still reports.
 */
function isBuildTimeConstant(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth = 0,
): boolean {
  // Bounded walk: a cyclic or absurdly deep expression resolves to "unknown",
  // which reports. Erring toward a finding is the safe direction here.
  if (depth > 6) {
    return false;
  }

  switch (node.type) {
    case 'Literal':
      return true;
    case 'TemplateLiteral':
      return node.expressions.every((expression) =>
        isBuildTimeConstant(expression, sourceCode, depth + 1),
      );
    case 'BinaryExpression':
      return (
        node.operator === '+' &&
        isBuildTimeConstant(node.left as TSESTree.Node, sourceCode, depth + 1) &&
        isBuildTimeConstant(node.right, sourceCode, depth + 1)
      );
    case 'ArrayExpression':
      return node.elements.every(
        (element) =>
          element !== null &&
          element.type !== 'SpreadElement' &&
          isBuildTimeConstant(element, sourceCode, depth + 1),
      );
    case 'CallExpression':
      return (
        node.callee.type === 'MemberExpression' &&
        node.callee.property.type === 'Identifier' &&
        CONSTANT_PRESERVING_METHODS.has(node.callee.property.name) &&
        isBuildTimeConstant(node.callee.object, sourceCode, depth + 1) &&
        node.arguments.every(
          (argument) =>
            argument.type !== 'SpreadElement' &&
            isBuildTimeConstant(argument, sourceCode, depth + 1),
        )
      );
    case 'Identifier':
      return isConstantBinding(node, sourceCode, depth);
    default:
      return false;
  }
}

/** Resolve an identifier to its single declaration and judge that. */
function isConstantBinding(
  node: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
  depth: number,
): boolean {
  let variable: TSESLint.Scope.Variable | null = null;
  let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
  while (scope !== null && variable === null) {
    variable = scope.variables.find((candidate) => candidate.name === node.name) ?? null;
    scope = scope.upper;
  }
  // Shadowed or re-declared bindings are not worth reasoning about.
  if (variable === null || variable.defs.length !== 1) {
    return false;
  }

  const definition = variable.defs[0]!;
  if (definition.type !== 'Variable') {
    return false;
  }

  // A `for (let i = 0; …)` counter is driven by the loop, not by input.
  if (definition.parent.parent?.type === 'ForStatement') {
    return true;
  }
  if (definition.parent.kind !== 'const') {
    return false;
  }

  const init = definition.node.init;
  return init !== null && isBuildTimeConstant(init, sourceCode, depth + 1);
}

export const detectNonLiteralRegexp = createRule<RuleOptions, MessageIds>({
  name: 'detect-non-literal-regexp',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/detect-non-literal-regexp.md',
      description: 'Detects RegExp(variable), which might allow an attacker to DOS your server with a long-running regular expression',
      cwe: 'CWE-400',
    },
    hasSuggestions: true,
    messages: {
      // 🎯 Token optimization: 41% reduction (51→30 tokens) - compact template variables
      regexpReDoS: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'ReDoS vulnerability',
        cwe: 'CWE-400',
        description: 'ReDoS vulnerability detected',
        severity: '{{riskLevel}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
      useStaticRegex: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Static Regex',
        description: 'Use pre-defined RegExp constants',
        severity: 'LOW',
        fix: 'const PATTERN = /^[a-z]+$/; // Define at module level',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp',
      }),
      validateInput: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Input',
        description: 'Validate and escape user input',
        severity: 'LOW',
        fix: 'Validate input length and characters before RegExp',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
      useRegexLibrary: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Safe Library',
        description: 'Use safe-regex library or re2',
        severity: 'LOW',
        fix: 'import { isSafe } from "safe-regex"; if (isSafe(pattern)) ...',
        documentationLink: 'https://github.com/substack/safe-regex',
      }),
      addTimeout: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Timeout',
        description: 'Add timeout to regex operations',
        severity: 'LOW',
        fix: 'Use timeout wrapper for regex operations',
        documentationLink: 'https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS',
      }),
      escapeUserInput: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Escape Input',
        description: 'Escape special regex characters',
        // oxlint-disable-next-line no-template-curly-in-string
        severity: 'LOW',
        // oxlint-disable-next-line no-template-curly-in-string
        fix: 'input.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowLiterals: {
            type: 'boolean',
            default: false,
            description: 'Allow literal string regex patterns'
          },
          additionalPatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional RegExp creation patterns to check'
          },
          maxPatternLength: {
            type: 'number',
            default: 100,
            minimum: 1,
            description: 'Maximum allowed pattern length for dynamic regex'
          }
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowLiterals: true,
      additionalPatterns: [],
      maxPatternLength: 100
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    // `options` is always an object here (defaulted just above), so a
    // second `|| {}` fallback could never fire — removed as dead code.
    const {
      allowLiterals = true,
      maxPatternLength = 100,
    }: Options = options;

    /**
     * Check if a node is a literal string (potentially safe)
     * Includes template literals without expressions
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isLiteralString = (node: TSESTree.Node): boolean => {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        return true;
      }
      // Template literals without expressions are also static/safe
      if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
        return true;
      }
      return false;
    };

    /**
     * Extract regex pattern from RegExp construction
     */
    const extractPattern = (node: TSESTree.CallExpression | TSESTree.NewExpression): {
      pattern: string;
      patternNode: TSESTree.Node | null;
      constructor: string;
      isDynamic: boolean;
      length: number;
    } => {
      const sourceCode = context.sourceCode;

      // Determine constructor type
      let constructor = 'RegExp';
      if (node.type === 'NewExpression' && node.callee.type === 'Identifier') {
        constructor = `new ${node.callee.name}`;
      }

      // First argument is the pattern
      const patternNode = node.arguments.length > 0 ? node.arguments[0] : null;
      const pattern = patternNode ? sourceCode.getText(patternNode) : '';
      const isDynamic = patternNode ? !isLiteralString(patternNode) : false;
      const length = patternNode && isLiteralString(patternNode) ?
                     String((patternNode as TSESTree.Literal).value).length : pattern.length;

      return { pattern, patternNode, constructor, isDynamic, length };
    };

    /**
     * Detect the specific vulnerability pattern
     */
    const detectVulnerability = (pattern: string, isDynamic: boolean): RegExpPattern => {
      // Check for dynamic construction first (highest risk)
      if (isDynamic) {
        for (const vuln of REGEXP_PATTERNS) {
          if (new RegExp(vuln.pattern, 'i').test(pattern)) {
            return vuln;
          }
        }
        // Generic dynamic RegExp construction
        return {
          pattern: 'dynamic',
          dangerous: true,
          vulnerability: 'redos',
          safeAlternative: 'Pre-defined RegExp constants',
          example: {
            bad: pattern,
            good: 'const PATTERNS = { email: /^[a-zA-Z0-9]+$/ }; PATTERNS[type]'
          },
          effort: '10-15 minutes',
          riskLevel: 'high'
        };
      }

      // A literal pattern is not a *non-literal* regexp. It only reaches here
      // when `allowLiterals` is off, i.e. the user asked to be told about
      // `new RegExp('…')` in favour of `/…/` syntax. ReDoS inside a literal is
      // `no-redos-vulnerable-regex`'s remit, which runs a real automaton
      // analysis instead of the two hand-written regexes that used to live here.
      return {
        pattern: 'literal-construction',
        dangerous: false,
        vulnerability: 'redos',
        safeAlternative: 'Regex literal syntax',
        example: {
          bad: `new RegExp(${pattern})`,
          good: '/pattern/',
        },
        effort: '2 minutes',
        riskLevel: 'high',
      };
    };

    /**
     * Generate refactoring steps based on the vulnerability
     */
    // oxlint-disable-next-line consistent-function-scoping
    const generateRefactoringSteps = (vulnerability: RegExpPattern): string => {
      if (vulnerability.pattern === 'dynamic') {
        return [
          '   1. Create a whitelist of allowed regex patterns',
          '   2. Use object lookup: PATTERNS[userChoice]',
          '   3. If dynamic needed: escape input with regex escaping function',
          '   4. Add pattern length validation',
          '   5. Consider using a safe regex library'
        ].join('\n');
      }

      if (vulnerability.pattern === 'literal-construction') {
        return [
          '   1. Replace new RegExp(\'…\') with a /…/ literal',
          '   2. Keep the flags as literal suffixes: /…/gi',
          '   3. Escaping differs: a literal needs one backslash, not two'
        ].join('\n');
      }

      // Every `RegExpPattern` constructed in this module has
      // `vulnerability: 'redos'` (see REGEXP_PATTERNS above and the two
      // object literals returned from `detectVulnerability`) — there is no
      // code path that ever produces `'injection'` or another value, so
      // this is the only reachable case. Kept as a direct return (not a
      // switch) to avoid unreachable branches that no test could ever hit.
      return [
        '   1. Avoid nested quantifiers and backreferences',
        '   2. Use possessive quantifiers: *+, ++, ?+',
        '   3. Restructure regex to be more specific',
        '   4. Test with potentially malicious inputs',
        '   5. Consider safe-regex library validation'
      ].join('\n');
    };

    /**
     * Determine overall risk level
     */
    // Every `RegExpPattern` ever constructed in this module (REGEXP_PATTERNS
    // entries, and the two object literals in `detectVulnerability`) sets
    // `riskLevel` to only `'high'` or `'critical'` — never `'medium'` or
    // `'low'` — so those two branches are the only reachable outcomes.
    const determineRiskLevel = (vulnerability: RegExpPattern): string => {
      if (vulnerability.riskLevel === 'critical') {
        return 'CRITICAL';
      }

      return 'HIGH';
    };

    /**
     * Check RegExp constructor calls for vulnerabilities
     */
    const checkRegExpCall = (node: TSESTree.CallExpression | TSESTree.NewExpression) => {
      // Check for RegExp constructor calls
      const isRegExpCall = node.callee.type === 'Identifier' && node.callee.name === 'RegExp';
      const isNewRegExp = node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'RegExp';

      if (!isRegExpCall && !isNewRegExp) {
        return;
      }

      const { pattern, patternNode, isDynamic, length } = extractPattern(node);

      if (!patternNode) {
        return;
      }

      if (isDynamic) {
        // The pattern is built, but the program decides every part of it —
        // a loop counter, a module constant, `CONST_ARRAY.join('|')`. Nothing
        // outside the process can change what this compiles to.
        if (isBuildTimeConstant(patternNode, context.sourceCode)) {
          return;
        }
      } else if (allowLiterals && length <= maxPatternLength) {
        return;
      }

      const vulnerability = detectVulnerability(pattern, isDynamic);

      // `detectVulnerability` always returns non-null when `isDynamic` is
      // true (either a matched REGEXP_PATTERNS entry or its own generic
      // "dynamic" object), so `vulnerability` can only be null when
      // `isDynamic` is false — meaning a synthetic `isDynamic ? {...} :
      // Both branches of `detectVulnerability` return an object — the dynamic
      // one and the literal-construction one — so there is no null to guard.
      const riskLevel = determineRiskLevel(vulnerability);
      const steps = generateRefactoringSteps(vulnerability);

      context.report({
        node,
        messageId: 'regexpReDoS',
        data: {
          pattern: pattern.substring(0, 30) + (pattern.length > 30 ? '...' : ''),
          riskLevel,
          vulnerability: vulnerability.vulnerability,
          safeAlternative: vulnerability.safeAlternative,
          steps,
          effort: vulnerability.effort
        },
        suggest: [
          {
            messageId: 'useStaticRegex',
            fix: () => null
          },
          {
            messageId: 'validateInput',
            fix: () => null
          },
          {
            messageId: 'useRegexLibrary',
            fix: () => null
          },
          {
            messageId: 'addTimeout',
            fix: () => null
          },
          {
            messageId: 'escapeUserInput',
            fix: () => null
          }
        ]
      });
    };

    return {
      CallExpression: checkRegExpCall,
      NewExpression: checkRegExpCall
    };
  },
});
