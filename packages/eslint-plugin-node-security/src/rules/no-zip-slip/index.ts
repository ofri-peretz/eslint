/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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

  /**
   * Module specifiers that mean this file works with archives.
   * Default: see DEFAULT_ARCHIVE_MODULES.
   */
  archiveModules?: string[];

  /**
   * Report entry-name and traversal shapes in files that never touch an
   * archive. Default: `false`.
   *
   * `true` restores the pre-inversion behaviour. Measured on an 8-repo corpus
   * that produced 8 findings, none of which involved an archive at all.
   */
  reportWithoutArchiveContext?: boolean;

  /** Functions that safely validate archive paths */
  pathValidationFunctions?: string[];

  /** Safe archive extraction libraries */
  safeLibraries?: string[];
}

type RuleOptions = [Options?];


/**
 * Modules whose presence means this file actually handles archives.
 *
 * Zip slip needs an ARCHIVE: an attacker-authored entry name, joined to a
 * destination, and written out. Without one there is no attacker-authored
 * name, and the two name-shaped handlers below degenerate into "this file
 * mentions `entry.name`" and "this string contains `../`" — which is precisely
 * what they produced on the corpus. All 8 findings were archive-free:
 *
 *   - `Shopify/cli` `packages/cli/bin/bundle.js:28` —
 *     `glob.sync('../../node_modules/.pnpm/**\/yoga.wasm')[0]`, a literal
 *     containing `../` in a variable whose name contains `file`.
 *   - `okta/okta-auth-js` `samples/gulpfile.js:37` —
 *     `const OKTA_ENV_SCRIPT_PATH = '../env/index.js'`, likewise.
 *   - `Shopify/cli` `packages/e2e/setup/app.ts:75,78` —
 *     `path.join(parentDir, entry.name)` where `entry` is an `fs.readdirSync`
 *     Dirent, a name the local filesystem authored.
 *
 * A hardcoded `'../env/index.js'` is never zip slip; it is a relative import
 * path the author wrote. Requiring an archive in the file is what separates
 * the mechanism from its silhouette.
 */
const DEFAULT_ARCHIVE_MODULES = [
  'adm-zip', 'unzipper', 'yauzl', 'yazl', 'tar', 'tar-fs', 'tar-stream',
  'extract-zip', 'node-stream-zip', 'jszip', 'archiver', 'decompress',
  'unzip-stream', 'zip-stream', 'gunzip-maybe', '7zip-min', 'node-7z',
];

/**
 * Check if path contains dangerous traversal sequences
 */
const containsPathTraversal = (pathText: string): boolean => {
  // Check for ../ sequences
  return /\.\.\//.test(pathText) ||
         /\.\.\\/.test(pathText) || // Windows paths
         pathText.startsWith('..') ||
         /\/\.\./.test(pathText);  // Embedded /..
};

/**
 * Check if destination is dangerous (sensitive system directories)
 * Note: /tmp is NOT dangerous - it's the standard safe temp location
 */
const isDangerousDestination = (destText: string): boolean => {
  // /tmp is SAFE - it's the standard temp location
  if (destText.startsWith('/tmp') || destText.includes('os.tmpdir') || destText.includes('TMPDIR')) {
    return false;
  }
  
  return destText.includes('/var') ||
         destText.includes('/usr') ||
         destText.includes('/etc') ||
         destText.includes('/root') ||
         destText.includes('/home') ||
         destText.includes('C:\\Windows') ||
         destText.includes('C:\\Program Files') ||
         destText.includes('C:\\Users');
};


