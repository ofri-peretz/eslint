/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-await-in-loop
 * Disallow await inside loops without considering concurrency implications (unicorn-inspired)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, variableOf } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds =
  | 'awaitInLoop'
  | 'suggestPromiseAll'
  | 'suggestConcurrent'
  | 'considerSequential'
  | 'asyncLoopPattern';

export interface Options {
  /** Allow await in for-of loops */
  allowForOf?: boolean;
  /** Allow await in while loops */
  allowWhile?: boolean;
  /** Check for potential concurrent execution opportunities */
  checkConcurrency?: boolean;
}

interface LoopContext {
  loopType: string;
  operationCount: number;
  hasDependencies: boolean;
  isSequential: boolean;
  hasSideEffects: boolean;
  estimatedPerformance: string;
  operations: string[];
  node: TSESTree.Node;
}

type RuleOptions = [Options?];

const LOOP_NODE_TYPES = new Set<string>([
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
]);

/**
 * The slot of a loop header evaluated exactly once, before iteration begins.
 * An await there costs 1x latency rather than Nx, so it is not that loop's
 * sequential cost. Every other header slot — a `for` test/update, a `while`
 * test, a for-of binding default — re-runs per iteration and stays in scope.
 * Loops with no once-evaluated slot return null.
 */
function onceEvaluatedSlot(loop: TSESTree.Node): string | null {
  if (loop.type === 'ForOfStatement' || loop.type === 'ForInStatement') {
    return 'right';
  }
  if (loop.type === 'ForStatement') {
    return 'init';
  }
  return null;
}

const SKIP_KEYS = new Set(['parent', 'tokens', 'comments', 'loc', 'range']);

function isFunctionNode(node: TSESTree.Node): boolean {
  return (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression' ||
    node.type === 'ArrowFunctionExpression'
  );
}

/**
 * Visit `node` and every descendant evaluated in the same function: a nested
 * function runs in its own context, so its body is not this loop's code.
 */
function walkSameFunction(
  node: TSESTree.Node,
  visit: (n: TSESTree.Node) => void,
): void {
  visit(node);
  if (isFunctionNode(node)) return;
  for (const key in node) {
    if (SKIP_KEYS.has(key)) continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    const children = Array.isArray(child) ? child : [child];
    for (const item of children) {
      if (item && typeof item === 'object' && 'type' in item) {
        walkSameFunction(item as TSESTree.Node, visit);
      }
    }
  }
}

function someNode(
  node: TSESTree.Node | null | undefined,
  test: (n: TSESTree.Node) => boolean,
): boolean {
  if (!node) return false;
  let found = false;
  walkSameFunction(node, (n) => {
    found ||= test(n);
  });
  return found;
}

/**
 * Does this loop feed an awaited value into its own next iteration?
 *
 * Then the awaits cannot run concurrently, and the loop is the correct shape
 * (the docs' "When Sequential is Required"). An awaited value is carried when
 * it reaches — through declarations and assignments inside the loop — a
 * binding that something deciding the next iteration reads: the loop's test or
 * update (a cursor), the arguments of an await in the loop (an accumulator), or
 * the test of a branch that leaves the loop (`if (res.done) break`, a retry
 * that returns on success). A method call on a binding with the value as an
 * argument (`results.push(r)`) stores it in that binding. An awaited value
 * collected for later and never read back by the loop (`results.push(r)`,
 * `total += r`) is not carried: the work is independent.
 */
function carriesAwaitedValue(
  loop: TSESTree.Node,
  awaits: readonly TSESTree.AwaitExpression[],
  sourceCode: Readonly<TSESLint.SourceCode>,
): boolean {
  const awaitSet = new Set<TSESTree.Node>(awaits);
  const tainted = new Set<unknown>();
  const reads = (n: TSESTree.Node): boolean =>
    n.type === 'Identifier' && tainted.has(variableOf(n, sourceCode));
  const isTainted = (n: TSESTree.Node | null | undefined): boolean =>
    someNode(n, (m) => awaitSet.has(m) || reads(m));

  const writes: Array<[TSESTree.Identifier, TSESTree.Node | null]> = [];
  const exits: TSESTree.Node[] = [];
  walkSameFunction(loop, (n) => {
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') {
      writes.push([n.id, n.init]);
    } else if (
      n.type === 'AssignmentExpression' &&
      n.left.type === 'Identifier'
    ) {
      writes.push([n.left, n.right]);
    } else if (
      n.type === 'CallExpression' &&
      n.callee.type === 'MemberExpression' &&
      n.callee.object.type === 'Identifier'
    ) {
      // `results.push(r)` stores the value in `results`.
      writes.push([n.callee.object, n]);
    } else if (
      n.type === 'IfStatement' &&
      someNode(
        n,
        (m) => m.type === 'BreakStatement' || m.type === 'ReturnStatement',
      )
    ) {
      exits.push(n.test);
    }
  });

  for (let grew = true; grew;) {
    grew = false;
    for (const [id, value] of writes) {
      // An undeclared global resolves to no variable, and `undefined` must not
      // stand for every other unresolved name.
      const variable = variableOf(id, sourceCode);
      if (variable && !tainted.has(variable) && isTainted(value)) {
        tainted.add(variable);
        grew = true;
      }
    }
  }
  if (tainted.size === 0) return false;

  const header =
    loop.type === 'ForStatement'
      ? [loop.test, loop.update]
      : loop.type === 'WhileStatement' || loop.type === 'DoWhileStatement'
        ? [loop.test]
        : [];
  return [...header, ...awaits.map((a) => a.argument), ...exits].some((n) =>
    someNode(n, reads),
  );
}

