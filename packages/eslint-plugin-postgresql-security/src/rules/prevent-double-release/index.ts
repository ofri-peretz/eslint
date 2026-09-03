/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import {
  TSESLint,
  AST_NODE_TYPES,
  TSESTree,
  formatLLMMessage,
  MessageIcons,
  propertyName,
} from '@interlace/eslint-devkit';
import { PreventDoubleReleaseOptions } from '../../types';
import { fileUsesPostgres } from '../../utils';

/**
 * Finds the nearest ancestor of a given type.
 */
function findAncestor<T extends TSESTree.Node>(
  node: TSESTree.Node | undefined,
  predicate: (n: TSESTree.Node) => n is T
): T | null {
  let current = node?.parent;
  while (current) {
    if (predicate(current)) return current;
    current = current.parent;
  }
  return null;
}

/**
 * Checks if node is inside a TryStatement's catch block
 */
function isInCatchBlock(node: TSESTree.Node): TSESTree.CatchClause | null {
  return findAncestor(node, (n): n is TSESTree.CatchClause =>
    n.type === AST_NODE_TYPES.CatchClause
  );
}

/**
 * Checks if node is inside a TryStatement's finally block
 */
function isInFinallyBlock(node: TSESTree.Node): TSESTree.TryStatement | null {
  const tryStmt = findAncestor(node, (n): n is TSESTree.TryStatement =>
    n.type === AST_NODE_TYPES.TryStatement
  );
  if (!tryStmt?.finalizer) return null;
  
  const nodeRange = node.range;
  const finalizerRange = tryStmt.finalizer.range;
  if (nodeRange[0] >= finalizerRange[0] && nodeRange[1] <= finalizerRange[1]) {
    return tryStmt;
  }
  return null;
}

/**
 * Checks if node is inside a TryStatement's try block
 */
function isInTryBlock(node: TSESTree.Node): TSESTree.TryStatement | null {
  const tryStmt = findAncestor(node, (n): n is TSESTree.TryStatement =>
    n.type === AST_NODE_TYPES.TryStatement
  );
  if (!tryStmt) return null;
  
  const nodeRange = node.range;
  const blockRange = tryStmt.block.range;
  if (nodeRange[0] >= blockRange[0] && nodeRange[1] <= blockRange[1]) {
    return tryStmt;
  }
  return null;
}

/**
 * Gets the containing function for a node
 */
function getContainingFunction(node: TSESTree.Node): TSESTree.Node | null {
  return findAncestor(node, (n): n is TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression =>
    n.type === AST_NODE_TYPES.FunctionDeclaration ||
    n.type === AST_NODE_TYPES.FunctionExpression ||
    n.type === AST_NODE_TYPES.ArrowFunctionExpression
  );
}

/** The name a `!flag` / `!obj.flag` test negates, or null. */
function negatedFlagName(test: TSESTree.Node): string | null {
  if (test.type !== AST_NODE_TYPES.UnaryExpression || test.operator !== '!') return null;
  const arg = test.argument;
  if (arg.type === AST_NODE_TYPES.Identifier) return arg.name;
  if (
    arg.type === AST_NODE_TYPES.MemberExpression &&
    !arg.computed &&
    arg.property.type === AST_NODE_TYPES.Identifier
  ) {
    return arg.property.name;
  }
  return null;
}

/** Does this statement subtree assign `true` to the named flag? */
function assignsTrue(node: TSESTree.Node, flag: string): boolean {
  let found = false;
  const walk = (current: TSESTree.Node): void => {
    if (found) return;
    if (
      current.type === AST_NODE_TYPES.AssignmentExpression &&
      current.operator === '=' &&
      current.right.type === AST_NODE_TYPES.Literal &&
      current.right.value === true
    ) {
      const { left } = current;
      if (left.type === AST_NODE_TYPES.Identifier && left.name === flag) found = true;
      if (
        left.type === AST_NODE_TYPES.MemberExpression &&
        propertyName(left) === flag
      ) {
        found = true;
      }
    }
    for (const key of Object.keys(current)) {
      if (key === 'parent') continue;
      const value = (current as unknown as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object' && 'type' in item) walk(item as TSESTree.Node);
        }
      } else if (value && typeof value === 'object' && 'type' in value) {
        walk(value as TSESTree.Node);
      }
    }
  };
  walk(node);
  return found;
}

