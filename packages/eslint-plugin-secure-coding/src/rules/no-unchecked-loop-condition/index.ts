/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-unchecked-loop-condition
 * Detects unchecked loop conditions that could cause DoS (CWE-400, CWE-606)
 *
 * Loops with unchecked conditions can cause denial of service by consuming
 * excessive CPU time or memory. This includes infinite loops, loops with
 * user-controlled bounds, and loops without proper termination conditions.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe loop patterns with clear termination
 * - Development/debugging loops
 * - JSDoc annotations (@safe-loop, @intentional)
 * - Timeout protections
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  unwrapTypeSyntax,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'uncheckedLoopCondition'
  | 'infiniteLoop'
  | 'userControlledLoopBound'
  | 'missingLoopTermination'
  | 'largeLoopBound'
  | 'unsafeRecursion';

export interface Options extends SecurityRuleOptions {
  /** Maximum allowed loop iterations for static analysis */
  maxStaticIterations?: number;

  /** Variables that contain user input */
  userInputVariables?: string[];

  /** Allow while(true) loops with breaks */
  allowWhileTrueWithBreak?: boolean;

  /** Maximum recursion depth to allow */
  maxRecursionDepth?: number;
}

type RuleOptions = [Options?];

export const noUncheckedLoopCondition = createRule<RuleOptions, MessageIds>({
  name: 'no-unchecked-loop-condition',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-unchecked-loop-condition.md',
      description: 'Detects unchecked loop conditions that could cause DoS',
      cwe: 'CWE-400',
    },
    messages: {
      uncheckedLoopCondition: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unchecked Loop Condition',
        cwe: 'CWE-400',
        description:
          'Loop condition may cause DoS through excessive iterations',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/400.html',
      }),
      infiniteLoop: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Infinite Loop',
        cwe: 'CWE-400',
        description: 'Loop may run indefinitely',
        severity: 'CRITICAL',
        fix: 'Add termination condition or iteration limit',
        documentationLink: 'https://cwe.mitre.org/data/definitions/400.html',
      }),
      userControlledLoopBound: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'User Controlled Loop Bound',
        cwe: 'CWE-606',
        description: 'Loop bound controlled by user input',
        severity: 'HIGH',
        fix: 'Limit maximum iterations or validate input',
        documentationLink: 'https://cwe.mitre.org/data/definitions/606.html',
      }),
      missingLoopTermination: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Loop Termination',
        cwe: 'CWE-400',
        description: 'Loop lacks clear termination condition',
        severity: 'MEDIUM',
        fix: 'Add explicit termination condition',
        documentationLink: 'https://cwe.mitre.org/data/definitions/400.html',
      }),
      largeLoopBound: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Large Loop Bound',
        cwe: 'CWE-400',
        description: 'Loop may iterate excessively',
        severity: 'MEDIUM',
        fix: 'Limit maximum iterations',
        documentationLink: 'https://cwe.mitre.org/data/definitions/400.html',
      }),
      unsafeRecursion: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Recursion',
        cwe: 'CWE-674',
        description: 'Recursive function may cause stack overflow',
        severity: 'HIGH',
        fix: 'Add recursion depth limit or use iterative approach',
        documentationLink: 'https://cwe.mitre.org/data/definitions/674.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxStaticIterations: {
            type: 'number',
            minimum: 100,
            default: 10000,
            description:
              'Literal iteration count above which a loop is reported',
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
            ],
            description: 'Variable names treated as user-controlled input',
          },
          allowWhileTrueWithBreak: {
            type: 'boolean',
            default: true,
            description:
              'Allow `while (true)` when the body contains a `break`',
          },
          maxRecursionDepth: {
            type: 'number',
            minimum: 1,
            default: 10,
            description: 'Recursion depth above which a call is reported',
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional function names to consider as loop protectors',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional JSDoc annotations to consider as safe markers',
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
      maxStaticIterations: 10000,
      userInputVariables: [
        'req',
        'request',
        'body',
        'query',
        'params',
        'input',
        'data',
      ],
      allowWhileTrueWithBreak: true,
      maxRecursionDepth: 10,
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      maxStaticIterations = 10000,
      userInputVariables = [
        'req',
        'request',
        'body',
        'query',
        'params',
        'input',
        'data',
      ],
      allowWhileTrueWithBreak = true,
      maxRecursionDepth = 10,
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode;
    const filename = context.filename;

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    // Track function calls to detect recursion
    const functionCalls = new Map<string, number>();
    const reportedRecursion = new Set<string>();
    const currentFunctionStack: string[] = [];

    // Track tainted variables (assigned from user input)
    const taintedVariables = new Set<string>();

    /**
     * Names that actually denote a request. Taint starts here and spreads by
     * assignment — it is not inferred from what a variable is called.
     *
     * The `body`/`query`/`params`/`input`/`data` entries in the default
     * `userInputVariables` are *properties* of one of these, not standalone
     * evidence: `req.query` is user input, a local `query` object is not.
     */
    const REQUEST_OBJECTS = new Set([
      'req',
      'request',
      'ctx',
      'context',
      'event',
    ]);

    /**
     * Check if a variable contains user input
     */
    const isUserInput = (varName: string): boolean => {
      // Check if it's a tainted variable (assigned from user input)
      if (taintedVariables.has(varName)) {
        return true;
      }

      // Check if it's a known user input variable
      const lowerVarName = varName.toLowerCase();

      // If custom userInputVariables are specified (not the defaults), only use those
      const isUsingDefaults =
        userInputVariables.length === 7 && // default length
        userInputVariables.includes('req') &&
        userInputVariables.includes('input');

      if (!isUsingDefaults) {
        // Custom userInputVariables specified, only check those
        return userInputVariables.some(
          (input) => lowerVarName === input.toLowerCase(),
        );
      }

      // Using defaults: a *request object* name is evidence; a bare noun is
      // not. The previous form substring-matched the identifier against all
      // seven defaults and additionally OR-ed in `includes('input')` and
      // `includes('data')` unconditionally, so every one of these read as
      // attacker-controlled:
      //
      //   metadataMap   dataSource   queryBuilder   requestId   bodyParser
      //
      // Worse, the guess propagated: a variable assigned from a "tainted"
      // one joins `taintedVariables`, so `const found = coll.find(query)`
      // made `found` tainted and every `for (const r of found)` a finding.
      // 25 of this rule's 28 findings on the wild corpus started that way,
      // as did the ILB-CWE-Corpus false positive — whose only sin was a
      // parameter named `input`:
      //
      //   function stripTags(input) { … do { … } while (current !== previous); }
      //
      // `req.query` is evidence. `query` is a name.
      return REQUEST_OBJECTS.has(lowerVarName);
    };

    /**
     * REMOVED: two printed-source DoS heuristics.
     *
     * `checkComplexDoSPatterns` matched `sourceCode.getText(condition)` against
     * `.match(`, `.test(`, `page` + `pageSize`, and `*` + `limit`.
     * `checkComplexDoSPatternsInScope` matched it against `startIndex` /
     * `endIndex`. Both reported `userControlledLoopBound` - a CWE-606 finding
     * asserting that a client chose the bound - on the strength of characters
     * appearing in the rendered text of the test expression.
     *
     * The rule ledger flags this rule for `textual-matching` and gives the
     * probe: put the matched text in a string literal or a comment inside
     * otherwise-clean code. Both halves of the probe reported:
     *
     *   while (source.slice(c, c + 7) !== ".match(") { c += 1; }   // REPORTED
     *   while (source.slice(c, c + 7) !== ".nope(")  { c += 1; }   // quiet
     *
     *   for (let i = 0; i < ((endIndex)) rows.length; i++) {}       // REPORTED,
     *      where ((endIndex)) stands for a COMMENT naming endIndex;
     *      the same loop without the comment is quiet.
     *
     * A hand-written lexer scanning for the text `.match(` was reported as a
     * user-controlled loop bound, and so was a loop whose only offence was a
     * comment. Two more, with no string or comment involved:
     *
     *   while (page < totalPages && pageSize > 0) { … }            // REPORTED
     *   for (let i = startIndex; i < endIndex; i++) { … }          // REPORTED
     *
     * with `totalPages` derived from a database count and both indices derived
     * from `rows.length`.
     *
     * There is no structural version of these checks to write. `page` next to
     * `pageSize` is not evidence of anything, and a regex call in a loop
     * condition is `no-redos-vulnerable-regex` / `detect-non-literal-regexp`
     * territory - the ledger already flags this rule for `duplicate-coverage`
     * with the latter. The genuinely user-controlled cases they used to catch
     * are caught by `involvesUserInput`, which follows the value.
     */

    /**
     * Is this collection size-checked before the loop runs?
     *
     * Two things were wrong with the previous form. It compared
     * `sourceCode.getText(test)` against `sourceCode.getText(collection)` with
     * `String.includes`, so `items` matched inside `filteredItems`; and it only
     * looked at ANCESTOR `if` statements, so it saw
     *
     *   if (Array.isArray(items) && items.length < MAX) { for (const x of items) … }
     *
     * and missed the guard clause everybody actually writes:
     *
     *   if (!Array.isArray(items) || items.length > MAX) return res.status(400)…;
     *   for (const x of items) …
     *
     * The guard is a preceding SIBLING, not an ancestor. This walks the
     * statements of the enclosing block that come before the loop as well, and
     * compares BINDINGS resolved through scope rather than printed text.
     */
    const checkIfCollectionIsValidated = (
      forOfNode: TSESTree.ForOfStatement,
      collection: TSESTree.Expression,
    ): boolean => {
      const guarded = collection;

      /** Does this `if` test size-check the same binding? */
      const validates = (test: TSESTree.Node): boolean => {
        let sawArrayCheck = false;
        let sawLengthComparison = false;
        const walk = (node: TSESTree.Node): void => {
          if (
            node.type === 'CallExpression' &&
            node.callee.type === 'MemberExpression' &&
            !node.callee.computed &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'Array' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'isArray' &&
            node.arguments.some(
              (a) => a.type !== 'SpreadElement' && samePath(a, guarded),
            )
          ) {
            sawArrayCheck = true;
          }
          if (
            node.type === 'BinaryExpression' &&
            ['<', '<=', '>', '>=', '===', '==', '!==', '!='].includes(
              node.operator,
            )
          ) {
            for (const side of [node.left, node.right]) {
              if (
                side.type === 'MemberExpression' &&
                !side.computed &&
                side.property.type === 'Identifier' &&
                side.property.name === 'length' &&
                samePath(side.object, guarded)
              ) {
                sawLengthComparison = true;
              }
            }
          }
          // One guard, two callers. Named child slots are frequently absent
          // (`argument` on a BinaryExpression), so the negative arm is real
          // there; every element of an `arguments` array is always a node, so
          // duplicating the guard inline created a second copy whose negative
          // arm no parser could reach.
          const walkIfNode = (value: unknown): void => {
            if (value && typeof value === 'object' && 'type' in value)
              walk(value as TSESTree.Node);
          };
          for (const key of [
            'left',
            'right',
            'argument',
            'expression',
            'test',
            'object',
            'callee',
          ] as const) {
            walkIfNode((node as unknown as Record<string, unknown>)[key]);
          }
          const args = (node as unknown as { arguments?: unknown[] }).arguments;
          if (Array.isArray(args)) {
            for (const a of args) walkIfNode(a);
          }
        };
        walk(test);
        return sawArrayCheck && sawLengthComparison;
      };

      // Enclosing `if` statements…
      for (
        let current: TSESTree.Node | undefined = forOfNode.parent;
        current;
        current = current.parent as TSESTree.Node | undefined
      ) {
        if (current.type === 'IfStatement' && validates(current.test))
          return true;
        if (
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression' ||
          current.type === 'ArrowFunctionExpression'
        ) {
          break;
        }
      }

      // …and guard clauses earlier in the same block.
      for (
        let current: TSESTree.Node | undefined = forOfNode;
        current;
        current = current.parent as TSESTree.Node | undefined
      ) {
        const parent = current.parent as TSESTree.Node | undefined;
        if (parent?.type === 'BlockStatement' || parent?.type === 'Program') {
          const body = parent.body as TSESTree.Statement[];
          // `current` was reached through `current.parent`, so it is always a
          // member of `parent.body` and `indexOf` cannot return -1. The former
          // `index >= 0 ? … : []` fallback was therefore permanently uncovered.
          const index = body.indexOf(current as TSESTree.Statement);
          for (const statement of body.slice(0, index)) {
            if (statement.type === 'IfStatement' && validates(statement.test))
              return true;
          }
        }
        if (
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression' ||
          current.type === 'ArrowFunctionExpression'
        ) {
          break;
        }
      }

      return false;
    };

    /** The variable this identifier resolves to, or null for an undeclared global. */
    const resolveVariable = (
      node: TSESTree.Identifier,
    ): TSESLint.Scope.Variable | null => {
      const scope = sourceCode.getScope(node);
      for (
        let current: typeof scope | null = scope;
        current;
        current = current.upper
      ) {
        const variable = current.variables.find((v) => v.name === node.name);
        if (variable) return variable;
      }
      return null;
    };

    /**
     * Do two expressions read the same value?
     *
     * Identifiers are compared by the BINDING they resolve to, so `items`
     * inside `filteredItems` is not a match - which is what
     * `getText(test).includes(getText(collection))` used to do. Property hops
     * are compared name by name down the chain, so `req.body.items` in the
     * guard matches `req.body.items` in the loop and nothing else.
     */
    const samePath = (left: TSESTree.Node, right: TSESTree.Node): boolean => {
      const a = unwrapTypeSyntax(left) as TSESTree.Node;
      const b = unwrapTypeSyntax(right) as TSESTree.Node;
      if (a.type === 'Identifier' && b.type === 'Identifier') {
        const va = resolveVariable(a);
        const vb = resolveVariable(b);
        // Two undeclared globals can only be compared by name.
        return va || vb ? va === vb : a.name === b.name;
      }
      if (a.type === 'MemberExpression' && b.type === 'MemberExpression') {
        return (
          !a.computed &&
          !b.computed &&
          a.property.type === 'Identifier' &&
          b.property.type === 'Identifier' &&
          a.property.name === b.property.name &&
          samePath(a.object, b.object)
        );
      }
      return false;
    };

    /**
     * Is this expression bounded by a `Math.min` / `Math.max` ceiling?
     *
     * Matched on the AST against the `Math` global, so a call on something else
     * that happens to be spelled the same way, and the same text inside a
     * string or a comment, are not it.
     */
    const isClamped = (node: TSESTree.Node): boolean => {
      const expression = unwrapTypeSyntax(node) as TSESTree.Node;
      if (
        expression.type === 'CallExpression' &&
        expression.callee.type === 'MemberExpression' &&
        !expression.callee.computed &&
        expression.callee.object.type === 'Identifier' &&
        expression.callee.object.name === 'Math' &&
        expression.callee.property.type === 'Identifier' &&
        // @vocabulary Math API
        ['min', 'max'].includes(expression.callee.property.name)
      ) {
        return true;
      }
      if (
        expression.type === 'BinaryExpression' ||
        expression.type === 'LogicalExpression'
      ) {
        return isClamped(expression.left) || isClamped(expression.right);
      }
      if (expression.type === 'ConditionalExpression') {
        return (
          isClamped(expression.consequent) && isClamped(expression.alternate)
        );
      }
      return false;
    };

    /**
     * Check if an expression involves user input
     */
    const involvesUserInput = (expression: TSESTree.Expression): boolean => {
      // A printed-source substring test used to run first here:
      //
      //   const expressionText = sourceCode.getText(expression).toLowerCase();
      //   if (userInputVariables.some(i => expressionText.includes(i))) return true;
      //
      // It short-circuited the AST walk below and matched the seven default
      // names anywhere in the rendered text — inside a longer identifier, a
      // property name, a string literal or a comment. `orderByExtractFromRequest`
      // and `LoggerRequestIdHeaders` were both findings on that basis. The
      // structural walk that follows was already the correct check; it just
      // never got to run.

      // Recursively check all parts of the expression
      const checkExpression = (raw: TSESTree.Expression): boolean => {
        // `(req.query.count as unknown as number)` reads exactly what
        // `req.query.count` reads. Express types `req.query.x` as
        // `string | string[] | ParsedQs | undefined`, so a TypeScript codebase
        // CANNOT use it as a loop bound without a cast - which means the rule
        // did not fire on TypeScript Express code at all.
        const node = unwrapTypeSyntax(raw) as TSESTree.Expression;
        if (node.type === 'MemberExpression') {
          // `.length` is a MEASUREMENT of data that has already been
          // materialised, not a count the client can inflate.
          // `Object.keys(req.body).length` is the number of fields the body
          // parser already built; iterating it is bounded by memory that
          // exists. `req.body.count` is a number the client chose. Reading the
          // object's name and ignoring which property was taken from it made
          // those two identical, and reported every
          // `for (let i = 0; i < fields.length; i++)` downstream of a request.
          if (
            !node.computed &&
            node.property.type === 'Identifier' &&
            node.property.name === 'length'
          ) {
            return false;
          }
          // Check object part (e.g., req, request, body, query, params)
          const objectText = sourceCode.getText(node.object);
          if (isUserInput(objectText)) {
            return true;
          }
          // Recursively check nested member expressions
          return checkExpression(node.object);
        }
        if (node.type === 'Identifier') {
          return isUserInput(node.name);
        }
        if (node.type === 'CallExpression') {
          // Check for Math.min, parseInt, etc. with user input
          return (
            checkExpression(node.callee) ||
            node.arguments
              .filter(
                (
                  arg: TSESTree.CallExpressionArgument,
                ): arg is TSESTree.Expression => arg.type !== 'SpreadElement',
              )
              .some((arg: TSESTree.Expression) => checkExpression(arg))
          );
        }
        if (node.type === 'LogicalExpression') {
          // `LogicalExpression` was missing entirely, so the single most common
          // way to read a bound off a request went untracked:
          //
          //   const pageSize = parseInt(req.query.pageSize) || 10;
          //
          // A `||` default does not bound the value - it only replaces the
          // falsy case, and `?pageSize=1e9` is not falsy.
          //
          // `&&` is different, and the difference is the value the expression
          // produces: `a && b` evaluates to `b` whenever `a` is truthy, so the
          // taint follows the RIGHT operand. That is what makes
          // `req.body.items && req.body.items.length` a length rather than a
          // request value.
          return node.operator === '&&'
            ? checkExpression(node.right as TSESTree.Expression)
            : checkExpression(node.left as TSESTree.Expression) ||
                checkExpression(node.right as TSESTree.Expression);
        }
        if (node.type === 'BinaryExpression') {
          // Check both sides of binary expressions
          return (
            checkExpression(node.left as TSESTree.Expression) ||
            checkExpression(node.right as TSESTree.Expression)
          );
        }
        if (node.type === 'UpdateExpression') {
          // Check update expressions like i++, ++i
          return checkExpression(node.argument);
        }
        if (node.type === 'UnaryExpression') {
          // Check unary expressions like -x, +x, !x
          return checkExpression(node.argument);
        }
        return false;
      };

      return checkExpression(expression);
    };

    /**
     * Check if a loop has a break statement
     */
    const hasBreakStatement = (loopBody: TSESTree.Statement): boolean => {
      let hasBreak = false;
      const visited = new Set<TSESTree.Node>();

      const checkNode = (node: TSESTree.Node, depth = 0): void => {
        // Prevent infinite recursion
        if (depth > 10 || visited.has(node)) {
          return;
        }
        visited.add(node);

        if (node.type === 'BreakStatement') {
          hasBreak = true;
          return;
        }

        // Check child nodes
        for (const key in node) {
          const child = (node as unknown as Record<string, unknown>)[key];
          if (child && typeof child === 'object') {
            if ('type' in child) {
              checkNode(child as TSESTree.Node, depth + 1);
            } else if (Array.isArray(child)) {
              child.forEach((item) => {
                if (item && typeof item === 'object' && 'type' in item) {
                  checkNode(item, depth + 1);
                }
              });
            }
          }
        }
      };

      checkNode(loopBody);
      return hasBreak;
    };

    /**
     * Is this self-call reached unconditionally from the function's body?
     *
     * Walking up from the call to the function that encloses it, nothing may
     * branch: no `if`, no ternary, no `&&`/`||`/`??` short-circuit, no `switch`
     * case, no loop, no `try`. A call that survives that walk runs on every
     * invocation, so the function recurses forever.
     */
    const isUnconditionalSelfCall = (call: TSESTree.Node): boolean => {
      const BRANCHING = new Set([
        'IfStatement',
        'ConditionalExpression',
        'LogicalExpression',
        'SwitchStatement',
        'SwitchCase',
        'ForStatement',
        'ForInStatement',
        'ForOfStatement',
        'WhileStatement',
        'DoWhileStatement',
        'TryStatement',
        'CatchClause',
      ]);
      let child: TSESTree.Node = call;
      for (
        let current: TSESTree.Node | undefined = call.parent as
          TSESTree.Node | undefined;
        current;
        child = current, current = current.parent as TSESTree.Node | undefined
      ) {
        if (BRANCHING.has(current.type)) return false;
        // A guard clause EARLIER in the block is a base case even though it is
        // a sibling rather than an ancestor:
        //
        //   function factorial(n, depth = 0) {
        //     if (depth > 10) return 1;
        //     return n * factorial(n - 1, depth + 1);
        //   }
        //
        // Nothing branches above the recursive call, and the function still
        // terminates. Reporting it would punish the correct remediation.
        if (current.type === 'BlockStatement') {
          // `child` is the node we just ascended from, so it is always present
          // in `current.body`; the former `index >= 0 ? … : []` fallback was
          // permanently uncovered for the same reason as the one above.
          const index = current.body.indexOf(child as TSESTree.Statement);
          const preceding = current.body.slice(0, index);
          if (
            preceding.some(
              (statement) =>
                statement.type === 'IfStatement' && exits(statement),
            )
          ) {
            return false;
          }
        }
        if (
          current.type === 'FunctionDeclaration' ||
          current.type === 'FunctionExpression' ||
          current.type === 'ArrowFunctionExpression'
        ) {
          return true;
        }
      }
      return false;
    };

    /** Does this subtree contain a `return` or a `throw`? */
    const exits = (node: TSESTree.Node): boolean => {
      if (node.type === 'ReturnStatement' || node.type === 'ThrowStatement')
        return true;
      for (const key in node) {
        const child = (node as unknown as Record<string, unknown>)[key];
        if (key === 'parent' || !child || typeof child !== 'object') continue;
        if ('type' in child) {
          if (exits(child as TSESTree.Node)) return true;
        } else if (Array.isArray(child)) {
          for (const item of child) {
            if (
              item &&
              typeof item === 'object' &&
              'type' in item &&
              exits(item)
            )
              return true;
          }
        }
      }
      return false;
    };

    /**
     * Estimate loop iterations from static analysis.
     *
     * Only ever called from the ForStatement visitor below with its own
     * `node`, so `loop` is always a ForStatement in practice; the parameter
     * type reflects that (a prior `TSESTree.ForStatement | WhileStatement |
     * DoWhileStatement` signature carried a redundant `loop.type ===
     * 'ForStatement'` guard around the whole body that could never be
     * false through any real call site).
     */
    // oxlint-disable-next-line consistent-function-scoping
    const estimateIterations = (loop: TSESTree.ForStatement): number | null => {
      // Try to parse for loop bounds
      const test = loop.test;
      if (test && test.type === 'BinaryExpression') {
        // Look for patterns like i < limit or i <= limit
        if (
          test.operator === '<' ||
          test.operator === '<=' ||
          test.operator === '>' ||
          test.operator === '>='
        ) {
          const right = test.right;
          if (right.type === 'Literal' && typeof right.value === 'number') {
            return Math.abs(right.value);
          }
        }
      }

      return null;
    };

    return {
      // Track variable declarations for tainting
      VariableDeclaration(node: TSESTree.VariableDeclaration) {
        for (const declarator of node.declarations) {
          if (declarator.id.type === 'Identifier' && declarator.init) {
            const varName = declarator.id.name;

            // Seed taint structurally, from the initializer's AST. This was a
            // substring test over the initializer's printed text against the
            // same seven names, and it is where the whole rule went wrong:
            //
            //   let current = String(input);   // 'String(input)' contains
            //                                  // 'input' → `current` tainted
            //   do { … } while (current !== previous);   // → reported
            //
            // The ILB-CWE-Corpus CWE-116 fixture is that exact code, and its
            // loop provably terminates — the string shrinks on every pass.
            // Its only offence was a parameter named `input`.
            const hasUserInput = involvesUserInput(declarator.init);
            // A CLAMP bounds the value. A PARSE does not.
            //
            // This used to be five substring tests over the initializer's
            // printed text, and two of them were `parseInt(` and `parseFloat(`.
            // Parsing changes an attacker's value from a string to a number and
            // leaves its magnitude alone:
            //
            //   const limit = parseInt(req.query.limit, 10);
            //   for (let i = 0; i < limit; i++) { … }        // ?limit=99999999
            //
            // was treated as sanitized and reported nothing. `Math.min` /
            // `Math.max` are the only two that impose a ceiling, and they are
            // now matched structurally on the `Math` global rather than found
            // in the rendered text - where `notMath.min(` and a `Math.min(`
            // inside a string or a comment counted just as well.
            const isSanitized = isClamped(declarator.init);

            if (hasUserInput && !isSanitized) {
              taintedVariables.add(varName);
            }
          }
        }
      },

      // Track function declarations and calls for recursion detection
      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        if (node.id) {
          currentFunctionStack.push(node.id.name);
        }
      },

      'FunctionDeclaration:exit'(node: TSESTree.FunctionDeclaration) {
        if (
          node.id &&
          currentFunctionStack[currentFunctionStack.length - 1] === node.id.name
        ) {
          currentFunctionStack.pop();
        }
      },

      // Track function calls
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        if (callee.type === 'Identifier') {
          const functionName = callee.name;
          const currentFunction =
            currentFunctionStack[currentFunctionStack.length - 1];

          // Check for recursion
          if (currentFunction && functionName === currentFunction) {
            const callCount = (functionCalls.get(functionName) || 0) + 1;
            functionCalls.set(functionName, callCount);

            if (!reportedRecursion.has(functionName)) {
              // TWO HARDCODED FUNCTION NAMES USED TO LIVE HERE:
              //
              //   const isTreeTraversal = currentFunction === 'traverseObject';
              //   if (callCount > maxRecursionDepth
              //       || currentFunction === 'recursiveFunc'
              //       || isTreeTraversal) { … }
              //
              // Both names are fixtures out of this rule's own test file. And
              // `callCount` counts recursive call SITES, not depth, so the
              // remaining disjunct needs ELEVEN self-calls written inside one
              // function before it fires. The practical effect was that
              // `unsafeRecursion` reported on exactly two spellings and nothing
              // else:
              //
              //   function traverseObject(n) { … traverseObject(c) … }  REPORTED
              //   function recursiveFunc(n)  { recursiveFunc(n - 1) }   REPORTED
              //   function walk(n)           { … walk(c) … }            quiet
              //
              // What replaces them is the one thing about recursion that can be
              // decided from the syntax alone: a self-call on a path with no
              // branch above it never terminates, whatever the function is
              // called. Depth-unbounded-but-conditional recursion
              // (`if (child) walk(child)`) is a real CWE-674 exposure and is NOT
              // decidable here - it needs a bound on the input's depth. That is
              // recorded as a known miss in the rule corpus rather than guessed
              // at from a name.
              if (
                callCount > maxRecursionDepth ||
                isUnconditionalSelfCall(node)
              ) {
                if (safetyChecker.isSafe(node, context)) {
                  return;
                }

                reportedRecursion.add(functionName);
                context.report({
                  node,
                  messageId: 'unsafeRecursion',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
              }
            }
          }
        }
      },

      // Check while statements
      WhileStatement(node: TSESTree.WhileStatement) {
        const test = node.test;

        // Check for while(true) or while(true) with potential infinite loop
        if (test.type === 'Literal' && test.value === true) {
          // Check if it has a break statement
          const hasBreak = hasBreakStatement(node.body);

          if (allowWhileTrueWithBreak && hasBreak) {
            // Allow while(true) with break if configured
            return;
          }

          // Report infinite loop for while(true) without break
          context.report({
            node,
            messageId: 'infiniteLoop',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // Check for user-controlled loop conditions
        if (involvesUserInput(test)) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: test,
            messageId: 'userControlledLoopBound',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // REMOVED: a state-dependent-flag check that read the CONDITION
        // VARIABLE'S NAME:
        //
        //   varName.toLowerCase().includes('continue') || …('running')
        //     || …('active') || …('enabled')   -> messageId 'infiniteLoop'
        //
        // `while (isActive) { … }` was reported as an Infinite Loop and
        // `while (isReady) { … }` was not, on identical control flow. A
        // supervisor loop driven by a flag the body clears is how every worker,
        // poller and game loop is written, and the flag is the reason it
        // terminates rather than evidence that it does not. The check also
        // fired regardless of whether the body contained a `break`.
        //
        // Substring matching on an identifier in a REPORTING path is banned
        // outright by CLAUDE.md, and this was four of them.
      },

      // Check for statements
      ForStatement(node: TSESTree.ForStatement) {
        // Check for for(;;) infinite loops
        if (!node.test && !node.update) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node,
            messageId: 'infiniteLoop',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // Check for missing test condition (for(;condition;))
        if (!node.test) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node,
            messageId: 'missingLoopTermination',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // Check for user-controlled loop bounds
        if (involvesUserInput(node.test)) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: node.test,
            messageId: 'userControlledLoopBound',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
          return;
        }

        // Check for potentially large iteration counts
        const estimatedIterations = estimateIterations(node);
        if (estimatedIterations && estimatedIterations > maxStaticIterations) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: node.test,
            messageId: 'largeLoopBound',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      },

      // Check do-while statements
      DoWhileStatement(node: TSESTree.DoWhileStatement) {
        const test = node.test;

        // Check for user-controlled conditions
        if (involvesUserInput(test)) {
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: test,
            messageId: 'userControlledLoopBound',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
            },
          });
        }
      },

      // Check for-in and for-of statements
      ForInStatement(node: TSESTree.ForInStatement) {
        const right = node.right;

        // Check if iterating over user-controlled collections
        if (involvesUserInput(right)) {
          // This could be problematic if the collection is very large
          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: right,
            messageId: 'uncheckedLoopCondition',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
              severity: 'MEDIUM',
              safeAlternative: 'Limit collection size or add iteration timeout',
            },
          });
        }
      },

      ForOfStatement(node: TSESTree.ForOfStatement) {
        const right = node.right;

        // Check if iterating over user-controlled collections
        if (involvesUserInput(right)) {
          // Check if the collection is validated in the same context
          const isValidated = checkIfCollectionIsValidated(node, right);
          if (isValidated) {
            return; // Collection is validated, safe to iterate
          }

          if (safetyChecker.isSafe(node, context)) {
            return;
          }

          context.report({
            node: right,
            messageId: 'uncheckedLoopCondition',
            data: {
              filePath: filename,
              line: String(node.loc?.start.line ?? 0),
              severity: 'MEDIUM',
              safeAlternative: 'Limit collection size before iteration',
            },
          });
        }
      },
    };
  },
});
