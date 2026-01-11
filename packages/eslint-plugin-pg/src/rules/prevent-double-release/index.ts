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
} from '@interlace/eslint-devkit';
import { PreventDoubleReleaseOptions } from '../../types';

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

/**
 * Checks if node is guarded by a conditional check (e.g., if (!released))
 */
function isGuardedByCondition(node: TSESTree.Node): boolean {
  const ifStmt = findAncestor(node, (n): n is TSESTree.IfStatement =>
    n.type === AST_NODE_TYPES.IfStatement
  );
  if (!ifStmt) return false;
  
  const conditionText = ifStmt.test;
  
  // Check for patterns like: !released, released === false, !client.released
  if (conditionText.type === AST_NODE_TYPES.UnaryExpression && conditionText.operator === '!') {
    const arg = conditionText.argument;
    if (arg.type === AST_NODE_TYPES.Identifier) {
      const name = arg.name.toLowerCase();
      return name.includes('released') || name.includes('done') || name.includes('closed');
    }
    if (arg.type === AST_NODE_TYPES.MemberExpression && arg.property.type === AST_NODE_TYPES.Identifier) {
      const name = arg.property.name.toLowerCase();
      return name.includes('released') || name.includes('done') || name.includes('closed');
    }
  }
  
  return false;
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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/prevent-double-release.md',
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
    const doneCallbacks = new Map<TSESTree.Node, TSESTree.CallExpression[]>();
    
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          node.callee.property.name === 'connect' &&
          node.arguments.length === 1 &&
          (node.arguments[0].type === AST_NODE_TYPES.ArrowFunctionExpression ||
           node.arguments[0].type === AST_NODE_TYPES.FunctionExpression)
        ) {
          const callback = node.arguments[0] as TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression;
          if (callback.params.length >= 3) {
            const doneParam = callback.params[2];
            if (doneParam.type === AST_NODE_TYPES.Identifier) {
              doneCallbacks.set(callback, []);
            }
          }
        }
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
                id.parent.property.type === AST_NODE_TYPES.Identifier &&
                id.parent.property.name === 'release' &&
                id.parent.parent?.type === AST_NODE_TYPES.CallExpression
              ) {
                const callNode = id.parent.parent;
                const guarded = isGuardedByCondition(callNode);
                releaseCalls.push({ node: callNode, guarded });
              }
            }
          });

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
                const isInExpression = (node: TSESTree.Node): boolean => {
                  let current = node.parent;
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

      'Program:exit'() {
        for (const [, calls] of doneCallbacks) {
          if (calls.length > 1) {
            calls.sort((a, b) => a.range[0] - b.range[0]);
            for (let i = 1; i < calls.length; i++) {
              context.report({ node: calls[i], messageId: 'doubleReleaseCallback' });
            }
          }
        }
      },
    };
  },
};
