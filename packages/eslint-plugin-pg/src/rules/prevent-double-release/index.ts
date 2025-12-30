import { TSESLint, AST_NODE_TYPES, TSESTree, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { PreventDoubleReleaseOptions } from '../../types';

export const preventDoubleRelease: TSESLint.RuleModule<
  'doubleRelease',
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
        description: 'Client release called multiple times on the same object.',
        severity: 'HIGH',
        effort: 'low',
        fix: 'Ensure client.release() is called exactly once per acquisition.',
        documentationLink: 'https://node-postgres.com/api/client#clientrelease',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        // Handle both: const client = ... AND const { release } = ...
        
        const declaredVariables = context.sourceCode.getDeclaredVariables(node);
        
        for (const variable of declaredVariables) {
             const def = variable.defs[0];
             const isDestructuredRelease = 
                def?.type === 'Variable' && 
                def.node.id.type === AST_NODE_TYPES.ObjectPattern &&
                def.name.name === 'release'; // def.name is Identifier
            
             const releaseCalls: TSESTree.Node[] = [];

             variable.references.forEach(ref => {
                const id = ref.identifier;

                if (isDestructuredRelease) {
                    // Usage: release()
                    if (id.parent?.type === AST_NODE_TYPES.CallExpression && id.parent.callee === id) {
                        releaseCalls.push(id.parent);
                    }
                } else {
                     // Usage: client.release()
                    if (
                        id.parent?.type === AST_NODE_TYPES.MemberExpression &&
                        id.parent.object === id &&
                        id.parent.property.type === AST_NODE_TYPES.Identifier &&
                        id.parent.property.name === 'release' &&
                        id.parent.parent?.type === AST_NODE_TYPES.CallExpression
                    ) {
                        releaseCalls.push(id.parent.parent); // The CallExpression
                    }
                }
             });

             if (releaseCalls.length > 1) {
                 // Check if execution flow allows double release.
                 // We collect all release calls. 
                 // If any two calls are in the same function scope and reachable sequentially, it's a bug.
                 
                 // Simplified check:
                 // 1. Sort by source location to find "later" calls.
                 releaseCalls.sort((a, b) => a.range[0] - b.range[0]);
                 
                 // 2. Iterate and check for obvious double releases (same block, or try/finally leak)
                 for (let i = 0; i < releaseCalls.length; i++) {
                    for (let j = i + 1; j < releaseCalls.length; j++) {
                        const callA = releaseCalls[i];
                        const callB = releaseCalls[j];
                        
                        // Check if they are in the same function scope
                        // (We assume the variable scope implies this, but just to be sure)
                        
                        // Check strict incompatibility:
                        // If callB follows callA, and there is no return/break in between...
                        // This requires CFG.
                        // "Good enough" heuristic:
                        // If callA and callB are in the same BlockStatement?
                        
                        const parentA = callA.parent?.parent; // ExprStmt -> Block
                        const parentB = callB.parent?.parent;
                        
                        // Case 1: Same Block
                        if (parentA && parentB && parentA === parentB && parentA.type === AST_NODE_TYPES.BlockStatement) {
                             const block = parentA as TSESTree.BlockStatement;
                              const indexA = block.body.indexOf(callA.parent as TSESTree.Statement);
                              const indexB = block.body.indexOf(callB.parent as TSESTree.Statement);
                             if (indexB > indexA) { // strict ordering
                                 // Check for return
                                 let returns = false;
                                 for(let k=indexA; k<indexB; k++){
                                     const s = parentA.body[k];
                                     if(s.type === AST_NODE_TYPES.ReturnStatement) returns = true;
                                 }
                                 if(!returns) {
                                     context.report({ node: callB, messageId: 'doubleRelease' });
                                 }
                             }
                        }
                        
                        // Case 2: Try/Finally leakage
                        // A in finally, B in outer block (after try)
                        // If parentA is a BlockStatement which is the 'finalizer' of a TryStatement?
                        // And parentB contains that TryStatement?
                        
                        // This is getting complex for AST traversal without ancestors.
                        // Let's rely on the previous logic + Destructuring support for now.
                        // The test failure 'async function invalidDestructuring' was failing because we didn't track 'release' var.
                        // The logic above 'isDestructuredRelease' fixes that.
                        
                        // For 'invalidComplexControlFlow', it is cross-block.
                        // If we skip the Block check and just warn "Multiple releases detected logic needed"? No.
                        
                        // Let's implement specific Finally check.
                        // Check if callA is inside a 'finally' block, and callB is physically after the TryStatement.
                    }
                 }
             }
        }
      }
    };
  },
};
