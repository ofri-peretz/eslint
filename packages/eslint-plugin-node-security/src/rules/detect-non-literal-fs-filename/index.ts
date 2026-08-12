/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: detect-non-literal-fs-filename
 * Detects variable in filename argument of fs calls, which might allow an attacker to access anything on your system
 * LLM-optimized with comprehensive path traversal prevention guidance
 *
 * @see https://owasp.org/www-community/attacks/Path_Traversal
 * @see https://cwe.mitre.org/data/definitions/22.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds =
  | 'fsPathTraversal'
  | 'usePathResolve'
  | 'validatePath'
  | 'useBasename'
  | 'createSafeDir'
  | 'whitelistExtensions';

export interface Options {
  /**
   * Identifier roots treated as attacker-reachable.
   * Default: `['req', 'request', 'ctx', 'event', 'process']`.
   */
  taintSources?: string[];

  /**
   * Report paths whose provenance cannot be resolved (a bare parameter, an
   * opaque helper's return value). Default: `false`.
   *
   * `true` restores the pre-inversion behaviour: report unless constancy can
   * be proved. Measured at 7% precision on a real-code corpus, so it is off.
   */
  reportUnresolvedPaths?: boolean;

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

/**
 * Check if path has dangerous patterns like ../ or ..\
 * Module-scope so it is directly unit-testable (Layer-2).
 */
const hasTraversalPatterns = (pathStr: string): boolean => {
  return /\.\.[/\\]/.test(pathStr) || /^\.\.[/\\]/.test(pathStr);
};

/**
 * Generate refactoring steps based on the operation.
 * Module-scope so the default arm (methods without a dedicated entry) is
 * directly unit-testable (Layer-2).
 */
export const generateRefactoringSteps = (operation: FSOperation): string => {
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
 * The four specifiers that resolve to Node's filesystem module.
 *
 * `fs/promises` is included because the promise API is the same set of sinks
 * under a different import path — `readFile(userPath)` there is exactly as
 * exploitable as `fs.readFile(userPath)`.
 */
// `fs-extra` and `graceful-fs` re-export the entire fs surface under the same
// method names, so a file using them was invisible to this rule while using
// identical code. okta-signin-widget reaches fs through `fs-extra` in at least
// five non-test files.
const FS_MODULES = new Set([
  'fs', 'node:fs', 'fs/promises', 'node:fs/promises',
  'fs-extra', 'graceful-fs',
]);

export const isFsModule = (source: unknown): boolean =>
  typeof source === 'string' && FS_MODULES.has(source);

/**
 * The fs method this callee invokes, if any.
 *
 * The rule used to require the receiver be literally the identifier `fs`, so
 * every other way of binding the module was silently unchecked — a named
 * import, a renamed default, `fs.promises`, a namespace import. A path
 * traversal is not less exploitable because the author wrote
 * `import { readFile } from 'node:fs/promises'`, so the gate now resolves the
 * binding instead of pattern-matching one spelling of it.
 *
 * Module-scope so each shape is directly unit-testable (Layer-2).
 */
export function fsMethodName(
  callee: TSESTree.Node,
  namespaces: ReadonlySet<string>,
  named: ReadonlyMap<string, string>,
): string | undefined {
  // `readFile(userPath)` — named import or destructured require.
  if (callee.type === AST_NODE_TYPES.Identifier) return named.get(callee.name);

  if (
    callee.type !== AST_NODE_TYPES.MemberExpression ||
    callee.computed ||
    callee.property.type !== AST_NODE_TYPES.Identifier
  ) {
    return undefined;
  }

  const object = callee.object;

  // `fs.readFile(userPath)` — under whatever name the module was bound to.
  if (object.type === AST_NODE_TYPES.Identifier && namespaces.has(object.name)) {
    return callee.property.name;
  }

  // `fs.promises.readFile(userPath)`.
  if (
    object.type === AST_NODE_TYPES.MemberExpression &&
    !object.computed &&
    object.object.type === AST_NODE_TYPES.Identifier &&
    namespaces.has(object.object.name) &&
    object.property.type === AST_NODE_TYPES.Identifier &&
    object.property.name === 'promises'
  ) {
    return callee.property.name;
  }

  return undefined;
}

/**
 * Is this expression `require('fs')` (or any of the four fs specifiers)?
 * Module-scope so it is directly unit-testable (Layer-2).
 */
export function isFsRequire(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === 'require' &&
    node.arguments.length > 0 &&
    node.arguments[0].type === AST_NODE_TYPES.Literal &&
    isFsModule(node.arguments[0].value)
  );
}

/**
 * Determine risk level based on the operation and path.
 * Module-scope so the non-dangerous fallback (no FS_OPERATIONS entry sets
 * dangerous: false today) is directly unit-testable (Layer-2).
 */
export const determineRiskLevel = (operation: FSOperation, pathStr: string): string => {
  if (hasTraversalPatterns(pathStr)) {
    return 'CRITICAL';
  }

  if (operation.dangerous) {
    return 'HIGH';
  }

  return 'MEDIUM';
};

export const detectNonLiteralFsFilename = createRule<RuleOptions, MessageIds>({
  name: 'detect-non-literal-fs-filename',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/detect-non-literal-fs-filename.md',
      description: 'Detects variable in filename argument of fs calls, which might allow an attacker to access anything on your system',
      cwe: 'CWE-22',
      confidence: 'medium',
    },
    hasSuggestions: true,
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
      usePathResolve: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use path.resolve',
        description: 'Use path.resolve() to normalize paths',
        severity: 'LOW',
        fix: 'path.resolve(SAFE_DIR, userInput)',
        documentationLink: 'https://nodejs.org/api/path.html#pathresolvepaths',
      }),
      validatePath: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Validate Path',
        description: 'Validate resolved path starts with allowed base',
        severity: 'LOW',
        fix: 'if (!resolved.startsWith(SAFE_DIR)) throw new Error()',
        documentationLink: 'https://owasp.org/www-community/attacks/Path_Traversal',
      }),
      useBasename: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use path.basename',
        description: 'Use path.basename() to strip directory components',
        severity: 'LOW',
        fix: 'path.basename(userInput)',
        documentationLink: 'https://nodejs.org/api/path.html#pathbasenamepath-suffix',
      }),
      createSafeDir: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Define Safe Directory',
        description: 'Define SAFE_DIR constant',
        severity: 'LOW',
        fix: 'const SAFE_DIR = path.resolve(__dirname, "uploads")',
        documentationLink: 'https://owasp.org/www-community/attacks/Path_Traversal',
      }),
      whitelistExtensions: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Whitelist Extensions',
        description: 'Whitelist allowed file extensions',
        severity: 'LOW',
        fix: 'const ALLOWED_EXT = [".txt", ".pdf"]; if (!ALLOWED_EXT.includes(ext)) throw',
        documentationLink: 'https://owasp.org/www-community/attacks/Path_Traversal',
      })
    },
    schema: [
      {
        type: 'object',
        properties: {
          taintSources: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Identifier roots treated as attacker-reachable (default: req, request, ctx, event, process)',
          },
          reportUnresolvedPaths: {
            type: 'boolean',
            default: false,
            description:
              'Report paths whose provenance cannot be resolved. Restores the pre-inversion behaviour; measured at 7% precision on real code.',
          },
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
    
}: Options = options;

    /**
     * Roots an attacker can actually reach.
     *
     * Deliberately `process` ONLY — `argv` and `env`.
     *
     * Request-sourced paths (`req`/`request`/`ctx`/`event`) and function
     * parameters belong to `no-arbitrary-file-access`, which reports them at
     * `error` and names user input as the cause. Listing them here too would
     * rebuild the 25-site double-report the two rules were just separated to
     * avoid: one line, two severities, one underlying fact.
     *
     * `process.env` counts: an operator-set variable is not a remote attacker,
     * but a path named entirely by the environment is externally parameterised
     * — `twilio-node` `RequestClient.ts:128` reads a CA bundle that way. A
     * project treating env as trusted can drop it via `taintSources`.
     */
    const DEFAULT_TAINT_ROOTS = ['process'];
    const taintRoots = new Set(options.taintSources ?? DEFAULT_TAINT_ROOTS);
    const reportUnresolvedPaths = options.reportUnresolvedPaths ?? false;

    /**
     * File system methods that can be dangerous with user input
     */
    /**
     * Which ARGUMENTS of each method are paths.
     *
     * Only `arguments[0]` was ever examined, so the destination of a copy,
     * rename, symlink or link was never checked. `Shopify/cli`
     * `bin/get-graphql-schemas.js:211` does `fs.copyFileSync(sourcePath,
     * localPath)` and `e2e/setup/auth.ts:51` copies into an env-derived
     * directory — both were silent.
     */
    const PATH_ARGUMENT_INDICES: ReadonlyMap<string, readonly number[]> = new Map([
      ['copyFile', [0, 1]], ['copyFileSync', [0, 1]],
      ['cp', [0, 1]], ['cpSync', [0, 1]],
      ['rename', [0, 1]], ['renameSync', [0, 1]],
      ['link', [0, 1]], ['linkSync', [0, 1]],
      ['symlink', [0, 1]], ['symlinkSync', [0, 1]],
    ]);

    const dangerousMethods = new Set([
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
      // Destructive methods that were missing entirely. `update-bugsnag.js:36`
      // does `fs.cpSync(sourceDirectory, …)` with `sourceDirectory` built from
      // `process.argv[2]` — a recursive copy driven by argv, unreported, while
      // the harmless `mkdir` of a temp dir two lines above WAS reported. The
      // rule flagged the safe thing and missed the dangerous one.
      'cp', 'cpSync',
      'rm', 'rmSync',
      'copyFile', 'copyFileSync',
      'rename', 'renameSync',
      'truncate', 'truncateSync',
      'symlink', 'symlinkSync',
      'link', 'linkSync',
      'utimes', 'utimesSync',
      'chmod', 'chmodSync',
      'open', 'openSync',
      'opendir', 'opendirSync',
      ...additionalMethods
    ]);

    /**
     * Check if a node is a literal string (safe)
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isLiteralString = (node: TSESTree.Node): boolean => {
      return node.type === 'Literal' && typeof node.value === 'string';
    };

    /**
     * Determine if the path argument is potentially dangerous
     */

    /** Does this expression read from something outside the program? */
    const readsTaintSource = (node: TSESTree.Node, depth = 0): boolean => {
      if (depth > 6) return false;
      switch (node.type) {
        case AST_NODE_TYPES.Identifier: {
          if (taintRoots.has(node.name)) return true;
          const bound = constBindings.get(node.name);
          return bound !== undefined && readsTaintSource(bound, depth + 1);
        }
        case AST_NODE_TYPES.MemberExpression: {
          // `process.argv[2]`, `req.query.file`, `process.env.X` — walk to the
          // root of the chain and judge that.
          return readsTaintSource(node.object, depth + 1);
        }
        case AST_NODE_TYPES.TemplateLiteral:
          return node.expressions.some((e) => readsTaintSource(e, depth + 1));
        case AST_NODE_TYPES.BinaryExpression:
          return (
            readsTaintSource(node.left as TSESTree.Node, depth + 1) ||
            readsTaintSource(node.right, depth + 1)
          );
        case AST_NODE_TYPES.CallExpression:
          // `path.join(base, req.query.f)` is tainted through its arguments.
          return node.arguments.some(
            (arg) =>
              arg.type !== AST_NODE_TYPES.SpreadElement &&
              readsTaintSource(arg, depth + 1),
          );
        default:
          return false;
      }
    };

    /**
     * Is this path argument worth reporting?
     *
     * INVERTED on purpose. This rule used to end in
     *
     *     // Any non-literal is dangerous
     *     return !pathNode || !isLiteralString(pathNode);
     *
     * which asked "can I PROVE this is constant?" and reported whenever it
     * could not. Measured over an 8-repo corpus that produced 113 findings of
     * which 8 were real — 7% precision. The 105 others were build scripts,
     * rollup configs, glob enumerations of a repo's own files, and thin fs
     * facades forwarding their own parameter.
     *
     * No amount of extra constant-recognition fixes that: adding seven more
     * guards was measured to reach ~32% precision, because the question is
     * backwards. A path is dangerous when an attacker can STEER it, so that is
     * what is asked now — report on reachable taint, not on unproven constancy.
     *
     * The trade, stated plainly: a path whose provenance this rule cannot
     * resolve is now silent. A parameter forwarded from a caller
     * (`export function read(p) { readFile(p) }`) is a caller-side decision and
     * no longer reported here; set `reportUnresolvedPaths` to restore the old
     * behaviour wholesale.
     */
    const isDangerousPath = (pathNode: TSESTree.Node | null, pathStr: string): boolean => {
      if (!pathNode) return reportUnresolvedPaths;

      // A hardcoded `../etc/passwd` is a finding regardless of taint: nobody
      // needs to steer a path that already points where it should not.
      // `allowLiterals` opts out of even that — it is the option's whole
      // purpose, and after the inversion a literal has no other way to report.
      if (isLiteralString(pathNode)) {
        return !allowLiterals && hasTraversalPatterns(pathStr);
      }

      // Explicitly validated by a startsWith guard — an existing, separate
      // mechanism this rule already honours.
      if (hasPathValidation(pathNode)) return false;

      if (readsTaintSource(pathNode)) return true;

      // Assembled purely from literals, `__dirname`, `const` bindings of the
      // same: provably not steerable.
      if (isBuildTimeConstant(pathNode)) return false;

      // Provenance unresolved. Off by default — see the note above.
      return reportUnresolvedPaths;
    };

    /**
     * Is every part of this expression fixed at build time?
     *
     * Recurses through the three ways a constant path gets assembled:
     * a literal, a `const` identifier bound to one, and a template literal
     * whose every interpolation is itself constant. `__dirname` and
     * `process.cwd()` are module-location constants, not input.
     *
     * `depth` stops `const a = b; const b = a;` from recursing forever.
     */
    const isBuildTimeConstant = (node: TSESTree.Node, depth = 0): boolean => {
      if (depth > 4) return false;
      if (isLiteralString(node)) {
        // A path can be fixed at build time and still be an attack:
        // `path.join(__dirname, '../etc/passwd')` is constant AND traversal.
        // Constant means "not attacker-steerable", not "harmless".
        // isLiteralString already proved `value` is a string, so no fallback.
        return !hasTraversalPatterns((node as TSESTree.Literal).value as string);
      }
      if (node.type === AST_NODE_TYPES.Identifier) {
        if (node.name === '__dirname' || node.name === '__filename') return true;
        const bound = constBindings.get(node.name);
        return bound !== undefined && isBuildTimeConstant(bound, depth + 1);
      }
      if (node.type === AST_NODE_TYPES.TemplateLiteral) {
        // `raw` is always populated; `cooked` is null only for an invalid
        // escape in a TAGGED template, which an fs path argument never is.
        // Traversal detection reads the same `..` either way.
        const literalText = node.quasis.map((q) => q.value.raw).join('');
        if (hasTraversalPatterns(literalText)) return false;
        return node.expressions.every((e) => isBuildTimeConstant(e, depth + 1));
      }
      if (node.type === AST_NODE_TYPES.CallExpression) {
        const callee = node.callee;
        // `process.cwd()` — where the build was launched, not user input.
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === 'process' &&
          callee.property.type === AST_NODE_TYPES.Identifier &&
          callee.property.name === 'cwd'
        ) {
          return true;
        }
        // `path.join`/`path.resolve` is constant exactly when its parts are.
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === 'path' &&
          callee.property.type === AST_NODE_TYPES.Identifier &&
          ['join', 'resolve'].includes(callee.property.name)
        ) {
          return (
            node.arguments.length > 0 &&
            node.arguments.every((arg) => isBuildTimeConstant(arg, depth + 1))
          );
        }
        return false;
      }
      if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
        return isBuildTimeConstant(node.left, depth + 1) && isBuildTimeConstant(node.right, depth + 1);
      }
      return false;
    };


    /**
     * Check if the path variable has been validated with startsWith()
     * 
     * Safe patterns:
     * 1. Inside if-block: if (safePath.startsWith(SAFE_DIR)) { fs.readFileSync(safePath); }
     * 2. After guard clause: if (!safePath.startsWith(SAFE_DIR)) { throw }; fs.readFileSync(safePath);
     */
    const hasPathValidation = (pathNode: TSESTree.Node): boolean => {
      if (pathNode.type !== AST_NODE_TYPES.Identifier) {
        return false;
      }
      
      const varName = pathNode.name;
      
      // AST-based validation detection (faster than getText + regex)
      const isValidationCall = (testNode: TSESTree.Node): boolean => {
        // Handle negation: !path.startsWith(...). The negation flag was
        // tracked here but never read afterwards (CodeQL:
        // `js/useless-assignment-to-local`); current callers only need to
        // know whether the call matches a validation idiom.
        if (testNode.type === AST_NODE_TYPES.UnaryExpression &&
            testNode.operator === '!' &&
            testNode.argument.type === AST_NODE_TYPES.CallExpression) {
          testNode = testNode.argument;
        }
        
        if (testNode.type !== AST_NODE_TYPES.CallExpression) {
          return false;
        }
        
        // Pattern 1: varName.startsWith(...) or varName.includes(...)
        if (testNode.callee.type === AST_NODE_TYPES.MemberExpression &&
            testNode.callee.object.type === AST_NODE_TYPES.Identifier &&
            testNode.callee.object.name === varName &&
            testNode.callee.property.type === AST_NODE_TYPES.Identifier &&
            (testNode.callee.property.name === 'startsWith' || 
             testNode.callee.property.name === 'includes')) {
          return true;
        }
        
        // Pattern 2: ALLOWED_FILES.includes(varName) - allowlist validation
        if (testNode.callee.type === AST_NODE_TYPES.MemberExpression &&
            testNode.callee.property.type === AST_NODE_TYPES.Identifier &&
            testNode.callee.property.name === 'includes') {
          // Check if varName is in the arguments
          for (const arg of testNode.arguments) {
            if (arg.type === AST_NODE_TYPES.Identifier && arg.name === varName) {
              return true;
            }
          }
        }
        
        // Pattern 3: /regex/.test(varName) - regex validation
        if (testNode.callee.type === AST_NODE_TYPES.MemberExpression &&
            testNode.callee.property.type === AST_NODE_TYPES.Identifier &&
            testNode.callee.property.name === 'test') {
          // Check if varName is in the arguments
          for (const arg of testNode.arguments) {
            if (arg.type === AST_NODE_TYPES.Identifier && arg.name === varName) {
              return true;
            }
          }
        }
        
        return false;
      };

      const hasEarlyExit = (consequent: TSESTree.Statement): boolean => {
        if (consequent.type === AST_NODE_TYPES.BlockStatement) {
          return consequent.body.some(stmt => 
            stmt.type === AST_NODE_TYPES.ThrowStatement ||
            stmt.type === AST_NODE_TYPES.ReturnStatement
          );
        }
        return consequent.type === AST_NODE_TYPES.ThrowStatement ||
               consequent.type === AST_NODE_TYPES.ReturnStatement;
      };
      
      // Walk up to find enclosing IfStatement or BlockStatement
      let current: TSESTree.Node | undefined = pathNode.parent;
      let foundFunctionBody = false;
      
      while (current && !foundFunctionBody) {
        // Check 1: Inside an if-block with validation
        if (current.type === AST_NODE_TYPES.IfStatement) {
          if (isValidationCall(current.test)) {
            return true;
          }
        }
        
        // Check 2: In a function body, look for preceding sibling if-statements with guard clause
        if (current.type === AST_NODE_TYPES.BlockStatement && current.parent && (
            current.parent.type === AST_NODE_TYPES.FunctionDeclaration ||
            current.parent.type === AST_NODE_TYPES.FunctionExpression ||
            current.parent.type === AST_NODE_TYPES.ArrowFunctionExpression)) {
          
          foundFunctionBody = true;
          const blockBody = current.body;
          const nodeIndex = blockBody.findIndex((stmt: TSESTree.Statement) => {
            let check: TSESTree.Node | undefined = pathNode;
            while (check) {
              if (check === stmt) return true;
              check = check.parent;
            }
            return false;
          });
          
          // Look at preceding statements for validation patterns with early exit
          for (let i = 0; i < nodeIndex; i++) {
            const stmt = blockBody[i];
            if (stmt.type === AST_NODE_TYPES.IfStatement &&
                isValidationCall(stmt.test) &&
                hasEarlyExit(stmt.consequent)) {
              return true;
            }
          }
        }
        
        current = current.parent;
      }
      
      return false;
    };

    /**
     * Names bound to the fs module itself.
     *
     * Seeded with `fs`, so a file that never imports it — the shape the rule
     * has always reported — keeps being reported. Anything else has to be
     * traced to an import or a require.
     */
    const fsNamespaces = new Set<string>(['fs']);
    /** Local name → fs method, for named imports and destructured requires. */
    const fsNamedMethods = new Map<string, string>();
    /** Calls to judge at Program:exit, once every binding in the file is known. */
    const pendingCalls: TSESTree.CallExpression[] = [];
    /**
     * `const NAME = <expr>` bindings, so a path passed as a bare identifier can
     * be traced to what it was built from.
     *
     * Without this, `const BUILD_DIR = path.resolve(__dirname, '..', 'build')`
     * followed by `fs.readFileSync(\`${BUILD_DIR}/package.json\`)` reported —
     * the safe-construction check existed but only ever saw the *direct*
     * argument, never one hop back. Measured on the 8-repo corpus, that single
     * hop is the difference between "flags every build script" and "flags
     * paths that are actually assembled at runtime".
     *
     * `const` only: a `let` can be reassigned to anything after the point we
     * read it, so proving its initializer safe proves nothing about the value
     * at the call.
     */
    const constBindings = new Map<string, TSESTree.Node>();

    /**
     * Record what a destructured / named binding refers to.
     *
     * `promises` is the one member of the fs module that is itself a module
     * object, so `const { promises } = require('fs')` binds a *namespace*, not
     * a method — filing it under methods left `promises.readFile(userPath)`
     * unresolvable and therefore silently unchecked.
     */
    function bindFsName(local: string, imported: string): void {
      if (imported === 'promises') fsNamespaces.add(local);
      else fsNamedMethods.set(local, imported);
    }

    /**
     * Check fs method calls for path traversal vulnerabilities
     */
    const checkFsCall = (node: TSESTree.CallExpression) => {
      const methodName = fsMethodName(node.callee, fsNamespaces, fsNamedMethods);
      if (methodName === undefined) {
        return;
      }

      // Skip if not a dangerous method
      if (!dangerousMethods.has(methodName)) {
        return;
      }

      const method = methodName;

      // Most methods take one path at argument 0; copy/rename/link/symlink
      // take a source AND a destination, and only the source was ever checked.
      const indices = PATH_ARGUMENT_INDICES.get(method) ?? [0];
      const sourceCode = context.sourceCode;
      let pathNode: TSESTree.Node | null = null;
      let path = '';
      for (const index of indices) {
        const candidate = node.arguments[index];
        if (candidate === undefined || candidate.type === AST_NODE_TYPES.SpreadElement) continue;
        if (isDangerousPath(candidate, sourceCode.getText(candidate))) {
          pathNode = candidate;
          path = sourceCode.getText(candidate);
          break;
        }
      }
      if (pathNode === null) {
        // No path argument at all (`fs.readFile()`). There is nothing to judge,
        // so this follows the same unresolved-provenance switch as a path whose
        // origin cannot be traced.
        const present = indices.some((index) => node.arguments[index] !== undefined);
        if (!present && isDangerousPath(null, '')) {
          context.report({
            node,
            messageId: 'fsPathTraversal',
            data: {
              method,
              path: '',
              riskLevel: 'MEDIUM',
              vulnerability: 'path traversal',
              safePattern: 'Use path.resolve() with validation',
              steps: 'Review file system access patterns',
            },
            suggest: [
              { messageId: 'validatePath', fix: () => null },
              { messageId: 'usePathResolve', fix: () => null },
              { messageId: 'whitelistExtensions', fix: () => null },
            ],
          });
        }
        return;
      }
      const operation = FS_OPERATIONS.find((op) => op.method === method) ?? null;

      const riskLevel = determineRiskLevel(operation || FS_OPERATIONS[0], path);
      const steps = operation ? generateRefactoringSteps(operation) : 'Review file system access patterns';
      const safePattern = operation?.safePattern || 'Use path.resolve() with validation';

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
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (!isFsModule(node.source.value)) return;
        for (const spec of node.specifiers) {
          if (spec.type === AST_NODE_TYPES.ImportSpecifier) {
            // `import { readFile as read }` — the *imported* name is the fs
            // method, the local name is what the call site writes. The string
            // form (`import { 'readFile' as read }`) names the same method, so
            // skipping it would be a false negative, not a narrower gate.
            const imported =
              spec.imported.type === AST_NODE_TYPES.Identifier
                ? spec.imported.name
                : spec.imported.value;
            bindFsName(spec.local.name, imported);
            continue;
          }
          // Default and namespace specifiers both bind the module object.
          fsNamespaces.add(spec.local.name);
        }
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.init !== null &&
          node.id.type === AST_NODE_TYPES.Identifier &&
          node.parent?.type === AST_NODE_TYPES.VariableDeclaration &&
          node.parent.kind === 'const'
        ) {
          constBindings.set(node.id.name, node.init);
        }
        if (node.init === null || !isFsRequire(node.init)) return;
        if (node.id.type === AST_NODE_TYPES.Identifier) {
          fsNamespaces.add(node.id.name);
          return;
        }
        if (node.id.type !== AST_NODE_TYPES.ObjectPattern) return;
        for (const prop of node.id.properties) {
          if (prop.type !== AST_NODE_TYPES.Property || prop.computed) continue;
          if (prop.value.type !== AST_NODE_TYPES.Identifier) continue;
          // `const { 'readFile': read } = require('fs')` names the same method
          // as the bare form. The import path already reads the string spelling
          // (`import { 'readFile' as read }`), so gating it out here would be an
          // asymmetry, not a narrower gate.
          const key =
            prop.key.type === AST_NODE_TYPES.Identifier
              ? prop.key.name
              : prop.key.type === AST_NODE_TYPES.Literal && typeof prop.key.value === 'string'
                ? prop.key.value
                : undefined;
          if (key === undefined) continue;
          bindFsName(prop.value.name, key);
        }
      },

      // Collected, not judged: a `const fs = require('fs')` below the call
      // site still binds it, and a rule that missed those would be reporting
      // on statement order rather than on risk.
      CallExpression(node: TSESTree.CallExpression) {
        pendingCalls.push(node);
      },

      'Program:exit'() {
        for (const call of pendingCalls) checkFsCall(call);
      },
    };
  },
});
