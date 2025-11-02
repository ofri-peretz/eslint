/**
 * ESLint Rule: detect-child-process
 * Detects instances of child_process & non-literal exec() calls
 * LLM-optimized with comprehensive command injection prevention guidance
 *
 * @see https://owasp.org/www-community/attacks/Command_Injection
 * @see https://cwe.mitre.org/data/definitions/78.html
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { generateLLMContext } from '../../utils/llm-context';

type MessageIds =
  | 'childProcessCommandInjection'
  | 'useExecFile'
  | 'useSpawn'
  | 'useSaferLibrary'
  | 'validateInput'
  | 'useShellFalse';

export interface Options {
  /** Allow exec() with literal strings (false = stricter) */
  allowLiteralStrings?: boolean;
  /** Allow spawn() with literal arguments (false = stricter) */
  allowLiteralSpawn?: boolean;
  /** Additional child_process methods to check */
  additionalMethods?: string[];
}

type RuleOptions = [Options?];

/**
 * Command execution patterns and their security implications
 */
interface CommandPattern {
  method: string;
  dangerous: boolean;
  vulnerability: 'command-injection' | 'argument-injection' | 'path-injection';
  safeAlternatives: string[];
  example: { bad: string; good: string[] };
  effort: string;
}

const COMMAND_PATTERNS: CommandPattern[] = [
  {
    method: 'exec',
    dangerous: true,
    vulnerability: 'command-injection',
    safeAlternatives: ['execFile', 'spawn'],
    example: {
      bad: 'exec(`git clone ${repoUrl}`)',
      good: [
        'execFile(\'git\', [\'clone\', repoUrl], {shell: false})',
        'spawn(\'git\', [\'clone\', repoUrl], {shell: false})'
      ]
    },
    effort: '15-25 minutes'
  },
  {
    method: 'execSync',
    dangerous: true,
    vulnerability: 'command-injection',
    safeAlternatives: ['execFileSync', 'spawnSync'],
    example: {
      bad: 'execSync(`npm install ${packageName}`)',
      good: [
        'execFileSync(\'npm\', [\'install\', packageName], {shell: false})',
        'spawnSync(\'npm\', [\'install\', packageName], {shell: false})'
      ]
    },
    effort: '15-25 minutes'
  },
  {
    method: 'spawn',
    dangerous: false,
    vulnerability: 'argument-injection',
    safeAlternatives: ['spawn with validation'],
    example: {
      bad: 'spawn(\'bash\', [\'-c\', userCommand])',
      good: [
        'spawn(validatedCommand, validatedArgs, {shell: false})',
        '// Validate command and args first'
      ]
    },
    effort: '20-30 minutes'
  }
];

