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
import {
  createRule,
  staticString,
  namesOneOf,
  propertyName,
} from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
/**
 * Six more used to sit here: `zipSlipVulnerability`, `validateArchivePaths`,
 * `sanitizeArchiveNames`, `strategyPathValidation`, `strategySafeLibraries` and
 * `strategySandboxing`. Every `context.report` in this file names one of the
 * four below, so none of the six had a report path — and none was lost, either:
 * `zipSlipVulnerability` interpolated `{{severity}}` and `{{safeAlternative}}`,
 * placeholders no call site in this rule has ever supplied, so emitting it
 * would have rendered the literal braces. The remediation text they carried is
 * already in the `fix:` line of the four messages that do fire.
 */
type MessageIds =
  | 'unsafeArchiveExtraction'
  | 'pathTraversalInArchive'
  | 'unvalidatedArchivePath'
  | 'dangerousArchiveDestination';

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

  /**
   * The property an archive entry exposes its path on.
   *
   * Every archive library spells this differently — `entryName` is adm-zip,
   * `fileName` is yauzl, `path` is unzipper and tar. The set of libraries a
   * project uses is already configurable here via `archiveModules`, so the set
   * of field names has to be too: hard-coding seven guesses and calling it
   * complete was an assertion about somebody else's dependency list.
   *
   * REPLACES the default rather than adding to it. Default:
   * `DEFAULT_ARCHIVE_ENTRY_FIELDS`.
   */
  archiveEntryFields?: string[];

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
/**
 * Extraction verbs that also mean something else in plain English.
 *
 * @protocol-constant The subset of `archiveFunctions` whose names are ordinary
 * English verbs rather than archive APIs. `extractAllTo` and `extractArchive`
 * name one thing and match on sight; `extract`, `extractAll`, `unzip` and
 * `untar` do not. A collection extracts a field, an OpenTelemetry propagator
 * extracts a trace context, a parser extracts a match — 25 findings across
 * passbolt/passbolt_styleguide and nioc/node-red-contrib-opentelemetry were
 * exactly those. This is a fact about English, not a tunable vocabulary:
 * letting a consumer shorten it would restore the false positives, and
 * `archiveFunctions` is already the option for adding a real extractor.
 */
const AMBIGUOUS_EXTRACTORS: ReadonlySet<string> = new Set([
  'extract',
  'extractAll',
  'unzip',
  'untar',
]);

/**
 * The property an archive entry carries its path on, per library.
 *
 *   entryName   adm-zip
 *   fileName    yauzl
 *   path        unzipper, tar
 *   name        tar-stream, archiver
 *
 * Named rather than inlined so a reader can see what is being assumed, and
 * `archiveEntryFields` can replace it wholesale for a library nobody here has
 * heard of.
 */
/**
 * @vocabulary Each name is the property a published archive library exposes an
 * entry's path on. Every entry cites its library, because a name we cannot
 * attribute is a guess, and a guess in a DEFAULT is an assertion about
 * somebody else's dependency list.
 *
 * `relativePath` and `pathname` were in this list until 2026-08-30 with no
 * library behind either, and no test exercised them —
 * `lint:detection-list-coverage` is what surfaced that. `pathname` is a URL
 * property, not an archive one. A consumer whose library really does spell it
 * that way sets `archiveEntryFields`.
 */
const DEFAULT_ARCHIVE_ENTRY_FIELDS = [
  'name', // node-stream-zip
  'path', // unzipper, tar, decompress
  'fileName', // yauzl
  'entryName', // adm-zip
  'filename', // unzip-stream
] as const;

const DEFAULT_ARCHIVE_MODULES = [
  'adm-zip',
  'unzipper',
  'yauzl',
  'yazl',
  'tar',
  'tar-fs',
  'tar-stream',
  'extract-zip',
  'node-stream-zip',
  'jszip',
  'archiver',
  'decompress',
  'unzip-stream',
  'zip-stream',
  'gunzip-maybe',
  '7zip-min',
  'node-7z',
];

/**
 * Check if path contains dangerous traversal sequences
 */
const containsPathTraversal = (pathText: string): boolean => {
  // Check for ../ sequences
  return (
    /\.\.\//.test(pathText) ||
    /\.\.\\/.test(pathText) || // Windows paths
    pathText.startsWith('..') ||
    /\/\.\./.test(pathText)
  ); // Embedded /..
};

