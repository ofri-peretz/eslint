/**
 * ESLint Rule: detect-child-process
 * Detects instances of child_process & non-literal exec() calls
 * LLM-optimized with comprehensive command injection prevention guidance
 *
 * @see https://owasp.org/www-community/attacks/Command_Injection
 * @see https://cwe.mitre.org/data/definitions/78.html
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds =
  | 'childProcessCommandInjection'
  | 'useExecFile'
  | 'useSpawn'
  | 'useSaferLibrary'
  | 'validateInput'
  | 'useShellFalse';

export interface Options {
  /** Allow exec() with literal strings. Default: false (stricter) */
  allowLiteralStrings?: boolean;
  
  /** Allow spawn() with literal arguments. Default: false (stricter) */
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
      // 🎯 Token optimization: 44% reduction (55→31 tokens) - removes ❌/✅/📚 labels
      childProcessCommandInjection: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Command injection',
        cwe: 'CWE-78',
        description: 'Command injection detected',
        severity: 'CRITICAL',
        fix: 'Use execFile/spawn with {shell: false} and array args',
        documentationLink: 'https://owasp.org/www-community/attacks/Command_Injection',
      }),
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
    
}: Options = options || {};

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

      context.report({
        node,
        messageId: 'childProcessCommandInjection',
        data: {
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