/**
 * Is this release call behind a release-once guard?
 *
 * The old test asked whether the negated identifier was SPELLED `released`,
 * `done` or `closed`. That is control-flow state inferred from a variable name,
 * and it was the rule's registered name-inference debt. It reported this
 * correct release-once guard —
 *
 *   let settled = false;
 *   if (!settled) { settled = true; client.release(); }
 *
 * — purely because the flag is called `settled`, while accepting
 *
 *   if (!released) { client.release(); }
 *
 * which guards nothing at all, because the flag is never set.
 *
 * What makes a guard real is that the guarded block SETS the flag it tested.
 * That is the fact; the spelling never was.
 */
function isGuardedByCondition(node: TSESTree.Node): boolean {
  const ifStmt = findAncestor(node, (n): n is TSESTree.IfStatement =>
    n.type === AST_NODE_TYPES.IfStatement
  );
  if (!ifStmt) return false;

  const flag = negatedFlagName(ifStmt.test);
  if (flag === null) return false;

  return assignsTrue(ifStmt.consequent, flag);
}

/**
 * Checks if a node is in an else-if/else branch that's mutually exclusive from another
 */
function areMutuallyExclusiveBranches(nodeA: TSESTree.Node, nodeB: TSESTree.Node): boolean {
  const ifA = findAncestor(nodeA, (n): n is TSESTree.IfStatement => n.type === AST_NODE_TYPES.IfStatement);
  const ifB = findAncestor(nodeB, (n): n is TSESTree.IfStatement => n.type === AST_NODE_TYPES.IfStatement);
  
  if (!ifA || !ifB) return false;
  
  // Check if both are in the same if/else chain
  if (ifA === ifB) {
    const nodeARange = nodeA.range;
    const nodeBRange = nodeB.range;
    const consequentRange = ifA.consequent.range;
    const alternateRange = ifA.alternate?.range;
    
    if (!alternateRange) return false;
    
    const aInConsequent = nodeARange[0] >= consequentRange[0] && nodeARange[1] <= consequentRange[1];
    const bInConsequent = nodeBRange[0] >= consequentRange[0] && nodeBRange[1] <= consequentRange[1];
    const aInAlternate = nodeARange[0] >= alternateRange[0] && nodeARange[1] <= alternateRange[1];
    const bInAlternate = nodeBRange[0] >= alternateRange[0] && nodeBRange[1] <= alternateRange[1];
    
    return (aInConsequent && bInAlternate) || (aInAlternate && bInConsequent);
  }
  
  return false;
}

/**
 * Checks if there's a return/throw statement between two positions in a block
 */
function hasExitBetween(block: TSESTree.BlockStatement, startIdx: number, endIdx: number): boolean {
  for (let k = startIdx + 1; k < endIdx; k++) {
    const stmt = block.body[k];
    if (stmt.type === AST_NODE_TYPES.ReturnStatement) return true;
    if (stmt.type === AST_NODE_TYPES.ThrowStatement) return true;
  }
  return false;
}

/**
 * Checks if a switch case has a break/return/throw
 */
function caseHasExit(switchCase: TSESTree.SwitchCase): boolean {
  for (const stmt of switchCase.consequent) {
    if (stmt.type === AST_NODE_TYPES.ReturnStatement) return true;
    if (stmt.type === AST_NODE_TYPES.ThrowStatement) return true;
    if (stmt.type === AST_NODE_TYPES.BreakStatement) return true;
  }
  return false;
}

/**
 * Gets the switch case containing a node
 */
function getSwitchCase(node: TSESTree.Node): TSESTree.SwitchCase | null {
  return findAncestor(node, (n): n is TSESTree.SwitchCase =>
    n.type === AST_NODE_TYPES.SwitchCase
  );
}

/**
 * Gets the if statement directly containing a node (not ancestors)
 */
function getDirectIfStatement(node: TSESTree.Node): TSESTree.IfStatement | null {
  return findAncestor(node, (n): n is TSESTree.IfStatement =>
    n.type === AST_NODE_TYPES.IfStatement
  );
}

/**
 * Checks if the if statement's branch containing the release has a return/throw after it
 */