export const noZipSlip = createRule<RuleOptions, MessageIds>({
  name: 'no-zip-slip',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-zip-slip.md',
      description: 'Detects zip slip/archive extraction vulnerabilities',
      cwe: 'CWE-22',
    },
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
          archiveModules: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_ARCHIVE_MODULES,
            description: 'Module specifiers that mean this file works with archives',
          },
          reportWithoutArchiveContext: {
            type: 'boolean',
            default: false,
            description:
              'Report entry-name and traversal shapes in files with no archive. Restores the pre-inversion behaviour.',
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
      archiveModules = DEFAULT_ARCHIVE_MODULES,
      reportWithoutArchiveContext = false,
    }: Options = options;

    const filename = context.filename;
    const archiveModuleSet = new Set(archiveModules.map((name) => name.toLowerCase()));

    /**
     * Does this file work with archives at all?
     *
     * True when it imports or requires an archive module, or when it contains
     * an archive-extraction call. Collected across the whole file before any
     * judgement is made, so a `require('adm-zip')` below the extraction still
     * counts — a rule that depended on statement order would be reporting on
     * formatting.
     */
    let hasArchiveContext = reportWithoutArchiveContext;
    const isArchiveModule = (specifier: unknown): boolean =>
      typeof specifier === 'string' && archiveModuleSet.has(specifier.toLowerCase());

    /**
     * Names that only appear when archives are in play: `new AdmZip(file)`,
     * `zipfile.readEntry()`, `tarStream.extract()`.
     *
     * A name heuristic, deliberately — but it gates CONTEXT, never a finding.
     * The report still requires the entry-name or traversal evidence below; all
     * this decides is whether that evidence is about an archive. Checked
     * against the two corpus files that produced `unvalidatedArchivePath`
     * (`Shopify/cli` `packages/e2e/setup/app.ts` and
     * `bin/bundling/esbuild-plugin-dedup-cli-kit.js`): neither contains the
     * substring `zip`, `tar` or `archive` anywhere.
     */
    const ARCHIVE_NAME = /zip|tarball|archive|gzip|gunzip|untar|tarstream|\btar\b/i;
    const namesArchive = (node: TSESTree.Node): boolean => {
      if (node.type === 'Identifier') return ARCHIVE_NAME.test(node.name);
      if (node.type === 'MemberExpression') {
        return (
          namesArchive(node.object) ||
          (node.property.type === 'Identifier' && ARCHIVE_NAME.test(node.property.name))
        );
      }
      return false;
    };

    /** Shapes deferred to Program:exit, once archive context is known. */
    const pending: (() => void)[] = [];

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
     * Check if path has been validated or sanitized
     * Detects patterns like:
     * - validatePath(), sanitizePath() custom functions
     * - path.basename() sanitization
     * - startsWith() validation in preceding if-block
     */
    const isPathValidated = (pathNode: TSESTree.Node): boolean => {
      let current: TSESTree.Node | undefined = pathNode;

      while (current) {
        // Check for custom validation function wrappers
        if (current.type === 'CallExpression' &&
            current.callee.type === 'Identifier' &&
            pathValidationFunctions.includes(current.callee.name)) {
          return true;
        }
        
        // Check for path.basename() sanitization
        if (current.type === 'CallExpression' &&
            current.callee.type === 'MemberExpression' &&
            current.callee.object.type === 'Identifier' &&
            current.callee.object.name === 'path' &&
            current.callee.property.type === 'Identifier' &&
            current.callee.property.name === 'basename') {
          return true;
        }
        
        // Check for preceding if-block with startsWith validation
        if (current.type === 'IfStatement') {
          const test = current.test;
          // if (path.startsWith(...)) or if (!path.startsWith(...)) { throw/return }
          if (test.type === 'CallExpression' &&
              test.callee.type === 'MemberExpression' &&
              test.callee.property.type === 'Identifier' &&
              test.callee.property.name === 'startsWith') {
            return true;
          }
          if (test.type === 'UnaryExpression' && test.operator === '!' &&
              test.argument.type === 'CallExpression' &&
              test.argument.callee.type === 'MemberExpression' &&
              test.argument.callee.property.type === 'Identifier' &&
              test.argument.callee.property.name === 'startsWith') {
            return true;
          }
          // if (path.includes('..')) { throw/return }
          if (test.type === 'CallExpression' &&
              test.callee.type === 'MemberExpression' &&
              test.callee.property.type === 'Identifier' &&
              test.callee.property.name === 'includes') {
            return true;
          }
        }
        
        current = current.parent as TSESTree.Node;
      }

      return false;
    };

    /**
     * Check if this uses a safe library
     * Safe libraries have built-in path validation or are known to be secure
     */
    const isSafeLibrary = (node: TSESTree.CallExpression): boolean => {
      const callee = node.callee;

      // Check for method calls on safe library instances (e.g., yauzl.open())
      if (callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          safeLibraries.includes(callee.object.name)) {
        return true;
      }

      // Check for direct calls to safe library functions (e.g., extract(file, opts))
      // This handles patterns like: const extract = require('extract-zip'); extract(...)
      if (callee.type === 'Identifier') {
        const name = callee.name.toLowerCase();
        if (name === 'extract' || name === 'unzipper' || 
            safeLibraries.some(lib => name.includes(lib.toLowerCase()))) {
          return true;
        }
      }

      return false;
    };

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (isArchiveModule(node.source.value)) hasArchiveContext = true;
      },

      NewExpression(node: TSESTree.NewExpression) {
        if (namesArchive(node.callee)) hasArchiveContext = true;
      },

      'Program:exit'() {
        for (const report of pending) report();
      },

      // Check archive extraction calls
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments[0]?.type === 'Literal' &&
          isArchiveModule(node.arguments[0].value)
        ) {
          hasArchiveContext = true;
        }
        if (isArchiveExtraction(node) || namesArchive(node.callee)) hasArchiveContext = true;
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
            } else {
              // For other archive functions, destination is typically the
              // second argument. isArchiveExtraction() already guaranteed
              // methodName is listed in archiveFunctions for member callees.
              destArg = args.length >= 2 ? args[1] : undefined;
            }
          } else {
            // For standalone functions like extractArchive(file, dest);
            // isArchiveExtraction() already guaranteed the callee is an
            // Identifier naming an archive function.
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

            // Additionally report dangerous destination for dangerous destinations.
            // `isDestDangerous` implies `destArg` is a string Literal (destText
            // is derived from it), so no `|| node` fallback is needed here.
            if (isDestDangerous && destArg) {
              context.report({
                node: destArg,
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

              // This looks like path.join(dest, entry.name) — but only if an
              // archive is involved. `entry` is just as often an
              // `fs.readdirSync` Dirent, whose name the local filesystem
              // authored, and `require.resolve(args.path)` is not an archive
              // at all.
              if (!isPathValidated(arg)) {
                pending.push(() => {
                  if (!hasArchiveContext) return;
                  context.report({
                    node: arg,
                    messageId: 'unvalidatedArchivePath',
                    data: {
                      filePath: filename,
                      line: String(node.loc?.start.line ?? 0),
                    },
                  });
                });
              }
            }
          }
        }
      },

      /**
       * A `../` inside a string literal.
       *
       * Narrowed to literals that sit INSIDE an archive-extraction call. The
       * handler used to also fire on any literal in a declarator whose name
       * contained `path`, `file`, `entry`, `archive`, `zip` or `tar` — which is
       * every relative import path and every glob in a build script, and was
       * five of the eight corpus findings. A traversal sequence an author typed
       * into their own source is not an attacker-authored archive entry; it is
       * a relative path.
       */
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string') {
          return;
        }

        const text = node.value;
        if (!(text.includes('/') || text.includes('\\')) || !containsPathTraversal(text)) {
          return;
        }

        let current: TSESTree.Node | undefined = node;
        while (current) {
          if (current.type === 'CallExpression' && isArchiveExtraction(current)) {
            context.report({
              node,
              messageId: 'pathTraversalInArchive',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
            return;
          }
          current = current.parent as TSESTree.Node;
        }

        // Dangerous-destination check lives in the CallExpression handler; the
        // previous "fire on any /etc or /home literal" logic produced false
        // positives on unrelated calls (fs.readFileSync, exec, …).
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