/**
 * Check if destination is dangerous (sensitive system directories)
 * Note: /tmp is NOT dangerous - it's the standard safe temp location
 */
const isDangerousDestination = (destText: string): boolean => {
  // /tmp is SAFE - it's the standard temp location
  if (
    destText.startsWith('/tmp') ||
    destText.includes('os.tmpdir') ||
    destText.includes('TMPDIR')
  ) {
    return false;
  }

  return (
    destText.includes('/var') ||
    destText.includes('/usr') ||
    destText.includes('/etc') ||
    destText.includes('/root') ||
    destText.includes('/home') ||
    destText.includes('C:\\Windows') ||
    destText.includes('C:\\Program Files') ||
    destText.includes('C:\\Users')
  );
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
    messages: {
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
    },
    schema: [
      {
        type: 'object',
        properties: {
          archiveFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'extract',
              'extractAll',
              'extractAllTo',
              'unzip',
              'untar',
              'extractArchive',
            ],
          },
          pathValidationFunctions: {
            type: 'array',
            items: { type: 'string' },
            default: ['validatePath', 'sanitizePath', 'checkPath', 'safePath'],
          },
          safeLibraries: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'yauzl',
              'safe-archive-extract',
              'tar-stream',
              'unzipper',
            ],
          },
          archiveEntryFields: {
            type: 'array',
            items: { type: 'string' },
            default: [...DEFAULT_ARCHIVE_ENTRY_FIELDS],
            description:
              'Property names an archive entry exposes its path on. Replaces the default.',
          },
          archiveModules: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_ARCHIVE_MODULES,
            description:
              'Module specifiers that mean this file works with archives',
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
      archiveFunctions: [
        'extract',
        'extractAll',
        'extractAllTo',
        'unzip',
        'untar',
        'extractArchive',
      ],
      pathValidationFunctions: [
        'validatePath',
        'sanitizePath',
        'checkPath',
        'safePath',
      ],
      safeLibraries: [
        'yauzl',
        'safe-archive-extract',
        'tar-stream',
        'unzipper',
      ],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const archiveEntryFields = new Set<string>(
      options.archiveEntryFields ?? DEFAULT_ARCHIVE_ENTRY_FIELDS,
    );
    const {
      archiveFunctions = [
        'extract',
        'extractAll',
        'extractAllTo',
        'unzip',
        'untar',
        'extractArchive',
      ],
      pathValidationFunctions = [
        'validatePath',
        'sanitizePath',
        'checkPath',
        'safePath',
      ],
      safeLibraries = [
        'yauzl',
        'safe-archive-extract',
        'tar-stream',
        'unzipper',
      ],
      archiveModules = DEFAULT_ARCHIVE_MODULES,
      reportWithoutArchiveContext = false,
    }: Options = options;

    const filename = context.filename;
    const archiveModuleSet = new Set(
      archiveModules.map((name) => name.toLowerCase()),
    );

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
      typeof specifier === 'string' &&
      archiveModuleSet.has(specifier.toLowerCase());

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
    const ARCHIVE_NAME =
      /zip|tarball|archive|gzip|gunzip|untar|tarstream|\btar\b/i;
    const namesArchive = (node: TSESTree.Node): boolean => {
      if (node.type === 'Identifier') return ARCHIVE_NAME.test(node.name);
      if (node.type === 'MemberExpression') {
        return (
          namesArchive(node.object) ||
          ARCHIVE_NAME.test(propertyName(node) ?? '')
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
      const method =
        callee.type === 'MemberExpression' ? propertyName(callee) : null;
      if (method !== null && archiveFunctions.includes(method)) {
        // `extractAllTo` and `extractArchive` belong to adm-zip and collide
        // with nothing. `extract`, `extractAll`, `unzip` and `untar` are
        // ordinary English: a collection extracts a field, a propagator
        // extracts a trace context, a parser extracts a match. Those need a
        // receiver that names an archive before the name means anything.
        if (!AMBIGUOUS_EXTRACTORS.has(method)) return true;
        return namesArchive((callee as TSESTree.MemberExpression).object);
      }

      // Check for standalone archive functions (e.g., extractArchive)
      if (
        callee.type === 'Identifier' &&
        archiveFunctions.includes(callee.name)
      ) {
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
        if (
          current.type === 'CallExpression' &&
          current.callee.type === 'Identifier' &&
          pathValidationFunctions.includes(current.callee.name)
        ) {
          return true;
        }

        // Check for path.basename() sanitization
        if (
          current.type === 'CallExpression' &&
          current.callee.type === 'MemberExpression' &&
          current.callee.object.type === 'Identifier' &&
          current.callee.object.name === 'path' &&
          propertyName(current.callee) === 'basename'
        ) {
          return true;
        }

        // Check for preceding if-block with startsWith validation
        if (current.type === 'IfStatement') {
          const test = current.test;
          // if (path.startsWith(...)) or if (!path.startsWith(...)) { throw/return }
          if (
            test.type === 'CallExpression' &&
            test.callee.type === 'MemberExpression' &&
            propertyName(test.callee) === 'startsWith'
          ) {
            return true;
          }
          if (
            test.type === 'UnaryExpression' &&
            test.operator === '!' &&
            test.argument.type === 'CallExpression' &&
            test.argument.callee.type === 'MemberExpression' &&
            propertyName(test.argument.callee) === 'startsWith'
          ) {
            return true;
          }
          // if (path.includes('..')) { throw/return }
          if (
            test.type === 'CallExpression' &&
            test.callee.type === 'MemberExpression' &&
            propertyName(test.callee) === 'includes'
          ) {
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
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        safeLibraries.includes(callee.object.name)
      ) {
        return true;
      }

      // Check for direct calls to safe library functions (e.g., extract(file, opts))
      // This handles patterns like: const extract = require('extract-zip'); extract(...)
      if (callee.type === 'Identifier') {
        const name = callee.name.toLowerCase();
        if (
          name === 'extract' ||
          name === 'unzipper' ||
          safeLibraries.some((lib) => name.includes(lib.toLowerCase()))
        ) {
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
        // `namesArchive` only — NOT `isArchiveExtraction`. The latter matches a
        // bare `.extract()` on any receiver, so letting it establish context
        // made the rule circular: the call being judged was its own evidence
        // that the file handles archives.
        //
        // Measured 2026-08-25: 22 of 28 findings on passbolt/passbolt_styleguide
        // were `this.extract("id")` in entity-collection models, and all three
        // on nioc/node-red-contrib-opentelemetry were
        // `propagator.extract(context.active(), headers, getter)` — OpenTelemetry
        // trace-context propagation. Neither file contains the substring `zip`,
        // `tar` or `archive` anywhere. A password manager would have received a
        // pull request whose entire content was that mistake.
        if (namesArchive(node.callee)) hasArchiveContext = true;
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
          const extractor =
            node.callee.type === 'MemberExpression'
              ? propertyName(node.callee)
              : null;
          if (extractor !== null) {
            const methodName = extractor;
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

          const destText =
            (destArg === undefined ? null : staticString(destArg)) ?? '';
          const isDestDangerous = isDangerousDestination(destText);
          const isMethodCall = node.callee.type === 'MemberExpression';

          if (isMethodCall) {
            // Method calls report unsafeArchiveExtraction unless destination is a safe relative path
            const isSafeRelativePath =
              destText.startsWith('./') || destText.startsWith('../');

            if (!isSafeRelativePath) {
              context.report({
                node,
                messageId: 'unsafeArchiveExtraction',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
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
              });
            }
          }
        }

        // Check for path.join or similar operations with archive entry names
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          // @vocabulary Node path API
          namesOneOf(propertyName(callee), [
            'join',
            'resolve',
            'relative',
            'normalize',
          ])
        ) {
          // Check arguments for potential archive entry usage
          const args = node.arguments;
          for (const arg of args) {
            if (
              arg.type === 'MemberExpression' &&
              namesOneOf(propertyName(arg), archiveEntryFields)
            ) {
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
        if (
          !(text.includes('/') || text.includes('\\')) ||
          !containsPathTraversal(text)
        ) {
          return;
        }

        let current: TSESTree.Node | undefined = node;
        while (current) {
          if (
            current.type === 'CallExpression' &&
            isArchiveExtraction(current)
          ) {
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

      // A `VariableDeclarator` handler used to sit here. Its body was EMPTY —
      // an `if` guarding three comment lines that said "simplified check - in
      // practice we'd need more sophisticated analysis". It matched on
      // `varName.includes('entry') || varName.includes('file')`, so it read as
      // a name heuristic AND did nothing, which is the worst of both: it looked
      // like coverage in review and produced no finding ever. Removed rather
      // than repaired; the CallExpression path above is what actually decides.
    };
  },
});