function ifBranchHasExitAfterRelease(releaseNode: TSESTree.Node, ifStmt: TSESTree.IfStatement): boolean {
  // Find which branch contains the release
  const releaseRange = releaseNode.range;
  const consequentRange = ifStmt.consequent.range;
  
  const inConsequent = releaseRange[0] >= consequentRange[0] && releaseRange[1] <= consequentRange[1];
  
  let branchBlock: TSESTree.BlockStatement | null = null;
  
  if (inConsequent && ifStmt.consequent.type === AST_NODE_TYPES.BlockStatement) {
    branchBlock = ifStmt.consequent;
  } else if (!inConsequent && ifStmt.alternate?.type === AST_NODE_TYPES.BlockStatement) {
    branchBlock = ifStmt.alternate;
  }
  
  if (!branchBlock) return false;
  
  // Find the release statement index
  const releaseParentStmt = releaseNode.parent?.type === AST_NODE_TYPES.ExpressionStatement 
    ? releaseNode.parent 
    : null;
  
  if (!releaseParentStmt) return false;
  
  const releaseIdx = branchBlock.body.indexOf(releaseParentStmt as TSESTree.Statement);
  if (releaseIdx === -1) return false;
  
  // Check if there's a return/throw after the release
  for (let i = releaseIdx + 1; i < branchBlock.body.length; i++) {
    const stmt = branchBlock.body[i];
    if (stmt.type === AST_NODE_TYPES.ReturnStatement || stmt.type === AST_NODE_TYPES.ThrowStatement) {
      return true;
    }
  }
  
  return false;
}