export const noAwaitInLoop = createRule<RuleOptions, MessageIds>({
  name: 'no-await-in-loop',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'eslint/no-await-in-loop',
    },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-reliability/docs/rules/no-await-in-loop.md',
      description:
        'Disallow await inside loops and suggest appropriate concurrency patterns',
    },
    hasSuggestions: false,
    messages: {
      awaitInLoop: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Sequential Async Loop',
        description: 'Await in loop forces sequential execution',
        severity: 'MEDIUM',
        fix: 'Consider Promise.all() for concurrent execution or extract async logic',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
      }),
      suggestPromiseAll: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Promise.all',
        description: 'Concurrent execution of independent operations',
        severity: 'LOW',
        fix: 'Promise.all(items.map(async (item) => await process(item)))',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all',
      }),
      suggestConcurrent: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Promise.allSettled',
        description: 'Concurrent execution with error handling',
        severity: 'LOW',
        fix: 'Promise.allSettled(items.map(async (item) => await process(item)))',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled',
      }),
      considerSequential: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Sequential Control',
        description: 'Operations require sequential execution',
        severity: 'LOW',
        fix: 'Add concurrency control or extract to async function',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
      }),
      asyncLoopPattern: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Async Loop Pattern',
        description: 'Use controlled concurrency library',
        severity: 'LOW',
        fix: 'Consider p-map, p-series, or similar for controlled concurrency',
        documentationLink: 'https://github.com/sindresorhus/p-map',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowForOf: {
            type: 'boolean',
            default: false,
          },
          allowWhile: {
            type: 'boolean',
            default: false,
          },
          checkConcurrency: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    { allowForOf: false, allowWhile: false, checkConcurrency: true },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowForOf: boolean;
    let allowWhile: boolean;

    function analyzeLoop(node: TSESTree.Node, loopType: string) {
      // Skip allowed loop types
      // `allowWhile` covers both spellings of a while loop.
      if (
        (loopType === 'ForOfStatement' && allowForOf) ||
        ((loopType === 'WhileStatement' || loopType === 'DoWhileStatement') &&
          allowWhile)
      ) {
        return;
      }

      // Find await expressions within the loop
      const awaitExpressions: TSESTree.AwaitExpression[] = [];

      // Properties to skip to avoid circular references
      const skipProperties = new Set([
        'parent',
        'tokens',
        'comments',
        'loc',
        'range',
      ]);

      function findAwaits(currentNode: TSESTree.Node, isLoopRoot = false) {
        if (currentNode.type === 'AwaitExpression') {
          awaitExpressions.push(currentNode);
        }

        // Don't traverse into nested functions (different scope)
        if (
          currentNode.type === 'FunctionDeclaration' ||
          currentNode.type === 'FunctionExpression' ||
          currentNode.type === 'ArrowFunctionExpression'
        ) {
          return;
        }

        // A nested loop reports its own awaits, so stop here rather than
        // claiming them too. The exception is that loop's once-evaluated head,
        // which re-runs on every iteration of THIS loop and so is our cost.
        if (!isLoopRoot && LOOP_NODE_TYPES.has(currentNode.type)) {
          const slot = onceEvaluatedSlot(currentNode);
          const head = slot
            ? (currentNode as unknown as Record<string, unknown>)[slot]
            : undefined;
          if (head && typeof head === 'object' && 'type' in head) {
            findAwaits(head as TSESTree.Node);
          }
          return;
        }

        // Our own head slot evaluates once, before iteration begins, so an
        // await there costs 1x and not Nx. It belongs to the enclosing loop,
        // which collects it through the branch above.
        const skipSlot = isLoopRoot ? onceEvaluatedSlot(currentNode) : null;

        for (const key in currentNode) {
          if (skipProperties.has(key)) continue;
          if (skipSlot !== null && key === skipSlot) continue;

          const child = (currentNode as unknown as Record<string, unknown>)[
            key
          ];
          if (Array.isArray(child)) {
            child.forEach((item) => {
              if (item && typeof item === 'object' && 'type' in item) {
                findAwaits(item as TSESTree.Node);
              }
            });
          } else if (child && typeof child === 'object' && 'type' in child) {
            findAwaits(child as TSESTree.Node);
          }
        }
      }

      findAwaits(node, true);

      if (
        awaitExpressions.length > 0 &&
        !carriesAwaitedValue(node, awaitExpressions, context.sourceCode)
      ) {
        // Analyze the loop context to determine the best suggestion
        const loopContext = analyzeLoopContext(node, loopType);

        for (const awaitExpr of awaitExpressions) {
          context.report({
            node: awaitExpr,
            messageId: 'awaitInLoop',
            data: {
              loopType: loopContext.loopType,
              operations: loopContext.operationCount,
              suggestion: getSuggestion(loopContext),
              performance: loopContext.estimatedPerformance,
            },
          });
        }
      }
    }

    function analyzeLoopContext(
      node: TSESTree.Node,
      loopType: string,
    ): LoopContext {
      const loopCtx: LoopContext = {
        loopType,
        operationCount: 1,
        hasDependencies: false,
        isSequential: true,
        hasSideEffects: false,
        estimatedPerformance: 'unknown',
        operations: [] as string[],
        node,
      };

      // Properties to skip to avoid circular references
      const skipProps = new Set([
        'parent',
        'tokens',
        'comments',
        'loc',
        'range',
      ]);

      // Analyze what operations are being performed in the loop
      function analyzeOperations(currentNode: TSESTree.Node) {
        if (currentNode.type === 'CallExpression') {
          if (currentNode.callee.type === 'Identifier') {
            loopCtx.operations.push(currentNode.callee.name);
          } else if (
            currentNode.callee.type === 'MemberExpression' &&
            currentNode.callee.property.type === 'Identifier'
          ) {
            loopCtx.operations.push(currentNode.callee.property.name);
          }
        }

        // Check for dependencies between iterations
        if (
          currentNode.type === 'AssignmentExpression' ||
          currentNode.type === 'UpdateExpression'
        ) {
          loopCtx.hasDependencies = true;
        }

        // Check for side effects that might require sequential execution
        if (
          currentNode.type === 'CallExpression' &&
          (loopCtx.operations.includes('push') ||
            loopCtx.operations.includes('splice') ||
            loopCtx.operations.includes('delete'))
        ) {
          loopCtx.hasSideEffects = true;
        }

        // Count operations
        if (currentNode.type === 'AwaitExpression') {
          loopCtx.operationCount++;
        }

        // Recursively analyze
        for (const key in currentNode) {
          if (skipProps.has(key)) continue;

          const child = (currentNode as unknown as Record<string, unknown>)[
            key
          ];
          if (Array.isArray(child)) {
            child.forEach((item) => {
              if (item && typeof item === 'object' && 'type' in item) {
                analyzeOperations(item as TSESTree.Node);
              }
            });
          } else if (child && typeof child === 'object' && 'type' in child) {
            analyzeOperations(child as TSESTree.Node);
          }
        }
      }

      analyzeOperations(node);

      // Determine if operations can be concurrent
      if (loopCtx.hasDependencies || loopCtx.hasSideEffects) {
        loopCtx.isSequential = true;
        loopCtx.estimatedPerformance = `sequential (${loopCtx.operationCount} operations)`;
      } else {
        loopCtx.isSequential = false;
        loopCtx.estimatedPerformance = `potential ${loopCtx.operationCount}x speedup with concurrency`;
      }

      return loopCtx;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function getSuggestion(loopCtx: LoopContext): string {
      if (loopCtx.isSequential) {
        return 'operations may need to be sequential - consider if concurrency is safe';
      } else {
        return 'operations appear independent - consider Promise.all() for concurrency';
      }
    }

    return {
      before() {
        const [options] = context.options;
        ({ allowForOf = false, allowWhile = false } = options || {});
      },
      ForStatement(node: TSESTree.ForStatement) {
        analyzeLoop(node, 'ForStatement');
      },

      ForInStatement(node: TSESTree.ForInStatement) {
        analyzeLoop(node, 'ForInStatement');
      },

      ForOfStatement(node: TSESTree.ForOfStatement) {
        analyzeLoop(node, 'ForOfStatement');
      },

      WhileStatement(node: TSESTree.WhileStatement) {
        analyzeLoop(node, 'WhileStatement');
      },

      DoWhileStatement(node: TSESTree.DoWhileStatement) {
        analyzeLoop(node, 'DoWhileStatement');
      },
    };
  },
});
