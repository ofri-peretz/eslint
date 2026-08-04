/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Prevent using AI output directly in dangerous operations
 * @description Detects when AI-generated content is used in eval, exec, or SQL
 * @see OWASP LLM05: Improper Output Handling
 * @see OWASP ASI05: Unexpected Code Execution
 */

import type { TSESLint } from '@interlace/eslint-devkit';
import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'unsafeOutputExecution' | 'unsafeOutputInSQL' | 'unsafeOutputInHTML';

export interface Options {
  /** Variable patterns that suggest AI output */
  aiOutputPatterns?: string[];
}

type RuleOptions = [Options?];

export const noUnsafeOutputHandling = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-output-handling',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/no-unsafe-output-handling.md',
      description: 'Prevent using AI output directly in dangerous operations (eval, SQL, HTML)',
      cwe: 'CWE-94',
      cvss: 9.8,
      confidence: 'medium',
    },
    messages: {
      unsafeOutputExecution: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'AI Output Used in Code Execution',
        cwe: 'CWE-94',
        owasp: 'A03:2021',
        cvss: 9.8,
        description: 'AI-generated content "{{variable}}" passed to {{function}}. This can lead to Remote Code Execution.',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS'],
        fix: 'Never execute AI-generated code directly. Use sandboxed execution with validation.',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
      unsafeOutputInSQL: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'AI Output in SQL Query',
        cwe: 'CWE-89',
        owasp: 'A03:2021',
        cvss: 9.0,
        description: 'AI-generated content used in SQL query. Use parameterized queries instead.',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'PCI-DSS'],
        fix: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = ?", [aiOutput])',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
      }),
      unsafeOutputInHTML: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'AI Output in innerHTML',
        cwe: 'CWE-79',
        owasp: 'A03:2021',
        cvss: 7.5,
        description: 'AI-generated content assigned to innerHTML. This can lead to XSS attacks.',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Use textContent or sanitize HTML: element.textContent = aiOutput',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          aiOutputPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Variable patterns that suggest AI output',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      aiOutputPatterns: [
        'result.text',
        'response.text',
        'completion',
        'generated',
        'aiOutput',
        'aiResponse',
        'llmOutput',
        'llmResponse',
        'modelOutput',
        'textContent',
        '.text',
      ],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const aiOutputPatterns = options.aiOutputPatterns ?? [
      'result.text', 'response.text', 'completion', 'generated',
      'aiOutput', 'aiResponse', 'llmOutput', '.text',
    ];

    const sourceCode = context.sourceCode;

    // Dangerous execution functions
    const dangerousFunctions = ['eval', 'Function', 'execSync', 'exec', 'spawn', 'execFile'];
    
    // SQL execution patterns
    const sqlPatterns = ['query', 'execute', 'run', 'raw'];
    
    /**
     * Variables locally bound to the result of a known AI SDK call.
     * Tracks the idiomatic `const { text } = await generateText(...)` and
     * `const result = await streamText(...)` patterns. Without this, the
     * heuristic pattern match (`result.text`, `aiOutput`, …) missed every
     * destructured-`text` case (real FN found by the OWASP-LLM02 corpus).
     *
     * Keyed on the resolved scope variable, not the name: `text` is one of the
     * most common identifiers there is, so a name set reports any unrelated
     * `text` parameter in a file that happens to also destructure one from an
     * AI call.
     */
    const aiBoundVariables = new Set<TSESLint.Scope.Variable>();

    /**
     * Whether an identifier is a read of a binding holding AI output.
     *
     * Asks the tracked variables which identifiers refer to them, rather than
     * resolving the identifier back to a variable — scope analysis has already
     * linked the two, and going this direction has no unresolved case to
     * handle. A shadowing `text` is a different variable, so its identifier is
     * simply not among these references.
     */
    function isAIBound(node: TSESTree.Node): boolean {
      if (node.type !== 'Identifier') return false;
      for (const variable of aiBoundVariables) {
        if (variable.references.some((r) => r.identifier === node)) return true;
      }
      return false;
    }

    const AI_SDK_CALLS = new Set(['generateText', 'streamText', 'generateObject', 'streamObject']);

    function isAISDKCall(node: TSESTree.Expression): boolean {
      // generateText(...) | ai.generateText(...) | sdk.generateText(...)
      let target: TSESTree.Expression = node;
      if (target.type === 'AwaitExpression') target = target.argument as TSESTree.Expression;
      if (target.type !== 'CallExpression') return false;
      const callee = target.callee;
      if (callee.type === 'Identifier' && AI_SDK_CALLS.has(callee.name)) return true;
      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier' &&
          AI_SDK_CALLS.has(callee.property.name)) return true;
      return false;
    }

    /**
     * Check if a node likely contains AI output
     */
    function isLikelyAIOutput(node: TSESTree.Node): boolean {
      // Direct member access into a tracked variable: `result.text`, `out.text`
      if (node.type === 'MemberExpression' && isAIBound(node.object)) {
        return true;
      }
      // Bare reference to a tracked variable (covers destructured `text` from
      // `const { text } = await generateText(...)`).
      if (isAIBound(node)) {
        return true;
      }
      // Original heuristic — still useful for `result.text`-shaped source even
      // when scope tracking missed the binding.
      const text = sourceCode.getText(node);
      return aiOutputPatterns.some((pattern: string) => text.includes(pattern));
    }

    /**
     * Check an interpolated string for AI output.
     *
     * Descends into the *parts* that carry values — a template literal's
     * `${...}` expressions and the operands of a `+` chain — instead of
     * pattern-matching the node's whole source text. Text matching only ever
     * caught `db.query(`... ${result.text}`)`; the tracked-binding case
     * `const { text } = await generateText(...); db.query(`... ${text}`)`
     * fell through, because the source reads `text` while the patterns look
     * for `.text`. The eval and innerHTML branches already consulted
     * aiBoundNames directly, so only the SQL branch had this gap.
     */
    function containsAIOutput(node: TSESTree.Node): boolean {
      if (node.type === 'TemplateLiteral') {
        return node.expressions.some(containsAIOutput);
      }
      if (node.type === 'BinaryExpression') {
        // `+` only. Nested chains parse left-associatively: `'a' + b + c` is
        // `('a' + b) + c`. Any other operator — `db.query(rows > limit)` — is a
        // comparison or arithmetic, not a query being built out of a value, so
        // there is nothing interpolated to report.
        return (
          node.operator === '+' &&
          (containsAIOutput(node.left) || containsAIOutput(node.right))
        );
      }
      return isLikelyAIOutput(node);
    }

    return {
      // Track `const r = await generateText(...)` / `const { text } = ...` shapes
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init || !isAISDKCall(node.init)) return;
        // Covers `const r = ...` and every binding in `const { text, usage } = ...`
        // without walking the pattern by hand.
        for (const variable of sourceCode.getDeclaredVariables(node)) {
          aiBoundVariables.add(variable);
        }
      },

      // Check for eval() and similar with AI output
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check dangerous execution functions
        const isDangerous = dangerousFunctions.some(fn => callee.includes(fn));
        if (isDangerous) {
          for (const arg of node.arguments) {
            if (isLikelyAIOutput(arg)) {
              context.report({
                node: arg,
                messageId: 'unsafeOutputExecution',
                data: { 
                  variable: sourceCode.getText(arg),
                  function: callee,
                },
              });
            }
          }
        }

        // Check SQL query functions
        const isSQLFunction = sqlPatterns.some(fn => callee.includes(fn));
        if (isSQLFunction) {
          for (const arg of node.arguments) {
            if (arg.type === 'TemplateLiteral' || arg.type === 'BinaryExpression') {
              // Check if template/concatenation includes AI output
              if (containsAIOutput(arg)) {
                context.report({
                  node: arg,
                  messageId: 'unsafeOutputInSQL',
                });
              }
            }
          }
        }
      },

      // Check for innerHTML assignment
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type === 'MemberExpression') {
          const prop = node.left.property;
          if (prop.type === 'Identifier' && prop.name === 'innerHTML') {
            if (isLikelyAIOutput(node.right)) {
              context.report({
                node: node.right,
                messageId: 'unsafeOutputInHTML',
              });
            }
          }
        }
      },
    };
  },
});
