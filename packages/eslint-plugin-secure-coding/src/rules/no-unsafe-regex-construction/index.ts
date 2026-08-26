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
import {
  formatLLMMessage,
  MessageIcons,
  resolveModuleBinding,
  unwrapTypeSyntax,
  staticString,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'unsafeRegexConstruction'
  | 'escapeUserInput';

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
] as const;

/**
 * `escape` and `sanitize` used to be on that list and were removed, because
 * neither of them does the job the list is about.
 *
 * The global `escape()` is URL/percent escaping: `.` `*` `+` `?` `(` `)` `[`
 * `]` `|` all pass through it unchanged, so `new RegExp(escape(userInput))` is
 * a catastrophic-backtracking DoS that this rule was silently blessing. An HTML
 * `sanitize()` is the same story for a different character set. And because
 * both names are generic, any LOCAL function wearing one — `function
 * sanitize(v) { return v.trim(); }` — switched the rule off for the whole
 * expression.
 *
 * A user whose `sanitize` really does escape regex metacharacters can still say
 * so via `trustedEscapingFunctions`. The default must not assume it.
 */

// Inline regex-metacharacter escape, appended to the flagged expression by the
// `escapeUserInput` suggestion fixer. No `escapeRegExp` helper exists in user
// code, so the fix must be self-contained rather than calling one.
// `${}` here are regex metacharacters inside a character class, not a template
// placeholder — the string is a literal `.replace(...)` snippet inserted by the fixer.
// eslint-disable-next-line no-template-curly-in-string
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
function taintSource(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  depth = 0,
): string | null {
  if (depth > 6) return null;

  // `req.query.q as string` reads exactly what `req.query.q` reads — the cast is
  // erased at compile time. Without this line the whole walker falls through to
  // `return null`, and since Express types `req.query.q` as
  // `string | string[] | ParsedQs | undefined`, a TypeScript handler CANNOT pass
  // it to `new RegExp` without the cast. The rule therefore reported nothing at
  // all on TypeScript Express code — the majority of its audience — while
  // passing every test, because no test in this suite was written with a cast.
  const unwrapped = unwrapTypeSyntax(node);
  if (unwrapped !== node) return taintSource(unwrapped, scope, depth + 1);

  if (node.type === 'TemplateLiteral') {
    for (const expression of node.expressions) {
      const found = taintSource(expression, scope, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return (
      taintSource(node.left as TSESTree.Node, scope, depth + 1) ??
      taintSource(node.right, scope, depth + 1)
    );
  }

  if (node.type === 'AwaitExpression') {
    return taintSource(node.argument, scope, depth + 1);
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
      if (
        REQUEST_ROOTS.has(root.name) &&
        properties.some((p) => REQUEST_PROPERTIES.has(p)) &&
        isInboundRequestBinding(root, scope)
      ) {
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
      const found = taintSource(arg, scope, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  // One binding hop. `const filter = req.query.filter; new RegExp(filter)` is
  // how every real handler is written — nobody inlines the sink argument — and
  // the provenance is fully attributable, so refusing to follow it was a false
  // negative on the DOMINANT shape rather than a deliberate abstention.
  //
  // Resolution is by ESLint's own scope analysis, never by the identifier's
  // spelling. EVERY write is examined, not just a single one: a `let` whose
  // writes are all literals is fixed, but
  //
  //   let pattern = DEFAULT_PATTERN;
  //   if (req.query.pattern) pattern = req.query.pattern;
  //   new RegExp(pattern);
  //
  // is the conditional-override idiom every options-merging handler is built
  // from, and one tainted write is enough to taint what reaches the engine.
  if (node.type === 'Identifier') {
    const variable = lookupVariable(node.name, scope);
    if (!variable) return null;
    for (const reference of variable.references) {
      if (!reference.isWrite() || !reference.writeExpr) continue;
      const found = taintSource(reference.writeExpr, scope, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  return null;
}

/**
 * Is this root identifier actually the inbound request, or just spelled like it?
 *
 * `REQUEST_ROOTS` is a name test, and on its own that is the defect class this
 * repo exists to avoid. It reported
 *
 *   const request = Object.freeze({ query: { pattern: '^GET /v1/' } });
 *   new RegExp(request.query.pattern);
 *
 * — three module constants, nothing from outside the file — because the
 * spelling matched. The real request object arrives as a HANDLER PARAMETER
 * (`(req, res) => …`, `async (ctx) => …`) or, in a script fragment, as a free
 * variable this file cannot see the origin of. A binding declared here with an
 * initialiser is neither, and its contents are whatever the source says.
 *
 * So the name still SELECTS the candidate; the binding decides.
 */
function isInboundRequestBinding(
  root: TSESTree.Identifier,
  scope: TSESLint.Scope.Scope,
): boolean {
  const variable = lookupVariable(root.name, scope);
  // Unresolved: a free variable, an ambient global, or an out-of-scope import.
  // Provenance unknown, which is not the same as proven local.
  if (!variable || variable.defs.length === 0) return true;
  return variable.defs.every((def) => def.type === 'Parameter');
}

/** Resolve a name to its variable by walking outward from `scope`. */
function lookupVariable(
  name: string,
  scope: TSESLint.Scope.Scope,
): TSESLint.Scope.Variable | undefined {
  for (
    let current: TSESLint.Scope.Scope | null = scope;
    current;
    current = current.upper
  ) {
    const found = current.variables.find((v) => v.name === name);
    if (found) return found;
  }
  return undefined;
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
 * Escapers that are only ever reached as `object.method(...)`.
 *
 * Exact membership against a closed set of published API names — not a
 * substring test. `escape` and `sanitize` are deliberately NOT here: as bare
 * identifiers a user opted into them via `trustedEscapingFunctions`, but as
 * property names they would suppress on any receiver at all.
 */
const MEMBER_ESCAPERS: ReadonlySet<string> = new Set([
  'escapeRegExp',
  'escapeRegex',
  'escapeStringRegexp',
  'regexpEscape',
]);

/**
 * Packages that exist solely to escape a regex metacharacter set. Whatever the
 * local binding is called, this is what the function does.
 */
const ESCAPER_PACKAGES: ReadonlySet<string> = new Set([
  'escape-string-regexp',
  'lodash.escaperegexp',
  'escape-regexp',
  'regexp.escape',
]);

function isEscaperPackageBinding(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): boolean {
  const binding = resolveModuleBinding(callee, scope);
  if (binding && ESCAPER_PACKAGES.has(binding.module)) return true;
  // `lodash`'s own `escapeRegExp`, however the lodash import was spelled.
  return (
    binding?.module === 'lodash' && binding.path.at(-1) === 'escapeRegExp'
  );
}

/**
 * Does this callee denote the `RegExp` constructor?
 *
 * Either written directly, or reached through a binding whose writes all
 * resolve to it. Anything that resolves to something else is not it.
 */
function isRegExpConstructor(
  callee: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  depth = 0,
): boolean {
  if (depth > 4) return false;
  if (callee.type !== 'Identifier') return false;
  if (callee.name === 'RegExp') {
    // Shadowed by a local declaration of the same name? Then it is not the global.
    const shadow = lookupVariable('RegExp', scope);
    return shadow === undefined || shadow.defs.length === 0;
  }
  const variable = lookupVariable(callee.name, scope);
  if (!variable) return false;
  const writes = variable.references.filter((ref) => ref.isWrite());
  return (
    writes.length > 0 &&
    writes.every((ref) => {
      // `writeExpr` is nullable, so `!== undefined` does not narrow it. A write
      // whose expression cannot be read proves nothing about the binding.
      const written = ref.writeExpr;
      return written != null && isRegExpConstructor(written, scope, depth + 1);
    })
  );
}

function isTrustedMemberEscaper(callee: TSESTree.Node): boolean {
  if (callee.type !== 'MemberExpression' || callee.computed) return false;
  if (callee.property.type !== 'Identifier') return false;
  // The ES2025 built-in, identified by the global it hangs off.
  if (
    callee.property.name === 'escape' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'RegExp'
  ) {
    return true;
  }
  return MEMBER_ESCAPERS.has(callee.property.name);
}

/**
 * Check if a node is escaped (wrapped in an escaping function)
 */
function isEscaped(
  node: TSESTree.Node,
  trustedFunctions: string[],
  sourceCode: TSESLint.SourceCode,
  scope: TSESLint.Scope.Scope,
): boolean {
  // Check if the node itself is a call to a trusted escaping function
  if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
    const functionName = node.callee.name;
    if (trustedFunctions.includes(functionName)) {
      return true;
    }
  }

  // The escaper reached under a local alias.
  //
  //   const esc = require('escape-string-regexp');
  //   new RegExp(esc(req.query.q), 'i');
  //
  // is correctly escaped code, and it reported — because the check above asks
  // how the author spelled the binding, and `esc` is not one of the four
  // spellings on the list. The import says which function this is; the local
  // name never did.
  if (
    node.type === 'CallExpression' &&
    isEscaperPackageBinding(node.callee, scope)
  ) {
    return true;
  }

  // `RegExp.escape(x)` and `_.escapeRegExp(x)` — a trusted escaper reached
  // through a member expression rather than a bare identifier.
  //
  // `'RegExp.escape'` was already in the trusted list, but the check above
  // compares against `callee.name`, which only exists on an Identifier callee.
  // A dotted string can never equal an identifier name, so that entry was
  // unreachable and `new RegExp(RegExp.escape(req.query.q))` — the ES2025
  // built-in, shipped in Node 24, and the exact remediation this rule's own
  // suggestion open-codes — reported as unescaped user input.
  if (node.type === 'CallExpression' && isTrustedMemberEscaper(node.callee)) {
    return true;
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
    return !(staticString(flagsNode) !== null);
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
  scope: TSESLint.Scope.Scope,
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

  const taintedBy = taintSource(patternNode, scope);
  const isUserInputValue = taintedBy !== null;
  // Default trusted functions + user configured ones.
  //
  // `'RegExp.escape'` used to sit in this list and could never match: the
  // consumer of the list compares against an Identifier callee's `name`, and no
  // identifier is spelled with a dot. It is now recognised structurally in
  // `isEscaped` instead.
  const allTrustedFunctions = [
    ...new Set([...DEFAULT_TRUSTED_ESCAPING_FUNCTIONS, ...trustedFunctions]),
  ];

  const isEscapedValue = isEscaped(
    patternNode,
    allTrustedFunctions,
    sourceCode,
    scope,
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
      // Check for RegExp constructor, INCLUDING under a local alias.
      //
      // `const Pattern = RegExp; new Pattern(req.query.q)` compiles the same
      // pattern in the same engine, and matching on `callee.name === 'RegExp'`
      // could not see it. The alias is resolved through scope analysis back to
      // the unshadowed global, so a user's own class called `RegExp` (which
      // would be a resolvable local binding to something else) does not match.
      if (!isRegExpConstructor(node.callee, sourceCode.getScope(node))) {
        return;
      }

      const {
        patternNode,
        isUserInput: isUserInputValue,
        isEscaped: isEscapedValue,
      } = extractPattern(
        node,
        sourceCode,
        trustedEscapingFunctions,
        sourceCode.getScope(node),
      );

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
            // `validatePattern` and `useSafeLibrary` used to sit here with
            // `fix: () => null`. ESLint's report translator drops any
            // suggestion whose fix resolves to nothing, so neither ever
            // reached an editor — verified by linting
            // `new RegExp(req.query.q)` through `Linter#verify`, which
            // returns exactly one suggestion (`escapeUserInput`). Their
            // advice now lives in the main message's `fix:` text, which is
            // actually rendered.
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
        });
      }
    }

    return {
      CallExpression: checkRegExpCall,
      NewExpression: checkRegExpCall,
    };
  },
});
