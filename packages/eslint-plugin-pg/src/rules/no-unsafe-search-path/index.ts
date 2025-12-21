import { TSESLint, AST_NODE_TYPES, TSESTree, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { NoUnsafeSearchPathOptions } from '../../types';

// Pre-compiled pattern check for search_path
const hasSearchPath = (str: string) => str.toLowerCase().includes('set search_path');

export const noUnsafeSearchPath: TSESLint.RuleModule<
  'noUnsafeSearchPath',
  NoUnsafeSearchPathOptions
> = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent unsafe SET search_path usage with dynamic values, which can lead to schema hijacking.',
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-pg/docs/rules/no-unsafe-search-path.md',
    },
    messages: {
      noUnsafeSearchPath: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Schema Hijacking Risk',
        description: 'Unsafe "SET search_path" detected.',
        severity: 'CRITICAL',
        cwe: 'CWE-426',
        owasp: 'A05:2021',
        compliance: ['SOC2', 'PCI-DSS'],
        effort: 'low',
        fix: 'Do not use dynamic values for search_path. Use static strings or strict validation.',
        documentationLink: 'https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== AST_NODE_TYPES.MemberExpression ||
          node.callee.property.type !== AST_NODE_TYPES.Identifier ||
          node.callee.property.name !== 'query'
        ) {
          return;
        }

        const args = node.arguments;
        if (args.length === 0) return;
        
        const queryArg = args[0];

        // 1. Literal Check: "SET search_path = " + variable
        if (queryArg.type === AST_NODE_TYPES.BinaryExpression && queryArg.operator === '+') {
           // We need to check if the left or right side contains "SET search_path"
           // This requires a bit of deep traversal if it's a chain, but let's check simple cases first.
           // Or, we can just check if *any* part of the expression is a string literal containing "SET search_path"
           
           // A simpler approach for BinaryExpression:
           // If it isn't a Literal, it's dynamic. If we can prove it contains "SET search_path", flag it.
           // But statically analyzing the concatenated string is hard.
           // However, we ALREADY forbid string concatenation in queries via `no-unsafe-query`.
           // So this rule specifically should target WHERE `no-unsafe-query` might miss (e.g. valid syntax but unsafe LOGIC),
           // OR reinforce it.
           
           // Actually `no-unsafe-query` blocks `query('SET search_path = ' + val)`.
           // But what about `query('SET search_path = $1', [val])`?
           // PostgreSQL DOES NOT allow parameters for `SET search_path`. It must be a literal identifier.
           // usages like `SET search_path TO $1` throw syntax error in PG.
           // So users MUST use string interpolation or literal.
           // `no-unsafe-query` will block the string interpolation/concatenation.
           // So the only "safe" way usually is `query('SET search_path = public')`.
           
           // Wait, if `no-unsafe-query` blocks all dynamic queries, then `no-unsafe-search-path` is redundant?
           // Not quite. `no-unsafe-query` allows template literals without expressions.
           // It blocks concatenation.
           
           // But sometimes people disable `no-unsafe-query` or use helpers.
           // Also, `pg-format` usage: `format('SET search_path = %I', val)`.
           // This IS safe from SQLi in general, but for `search_path`, allows changing to ARBITRARY schema.
           // If attacker controls `val`, they can point to `hack_public` schema.
           // So we want to ensure `search_path` is HARDCODED or strictly validated.
           
           // Let's detect `SET search_path` in any string literal part of the arg.
           // If we find it, and the argument is NOT a pure String Literal (i.e. it involves vars/functions), WARN.
        }

        if (queryArg.type === AST_NODE_TYPES.Literal) {
          if (typeof queryArg.value === 'string' && hasSearchPath(queryArg.value)) {
             // Safe: Literal string "SET search_path = public"
             return; 
          }
        }
        
        // If it's a TemplateLiteral
        if (queryArg.type === AST_NODE_TYPES.TemplateLiteral) {
           // Check quasis
           const rawText = queryArg.quasis.map(q => q.value.raw).join(' ');
           if (hasSearchPath(rawText)) {
              if (queryArg.expressions.length > 0) {
                 context.report({
                   node: queryArg,
                   messageId: 'noUnsafeSearchPath',
                 });
              }
           }
           return;
        }
        
        // If it's a BinaryExpression (concat)
        if (queryArg.type === AST_NODE_TYPES.BinaryExpression) {
            // We can't easily reconstruction the full string. 
            // But if we detect "search_path" in any literal part, and it's being concatenated, flag it.
            
            // This is a simplified visitor for the binary expression tree
            const parts: string[] = [];
            const stack: any[] = [queryArg];
            
            while(stack.length > 0) {
              const curr = stack.pop();
              if (curr.type === AST_NODE_TYPES.BinaryExpression && curr.operator === '+') {
                stack.push(curr.right);
                stack.push(curr.left);
              } else if (curr.type === AST_NODE_TYPES.Literal && typeof curr.value === 'string') {
                parts.push(curr.value);
              } 
            }
            
            const combined = parts.join(' ');
            if (hasSearchPath(combined)) {
               context.report({
                 node: queryArg,
                 messageId: 'noUnsafeSearchPath',
               });
            }
            return;
        }
        
        // CallExpression (e.g. pg-format)
        // format('SET search_path = %I', schema) -> This is arguably unsafe if schema is user-controlled.
        if (queryArg.type === AST_NODE_TYPES.CallExpression) {
           if (queryArg.arguments.length > 0 && 
               queryArg.arguments[0].type === AST_NODE_TYPES.Literal && 
               typeof queryArg.arguments[0].value === 'string' &&
               hasSearchPath(queryArg.arguments[0].value)) {
                 
                 // Fix: If all arguments are Literals, assume it is safe.
                 const allLiterals = queryArg.arguments.every(arg => arg.type === AST_NODE_TYPES.Literal);
                 if (allLiterals) return;

                 context.report({
                   node: queryArg,
                   messageId: 'noUnsafeSearchPath',
                 });
           }
        }
      },
    };
  },
};
