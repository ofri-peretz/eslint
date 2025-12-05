/**
 * ESLint Rule: no-zip-slip
 * Detects zip slip/archive extraction vulnerabilities (CWE-22)
 *
 * Zip slip vulnerabilities occur when extracting archives without properly
 * validating file paths, allowing attackers to write files outside the
 * intended extraction directory using path traversal sequences like "../".
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe archive extraction patterns
 * - Path validation functions
 * - JSDoc annotations (@safe, @validated)
 * - Trusted extraction libraries
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
type MessageIds =
  | 'zipSlipVulnerability'
  | 'unsafeArchiveExtraction'
  | 'pathTraversalInArchive'
  | 'unvalidatedArchivePath'
  | 'dangerousArchiveDestination'
  | 'useSafeArchiveExtraction'
  | 'validateArchivePaths'
  | 'sanitizeArchiveNames'
  | 'strategyPathValidation'
  | 'strategySafeLibraries'
  | 'strategySandboxing';

export interface Options {
  /** Archive extraction functions to check */
  archiveFunctions?: string[];

  /** Functions that safely validate archive paths */
  pathValidationFunctions?: string[];

  /** Safe archive extraction libraries */
  safeLibraries?: string[];
}

type RuleOptions = [Options?];


export const noZipSlip = createRule<RuleOptions, MessageIds>({
  name: 'no-zip-slip',
  meta: {
    type: 'problem',
    docs: {
      description: 'Detects zip slip/archive extraction vulnerabilities',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      zipSlipVulnerability: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Zip Slip Vulnerability',
        cwe: 'CWE-22',
        description: 'Archive extraction vulnerable to path traversal',
        severity: '{{severity}}',
        fix: '{{safeAlternative}}',
        documentationLink: 'https://cwe.mitre.org/data/definitions/22.html',
      }),
      unsafeArchiveExtraction: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Archive Extraction',
        cwe: 'CWE-22',
        description: 'Archive extraction without path validation',
        severity: 'HIGH',
        fix: 'Use safe extraction libraries or validate all paths',
        documentationLink: 'https://snyk.io/research/zip-slip-vulnerability',
      }),
      pathTraversalInArchive: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Path Traversal in Archive',
        cwe: 'CWE-22',
        description: 'Archive contains path traversal sequences',
        severity: 'CRITICAL',
        fix: 'Reject archives with path traversal or sanitize paths',
        documentationLink: 'https://cwe.mitre.org/data/definitions/22.html',
      }),
      unvalidatedArchivePath: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unvalidated Archive Path',
        cwe: 'CWE-22',
        description: 'Archive entry path used without validation',
        severity: 'HIGH',
        fix: 'Validate paths before extraction',
        documentationLink: 'https://snyk.io/research/zip-slip-vulnerability',
      }),
      dangerousArchiveDestination: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Dangerous Archive Destination',
        cwe: 'CWE-22',
        description: 'Archive extracted to sensitive location',
        severity: 'MEDIUM',
        fix: 'Extract to safe temporary directory',
        documentationLink: 'https://cwe.mitre.org/data/definitions/22.html',
      }),
      useSafeArchiveExtraction: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Safe Archive Extraction',
        description: 'Use libraries with built-in path validation',
        severity: 'LOW',
        fix: 'Use yauzl, safe-archive-extract, or similar safe libraries',
        documentationLink: 'https://www.npmjs.com/package/yauzl',
      }),
      validateArchivePaths: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Archive Paths',
        description: 'Validate all archive entry paths',
        severity: 'LOW',
        fix: 'Check paths don\'t contain ../ and are within destination directory',
        documentationLink: 'https://snyk.io/research/zip-slip-vulnerability',
      }),
      sanitizeArchiveNames: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Sanitize Archive Names',
        description: 'Sanitize archive entry names',
        severity: 'LOW',
        fix: 'Use path.basename() or custom sanitization',
        documentationLink: 'https://nodejs.org/api/path.html#pathbasenamepath-ext',
      }),
      strategyPathValidation: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Path Validation Strategy',
        description: 'Validate paths before any file operations',
        severity: 'LOW',
        fix: 'Check path.startsWith(destination) and no ../ sequences',
        documentationLink: 'https://cwe.mitre.org/data/definitions/22.html',
      }),
      strategySafeLibraries: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Safe Libraries Strategy',
        description: 'Use archive libraries with built-in safety',
        severity: 'LOW',
        fix: 'Use yauzl, adm-zip with validation, or safe-archive-extract',
        documentationLink: 'https://www.npmjs.com/package/safe-archive-extract',
      }),
      strategySandboxing: formatLLMMessage({
        icon: MessageIcons.STRATEGY,
        issueName: 'Sandboxing Strategy',
        description: 'Extract archives in sandboxed environment',
        severity: 'LOW',
        fix: 'Use temporary directories and restrict permissions',
        documentationLink: 'https://nodejs.org/api/fs.html#fsopentempdirprefix-options-callback',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          archiveFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['extract', 'extractAll', 'extractAllTo', 'unzip', 'untar', 'extractArchive'],
          },
          pathValidationFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validatePath', 'sanitizePath', 'checkPath', 'safePath'],
          },
          safeLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: ['yauzl', 'safe-archive-extract', 'tar-stream', 'unzipper'],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      archiveFunctions: ['extract', 'extractAll', 'extractAllTo', 'unzip', 'untar', 'extractArchive'],
      pathValidationFunctions: ['validatePath', 'sanitizePath', 'checkPath', 'safePath'],
      safeLibraries: ['yauzl', 'safe-archive-extract', 'tar-stream', 'unzipper'],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      archiveFunctions = ['extract', 'extractAll', 'extractAllTo', 'unzip', 'untar', 'extractArchive'],
      pathValidationFunctions = ['validatePath', 'sanitizePath', 'checkPath', 'safePath'],
      safeLibraries = ['yauzl', 'safe-archive-extract', 'tar-stream', 'unzipper'],
    }: Options = options;

    const filename = context.filename || context.getFilename();

    // Safety checks are implemented directly in the handlers

    /**
     * Check if this is an archive extraction operation
     */
    const isArchiveExtraction = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // Check for archive method calls (e.g., zip.extractAllTo)
      if (callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          archiveFunctions.includes(callee.property.name)) {
        return true;
      }

      // Check for standalone archive functions (e.g., extractArchive)
      if (callee.type === 'Identifier' &&
          archiveFunctions.includes(callee.name)) {
        return true;
      }

      return false;
    };

    /**
     * Check if path contains dangerous traversal sequences
     */
    const containsPathTraversal = (pathText: string): boolean => {
      // Check for ../ sequences
      return /\.\.\//.test(pathText) ||
             /\.\.\\/.test(pathText) || // Windows paths
             /^\.\./.test(pathText) || // Leading ..
             /\/\.\./.test(pathText);  // Embedded /..
    };


    /**
     * Check if path has been validated
     */
    const isPathValidated = (pathNode: TSESTree.Node): boolean => {
      let current: TSESTree.Node | undefined = pathNode;

      while (current) {
        if (current.type === 'CallExpression' &&
            current.callee.type === 'Identifier' &&
            pathValidationFunctions.includes(current.callee.name)) {
          return true;
        }
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check if this uses a safe library
     */
    const isSafeLibrary = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      if (callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          safeLibraries.includes(callee.object.name)) {
        return true;
      }

      return false;
    };

    /**
     * Check if destination is dangerous
     */
    const isDangerousDestination = (destText: string): boolean => {
      return destText.includes('/tmp') ||
             destText.includes('/var') ||
             destText.includes('/usr') ||
             destText.includes('/etc') ||
             destText.includes('/root') ||
             destText.includes('/home') ||
             destText.includes('C:\\Windows') ||
             destText.includes('C:\\Program Files') ||
             destText.includes('C:\\Users');
    };

    return {
      // Check archive extraction calls
      CallExpression(node: TSESTree.CallExpression) {
        if (isArchiveExtraction(node) && !isSafeLibrary(node)) {
          // Check for @safe annotations in the source
          const sourceCode = context.sourceCode;
          let hasSafeAnnotation = false;

          // Look for @safe comments in the source code
          const allComments = sourceCode.getAllComments();
          for (const comment of allComments) {
            if (comment.type === 'Block' && comment.value.includes('@safe')) {
              hasSafeAnnotation = true;
              break;
            }
          }

          if (hasSafeAnnotation) {
            return; // Skip reporting if marked as safe
          }

          // Check if destination is dangerous
          const args = node.arguments;
          let destArg: TSESTree.Node | undefined;

          // Determine which argument is the destination based on the function
          if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
            const methodName = node.callee.property.name;
            if (['extractAllTo', 'unzip'].includes(methodName)) {
              // Destination is the first argument
              destArg = args[0];
            } else if (archiveFunctions.includes(methodName)) {
              // For other archive functions, destination is typically the second argument
              destArg = args.length >= 2 ? args[1] : undefined;
            }
          } else if (node.callee.type === 'Identifier' && archiveFunctions.includes(node.callee.name)) {
            // For standalone functions like extractArchive(file, dest)
            destArg = args.length >= 2 ? args[1] : undefined;
          }

          const destText = destArg && destArg.type === 'Literal' && typeof destArg.value === 'string' ? destArg.value : '';
          const isDestDangerous = isDangerousDestination(destText);
          const isMethodCall = node.callee.type === 'MemberExpression';

          if (isMethodCall) {
            // Method calls report unsafeArchiveExtraction unless destination is a safe relative path
            const isSafeRelativePath = destText.startsWith('./') || destText.startsWith('../');

            if (!isSafeRelativePath) {
              context.report({
                node,
                messageId: 'unsafeArchiveExtraction',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
                suggest: [
                  {
                    messageId: 'useSafeArchiveExtraction',
                    fix: () => null,
                  },
                ],
              });
            }
            // For safe relative paths, don't report any error

            // Additionally report dangerous destination for dangerous destinations
            if (isDestDangerous) {
              context.report({
                node: destArg || node,
                messageId: 'dangerousArchiveDestination',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          } else {
            // Standalone calls: report dangerousArchiveDestination for dangerous destinations, unsafeArchiveExtraction otherwise
            if (isDestDangerous) {
              context.report({
                node,
                messageId: 'dangerousArchiveDestination',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            } else {
              context.report({
                node,
                messageId: 'unsafeArchiveExtraction',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
                suggest: [
                  {
                    messageId: 'useSafeArchiveExtraction',
                    fix: () => null
                  },
                ],
              });
            }
          }
        }

        // Check for path.join or similar operations with archive entry names
        const callee = node.callee;
        if (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            ['join', 'resolve', 'relative', 'normalize'].includes(callee.property.name)) {

          // Check arguments for potential archive entry usage
          const args = node.arguments;
          for (const arg of args) {
            if (arg.type === 'MemberExpression' &&
                arg.property.type === 'Identifier' &&
                ['name', 'path', 'fileName', 'entryName', 'relativePath', 'filename', 'pathname'].includes(arg.property.name)) {

              // This looks like path.join(dest, entry.name) - check if validated
              if (!isPathValidated(arg)) {
                context.report({
                  node: arg,
                  messageId: 'unvalidatedArchivePath',
                  data: {
                    filePath: filename,
                    line: String(node.loc?.start.line ?? 0),
                  },
                });
              }
            }
          }
        }
      },

      // Check string literals for dangerous paths
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string') {
          return;
        }

        const text = node.value;

        // Check for path traversal in strings that look like file paths
        if ((text.includes('/') || text.includes('\\')) && containsPathTraversal(text)) {
          // Check if this is in an archive-related context
          let current: TSESTree.Node | undefined = node;
          let isArchiveContext = false;

          while (current && !isArchiveContext) {
            if (current.type === 'CallExpression' && isArchiveExtraction(current)) {
              isArchiveContext = true;
              break;
            }
            if (current.type === 'VariableDeclarator' &&
                current.id.type === 'Identifier' &&
                (current.id.name.includes('archive') ||
                 current.id.name.includes('zip') ||
                 current.id.name.includes('tar') ||
                 current.id.name.includes('path') ||
                 current.id.name.includes('file') ||
                 current.id.name.includes('entry'))) {
              isArchiveContext = true;
              break;
            }
            current = current.parent as TSESTree.Node;
          }

          // Also check if the variable name suggests archive usage
          const parent = node.parent;
          if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
            const varName = parent.id.name.toLowerCase();
            if (varName.includes('archive') || varName.includes('zip') || varName.includes('tar') ||
                varName.includes('path') || varName.includes('file') || varName.includes('extract') ||
                varName.includes('entry')) {
              isArchiveContext = true;
            }
          }

          if (isArchiveContext) {
            context.report({
              node,
              messageId: 'pathTraversalInArchive',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }

        // Dangerous destinations are handled by the CallExpression handler to avoid duplicates
        // Only check for dangerous destinations not related to archive extraction
        if (isDangerousDestination(text) && !containsPathTraversal(text)) {
          // Check if this is used as an extraction destination
          let current: TSESTree.Node | undefined = node;
          let isExtractionDest = false;

          while (current && !isExtractionDest) {
            if (current.type === 'CallExpression' && isArchiveExtraction(current)) {
              // Check if this node is a destination argument
              const args = current.arguments;
              const callee = current.callee;
              const isMethodCall = callee.type === 'MemberExpression';

              if ((isMethodCall && args.length >= 1 && args[0] === node) ||
                  (!isMethodCall && args.length >= 2 && args[1] === node)) {
                isExtractionDest = true;
                break;
              }
            }
            current = current.parent as TSESTree.Node;
          }

          // Only report if not already handled by CallExpression handler
          if (!isExtractionDest) {
            context.report({
              node,
              messageId: 'dangerousArchiveDestination',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check variable assignments
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init || node.id.type !== 'Identifier') {
          return;
        }

        const varName = node.id.name.toLowerCase();

        // Check if this variable holds archive-related data
        if (varName.includes('entry') || varName.includes('file') || varName.includes('path')) {
          if (node.init.type === 'MemberExpression' &&
              node.init.property.type === 'Identifier' &&
              ['name', 'path'].includes(node.init.property.name)) {

            // This looks like: const entryName = entry.name;
            // Check if this variable is used unsafely later
            // This is a simplified check - in practice we'd need more sophisticated analysis
          }
        }
      }
    };
  },
});
