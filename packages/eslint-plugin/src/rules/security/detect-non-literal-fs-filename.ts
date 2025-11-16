/**
 * ESLint Rule: detect-non-literal-fs-filename
 * Detects variable in filename argument of fs calls, which might allow an attacker to access anything on your system
 * LLM-optimized with comprehensive path traversal prevention guidance
 *
 * @see https://owasp.org/www-community/attacks/Path_Traversal
 * @see https://cwe.mitre.org/data/definitions/22.html
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { generateLLMContext } from '../../utils/llm-context';

type MessageIds =
  | 'fsPathTraversal'
  | 'usePathResolve'
  | 'validatePath'
  | 'useBasename'
  | 'createSafeDir'
  | 'whitelistExtensions';

export interface Options {
  /** Allow literal strings. Default: false (stricter) */
  allowLiterals?: boolean;
  
  /** Additional fs methods to check */
  additionalMethods?: string[];
}

type RuleOptions = [Options?];

/**
 * File system operations and their security implications
 */
interface FSOperation {
  method: string;
  dangerous: boolean;
  vulnerability: 'path-traversal' | 'directory-traversal' | 'file-access';
  safePattern: string;
  example: { bad: string; good: string };
  effort: string;
}

const FS_OPERATIONS: FSOperation[] = [
  {
    method: 'readFile',
    dangerous: true,
    vulnerability: 'file-access',
    safePattern: 'path.resolve(SAFE_DIR, path.basename(userInput))',
    example: {
      bad: 'fs.readFile(userPath, callback)',
      good: 'const safePath = path.join(SAFE_UPLOADS_DIR, path.basename(userPath)); fs.readFile(safePath, callback)'
    },
    effort: '10-15 minutes'
  },
  {
    method: 'writeFile',
    dangerous: true,
    vulnerability: 'file-access',
    safePattern: 'path.resolve(SAFE_DIR, path.basename(userInput))',
    example: {
      bad: 'fs.writeFile(userPath, data, callback)',
      good: 'const safePath = path.join(SAFE_WRITES_DIR, path.basename(userPath)); fs.writeFile(safePath, data, callback)'
    },
    effort: '10-15 minutes'
  },
  {
    method: 'stat',
    dangerous: true,
    vulnerability: 'path-traversal',
    safePattern: 'path.resolve(baseDir, userInput) with validation',
    example: {
      bad: 'fs.stat(userPath, callback)',
      good: 'const resolvedPath = path.resolve(SAFE_DIR, userPath);\nif (!resolvedPath.startsWith(SAFE_DIR)) return;\nfs.stat(resolvedPath, callback)'
    },
    effort: '15-20 minutes'
  },
  {
    method: 'readdir',
    dangerous: true,
    vulnerability: 'directory-traversal',
    safePattern: 'Validate directory is within allowed paths',
    example: {
      bad: 'fs.readdir(userDir, callback)',
      good: 'const resolvedDir = path.resolve(ALLOWED_DIRS, userDir);\nif (!resolvedDir.startsWith(ALLOWED_DIRS)) return;\nfs.readdir(resolvedDir, callback)'
    },
    effort: '15-20 minutes'
  }
];

