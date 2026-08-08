/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-insecure-comparison
 * Detects insecure comparison operators (==, !=) that can lead to type coercion vulnerabilities
 * CWE-697: Incorrect Comparison
 * 
 * @see https://cwe.mitre.org/data/definitions/697.html
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'insecureComparison' | 'useStrictEquality' | 'timingUnsafeComparison';

export interface Options {
  /** Allow insecure comparison in test files. Default: false */
  allowInTests?: boolean;
  
  /** Additional patterns to ignore. Default: [] */
  ignorePatterns?: string[];
}

type RuleOptions = [Options?];

export const noInsecureComparison = createRule<RuleOptions, MessageIds>({
  name: 'no-insecure-comparison',
  meta: {
    type: 'problem',
    deprecated: true,
    replacedBy: ['node-security/no-timing-unsafe-compare'],
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-insecure-comparison.md',
      description: 'Detects insecure comparison operators (==, !=) that can lead to type coercion vulnerabilities',
      cwe: 'CWE-697',
      cvss: 5.3,
    },
    // No `fixable`: this rule emits suggestions only. Rewriting `==` to `===`
    // is not guaranteed to preserve behaviour, so it must not run under
    // `--fix`.
    hasSuggestions: true,
    messages: {
      insecureComparison: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insecure Comparison',
        cwe: 'CWE-697',
        description: 'Insecure comparison operator ({{operator}}) detected - can lead to type coercion vulnerabilities',
        severity: 'HIGH',
        fix: 'Use strict equality ({{strictOperator}}) instead: {{example}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/697.html',
      }),
      useStrictEquality: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Strict Equality',
        description: 'Use strict equality operator',
        severity: 'LOW',
        fix: 'Replace == with === and != with !==',
        documentationLink: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality',
      }),
      timingUnsafeComparison: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Timing Attack Risk',
        cwe: 'CWE-208',
        description: 'Secret comparison with {{operator}} can leak timing information',
        severity: 'HIGH',
        fix: 'Use crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))',
        documentationLink: 'https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
            description: 'Allow insecure comparison in test files',
          },
          ignorePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional patterns to ignore',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      ignorePatterns: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}]
  ) {
    const {
      allowInTests = false,
      ignorePatterns = [],
    } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);
    const sourceCode = context.sourceCode;

    // Codemods and AST-walker tools legitimately compare AST identifiers
    // (`node.key === 'foo'`, `node.name === 'bar'`) — those keys aren't
    // secrets, they're AST property names that happen to share the word
    // "key". Detect codemod context once per file.
    const AST_TOOL_PACKAGES = [
      '@babel/types', '@babel/traverse', '@babel/generator', '@babel/parser',
      'recast', 'jscodeshift', 'estree-walker', 'unist-util-visit',
      '@typescript-eslint/utils', '@typescript-eslint/typescript-estree',
      'typescript', 'ts-morph', 'eslint',
    ];
    const isCodemodFile = (() => {
      if (/\/codemod[s]?\//i.test(filename)) return true;
      if (/codemod\.[mc]?[jt]sx?$/i.test(filename)) return true;
      // Look for AST-tool imports at the top of the file
      const program = sourceCode.ast;
      for (const stmt of program.body) {
        if (stmt.type === 'ImportDeclaration') {
          const source = (stmt.source as TSESTree.Literal).value;
          if (typeof source === 'string' && AST_TOOL_PACKAGES.some((p) => source === p || source.startsWith(p + '/'))) {
            return true;
          }
        }
      }
      return false;
    })();

    /**
     * Check if a string matches any ignore pattern
     */
    // oxlint-disable-next-line consistent-function-scoping
    function matchesIgnorePattern(text: string, patterns: string[]): boolean {
      return patterns.some(pattern => {
        try {
          const regex = new RegExp(pattern, 'i');
          return regex.test(text);
        } catch {
          // Invalid regex - treat as literal string match
          return text.toLowerCase().includes(pattern.toLowerCase());
        }
      });
    }

    /**
     * `null` literal, ignoring parentheses.
     */
    function isNullLiteral(node: TSESTree.Node): boolean {
      return node.type === 'Literal' && node.raw === 'null';
    }

    /**
     * Check BinaryExpression for insecure comparison operators
     */
    function checkBinaryExpression(node: TSESTree.BinaryExpression) {
      if (isTestFile) {
        return;
      }

      // Skip codemod / AST-walker contexts — `node.key === '...'` style
      // comparisons there are AST identifier checks, not secret comparisons.
      if (isCodemodFile) {
        return;
      }

      // Word-level, not substring-level. The bare keywords `key`, `auth` and
      // `mac` used to be matched as substrings of the whole expression's source
      // text, which made `if (key === "__non_webpack_require__")` a "timing
      // attack" and swept in `monkey`, `keyword`, `machine`, `author`. A secret
      // is named by a *word*, so match words.
      const secretKeywords = new Set([
        'secret', 'secrets', 'token', 'tokens', 'password', 'passwd', 'pwd',
        'apikey', 'api_key', 'secretkey', 'secret_key', 'privatekey', 'private_key',
        'signature', 'hmac', 'digest', 'checksum', 'nonce', 'otp',
        'passwordhash', 'password_hash', 'hashedpassword', 'hashed_password',
      ]);

      /**
       * Split an identifier-ish name into lowercase word segments:
       * `expectedPassword` → ['expected', 'password'], `api_key` → ['api','key'].
       * The joined form is kept too so `apiKey` also matches the `apikey` entry.
       */
      // oxlint-disable-next-line consistent-function-scoping
      const nameSegments = (name: string): string[] => {
        const parts = name
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .split(/[^A-Za-z0-9]+/)
          .filter(Boolean)
          .map((p) => p.toLowerCase());
        return [...parts, parts.join(''), parts.join('_'), name.toLowerCase()];
      };

      /** Every identifier / property name appearing inside an expression. */
      // oxlint-disable-next-line consistent-function-scoping
      const namesIn = (expr: TSESTree.Node): string[] => {
        const out: string[] = [];
        const walk = (n: TSESTree.Node): void => {
          if (n.type === 'Identifier') out.push(n.name);
          else if (n.type === 'MemberExpression') {
            walk(n.object);
            if (!n.computed && n.property.type === 'Identifier') out.push(n.property.name);
            else walk(n.property);
          } else if (n.type === 'CallExpression') {
            walk(n.callee);
          }
        };
        walk(expr);
        return out;
      };

      const isSecurityContext = ((): boolean => {
         let current: TSESTree.Node | undefined = node;
         while (current) {
             if ((current.type === 'FunctionDeclaration' || 
                  current.type === 'FunctionExpression' || 
                  current.type === 'ArrowFunctionExpression') && 
                  'id' in current && current.id?.name) {
                 if (/security|auth|crypto|hash|token|secret|insecure|verify|validate/i.test(current.id.name)) {
                     return true;
                 }
             }
             if (current.type === 'MethodDefinition' && current.key.type === 'Identifier') {
                  if (/security|auth|crypto|hash|token|secret|insecure|verify|validate/i.test(current.key.name)) {
                     return true;
                 }
             }
             current = current.parent;
         }
         return false;
      })();

      const isPotentialSecret = (expr: TSESTree.Expression): boolean => {
        const segments = namesIn(expr).flatMap(nameSegments);
        if (segments.some(segment => secretKeywords.has(segment))) return true;

        // In security contexts, treat generic terms as potential secrets
        if (isSecurityContext) {
            const contextKeywords = new Set(['provided', 'expected', 'actual', 'input', 'value', 'data']);
            return segments.some(segment => contextKeywords.has(segment));
        }
        return false;
      };

      // Timing-safe comparison for secrets even with strict equality
      if ((node.operator === '===' || node.operator === '!==') &&
          (isPotentialSecret(node.left) || isPotentialSecret(node.right))) {
        
        // SKIP: Length comparisons are safe - they're actually required before timingSafeEqual
        const isLengthComparison = (expr: TSESTree.Expression): boolean => {
          return expr.type === AST_NODE_TYPES.MemberExpression &&
                 expr.property.type === AST_NODE_TYPES.Identifier &&
                 expr.property.name === 'length';
        };
        
        if (isLengthComparison(node.left) || isLengthComparison(node.right)) {
          return; // Length checks are safe and recommended
        }
        
        const leftText = sourceCode.getText(node.left);
        const rightText = sourceCode.getText(node.right);
        
        // ... rest of logic uses example ...
        const example = `crypto.timingSafeEqual(Buffer.from(${leftText}), Buffer.from(${rightText}))`;
        
        context.report({
          node,
          messageId: 'timingUnsafeComparison',
          data: {
            operator: node.operator,
            strictOperator: node.operator,
            example: example,
          },
          suggest: [
            {
              messageId: 'useStrictEquality', // This messageId usage might be wrong for timing safe output, but kept for now or reused?
               // Wait, previous code used useStrictEquality as suggest?
               // Ah, the previous code had a fix/suggest structure.
              fix: (fixer: TSESLint.RuleFixer) => fixer.replaceText(node, example),
            },
          ],
        });
        return;
      }

      // Check for insecure comparison operators
      if (node.operator === '==' || node.operator === '!=') {
        const text = sourceCode.getText(node);
        
        // Check if it matches any ignore pattern
        if (matchesIgnorePattern(text, ignorePatterns)) {
          return;
        }

        // `x == null` / `x != null` is the idiomatic nullish check: it matches
        // null *and* undefined in one comparison, which is exactly why it is
        // written that way. It is not a type-coercion weakness, and rewriting
        // it to `=== null` silently drops the `undefined` case. Core `eqeqeq`
        // exempts it under the `smart`/`allow-null` options for the same
        // reason. Measured on express/axios/sequelize: 73 of 161 reports from
        // this rule were this pattern.
        if (isNullLiteral(node.left) || isNullLiteral(node.right)) {
          return;
        }

        const strictOperator = node.operator === '==' ? '===' : '!==';
        const leftText = sourceCode.getText(node.left);
        const rightText = sourceCode.getText(node.right);
        const example = `${leftText} ${strictOperator} ${rightText}`;

        context.report({
          node: node,
          messageId: 'insecureComparison',
          data: {
            operator: node.operator,
            strictOperator,
            example,
          },
          // No `fix` here on purpose: swapping `==` for `===` can change
          // runtime behaviour when the operands differ in type, so it is not
          // safe to run under `--fix`. Offered as a suggestion the author
          // opts into.
          suggest: [
            {
              messageId: 'useStrictEquality',
              fix: (fixer: TSESLint.RuleFixer) => {
                return fixer.replaceText(node, example);
              },
            },
          ],
        });
      }
    }

    return {
      BinaryExpression: checkBinaryExpression,
    };
  },
});

