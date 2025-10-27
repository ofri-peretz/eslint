/**
 * ESLint Rule: no-unsafe-dynamic-require
 * Detects dynamic require() calls that could lead to code injection
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { generateLLMContext } from '../../utils/llm-context';

type MessageIds = 'unsafeDynamicRequire' | 'useStaticImport' | 'useAllowlist';

interface Options {
  allowDynamicImport?: boolean;
}

type RuleOptions = [Options?];

export const noUnsafeDynamicRequire = createRule<RuleOptions, MessageIds>({
  name: 'no-unsafe-dynamic-require',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent unsafe dynamic require() calls that could enable code injection',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      unsafeDynamicRequire: '🔒 Security: Dynamic require() | Risk: {{risk}} | Attack: {{attack}}',
      useStaticImport: '✅ Use static import',
      useAllowlist: '✅ Add path validation with allowlist',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowDynamicImport: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowDynamicImport: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { allowDynamicImport = false } = options;

    const sourceCode = context.sourceCode || context.getSourceCode();
    const filename = context.filename || context.getFilename();

    /**
     * Check if argument is dynamic (not a literal)
     */
    const isDynamicArgument = (arg: TSESTree.Expression | TSESTree.SpreadElement): boolean => {
      if (arg.type === 'Literal') return false;
      if (arg.type === 'TemplateLiteral' && arg.expressions.length === 0) return false;
      return true;
    };

    /**
     * Generate secure alternative
     */
    const generateSecureAlternative = (node: TSESTree.CallExpression): string => {
      const arg = node.arguments[0];
      if (!arg || arg.type === 'SpreadElement') return '';

      const argText = sourceCode.getText(arg);
      
      return `// Use allowlist validation:
const ALLOWED_MODULES = ['module1', 'module2'];
const moduleName = ${argText};
if (!ALLOWED_MODULES.includes(moduleName)) {
  throw new Error('Module not allowed');
}
const module = require(moduleName);`;
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for require() calls
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'require') {
          return;
        }

        // Must have at least one argument
        if (node.arguments.length === 0) return;

        const firstArg = node.arguments[0];
        if (firstArg.type === 'SpreadElement') return;

        // Check if dynamic
        if (!isDynamicArgument(firstArg)) return;

        const secureAlternative = generateSecureAlternative(node);
        const argText = sourceCode.getText(firstArg);

        const llmContext = generateLLMContext('security/no-unsafe-dynamic-require', {
          severity: 'error',
          category: 'security',
          filePath: filename,
          node,
          details: {
            vulnerability: 'Arbitrary Code Execution',
            cveExamples: ['CVE-2021-23358', 'CVE-2020-7608'],
            severity: 'CRITICAL',
            unsafePattern: {
              code: sourceCode.getText(node),
              issue: 'Dynamic module path from user input or variable',
              attackVector: 'Attacker controls path → loads malicious module',
              exampleAttack: `require("../../../../../../etc/passwd") or require("child_process").exec("rm -rf /")`,
              realWorldImpact: 'Remote Code Execution, Server takeover, Data exfiltration',
            },
            detectedPattern: {
              dynamicPath: argText,
              risk: 'HIGH - Path not validated',
              potentialImpact: 'Attacker could require arbitrary modules including native Node.js modules',
            },
            securePattern: {
              code: secureAlternative,
              approach: 'Allowlist-based validation',
              benefits: [
                'Only approved modules can be loaded',
                'No path traversal attacks possible',
                'Clear intent in code',
              ],
            },
            betterAlternatives: {
              staticImport: {
                code: `import { module } from './module';`,
                why: 'Bundler can tree-shake and optimize',
                when: 'Use when module is known at build time',
              },
              dynamicImport: {
                code: `const module = await import('./module');`,
                why: 'ESM dynamic imports are safer than require()',
                when: 'Use for code splitting with static paths',
              },
              allowlist: {
                code: secureAlternative,
                why: 'Explicit control over allowed modules',
                when: 'Use when dynamic loading is truly necessary',
              },
            },
            compliance: {
              owasp: 'A03:2021 - Injection',
              cwe: 'CWE-94: Improper Control of Generation of Code',
              nist: 'AC-6: Least Privilege',
            },
            relatedVulnerabilities: [
              'Path traversal (CWE-22)',
              'Command injection (CWE-78)',
              'Deserialization of untrusted data (CWE-502)',
            ],
          },
          resources: {
            docs: 'https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html',
          },
        });

        context.report({
          node,
          messageId: 'unsafeDynamicRequire',
          data: {
            risk: 'CRITICAL',
            attack: 'Arbitrary Code Execution',
            ...llmContext,
          },
          suggest: [
            {
              messageId: 'useStaticImport',
              fix: null, // Cannot auto-convert, needs manual intervention
            },
            {
              messageId: 'useAllowlist',
              fix: null, // Too complex for auto-fix
            },
          ],
        });
      },
    };
  },
});