export const detectNonLiteralFsFilename = createRule<RuleOptions, MessageIds>({
  name: 'detect-non-literal-fs-filename',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects variable in filename argument of fs calls, which might allow an attacker to access anything on your system',
    },
    messages: {
      // 🎯 Token optimization: 39% reduction (49→30 tokens) - template variables still work
      fsPathTraversal: formatLLMMessage({
        icon: '🔑',
        issueName: 'Path traversal',
        cwe: 'CWE-22',
        description: 'Path traversal vulnerability',
        severity: '{{riskLevel}}',
        fix: '{{safePattern}}',
        documentationLink: 'https://owasp.org/www-community/attacks/Path_Traversal',
      }),
      usePathResolve: '✅ Use path.resolve() to normalize paths and prevent traversal',
      validatePath: '✅ Validate resolved path starts with allowed base directory',
      useBasename: '✅ Use path.basename() to strip directory components',
      createSafeDir: '✅ Define SAFE_DIR constant for allowed file operations',
      whitelistExtensions: '✅ Whitelist allowed file extensions'
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowLiterals: {
            type: 'boolean',
            default: false,
            description: 'Allow literal string paths'
          },
          additionalMethods: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional fs methods to check'
          },
          allowedExtensions: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Allowed file extensions (e.g., [".txt", ".json"])'
          }
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowLiterals: false,
      additionalMethods: []
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      allowLiterals = false,
      additionalMethods = []
    } = options;

    /**
     * File system methods that can be dangerous with user input
     */
    const dangerousMethods = [
      'readFile', 'readFileSync',
      'writeFile', 'writeFileSync',
      'appendFile', 'appendFileSync',
      'stat', 'statSync',
      'lstat', 'lstatSync',
      'readdir', 'readdirSync',
      'unlink', 'unlinkSync',
      'mkdir', 'mkdirSync',
      'rmdir', 'rmdirSync',
      'access', 'accessSync',
      'createReadStream', 'createWriteStream',
      ...additionalMethods
    ];

    /**
     * Check if a node is a literal string (safe)
     */
    const isLiteralString = (node: TSESTree.Node): boolean => {
      return node.type === 'Literal' && typeof node.value === 'string';
    };

    /**
     * Check if path has dangerous patterns like ../ or ..\
     */
    const hasTraversalPatterns = (pathStr: string): boolean => {
      return /\.\.[/\\]/.test(pathStr) || /^\.\.[/\\]/.test(pathStr);
    };

    /**
     * Extract path argument from fs call
     */
    const extractPathArgument = (node: TSESTree.CallExpression): {
      path: string;
      pathNode: TSESTree.Node | null;
      method: string;
      operation: FSOperation | null;
    } => {
      const method = node.callee.type === 'MemberExpression' &&
                    node.callee.property.type === 'Identifier'
                      ? node.callee.property.name
                      : 'unknown';

      const operation = FS_OPERATIONS.find(op => op.method === method) || null;

      // First argument is usually the path
      const pathNode = node.arguments.length > 0 ? node.arguments[0] : null;
      const sourceCode = context.sourceCode || context.getSourceCode();
      const path = pathNode ? sourceCode.getText(pathNode) : '';

      return { path, pathNode, method, operation };
    };

    /**
     * Determine if the path argument is potentially dangerous
     */
    const isDangerousPath = (pathNode: TSESTree.Node | null, pathStr: string): boolean => {
      // Allow literals if configured
      if (allowLiterals && pathNode && isLiteralString(pathNode)) {
        return false;
      }

      // Check for obvious traversal patterns in literals
      if (pathNode && isLiteralString(pathNode) && hasTraversalPatterns(pathStr)) {
        return true;
      }

      // Any non-literal is dangerous
      return !pathNode || !isLiteralString(pathNode);
    };

    /**
     * Generate refactoring steps based on the operation
     */
    const generateRefactoringSteps = (operation: FSOperation): string => {
      switch (operation.method) {
        case 'readFile':
        case 'writeFile':
          return [
            '   1. Define a SAFE_DIR constant for allowed operations',
            '   2. Use path.basename() to strip directory components',
            '   3. Combine with SAFE_DIR: path.join(SAFE_DIR, path.basename(userPath))',
            '   4. Optionally validate file extensions',
            '   5. Add error handling for invalid paths'
          ].join('\n');

        case 'stat':
          return [
            '   1. Use path.resolve() to normalize the path',
            '   2. Check if resolved path starts with allowed base directory',
            '   3. Reject requests that escape the allowed directory',
            '   4. Use path.relative() for additional validation',
            '   5. Log security events for monitoring'
          ].join('\n');

        case 'readdir':
          return [
            '   1. Resolve the directory path: path.resolve(ALLOWED_DIRS, userDir)',
            '   2. Validate resolved path starts with ALLOWED_DIRS',
            '   3. Check directory exists and is readable',
            '   4. Consider whitelisting allowed directories',
            '   5. Add rate limiting to prevent enumeration attacks'
          ].join('\n');

        default:
          return [
            '   1. Identify the specific file operation needed',
            '   2. Define safe base directories for operations',
            '   3. Use path.resolve() and validate containment',
            '   4. Sanitize user input (basename, extension validation)',
            '   5. Add comprehensive error handling'
          ].join('\n');
      }
    };

    /**
     * Determine risk level based on the operation and path
     */
    const determineRiskLevel = (operation: FSOperation, pathStr: string): string => {
      if (hasTraversalPatterns(pathStr)) {
        return 'CRITICAL';
      }

      if (operation.dangerous) {
        return 'HIGH';
      }

      return 'MEDIUM';
    };

    /**
     * Check fs method calls for path traversal vulnerabilities
     */
    const checkFsCall = (node: TSESTree.CallExpression) => {
      // Check if it's an fs method call
      if (node.callee.type !== 'MemberExpression' ||
          node.callee.object.type !== 'Identifier' ||
          node.callee.object.name !== 'fs' ||
          node.callee.property.type !== 'Identifier') {
        return;
      }

      const methodName = node.callee.property.name;

      // Skip if not a dangerous method
      if (!dangerousMethods.includes(methodName)) {
        return;
      }

      const { path, pathNode, method, operation } = extractPathArgument(node);

      // Check if the path argument is dangerous
      if (!isDangerousPath(pathNode, path)) {
        return;
      }

      const riskLevel = determineRiskLevel(operation || FS_OPERATIONS[0], path);
      const steps = operation ? generateRefactoringSteps(operation) : 'Review file system access patterns';
      const safePattern = operation?.safePattern || 'Use path.resolve() with validation';

      const _llmContext = generateLLMContext('security/detect-non-literal-fs-filename', {
        severity: riskLevel.toLowerCase() as 'error' | 'warning',
        category: 'security',
        filePath: context.filename || context.getFilename(),
        node,
        details: {
          vulnerability: {
            type: operation?.vulnerability || 'path-traversal',
            cwe: 'CWE-22: Path Traversal',
            owasp: 'A01:2021-Broken Access Control',
            cvss: riskLevel === 'CRITICAL' ? '8.1' : riskLevel === 'HIGH' ? '7.5' : '5.3'
          },
          fileSystem: {
            method,
            dangerous: operation?.dangerous || false,
            pathArgument: path,
            hasTraversalPatterns: hasTraversalPatterns(path)
          },
          exploitability: {
            difficulty: hasTraversalPatterns(path) ? 'Easy' : 'Medium',
            impact: 'Arbitrary file read/write, data exfiltration, server compromise',
            prerequisites: 'User input reaches file system operations'
          },
          remediation: {
            effort: operation?.effort || '15-20 minutes',
            priority: `${riskLevel} - Fix immediately`,
            automated: false,
            steps: [
              `Replace ${method}(${path}) with safe pattern`,
              'Use path.resolve() and validate containment',
              'Define SAFE_DIR constants for allowed operations',
              'Add input validation and sanitization',
              'Test with malicious path inputs'
            ]
          }
        },
        quickFix: {
          automated: false,
          estimatedEffort: operation?.effort || '15-20 minutes',
          changes: [
            `Replace ${method}(${path}) with safe file access pattern`,
            'Add path validation to prevent directory traversal',
            'Use path.join() or path.resolve() with base directory checks',
            'Define constants for safe directories'
          ]
        },
        resources: {
          docs: 'https://owasp.org/www-community/attacks/Path_Traversal',
          examples: 'https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html'
        }
      });

      context.report({
        node,
        messageId: 'fsPathTraversal',
        data: {
          method,
          path,
          riskLevel,
          vulnerability: operation?.vulnerability || 'path traversal',
          safePattern,
          steps,
          effort: operation?.effort || '15-20 minutes'
        },
        suggest: [
          {
            messageId: 'usePathResolve',
            fix: () => null
          },
          {
            messageId: 'validatePath',
            fix: () => null
          },
          {
            messageId: 'useBasename',
            fix: () => null
          },
          {
            messageId: 'createSafeDir',
            fix: () => null
          },
          {
            messageId: 'whitelistExtensions',
            fix: () => null
          }
        ]
      });
    };

    return {
      CallExpression: checkFsCall
    };
  },
});