export const preventDoubleRelease: TSESLint.RuleModule<
  'doubleRelease' | 'doubleReleaseCallback',
  PreventDoubleReleaseOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent releasing a pg client multiple times.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-postgresql-security/docs/rules/prevent-double-release.md',
      cwe: 'CWE-415',
      cweJustification: 'CWE-415 (Double Free) — semantic equivalent for connection lifecycle: releasing a pooled client twice corrupts the pool\'s internal accounting and can hand the same connection to two callers.',
      confidence: 'medium',
    },
    messages: {
      doubleRelease: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Double Release',
        description: 'Client release() called multiple times on the same object.',
        severity: 'HIGH',
        effort: 'low',
        fix: 'Ensure client.release() is called exactly once per acquisition, preferably in a finally block.',
        documentationLink: 'https://node-postgres.com/api/client#clientrelease',
      }),
      doubleReleaseCallback: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Double Release (Callback)',
        description: 'Connection release callback (done) called multiple times.',
        severity: 'HIGH',
        effort: 'low',
        fix: 'Ensure done() or release callback is called exactly once per pool.connect() callback.',
        documentationLink: 'https://node-postgres.com/api/pool#poolconnect',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Every rule here is PostgreSQL-specific, and none of them knew it: over
    // 108,838 files, 94% of this plugin's findings were in files with no
    // PostgreSQL client at all. Registering no visitors is both the gate and
    // the cheap path — a file with no database in it does no work.
    if (!fileUsesPostgres(context.sourceCode.ast)) return {};

    return {
      /**
       * The CALLBACK form: `pool.connect((err, client, done) => { … })`.
       *
       * `done` IS the release. The rule declared a `doubleReleaseCallback`
       * message for this and never reported it once — the report path was
       * never built, so the entire legacy pg API was a blind spot. The ledger
       * flagged it as an orphan message; it was a false negative.
       *
       * The defect is the error path that calls `done(err)` and then falls
       * THROUGH to the success path instead of returning.
       */
      'CallExpression > ArrowFunctionExpression, CallExpression > FunctionExpression'(
        callback: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
      ) {
        const call = callback.parent as TSESTree.CallExpression;
        if (
          call.callee.type !== AST_NODE_TYPES.MemberExpression ||
          call.callee.property.type !== AST_NODE_TYPES.Identifier ||
          call.callee.property.name !== 'connect'
        ) {
          return;
        }

        // `(err, client, done)` — the third parameter is the release callback.
        const doneParam = callback.params[2];
        if (doneParam === undefined || doneParam.type !== AST_NODE_TYPES.Identifier) return;

        // Flattened rather than `[0]` with an undefined guard: a function's
        // third parameter always declares a variable, so that guard was
        // unreachable through the real parser. Dead branches get deleted here.
        const calls = context.sourceCode
          .getDeclaredVariables(callback)
          .filter((v) => v.name === doneParam.name)
          .flatMap((v) => v.references.map((ref) => ref.identifier))
          .filter(
            (id) => id.parent?.type === AST_NODE_TYPES.CallExpression && id.parent.callee === id,
          )
          .map((id) => id.parent as TSESTree.CallExpression)
          .sort((a, b) => a.range[0] - b.range[0]);

        if (calls.length < 2) return;

        // Every call but the last has to be terminated by a `return` or a
        // `throw` in its own block, or control falls through to the next one.
        const terminated = (node: TSESTree.Node): boolean => {
          const statement = node.parent?.type === AST_NODE_TYPES.ExpressionStatement
            ? node.parent
            : null;
          const block = statement?.parent;
          if (block === undefined || block === null || block.type !== AST_NODE_TYPES.BlockStatement) {
            return false;
          }
          const index = block.body.indexOf(statement as TSESTree.Statement);
          return block.body
            .slice(index + 1)
            .some(
              (s) =>
                s.type === AST_NODE_TYPES.ReturnStatement ||
                s.type === AST_NODE_TYPES.ThrowStatement,
            );
        };

        if (calls.slice(0, -1).every((c) => terminated(c))) return;

        context.report({
          node: calls[calls.length - 1],
          messageId: 'doubleReleaseCallback',
        });
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        const declaredVariables = context.sourceCode.getDeclaredVariables(node);

        for (const variable of declaredVariables) {
          const def = variable.defs[0];
          const isDestructuredRelease =
            def?.type === 'Variable' &&
            def.node.id.type === AST_NODE_TYPES.ObjectPattern &&
            def.name.name === 'release';

          const releaseCalls: { node: TSESTree.CallExpression; guarded: boolean }[] = [];

          variable.references.forEach((ref) => {
            const id = ref.identifier;

            if (isDestructuredRelease) {
              if (
                id.parent?.type === AST_NODE_TYPES.CallExpression &&
                id.parent.callee === id
              ) {
                const callNode = id.parent;
                const guarded = isGuardedByCondition(callNode);
                releaseCalls.push({ node: callNode, guarded });
              }
            } else {
              if (
                id.parent?.type === AST_NODE_TYPES.MemberExpression &&
                id.parent.object === id &&
                propertyName(id.parent) === 'release' &&
                id.parent.parent?.type === AST_NODE_TYPES.CallExpression
              ) {
                const callNode = id.parent.parent;
                const guarded = isGuardedByCondition(callNode);
                releaseCalls.push({ node: callNode, guarded });
              }
            }
          });

          // ONE checkout, a release INSIDE a loop. Every iteration after the
          // first releases a client this scope no longer owns — a double
          // release that the pairwise comparison below can never see, because
          // there is only one release call in the source.
          if (releaseCalls.length >= 1 && def?.type === 'Variable') {
            for (const call of releaseCalls) {
              const loop = findAncestor(call.node, (n): n is TSESTree.Node =>
                n.type === AST_NODE_TYPES.ForStatement ||
                n.type === AST_NODE_TYPES.ForOfStatement ||
                n.type === AST_NODE_TYPES.ForInStatement ||
                n.type === AST_NODE_TYPES.WhileStatement ||
                n.type === AST_NODE_TYPES.DoWhileStatement,
              );
              // A checkout inside the same loop means each iteration owns its
              // own client, which is correct.
              if (loop === undefined || loop === null) continue;
              if (loop.range[0] <= def.node.range[0] && def.node.range[1] <= loop.range[1]) {
                continue;
              }
              if (getContainingFunction(call.node) !== getContainingFunction(def.node)) continue;
              context.report({ node: call.node, messageId: 'doubleRelease' });
            }
          }

          if (releaseCalls.length > 1) {
            releaseCalls.sort((a, b) => a.node.range[0] - b.node.range[0]);
            const reported = new Set<TSESTree.Node>();

            for (let i = 0; i < releaseCalls.length; i++) {
              for (let j = i + 1; j < releaseCalls.length; j++) {
                const callA = releaseCalls[i];
                const callB = releaseCalls[j];

                // Skip if already reported
                if (reported.has(callB.node)) continue;

                // Skip if both are guarded
                if (callA.guarded && callB.guarded) continue;

                // Skip if mutually exclusive branches
                if (areMutuallyExclusiveBranches(callA.node, callB.node)) continue;

                // Same function scope check
                const funcA = getContainingFunction(callA.node);
                const funcB = getContainingFunction(callB.node);
                if (funcA !== funcB) continue;

                // Case 1: Try + Catch (not finally) - both paths release
                const tryA = isInTryBlock(callA.node);
                const catchB = isInCatchBlock(callB.node);
                if (tryA && catchB && catchB.parent === tryA) {
                  context.report({ node: callB.node, messageId: 'doubleRelease' });
                  reported.add(callB.node);
                  continue;
                }

                // Case 2: Catch + Try (reversed order in source)
                const catchA = isInCatchBlock(callA.node);
                const tryB = isInTryBlock(callB.node);
                if (catchA && tryB && catchA.parent === tryB) {
                  context.report({ node: callB.node, messageId: 'doubleRelease' });
                  reported.add(callB.node);
                  continue;
                }

                // Case 3: Switch fallthrough
                const switchCaseA = getSwitchCase(callA.node);
                const switchCaseB = getSwitchCase(callB.node);
                if (switchCaseA && switchCaseB && switchCaseA !== switchCaseB) {
                  // Check if same switch statement
                  const switchA = findAncestor(switchCaseA, (n): n is TSESTree.SwitchStatement =>
                    n.type === AST_NODE_TYPES.SwitchStatement
                  );
                  const switchB = findAncestor(switchCaseB, (n): n is TSESTree.SwitchStatement =>
                    n.type === AST_NODE_TYPES.SwitchStatement
                  );
                  if (switchA === switchB && switchA) {
                    // Check if caseA doesn't have break/return/throw (fallthrough)
                    if (!caseHasExit(switchCaseA)) {
                      context.report({ node: callB.node, messageId: 'doubleRelease' });
                      reported.add(callB.node);
                      continue;
                    }
                  }
                }

                // Case 4: If without else + sequential release
                const ifA = getDirectIfStatement(callA.node);
                if (ifA && !ifA.alternate) {
                  // B is after the if statement
                  if (callB.node.range[0] > ifA.range[1]) {
                    // Check if B is in same block as the if
                    const parentBlock = findAncestor(ifA, (n): n is TSESTree.BlockStatement =>
                      n.type === AST_NODE_TYPES.BlockStatement
                    );
                    if (parentBlock) {
                      const bParentStmt = callB.node.parent?.type === AST_NODE_TYPES.ExpressionStatement 
                        ? callB.node.parent : null;
                      if (bParentStmt && parentBlock.body.includes(bParentStmt as TSESTree.Statement)) {
                        // Check if the if branch has exit after release
                        if (!ifBranchHasExitAfterRelease(callA.node, ifA)) {
                          context.report({ node: callB.node, messageId: 'doubleRelease' });
                          reported.add(callB.node);
                          continue;
                        }
                      }
                    }
                  }
                }

                // Case 5: Two sequential if statements (neither has else)
                const ifB = getDirectIfStatement(callB.node);
                if (ifA && ifB && ifA !== ifB && !ifA.alternate && !ifB.alternate) {
                  // Both are different if statements at same level
                  const parentBlockA = ifA.parent;
                  const parentBlockB = ifB.parent;
                  if (parentBlockA === parentBlockB && parentBlockA?.type === AST_NODE_TYPES.BlockStatement) {
                    // Check if ifA doesn't exit after release
                    if (!ifBranchHasExitAfterRelease(callA.node, ifA)) {
                      context.report({ node: callB.node, messageId: 'doubleRelease' });
                      reported.add(callB.node);
                      continue;
                    }
                  }
                }

                const parentA = callA.node.parent?.parent;
                const parentB = callB.node.parent?.parent;

                // Case 6: Same Block - direct sequential releases
                if (
                  parentA &&
                  parentB &&
                  parentA === parentB &&
                  parentA.type === AST_NODE_TYPES.BlockStatement
                ) {
                  const block = parentA as TSESTree.BlockStatement;
                  const indexA = block.body.indexOf(callA.node.parent as TSESTree.Statement);
                  const indexB = block.body.indexOf(callB.node.parent as TSESTree.Statement);
                  if (indexB > indexA && !hasExitBetween(block, indexA, indexB)) {
                    context.report({ node: callB.node, messageId: 'doubleRelease' });
                    reported.add(callB.node);
                    continue;
                  }
                }

                // Case 7: Try/Catch + Finally pattern
                const catchAForFinally = isInCatchBlock(callA.node);
                const finallyB = isInFinallyBlock(callB.node);
                if (catchAForFinally && finallyB) {
                  const tryOfCatch = catchAForFinally.parent;
                  if (tryOfCatch === finallyB) {
                    context.report({ node: callB.node, messageId: 'doubleRelease' });
                    reported.add(callB.node);
                    continue;
                  }
                }

                // Case 8: Try block + Finally pattern
                const tryAForFinally = isInTryBlock(callA.node);
                const finallyB2 = isInFinallyBlock(callB.node);
                if (tryAForFinally && finallyB2 && tryAForFinally === finallyB2) {
                  context.report({ node: callB.node, messageId: 'doubleRelease' });
                  reported.add(callB.node);
                  continue;
                }

                // Case 9: Finally + After try pattern
                const finallyA = isInFinallyBlock(callA.node);
                if (finallyA) {
                  const tryEndPos = finallyA.range[1];
                  if (callB.node.range[0] > tryEndPos) {
                    context.report({ node: callB.node, messageId: 'doubleRelease' });
                    reported.add(callB.node);
                    continue;
                  }
                }

                // Case 10: Try block release + after try (with or without finally)
                const tryAWithOrWithout = isInTryBlock(callA.node);
                if (tryAWithOrWithout) {
                  // B is after the entire try statement (including any finally)
                  const tryEndPos = tryAWithOrWithout.range[1];
                  if (callB.node.range[0] > tryEndPos && !isInFinallyBlock(callB.node)) {
                    context.report({ node: callB.node, messageId: 'doubleRelease' });
                    reported.add(callB.node);
                    continue;
                  }
                }

                // Case 11: Early return branch + Finally (without exit)
                const ifStmtA = findAncestor(callA.node, (n): n is TSESTree.IfStatement =>
                  n.type === AST_NODE_TYPES.IfStatement
                );
                if (ifStmtA && finallyB) {
                  if (!ifBranchHasExitAfterRelease(callA.node, ifStmtA)) {
                    context.report({ node: callB.node, messageId: 'doubleRelease' });
                    reported.add(callB.node);
                    continue;
                  }
                }

                // Case 12: Catch block + after try (no finally, or B is outside finally)
                const catchAForAfter = isInCatchBlock(callA.node);
                if (catchAForAfter) {
                  const tryOfCatchA = catchAForAfter.parent as TSESTree.TryStatement;
                  const tryEndPos = tryOfCatchA.range[1];
                  if (callB.node.range[0] > tryEndPos) {
                    context.report({ node: callB.node, messageId: 'doubleRelease' });
                    reported.add(callB.node);
                    continue;
                  }
                }

                // Case 13: Expression-based release (ternary, short-circuit) + sequential
                // Check if A is in a ternary/conditional expression or logical expression
                const isInExpression = (exprNode: TSESTree.Node): boolean => {
                  let current = exprNode.parent;
                  while (current) {
                    if (current.type === AST_NODE_TYPES.ConditionalExpression) return true;
                    if (current.type === AST_NODE_TYPES.LogicalExpression) return true;
                    if (current.type === AST_NODE_TYPES.ExpressionStatement) break;
                    if (current.type === AST_NODE_TYPES.BlockStatement) break;
                    current = current.parent;
                  }
                  return false;
                };

                if (isInExpression(callA.node)) {
                  // A is in a conditional/logical expression, B comes after
                  // Find the containing expression statement for A
                  let exprStmtA: TSESTree.Node | null = callA.node;
                  while (exprStmtA && exprStmtA.type !== AST_NODE_TYPES.ExpressionStatement) {
                    exprStmtA = exprStmtA.parent ?? null;
                  }
                  if (exprStmtA && callB.node.range[0] > exprStmtA.range[1]) {
                    // Check they're in the same block
                    const blockA = findAncestor(exprStmtA, (n): n is TSESTree.BlockStatement =>
                      n.type === AST_NODE_TYPES.BlockStatement
                    );
                    const blockB = findAncestor(callB.node, (n): n is TSESTree.BlockStatement =>
                      n.type === AST_NODE_TYPES.BlockStatement
                    );
                    if (blockA && blockA === blockB) {
                      context.report({ node: callB.node, messageId: 'doubleRelease' });
                      reported.add(callB.node);
                      continue;
                    }
                  }
                }
              }
            }
          }
        }
      },
    };
  },
};
