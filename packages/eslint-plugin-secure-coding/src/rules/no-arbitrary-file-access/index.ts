/**
 * @fileoverview Prevent file access from user input
 * 
 * False Positive Reduction:
 * This rule detects safe patterns including:
 * - path.basename() sanitization
 * - path.join() with validated base directories
 * - startsWith() validation guards
 * - Early-return throw patterns
 */

import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

type MessageIds = 'violationDetected';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

export const noArbitraryFileAccess = createRule<RuleOptions, MessageIds>({
  name: 'no-arbitrary-file-access',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent file access from user input',
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Arbitrary File Access',
        cwe: 'CWE-22',
        description: 'File path from user input - path traversal vulnerability',
        severity: 'HIGH',
        fix: 'Validate and sanitize file paths, use allowlists',
        documentationLink: 'https://cwe.mitre.org/data/definitions/22.html',
      })
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    
    function report(node: TSESTree.Node) {
      context.report({ node, messageId: 'violationDetected' });
    }
    
    const fsReadMethods = ['readFile', 'readFileSync', 'readdir', 'readdirSync', 'stat', 'statSync'];
    const fsWriteMethods = ['writeFile', 'writeFileSync', 'appendFile', 'appendFileSync'];
    const userInputSources = ['req', 'request', 'params', 'query', 'body'];
    
    // Track variables that have been sanitized with path.basename()
    const sanitizedVariables = new Set<string>();
    // Track variables that have been validated with startsWith() guards
    const validatedVariables = new Set<string>();
    
    /**
     * Check if a variable is assigned from path.basename() or path.join() with basename
     */
    function checkVariableDeclaration(node: TSESTree.VariableDeclarator) {
      if (node.id.type !== 'Identifier' || !node.init) {
        return;
      }
      
      const varName = node.id.name;
      const init = node.init;
      
      // Check for path.basename() assignment
      if (init.type === 'CallExpression' &&
          init.callee.type === 'MemberExpression' &&
          init.callee.object.type === 'Identifier' &&
          init.callee.object.name === 'path' &&
          init.callee.property.type === 'Identifier' &&
          init.callee.property.name === 'basename') {
        sanitizedVariables.add(varName);
      }
      
      // Check for path.join() with a sanitized variable or literal base
      if (init.type === 'CallExpression' &&
          init.callee.type === 'MemberExpression' &&
          init.callee.object.type === 'Identifier' &&
          init.callee.object.name === 'path' &&
          init.callee.property.type === 'Identifier' &&
          init.callee.property.name === 'join') {
        
        // Check if any argument is a sanitized variable
        const hasSanitizedArg = init.arguments.some((arg: TSESTree.CallExpressionArgument) => 
          arg.type === 'Identifier' && sanitizedVariables.has(arg.name)
        );
        
        // Check if first arg is a safe base (literal or known safe variable)
        const firstArg = init.arguments[0];
        const hasSafeBase = firstArg && (
          firstArg.type === 'Literal' ||
          (firstArg.type === 'Identifier' && /^(SAFE|BASE|ROOT|UPLOAD|PUBLIC)/i.test(firstArg.name))
        );
        
        if (hasSanitizedArg && hasSafeBase) {
          sanitizedVariables.add(varName);
        }
      }
    }
    
    /**
     * Check if there's a startsWith() guard validation for this variable
     * Looks for patterns like:
     * if (!path.startsWith(baseDir)) { throw ... }
     * if (!path.startsWith(baseDir)) { return ... }
     */
    function hasStartsWithGuard(node: TSESTree.Node, varName: string): boolean {
      // Already validated
      if (validatedVariables.has(varName)) {
        return true;
      }
      
      // Walk up to find the containing block or function
      let current: TSESTree.Node | undefined = node.parent;
      
      while (current) {
        // If we've reached a function body or block, search its statements
        if (current.type === AST_NODE_TYPES.BlockStatement) {
          const statements = current.body;
          
          // Look for IF statements in this block that validate our variable
          for (const stmt of statements) {
            if (stmt.type === AST_NODE_TYPES.IfStatement) {
              const testText = sourceCode.getText(stmt.test).toLowerCase();
              
              // Check for startsWith() validation pattern with our variable
              if (testText.includes('startswith') && testText.includes(varName.toLowerCase())) {
                // Check if this is a guard clause (negated condition with throw/return)
                const consequent = stmt.consequent;
                
                // Handle block statement: if (...) { throw/return; }
                if (consequent.type === AST_NODE_TYPES.BlockStatement && consequent.body.length > 0) {
                  const firstStmt = consequent.body[0];
                  if (firstStmt.type === AST_NODE_TYPES.ThrowStatement || firstStmt.type === AST_NODE_TYPES.ReturnStatement) {
                    validatedVariables.add(varName);
                    return true;
                  }
                }
                
                // Handle direct statement: if (...) throw/return;
                if (consequent.type === AST_NODE_TYPES.ThrowStatement || consequent.type === AST_NODE_TYPES.ReturnStatement) {
                  validatedVariables.add(varName);
                  return true;
                }
              }
            }
          }
        }
        
        // Also check if current IS an if statement (when node is inside the consequent)
        if (current.type === AST_NODE_TYPES.IfStatement) {
          const testText = sourceCode.getText(current.test).toLowerCase();
          if (testText.includes('startswith') && testText.includes(varName.toLowerCase())) {
            validatedVariables.add(varName);
            return true;
          }
        }
        
        current = current.parent;
      }
      
      return false;
    }
    
    /**
     * Check if a variable comes from a sanitized/validated source
     */
    function isVariableSafe(varName: string, node: TSESTree.Node): boolean {
      // Already tracked as sanitized
      if (sanitizedVariables.has(varName)) {
        return true;
      }
      
      // Has startsWith guard validation
      if (hasStartsWithGuard(node, varName)) {
        return true;
      }
      
      // Check naming conventions that suggest safety
      if (/^(safe|sanitized|validated|clean)/i.test(varName)) {
        return true;
      }
      
      return false;
    }
    
    return {
      // Track variable declarations for sanitization patterns
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        checkVariableDeclaration(node);
      },
      
      CallExpression(node: TSESTree.CallExpression) {
        // Detect fs.* with user input
        if (node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'fs' &&
            node.callee.property.type === 'Identifier' &&
            [...fsReadMethods, ...fsWriteMethods].includes(node.callee.property.name)) {
          
          const pathArg = node.arguments[0];
          
          // Skip if path is a literal (safe)
          if (pathArg && pathArg.type === 'Literal') {
            return;
          }
          
          // Check if path is a variable
          if (pathArg && pathArg.type === 'Identifier') {
            const varName = pathArg.name;
            
            // Skip if variable is sanitized or validated
            if (isVariableSafe(varName, node)) {
              return;
            }
            
            report(node);
            return;
          }
          
          // Flag if path is from a member expression (user input sources)
          if (pathArg?.type === 'MemberExpression' &&
              pathArg.object.type === 'Identifier') {
            const objName = pathArg.object.name.toLowerCase();
            if (userInputSources.includes(objName)) {
              report(node);
            }
          }
        }
      },
    };
  },
});