export const detectChildProcess = createRule<RuleOptions, MessageIds>({
  name: 'detect-child-process',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects child_process usage that may allow command injection',
    },
    messages: {
      childProcessCommandInjection:
        '⚠️ Command injection (CWE-78) | {{riskLevel}}\n' +
        '   ❌ Current: {{method}}("command " + userInput)\n' +
        '   ✅ Fix: {{alternatives}}\n' +
        '   📚 https://owasp.org/www-community/attacks/Command_Injection',
      useExecFile: '✅ Use execFile() with argument array instead of string interpolation',
      useSpawn: '✅ Use spawn() with separate arguments: spawn(cmd, [arg1, arg2])',
      useSaferLibrary: '✅ Consider safer libraries: execa, zx, or cross-spawn',
      validateInput: '✅ Add input validation and sanitization',
      useShellFalse: '✅ Always use shell: false to prevent shell interpretation'
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowLiteralStrings: {
            type: 'boolean',
            default: false,
            description: 'Allow exec() with literal strings'
          },
          allowLiteralSpawn: {
            type: 'boolean',
            default: false,
            description: 'Allow spawn() with literal arguments'
          },
          additionalMethods: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional child_process methods to check'
          }
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowLiteralStrings: false,
      allowLiteralSpawn: false,
      additionalMethods: []
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      allowLiteralStrings = false,
      allowLiteralSpawn = false,
      additionalMethods = []
    } = options;

    /**
     * Child process methods that can be dangerous
     */
    const dangerousMethods = [
      'exec',
      'execSync',
      'execFile',
      'execFileSync',
      'spawn',
      'spawnSync',
      'fork',
      'forkSync',
      ...additionalMethods
    ];

    /**
     * Check if a node contains string interpolation or concatenation
     */
    const containsDynamicStrings = (node: TSESTree.Node): boolean => {
      if (node.type === 'TemplateLiteral') {
        return node.expressions.length > 0;
      }

      if (node.type === 'BinaryExpression' && node.operator === '+') {
        return true;
      }

      // Check for variable references
      if (node.type === 'Identifier') {
        return true;
      }

      return false;
    };

    /**
     * Check if arguments contain only literals (safe)
     */
    const hasOnlyLiteralArgs = (args: TSESTree.Node[]): boolean => {
      return args.every(arg =>
        arg.type === 'Literal' ||
        (arg.type === 'ArrayExpression' &&
         arg.elements.every((el: TSESTree.Node | null) => el?.type === 'Literal'))
      );
    };

    /**
     * Extract command and arguments for analysis
     */
    const extractCommandInfo = (node: TSESTree.CallExpression): {
      method: string;
      args: string;
      pattern: CommandPattern | null;
      isDynamic: boolean;
    } => {
      const method = node.callee.type === 'MemberExpression' &&
                    node.callee.property.type === 'Identifier'
                      ? node.callee.property.name
                      : 'unknown';

      const sourceCode = context.sourceCode || context.getSourceCode();
      const args = node.arguments.map((arg: TSESTree.Node) => sourceCode.getText(arg)).join(', ');

      const pattern = COMMAND_PATTERNS.find(p => p.method === method) || null;

      // Check if arguments contain dynamic content
      const isDynamic = node.arguments.some((arg: TSESTree.Node) => containsDynamicStrings(arg));

      return { method, args, pattern, isDynamic };
    };

    /**
     * Generate refactoring steps based on the pattern
     */
    const generateRefactoringSteps = (pattern: CommandPattern): string => {
      switch (pattern.method) {
        case 'exec':
        case 'execSync':
          return [
            '   1. Replace exec() with execFile() or spawn()',
            '   2. Split command and arguments into separate array elements',
            '   3. Use {shell: false} option to prevent shell interpretation',
            '   4. Validate and sanitize all user inputs',
            '   5. Consider using execa library for better security'
          ].join('\n');

        case 'spawn':
          return [
            '   1. Ensure first argument is a safe, validated command path',
            '   2. Pass arguments as separate array elements',
            '   3. Use {shell: false} to prevent shell injection',
            '   4. Validate command exists and is executable',
            '   5. Consider using cross-spawn for cross-platform safety'
          ].join('\n');

        default:
          return [
            '   1. Identify the specific command execution need',
            '   2. Choose appropriate child_process method',
            '   3. Use argument arrays instead of string interpolation',
            '   4. Add comprehensive input validation',
            '   5. Test with malicious inputs'
          ].join('\n');
      }
    };

    /**
     * Determine risk level based on the call pattern
     */
    const determineRiskLevel = (pattern: CommandPattern | null, isDynamic: boolean): 'critical' | 'high' | 'medium' => {
      if (pattern?.dangerous && isDynamic) {
        return 'critical';
      }
      if (pattern?.dangerous || isDynamic) {
        return 'high';
      }
      return 'medium';
    };

    /**
     * Check child_process calls for security issues
     */
    const checkChildProcessCall = (node: TSESTree.CallExpression) => {
      // Check if it's a child_process method call
      if (node.callee.type !== 'MemberExpression' ||
          node.callee.object.type !== 'Identifier' ||
          node.callee.object.name !== 'child_process' ||
          node.callee.property.type !== 'Identifier') {
        return;
      }

      const methodName = node.callee.property.name;

      // Skip if not a dangerous method
      if (!dangerousMethods.includes(methodName)) {
        return;
      }

      const { method, args, pattern, isDynamic } = extractCommandInfo(node);

      // Allow literal strings if configured
      if (allowLiteralStrings && method === 'exec' && !isDynamic) {
        return;
      }

      // Allow literal spawn if configured
      if (allowLiteralSpawn && method === 'spawn' && hasOnlyLiteralArgs(node.arguments)) {
        return;
      }

      // Report the security issue
      const riskLevel = determineRiskLevel(pattern, isDynamic);
      const steps = pattern ? generateRefactoringSteps(pattern) : 'Review and secure command execution';
      const alternatives = pattern?.safeAlternatives.join(', ') || 'execFile, spawn with validation';

      const llmContext = generateLLMContext('security/detect-child-process', {
        severity: riskLevel === 'critical' ? 'error' : riskLevel === 'high' ? 'warning' : 'info',
        category: 'security',
        filePath: context.filename || context.getFilename(),
        node,
        details: {
          vulnerability: {
            type: pattern?.vulnerability || 'command-injection',
            cwe: 'CWE-78: OS Command Injection',
            owasp: 'A03:2021-Injection',
            cvss: riskLevel === 'critical' ? '9.8' : riskLevel === 'high' ? '8.1' : '6.5'
          },
          command: {
            method,
            dangerous: pattern?.dangerous || false,
            dynamicArguments: isDynamic,
            shellInjectionRisk: method.includes('exec') && isDynamic
          },
          exploitability: {
            difficulty: isDynamic ? 'Easy' : 'Medium',
            impact: 'Complete server compromise, data exfiltration',
            prerequisites: 'User input reaches command execution'
          },
          remediation: {
            effort: pattern?.effort || '15-30 minutes',
            priority: `${riskLevel} - Fix immediately`,
            automated: false,
            steps: [
              `Replace ${method}() with safer alternative`,
              'Use argument arrays instead of string interpolation',
              'Add shell: false option',
              'Validate all inputs',
              'Test with malicious commands'
            ]
          }
        },
        quickFix: {
          automated: false,
          estimatedEffort: pattern?.effort || '15-30 minutes',
          changes: [
            `Replace ${method}(${args}) with safe alternative`,
            'Split command and arguments into array',
            'Add input validation',
            'Use shell: false option'
          ]
        },
        resources: {
          docs: 'https://owasp.org/www-community/attacks/Command_Injection',
          examples: 'https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html',
        }
      });

      context.report({
        node,
        messageId: 'childProcessCommandInjection',
        data: {
          ...llmContext,
          method,
          args,
          riskLevel,
          vulnerability: pattern?.vulnerability || 'command injection',
          alternatives,
          steps,
          effort: pattern?.effort || '15-30 minutes'
        },
        suggest: [
          {
            messageId: 'useExecFile',
            fix: () => null
          },
          {
            messageId: 'useSpawn',
            fix: () => null
          },
          {
            messageId: 'useSaferLibrary',
            fix: () => null
          },
          {
            messageId: 'validateInput',
            fix: () => null
          },
          {
            messageId: 'useShellFalse',
            fix: () => null
          }
        ]
      });
    };

    /**
     * Check require/import statements for child_process
     */
    const checkChildProcessImport = () => {
      // This could be extended to warn about child_process imports in general
      // For now, we focus on the actual dangerous calls
    };

    return {
      CallExpression: checkChildProcessCall,
      ImportDeclaration: checkChildProcessImport
    };
  },
});
