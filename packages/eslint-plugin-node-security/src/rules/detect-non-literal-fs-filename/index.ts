/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔒 LOCKED 2026-08-17 — read this whole block before changing anything here.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Behaviour derived from the semantics of CWE-22, every claim executed in Node
 * 24 rather than reasoned about, and scored head-to-head against
 * `eslint-plugin-security`'s rule of the same name:
 *
 *   corpus (20 fixtures)   ours 100.0% F1  ·  theirs 71.4%  (same recall 10/10;
 *                          the whole gap is precision — 0 FP against their 8)
 *   real source (5 repos)  ours 38 findings ·  theirs 2,291  — 60x quieter
 *
 * Contract: `benchmarks/rule-corpus/node-security__detect-non-literal-fs-filename/SPEC.md`.
 * Pinned by `path-guards.test.ts` beside this file — mutation-verified, 9 of its
 * 18 cases fail when the taint roots and the separator anchor are reverted.
 *
 * ── WHAT LEGITIMATELY REOPENS THIS FILE ────────────────────────────────────
 *
 *   1. Node adds a filesystem API, or `path` changes resolution semantics.
 *   2. A new use case arrives WITH A REPRODUCTION — code genuinely vulnerable
 *      and unreported, or genuinely safe and reported, demonstrated by RUNNING
 *      it, not by reading this file and reasoning.
 *   3. A shared helper it imports changes behaviour underneath it.
 *
 * ── EDITS THAT LOOK CORRECT AND ARE NOT ────────────────────────────────────
 *
 *   ✗ "`join` and `resolve` are the same sink."
 *     They are not. `path.join('/safe','/etc/passwd')` is `/safe/etc/passwd`,
 *     but `path.resolve` of the same is `/etc/passwd` — resolve honours an
 *     absolute argument and jumps to the root. Verified.
 *
 *   ✗ "`path.normalize(p)` sanitises the path."
 *     It COLLAPSES `..`, it does not reject it:
 *     `normalize('/safe/../etc/passwd')` is `/etc/passwd`. Not a guard.
 *
 *   ✗ "`resolve(base,p).startsWith(base)` is a containment check."
 *     `'/safebad'.startsWith('/safe')` is TRUE. Only `base + path.sep` holds.
 *     Accepting the unanchored form SUPPRESSED the vulnerable shape, which is
 *     the worst direction for a suppression to be wrong in. This rule's own
 *     remediation text recommended it until 2026-08-17.
 *
 *   ✗ "`process.env.X` / `process.argv[2]` as a whole path should report."
 *     Deliberately not. Whoever sets the environment or argv of a process
 *     already chooses which files it opens; for a CLI, `readFile(argv[2])` IS
 *     the feature. Measured at 7% precision before `isWholeTaintValue` existed.
 *     The COMPOSED form still reports — a fixed prefix an argument extends.
 *
 *   ✗ "That suppression should apply to requests too."
 *     No. A remote caller supplying the ENTIRE path does not need to escape a
 *     base — they name `/etc/passwd`, which is arbitrary file read, the most
 *     severe form of this weakness. `WHOLE_VALUE_TRUSTED_ROOTS` exists to keep
 *     "already trusted with the process" apart from "unauthenticated and
 *     remote", and merging them is what made this rule score TP 0/6.
 *
 *   ✗ "`path.basename()` still leaves a traversal."
 *     `basename('../../etc/passwd')` is `passwd`. It is also the remediation
 *     this rule's own message recommends, and a rule that reports its own
 *     advice cannot be satisfied.
 *
 *   ✗ "An allowlist only needs one part checked."
 *     Every tainted part must be. `'/s/' + a + b` with only `a` allowlisted
 *     still lets `b` traverse — pinned by a CONTROL case.
 *
 *   ✗ "0 findings and 0 false positives means the rule is precise."
 *     It meant the rule had no MemberExpression taint path and never fired on
 *     `req.query.file`. **Silence is not precision.** Check recall first.
 *
 * ── HOW TO CHANGE IT ───────────────────────────────────────────────────────
 *
 *   1. Write the case in SPEC.md first, TP or FP, with the reason.
 *   2. Prove the semantics with `node -e`.
 *   3. Add the fixture, re-run the duel.
 *   4. Re-measure real source — and FILTER BY OUR ruleId. An ad-hoc harness
 *      without that filter counted the target repo's own ESLint config as our
 *      findings and inflated both sides (strapi: 25 real vs 250 apparent).
 *   5. Add a lock test; verify it FAILS with your change reverted.
 *   6. Move this date forward and say what changed.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ESLint Rule: detect-non-literal-fs-filename
 * Detects a caller-steerable path reaching an fs sink (CWE-22).
 *
 * @see https://owasp.org/www-community/attacks/Path_Traversal
 * @see https://cwe.mitre.org/data/definitions/22.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  formatLLMMessage,
  propertyName,
  resolveModuleBinding,
  staticString,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'fsPathTraversal';

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

  /**
   * Turn the hardcoded-path check off entirely. Default: `false` (the check
   * runs).
   *
   * With the default, a literal reports only when it ARRIVES somewhere
   * sensitive — `/etc/passwd`, `.ssh/id_rsa`, `.aws/credentials` — via
   * `targetsSensitiveLocation`. Measured effect of getting that wrong: the check
   * used to fire on any `../`, and on a census of ALL 37 findings this rule
   * produces over 3.0M lines of open-source code, relative literals like
   * `cp('../../../docs', …)` and `readFile('../package.json')` were its single
   * largest false-positive class. Narrowing it took the rule 37 -> 24 findings
   * and ADDED a true positive (`fs.readFileSync('/etc/passwd')` in pm2, which
   * has no `../` and never matched the old check).
   *
   * Set `true` to silence hardcoded paths altogether, including sensitive ones.
   */
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
      good: 'const safePath = path.join(SAFE_UPLOADS_DIR, path.basename(userPath)); fs.readFile(safePath, callback)',
    },
    effort: '10-15 minutes',
  },
  {
    method: 'writeFile',
    dangerous: true,
    vulnerability: 'file-access',
    safePattern: 'path.resolve(SAFE_DIR, path.basename(userInput))',
    example: {
      bad: 'fs.writeFile(userPath, data, callback)',
      good: 'const safePath = path.join(SAFE_WRITES_DIR, path.basename(userPath)); fs.writeFile(safePath, data, callback)',
    },
    effort: '10-15 minutes',
  },
  {
    method: 'stat',
    dangerous: true,
    vulnerability: 'path-traversal',
    safePattern: 'path.resolve(baseDir, userInput) with validation',
    example: {
      bad: 'fs.stat(userPath, callback)',
      good: 'const resolvedPath = path.resolve(SAFE_DIR, userPath);\nif (!resolvedPath.startsWith(SAFE_DIR + path.sep)) return;\nfs.stat(resolvedPath, callback)',
    },
    effort: '15-20 minutes',
  },
  {
    method: 'readdir',
    dangerous: true,
    vulnerability: 'directory-traversal',
    safePattern: 'Validate directory is within allowed paths',
    example: {
      bad: 'fs.readdir(userDir, callback)',
      good: 'const resolvedDir = path.resolve(ALLOWED_DIRS, userDir);\nif (!resolvedDir.startsWith(ALLOWED_DIRS + path.sep)) return;\nfs.readdir(resolvedDir, callback)',
    },
    effort: '15-20 minutes',
  },
];

/**
 * Check if path has dangerous patterns like ../ or ..\
 * Module-scope so it is directly unit-testable (Layer-2).
 */
const hasTraversalPatterns = (pathStr: string): boolean => {
  return /\.\.[/\\]/.test(pathStr) || /^\.\.[/\\]/.test(pathStr);
};

/**
 * Locations a program has no ordinary reason to reach with a hardcoded path.
 *
 * A closed set of OPERATING-SYSTEM paths, matched on normalised path segments —
 * not a vocabulary of identifier spellings, which is the inference this
 * ecosystem forbids. `/etc/passwd` means one thing on every Unix box; a variable
 * called `config` means nothing.
 */
/**
 * The members of `process` that carry INPUT — values chosen by whoever launched
 * the program. Everything else on `process` is machine state the program reads
 * about itself (`pid`, `ppid`, `platform`, `arch`, `version`, `versions`,
 * `execPath`, `uptime()`), and a number or a platform name cannot contain `../`.
 *
 * Exact membership against Node's documented surface, never a substring test.
 */
const PROCESS_INPUT_MEMBERS = new Set([
  'env',
  'argv',
  'argv0',
  'execArgv',
  'stdin',
]);

const SENSITIVE_SEGMENTS = [
  'etc/passwd',
  'etc/shadow',
  'etc/hosts',
  'etc/sudoers',
  'proc/self',
  '.ssh/id_rsa',
  '.ssh/id_dsa',
  '.ssh/authorized_keys',
  '.aws/credentials',
  '.npmrc',
  '.git/config',
  'windows/system32/config/sam',
];

/**
 * Does a HARDCODED path aim somewhere it should not?
 *
 * This is what the literal branch always claimed to do — "a hardcoded
 * `../etc/passwd` is a finding regardless of taint: nobody needs to steer a path
 * that already points where it should not". What it actually did was test for
 * `/\.\.[/\\]/`, i.e. any `../` at all.
 *
 * Measured: a census of ALL 37 findings this rule produces over 3.0M lines of
 * open-source code found relative literals to be the single largest false-positive
 * class — `cp('../../../docs', …)`, `readFile('../package.json')`,
 * `readFileSync('../package.json')`. Every one is an ordinary
 * monorepo-relative path, reported as CWE-22 at CRITICAL.
 *
 * Traversal is an ATTACKER steering a path. A literal is fixed by whoever typed
 * it, so the only literal worth reporting is one that already arrives somewhere
 * sensitive. Segments are compared after collapsing `..`, so `../../etc/passwd`
 * and `/etc/passwd` are the same finding and `../config.json` is not one.
 */
const targetsSensitiveLocation = (pathStr: string): boolean => {
  // `pathStr` is `sourceCode.getText(node)`, so a string literal arrives WITH its
  // quotes — `'../../etc/passwd'`, not `../../etc/passwd`. The old check searched
  // for `../` anywhere and never noticed; anything anchored at the start does.
  const unquoted = pathStr.replace(/^['"`]|['"`]$/g, '');
  const normalised = unquoted.replace(/\\/g, '/').toLowerCase();

  // A hardcoded path with no `..` segment does not traverse, and this rule
  // reports under `issueName: 'Path traversal'`, CWE-22, advising
  // `path.basename()`, an allowlist, or a resolved prefix check. Every one of
  // those remedies acts on a path someone else influences. None of them means
  // anything applied to a constant the author typed, and you cannot basename
  // `/etc/shadow` into safety.
  //
  // The branch was written to ask where a path ARRIVES rather than whether it
  // contains dots, and that intent is defensible — but it is a different claim
  // (a program reading a sensitive location) needing a different message and
  // CWE. Asserting it through a traversal message tells the reader something
  // untrue, which is the same defect as `regexpReDoS` claiming backtracking it
  // never established.
  //
  // Measured: the rule produces exactly ONE finding across the 20-repository
  // corpus, and it is this case — pm2's `lib/tools/passwd.js`, a file whose
  // entire job is parsing `/etc/passwd`. n=1 was not enough to overturn a
  // deliberate decision; the message being false about it is.
  //
  // A literal that SPELLS traversal still reports: `'../../etc/passwd'` does
  // traverse, so the word is at least accurate about the string.
  if (!/(^|\/)\.\.(\/|$)/.test(normalised)) {
    return false;
  }
  // Strip leading `./` and `../` segments — they say where the path STARTS, and
  // the question here is where it ENDS.
  const withoutPrefix = normalised.replace(/^(?:\.{1,2}\/)+/, '');
  return SENSITIVE_SEGMENTS.some(
    (seg) =>
      withoutPrefix === seg ||
      withoutPrefix.endsWith(`/${seg}`) ||
      withoutPrefix.startsWith(`${seg}/`),
  );
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
        '   5. Add error handling for invalid paths',
      ].join('\n');

    case 'stat':
      return [
        '   1. Use path.resolve() to normalize the path',
        '   2. Check the resolved path starts with the base PLUS path.sep — a bare',
        '      prefix lets /safebad through a /safe check',
        '   3. Reject requests that escape the allowed directory',
        '   4. Use path.relative() for additional validation',
        '   5. Log security events for monitoring',
      ].join('\n');

    case 'readdir':
      return [
        '   1. Resolve the directory path: path.resolve(ALLOWED_DIRS, userDir)',
        '   2. Validate resolved path starts with ALLOWED_DIRS',
        '   3. Check directory exists and is readable',
        '   4. Consider whitelisting allowed directories',
        '   5. Add rate limiting to prevent enumeration attacks',
      ].join('\n');

    default:
      return [
        '   1. Identify the specific file operation needed',
        '   2. Define safe base directories for operations',
        '   3. Use path.resolve() and validate containment',
        '   4. Sanitize user input (basename, extension validation)',
        '   5. Add comprehensive error handling',
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
/**
 * Drop-in replacements that expose the same filesystem surface as `fs`.
 * `node:` prefixes are stripped by the resolver before this map is consulted.
 */
const FS_MODULE_EQUIVALENTS = {
  'fs-extra': 'fs',
  'graceful-fs': 'fs',
  'fs/promises': 'fs',
} as const;

// The equivalents map above is consulted by `resolveModuleBinding`, which only
// runs on a call's receiver. `isFsModule` guards two paths the resolver never
// sees — a bare `require('fs-extra')` argument and an `ImportDeclaration`
// source — so the drop-ins have to be listed here as well or a file reaching
// fs through `fs-extra` stays invisible while using identical code.
// okta-signin-widget does exactly that in at least five non-test files.
const FS_MODULES = new Set([
  'fs',
  'node:fs',
  'fs/promises',
  'node:fs/promises',
  'fs-extra',
  'graceful-fs',
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

  // `callee.computed` used to bail here, and that was the real blind spot:
  // `fs['readFileSync'](userPath)` reaches exactly the same function as
  // `fs.readFileSync(userPath)` and went unreported. `propertyName` resolves
  // the dotted form, the string-subscript form and the template form alike, so
  // asking it for a name is both narrower and wider than the old pair of
  // conditions — narrower because a truly dynamic `fs[method]()` still yields
  // null, wider because a static subscript now resolves.
  if (callee.type !== AST_NODE_TYPES.MemberExpression) {
    return undefined;
  }
  // Resolved ONCE. Asking again at each return produced a `?? undefined` the
  // null check above had already made unreachable — a dead branch wearing the
  // look of a safeguard.
  const method = propertyName(callee);
  if (method === null) {
    return undefined;
  }

  const object = callee.object;

  // `fs.readFile(userPath)` — under whatever name the module was bound to.
  if (
    object.type === AST_NODE_TYPES.Identifier &&
    namespaces.has(object.name)
  ) {
    return method;
  }

  // `fs.promises.readFile(userPath)`.
  if (
    object.type === AST_NODE_TYPES.MemberExpression &&
    object.object.type === AST_NODE_TYPES.Identifier &&
    namespaces.has(object.object.name) &&
    propertyName(object) === 'promises'
  ) {
    return method;
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
export const determineRiskLevel = (
  operation: FSOperation,
  pathStr: string,
): string => {
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
      description:
        'Detects variable in filename argument of fs calls, which might allow an attacker to access anything on your system',
      cwe: 'CWE-22',
      confidence: 'medium',
    },
    // Token optimization — 39% reduction (49 to 30 tokens); template variables
    // still work. Kept OUTSIDE the messages block: `scripts/rule-audit.ts` reads
    // messageIds by scanning the block for `name:`, so a comment containing a
    // colon inside it becomes a phantom messageId that no test can ever assert.
    // This note's old wording produced one called `optimization`.
    messages: {
      fsPathTraversal: formatLLMMessage({
        icon: '🔑',
        issueName: 'Path traversal',
        cwe: 'CWE-22',
        description: 'Path traversal vulnerability',
        severity: '{{riskLevel}}',
        // §C2.4 — the sentence that lets a reader CLOSE a finding instead of
        // "fixing" correct code. Names `path.resolve` + a SEPARATOR-ANCHORED
        // prefix check, never a bare `startsWith(SAFE_DIR)`: that guard is
        // defeated by `/safe-dir-evil`, and this rule's own remediation text
        // recommended it until 2026-08-17.
        fix: '{{safePattern}} — Not a finding when the value is path.basename()d, checked against an allowlist, or resolved and then prefix-checked WITH a trailing separator',
        documentationLink:
          'https://owasp.org/www-community/attacks/Path_Traversal',
      }),
    },
    /**
     * `allowedExtensions` used to sit in `properties`. It was declared in the
     * schema ONLY — absent from the `Options` interface, absent from
     * `defaultOptions`, and read by nothing in `create()`. A consumer who set it
     * got no suppression and no complaint. Deleted rather than built out: this
     * rule reports paths whose provenance is ATTACKER-REACHABLE, and such a
     * path's extension is by definition not known statically —
     * `fs.readFileSync(process.argv[2])` has no extension to match. An option
     * that could only ever fire on paths the rule already ignores is not a
     * missing feature.
     *
     * Kept OUTSIDE the properties block deliberately: `scripts/rule-audit.ts`
     * reads property names by scanning the block for `name:`, and a comment
     * containing a colon inside it is read as a phantom option — this note's
     * old wording produced one called `implemented`, which then failed the
     * `unexercised-option` check forever because no test could ever set it.
     */
    schema: [
      {
        type: 'object',
        properties: {
          taintSources: {
            type: 'array',
            items: { type: 'string' },
            // Stated in the schema, not only in the destructuring. A default
            // that lives only in `create()` cannot be read by the docs
            // generator or by a user inspecting the rule's contract.
            default: ['process'],
            description:
              // The default is `['process']` ALONE. This description used to
              // claim `req, request, ctx, event, process`, which is what the
              // rule would need to catch an Express path traversal by itself —
              // and an audit read the description, probed the Express shape,
              // found silence, and filed it as a flagship false negative.
              //
              // It is not one. Request-sourced paths are `no-arbitrary-file-access`'s
              // partition; probing both rules on
              // `fs.readFileSync(`/srv/${req.params.name}.html`)` yields exactly
              // one report, from that rule, at `error`. The docs were wrong, not
              // the detection.
              "Identifier roots treated as attacker-reachable. Default: ['process'] " +
              '(process.argv and process.env). Request roots (req/request/ctx/event) ' +
              'are deliberately NOT included — no-arbitrary-file-access owns those, ' +
              'and listing them here would double-report one line at two severities. ' +
              'Add them only if you run this rule without that one.',
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
            description:
              'Allow literal string paths. Default true: a rule named "non-literal" reporting a literal contradicts its contract. Set false to also flag hardcoded paths containing "../" — measured as this rule\'s largest FP class on real code.',
          },
          additionalMethods: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional fs methods to check',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  skipTestFiles: true, // §B1 — independent of the harness
  defaultOptions: [
    {
      allowLiterals: false,
      additionalMethods: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { allowLiterals = false, additionalMethods = [] }: Options = options;

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
    /**
     * `process` was the whole list, so a REQUEST-derived path was not tainted at
     * all and `fs.readFileSync(req.query.file)` — the canonical CWE-22 — was
     * silent. Measured: the rule scored TP 0/6 on its own weakness while
     * `eslint-plugin-security` scored 6/6.
     *
     * Exact membership, never substring: `requestId` and `prerequisites` are not
     * requests. Roots are further disqualified by `isLocallyConstructed`, so a
     * `const req = {...}` fixture built in the file does not count.
     */
    const DEFAULT_TAINT_ROOTS = [
      'process',
      'req',
      'request',
      'ctx',
      'context',
      'event',
    ];

    /**
     * Roots whose whole-value read is NOT traversal.
     *
     * `isWholeTaintValue` suppresses a path used entire, on the reasoning that
     * there is no base directory to escape — correct for
     * `fs.readFileSync(process.env.TWILIO_CA_BUNDLE)`, because whoever sets the
     * process environment already chooses which files the process opens.
     *
     * That reasoning does NOT transfer to a request. A remote caller who supplies
     * the ENTIRE path does not need to escape a base — they name
     * `/etc/passwd` directly, which is arbitrary file read: the most severe form
     * of this weakness, not the absence of one. Applying one suppression to both
     * roots conflated "already trusted with the process" with "unauthenticated
     * and remote".
     */
    const WHOLE_VALUE_TRUSTED_ROOTS = new Set(['process']);

    /**
     * Roots whose NAME is not evidence of anything.
     *
     * `req`, `request` and `event` name a request in nearly all code that uses
     * them, and no measured false positive came from them. `ctx` and `context`
     * name a build context, a compiler directory, a React context, a canvas
     * context, an AWS Lambda context — and occasionally a Koa request.
     */
    const AMBIGUOUS_ROOTS = new Set(['ctx', 'context']);

    /**
     * Properties that only a request-like object carries. Exact membership
     * against a closed surface, never a substring — `ctx.runtimeDir` and
     * `ctx.plugins` are not in it, and `ctx.query` is.
     */
    const REQUEST_SURFACE = new Set([
      'query',
      'params',
      'body',
      'request',
      'req',
      'headers',
      'cookies',
      'searchParams',
      'originalUrl',
    ]);

    /**
     * Does this `ctx`/`context` binding PROVE it is a request?
     *
     * The proof is a member access naming a request surface, anywhere the
     * binding is read: Koa's `ctx.query.file` proves it, `ctx.runtimeDir` does
     * not. Scope references are used rather than the one node in hand, so the
     * evidence can appear at any use of the binding, not only at the sink.
     */
    /** Does this name bind to something the file actually declares? */
    const resolvesInFile = (id: TSESTree.Identifier): boolean =>
      context.sourceCode
        .getScope(id)
        .references.find((ref) => ref.identifier === id)?.resolved != null;

    const readsRequestSurface = (node: TSESTree.Node | undefined): boolean =>
      node?.type === AST_NODE_TYPES.MemberExpression &&
      !node.computed &&
      node.property.type === AST_NODE_TYPES.Identifier &&
      REQUEST_SURFACE.has(node.property.name);

    const hasRequestEvidence = (id: TSESTree.Identifier): boolean => {
      // The access in hand: `ctx.query.file` reaches here as the `ctx` of
      // `ctx.query`, so the parent alone settles the common case.
      if (
        readsRequestSurface(
          (id as TSESTree.Node & { parent?: TSESTree.Node }).parent,
        )
      )
        return true;
      // Otherwise any OTHER use of the same binding will do — a handler that
      // reads `ctx.request.body` on one line and builds a path from `ctx.x` on
      // the next is still holding a request.
      //
      // `context.sourceCode`, not the `sourceCode` local: this helper sits above
      // that declaration, and referencing it here threw `ReferenceError` inside
      // the rule — which RuleTester surfaced as ordinary assertion failures in
      // BOTH directions, not as a crash.
      // No `?? []` fallback: the caller has already established with
      // `resolvesInFile` that this binding resolves, so the branch would be
      // unreachable — and an unreachable branch is a permanent hole in a package
      // held at a 100% coverage threshold.
      const variable = context.sourceCode
        .getScope(id)
        .references.find((ref) => ref.identifier === id)!.resolved!;
      return variable.references.some((ref) =>
        readsRequestSurface(
          (ref.identifier as TSESTree.Node & { parent?: TSESTree.Node }).parent,
        ),
      );
    };
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
    const PATH_ARGUMENT_INDICES: ReadonlyMap<string, readonly number[]> =
      new Map([
        ['copyFile', [0, 1]],
        ['copyFileSync', [0, 1]],
        ['cp', [0, 1]],
        ['cpSync', [0, 1]],
        ['rename', [0, 1]],
        ['renameSync', [0, 1]],
        ['link', [0, 1]],
        ['linkSync', [0, 1]],
        ['symlink', [0, 1]],
        ['symlinkSync', [0, 1]],
      ]);

    const dangerousMethods = new Set([
      'readFile',
      'readFileSync',
      'writeFile',
      'writeFileSync',
      'appendFile',
      'appendFileSync',
      'stat',
      'statSync',
      'lstat',
      'lstatSync',
      'readdir',
      'readdirSync',
      'unlink',
      'unlinkSync',
      'mkdir',
      'mkdirSync',
      'rmdir',
      'rmdirSync',
      'access',
      'accessSync',
      'createReadStream',
      'createWriteStream',
      // Every remaining fs entry point that takes a path as its first argument. The list
      // previously covered 11 of the ~30, so traversal through rename/copyFile/symlink/chmod
      // was silently unguarded. Deliberately NOT included: realpath (canonicalisation is the
      // MITIGATION — `realpathSync(p)` then `startsWith(allowedDir)` is the documented safe
      // pattern) and exists/watch (probes that neither read content nor mutate).
      //
      // Destructive methods that were missing entirely. `update-bugsnag.js:36`
      // does `fs.cpSync(sourceDirectory, …)` with `sourceDirectory` built from
      // `process.argv[2]` — a recursive copy driven by argv, unreported, while
      // the harmless `mkdir` of a temp dir two lines above WAS reported. The
      // rule flagged the safe thing and missed the dangerous one.
      'open',
      'openSync',
      'rm',
      'rmSync',
      'rename',
      'renameSync',
      'copyFile',
      'copyFileSync',
      'cp',
      'cpSync',
      'truncate',
      'truncateSync',
      'chmod',
      'chmodSync',
      'chown',
      'chownSync',
      'lchown',
      'lchownSync',
      'utimes',
      'utimesSync',
      'readlink',
      'readlinkSync',
      'symlink',
      'symlinkSync',
      'link',
      'linkSync',
      'opendir',
      'opendirSync',
      ...additionalMethods,
    ]);

    /**
     * Check if a node is a literal string (safe)
     */
    // oxlint-disable-next-line consistent-function-scoping
    const isLiteralString = (node: TSESTree.Node): boolean => {
      return staticString(node) !== null;
    };

    /**
     * Determine if the path argument is potentially dangerous
     */

    /**
     * Is this root something THIS FILE builds, rather than something opaque
     * handed to it?
     *
     * `const req = { query: { file: 'seed.json' } }` is a fixture, a default or a
     * seed script — not an inbound request, whatever it is spelled. The
     * initialiser is visible, so reporting it asserts a caller exists against the
     * evidence in front of us.
     *
     * A root the file CANNOT see (a parameter, an import, a call result) stays
     * tainted: absence of evidence is not evidence of safety, and that asymmetry
     * is deliberate. A REASSIGNED binding also stays tainted — reading only the
     * declaration is how a suppression becomes an escape hatch.
     */
    const isLocallyConstructed = (id: TSESTree.Identifier): boolean => {
      const variable = context.sourceCode
        .getScope(id)
        .references.find(
          (ref: TSESLint.Scope.Reference) => ref.identifier === id,
        )?.resolved;
      if (!variable || variable.defs.length !== 1) return false;
      const def = variable.defs[0];
      if (def.type !== 'Variable') return false;
      if (
        variable.references.filter((ref: TSESLint.Scope.Reference) =>
          ref.isWrite(),
        ).length > 1
      ) {
        return false;
      }
      const init = (def.node as TSESTree.VariableDeclarator).init;
      return (
        init?.type === AST_NODE_TYPES.ObjectExpression ||
        init?.type === AST_NODE_TYPES.ArrayExpression
      );
    };

    /** Does this expression read from something outside the program? */
    const readsTaintSource = (node: TSESTree.Node, depth = 0): boolean => {
      if (depth > 6) return false;
      switch (node.type) {
        case AST_NODE_TYPES.Identifier: {
          if (taintRoots.has(node.name)) {
            // `ctx` and `context` are the two roots that name something OTHER
            // than a request far more often than they name one. Measured: after
            // the literal and process.pid fixes, EVERY remaining false positive
            // over the 20-repo corpus was one of them — webpack's compiler
            // context directory, a Docker build context, and a strapi parameter
            // annotated `BuildContext`. A bare name is not evidence, and this
            // rule reporting on one is the defect class CLAUDE.md opens with.
            //
            // It evaded `lint:name-inference` because the match lives in a data
            // table instead of a `.includes()` call — the documented way that
            // gate has been defeated before.
            // RESOLVES, and then has no evidence. The two conditions are not
            // interchangeable: a `ctx` the file declares nowhere cannot be shown
            // to be a build context any more than it can be shown to be a
            // request, and this rule's standing position is that absence of
            // evidence is not evidence of safety. Dropping the resolution check
            // turned an undeclared `ctx.runtimeDir` from a finding into silence
            // — a false negative introduced by a false-positive fix, caught by
            // the case below it.
            if (
              AMBIGUOUS_ROOTS.has(node.name) &&
              resolvesInFile(node) &&
              !hasRequestEvidence(node)
            ) {
              return false;
            }
            return !isLocallyConstructed(node);
          }
          const bound = constBindings.get(node.name);
          return bound !== undefined && readsTaintSource(bound, depth + 1);
        }
        case AST_NODE_TYPES.MemberExpression: {
          // Most of `process` is MACHINE STATE, not input.
          //
          // `process` is a taint root so that `process.env.X` and
          // `process.argv[2]` are seen — things whoever launched the program
          // chooses. `process.pid` is a number the OS assigns; it cannot contain
          // a path separator, let alone `../`. Nor can `platform`, `arch`,
          // `version` or `ppid`.
          //
          // Measured: n8n's blob store builds
          // `` `${writePath}.tmp.${process.pid}.${randomUUID()}` `` and every fs
          // call on that temp path was reported — four findings in one file, and
          // the same shape recurred across the corpus. The path is composed, so
          // `isWholeTaintValue` correctly declined to trust it; the error was
          // upstream, in calling a PID untrusted at all.
          //
          // A closed set of member names off `process`, not a spelling heuristic:
          // these are the documented Node properties an invoker controls.
          if (
            !node.computed &&
            node.object.type === AST_NODE_TYPES.Identifier &&
            node.object.name === 'process' &&
            node.property.type === AST_NODE_TYPES.Identifier &&
            !PROCESS_INPUT_MEMBERS.has(node.property.name)
          ) {
            return false;
          }
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
        case AST_NODE_TYPES.CallExpression: {
          // `path.basename(untrusted)` SANITISES. Measured:
          // `basename('../../etc/passwd')` is `passwd` — every directory
          // component is gone, so there is nothing left to traverse with. It is
          // also the remediation this rule's own message recommends, and
          // reporting your own advice makes a rule unsatisfiable.
          const callee = node.callee;
          if (
            callee.type === AST_NODE_TYPES.MemberExpression &&
            !callee.computed &&
            callee.object.type === AST_NODE_TYPES.Identifier &&
            callee.object.name === 'path' &&
            callee.property.type === AST_NODE_TYPES.Identifier &&
            propertyName(callee) === 'basename'
          ) {
            return false;
          }
          // `path.join(base, req.query.f)` is tainted through its arguments.
          return node.arguments.some(
            (arg) =>
              arg.type !== AST_NODE_TYPES.SpreadElement &&
              readsTaintSource(arg, depth + 1),
          );
        }
        default:
          return false;
      }
    };

    /**
     * Is the taint the WHOLE path, rather than a part of one?
     *
     * CWE-22 is path TRAVERSAL: an attacker escapes a directory the code chose
     * by extending or redirecting a path that has other, fixed parts.
     * `path.join('/uploads', userFile)` is that — `../../etc/passwd` walks out
     * of `/uploads`. A value used entire is not:
     *
     * ```ts
     * // twilio-node src/base/RequestClient.ts:128
     * agentOpts.ca = fs.readFileSync(process.env.TWILIO_CA_BUNDLE);
     * ```
     *
     * There is no base directory to escape and nothing to append to. Whoever
     * sets `TWILIO_CA_BUNDLE` names a file outright — and anyone who can set a
     * variable in the process environment already chooses which files the
     * process opens, with or without this line. Reporting it as traversal
     * describes a mechanism that is not present.
     *
     * The composed case still reports, unchanged: `Shopify/cli`
     * `bin/update-bugsnag.js:36` copies from `path.join(__dirname, '..',
     * 'packages', packageName)` where `packageName` comes off `process.argv` —
     * a fixed prefix an argument extends, which is exactly the shape above.
     *
     * No depth counter, unlike `readsTaintSource`, and that is deliberate
     * rather than an omission. This walk is only ever entered on an expression
     * `readsTaintSource` has ALREADY resolved to a root inside its own six
     * hops, and it follows a strict subset of that walk — binding, receiver,
     * single `path.*` argument, all of which move toward the same root. A
     * binding cycle (`const a = b; const b = a;`) has no root to reach, so
     * `readsTaintSource` returns false on it and this function is never called.
     */
    /**
     * Does any part of this expression reach a taint root that is NOT trusted
     * whole — a request, rather than the process's own environment?
     *
     * Deliberately separate from `readsTaintSource`: that answers "is there
     * taint", this answers "is any of it the dangerous kind". The base-is-taint
     * exemption above turns on the difference.
     */
    const containsUntrustedRoot = (node: TSESTree.Node, depth = 0): boolean => {
      if (depth > 6) return false;
      switch (node.type) {
        case AST_NODE_TYPES.Identifier: {
          if (taintRoots.has(node.name))
            return !WHOLE_VALUE_TRUSTED_ROOTS.has(node.name);
          const bound = constBindings.get(node.name);
          return bound !== undefined && containsUntrustedRoot(bound, depth + 1);
        }
        case AST_NODE_TYPES.MemberExpression:
          return containsUntrustedRoot(node.object, depth + 1);
        case AST_NODE_TYPES.TemplateLiteral:
          return node.expressions.some((e) =>
            containsUntrustedRoot(e, depth + 1),
          );
        case AST_NODE_TYPES.BinaryExpression:
          return (
            containsUntrustedRoot(node.left as TSESTree.Node, depth + 1) ||
            containsUntrustedRoot(node.right, depth + 1)
          );
        case AST_NODE_TYPES.CallExpression:
          return node.arguments.some(
            (a) =>
              a.type !== AST_NODE_TYPES.SpreadElement &&
              containsUntrustedRoot(a, depth + 1),
          );
        default:
          return false;
      }
    };

    const isWholeTaintValue = (node: TSESTree.Node): boolean => {
      switch (node.type) {
        case AST_NODE_TYPES.Identifier: {
          // Only a root whose whole-value read is genuinely not traversal — see
          // WHOLE_VALUE_TRUSTED_ROOTS. A request supplying the ENTIRE path is
          // arbitrary file read, so it must NOT be suppressed here.
          if (taintRoots.has(node.name))
            return WHOLE_VALUE_TRUSTED_ROOTS.has(node.name);
          const bound = constBindings.get(node.name);
          return bound !== undefined && isWholeTaintValue(bound);
        }
        // `process.env.X`, `process.argv[2]` — a whole value read off a root.
        case AST_NODE_TYPES.MemberExpression:
          return isWholeTaintValue(node.object);
        case AST_NODE_TYPES.CallExpression: {
          // `path.resolve(process.env.X)` normalises one value; it does not
          // give the attacker a second part to escape from. Two or more parts
          // is a base plus a segment, which is composition.
          const callee = node.callee;
          // `path.join(...)` AND the destructured `join(...)` from
          // `import { join } from 'path'`. Only the member form was recognised,
          // so a CLI using the destructured spelling — which n8n and serverless
          // both do — fell out of every path-aware branch. Resolved through the
          // module graph rather than matched on the callee's NAME: a local
          // function called `join` is not `path.join`.
          const isPathCall =
            (callee.type === AST_NODE_TYPES.MemberExpression &&
              callee.object.type === AST_NODE_TYPES.Identifier &&
              callee.object.name === 'path') ||
            resolveModuleBinding(
              callee,
              context.sourceCode.getScope(callee),
              {},
            )?.module === 'path';
          if (!isPathCall) return false;
          if (node.arguments.length === 1)
            return isWholeTaintValue(node.arguments[0]);
          // Taint as the BASE, with every following segment a fixed literal:
          // `path.join(process.env.HOME, '.terraform.d', 'credentials.tfrc.json')`.
          // Nothing here is steerable — the caller chose the base and the program
          // chose the rest. Same argument WHOLE_VALUE_TRUSTED_ROOTS already makes
          // for a whole-value read, one step further along.
          //
          // Deliberately limited to those roots by `isWholeTaintValue` on the
          // first argument: whoever picks the base directory picks the file, so
          // `path.join(req.body.dir, 'config.json')` must still report. A CONTROL
          // pins both directions.
          //
          // Generalised from "literal suffixes only" after measurement: both
          // remaining real-source findings were a CLI joining a name onto the
          // directory it was handed (`join(process.argv[2], file)`). A segment
          // cannot escape a base the INVOKER named — that is the lock header's
          // own argument for whole values, one step along.
          //
          // The guard is `containsUntrustedRoot`: one request-derived part
          // anywhere in the expression and the exemption is off, so
          // `join(baseDir, req.query.f)` still reports.
          return (
            isWholeTaintValue(node.arguments[0]) && !containsUntrustedRoot(node)
          );
        }
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
    const isDangerousPath = (
      pathNode: TSESTree.Node | null,
      pathStr: string,
    ): boolean => {
      if (!pathNode) return reportUnresolvedPaths;

      // A hardcoded `../etc/passwd` is a finding regardless of taint: nobody
      // needs to steer a path that already points where it should not.
      // `allowLiterals` opts out of even that — it is the option's whole
      // purpose, and after the inversion a literal has no other way to report.
      if (isLiteralString(pathNode)) {
        // `hasTraversalPatterns` alone matched every `../` in the codebase. The
        // finding is the DESTINATION, not the dots — see
        // `targetsSensitiveLocation` and `literal-paths.test.ts`.
        return !allowLiterals && targetsSensitiveLocation(pathStr);
      }

      // Explicitly validated by a startsWith guard — an existing, separate
      // mechanism this rule already honours.
      if (hasPathValidation(pathNode)) return false;

      // Taint that has been COMPOSED into a path — a prefix it can escape, a
      // segment it can redirect. Taint used whole is not traversal; see
      // `isWholeTaintValue`.
      if (readsTaintSource(pathNode)) return !isWholeTaintValue(pathNode);

      // Assembled purely from literals, `__dirname`, `const` bindings of the
      // same: provably not steerable.
      if (isBuildTimeConstant(pathNode)) return false;

      // A name that is declared nowhere in the file. This is the one shape
      // where "unresolved" means genuinely unknown rather than "resolved, and
      // not provably constant" — and the two must not share a verdict.
      //
      // The 105 false positives PR #546 removed were all the second kind: a
      // rollup config's `const`, a glob over the repo's own files, a thin
      // facade forwarding its own parameter. Every one of them RESOLVES, so
      // every one of them stays quiet here.
      //
      // `fs.readFile(filename)` with `filename` bound nowhere cannot be shown
      // safe by any reasoning available in this file. That is why
      // eslint-plugin-security reports it, and on this shape they are right.
      if (isFreeVariable(pathNode)) return true;

      // The same reasoning, applied to a path that is COMPOSED from a free
      // variable rather than being one. `readFile(`template with ${filename}`)`
      // and `readFileSync(path.resolve(__dirname, foo))` are exactly as
      // unknowable as `readFile(filename)` — the free name is simply one node
      // deeper — but the check above only ever saw a bare Identifier, so both
      // fell through to silence.
      //
      // These were the last two open cases on eslint-plugin-security's own
      // corpus. Everything provably constant has already returned false at
      // `isBuildTimeConstant`, so reaching here means at least one part of the
      // path resolves nowhere in this file.
      if (containsFreeVariable(pathNode)) return true;

      // Provenance unresolved. Off by default — see the note above.
      return reportUnresolvedPaths;
    };

    /**
     * Is this identifier a free variable — referenced but declared nowhere?
     *
     * `ref.resolved === null` is the scope analyser's own verdict, so this
     * cannot drift from what ESLint believes about the binding.
     */
    function isFreeVariable(node: TSESTree.Node): boolean {
      if (node.type !== AST_NODE_TYPES.Identifier) return false;
      const through = context.sourceCode.getScope(node).through;
      return through.some(
        (ref) => ref.identifier === node && ref.resolved === null,
      );
    }

    /**
     * Is any PART of this expression a free variable?
     *
     * `isFreeVariable` only inspects a bare Identifier, so a path assembled
     * around an unresolvable name — a template interpolation, a `path.resolve`
     * argument, a concatenation operand — reached the default and stayed
     * silent. Recurses only through the node types that actually compose a
     * path string; anything else is left to the checks above.
     *
     * `depth` mirrors isBuildTimeConstant and guards against pathological AST.
     */
    const containsFreeVariable = (node: TSESTree.Node, depth = 0): boolean => {
      if (depth > 4) return false;

      // Anything already provable at build time is not "unknowable", however deep it sits.
      // `__dirname` is the case that matters: ESLint resolves no Node globals by default,
      // so a bare `__dirname` looks like a free variable, and without this check
      // `path.join(__dirname, '../templates')` — a fully constant path — was reported.
      if (isBuildTimeConstant(node, depth)) return false;

      if (isFreeVariable(node)) return true;

      switch (node.type) {
        case AST_NODE_TYPES.TemplateLiteral:
          return node.expressions.some((e) =>
            containsFreeVariable(e, depth + 1),
          );
        case AST_NODE_TYPES.CallExpression:
          // `path.resolve(__dirname, foo)` — the callee is irrelevant, the
          // arguments are what end up in the path.
          return node.arguments.some(
            (a) =>
              a.type !== AST_NODE_TYPES.SpreadElement &&
              containsFreeVariable(a, depth + 1),
          );
        case AST_NODE_TYPES.BinaryExpression:
          return (
            node.operator === '+' &&
            (containsFreeVariable(node.left, depth + 1) ||
              containsFreeVariable(node.right, depth + 1))
          );
        // A COMPUTED key, and deliberately not the object.
        //
        // `obj[k]` selects which value you get, so an unknowable `k` makes the
        // result unknowable however well-known `obj` is. That is strictly more
        // opaque than the bare `readFile(filename)` this function already
        // reports, yet `import.meta[prop]` and `cfg[prop]` were silent while
        // `dir` reported — the weaker evidence produced the louder verdict.
        //
        // The object is NOT recursed into, and the reason is measured rather
        // than stylistic: ESLint resolves no Node globals by default, so
        // `process` reads as a free variable, and walking the object would make
        // every `process.env.HOME` a finding. A static key names one fixed slot
        // and is left to `isBuildTimeConstant` and the taint reader above.
        //
        // Last open case on eslint-plugin-security's own corpus:
        // `fs.readFileSync(path.resolve(import.meta[prop], './index.html'))`.
        case AST_NODE_TYPES.MemberExpression:
          return (
            node.computed && containsFreeVariable(node.property, depth + 1)
          );
        default:
          return false;
      }
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
        return !hasTraversalPatterns(
          (node as TSESTree.Literal).value as string,
        );
      }
      if (node.type === AST_NODE_TYPES.Identifier) {
        if (node.name === '__dirname' || node.name === '__filename')
          return true;
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
          propertyName(callee) === 'cwd'
        ) {
          return true;
        }
        // `path.join`/`path.resolve` is constant exactly when its parts are.
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.object.type === AST_NODE_TYPES.Identifier &&
          callee.object.name === 'path' &&
          callee.property.type === AST_NODE_TYPES.Identifier &&
          // @vocabulary Node path API
          ['join', 'resolve'].includes(callee.property.name)
        ) {
          return (
            node.arguments.length > 0 &&
            node.arguments.every((arg) => isBuildTimeConstant(arg, depth + 1))
          );
        }
        return false;
      }
      if (
        node.type === AST_NODE_TYPES.BinaryExpression &&
        node.operator === '+'
      ) {
        return (
          isBuildTimeConstant(node.left, depth + 1) &&
          isBuildTimeConstant(node.right, depth + 1)
        );
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
    /**
     * Is this `startsWith` argument anchored to a path separator?
     *
     * Accepted, because each provably ends the prefix at a boundary:
     *   `base + path.sep`      a concatenation ending in the separator
     *   `base + '/'`           the literal form of the same thing
     *   `'/safe/'`             a literal already ending in a separator
     *   `` `${base}/` ``       the template form
     *
     * Rejected: a bare `base`, which is the prefix bug — `/safebad` passes it.
     * When the argument cannot be read at all, reject: an unproven guard must not
     * silence a finding.
     */
    const isSeparatorAnchored = (arg: TSESTree.Node | undefined): boolean => {
      if (arg === undefined) return false;
      const endsWithSep = (n: TSESTree.Node): boolean => {
        // `path.sep`
        if (
          n.type === AST_NODE_TYPES.MemberExpression &&
          !n.computed &&
          n.object.type === AST_NODE_TYPES.Identifier &&
          n.object.name === 'path' &&
          n.property.type === AST_NODE_TYPES.Identifier &&
          propertyName(n) === 'sep'
        ) {
          return true;
        }
        const staticText = staticString(n);
        if (staticText !== null) {
          return staticText.endsWith('/') || staticText.endsWith('\\');
        }
        return false;
      };
      if (endsWithSep(arg)) return true;
      // `base + path.sep` / `base + '/'` — the separator must be the LAST part.
      if (
        arg.type === AST_NODE_TYPES.BinaryExpression &&
        arg.operator === '+'
      ) {
        return endsWithSep(arg.right);
      }
      // `` `${base}/` `` — the trailing quasi carries the separator.
      if (arg.type === AST_NODE_TYPES.TemplateLiteral) {
        // `quasis` is never empty for a TemplateLiteral — a template with n
        // expressions has n+1 quasis — and `cooked` is null only for an invalid
        // escape in a TAGGED template, which a `startsWith` argument is not. The
        // `?? ''` fallback that used to sit here was unreachable, and it showed
        // up as the one branch this package could not cover.
        const last = arg.quasis[arg.quasis.length - 1].value.cooked;
        if (last.endsWith('/') || last.endsWith('\\')) return true;
        // `` `${base}${path.sep}` `` ends with an EXPRESSION, so its trailing
        // quasi is empty — the separator is the last interpolation instead.
        // Reading only the quasi rejected a guard that does hold, which a
        // suppression must never do; found by writing the test for it.
        if (last === '') {
          const tail = arg.expressions[arg.expressions.length - 1];
          return tail !== undefined && endsWithSep(tail);
        }
        return false;
      }
      return false;
    };

    const hasPathValidation = (pathNode: TSESTree.Node): boolean => {
      // A COMPOSED path validates through its tainted PART.
      // `if (!OK.includes(f)) throw; fs.readFileSync('/safe/' + f)` is guarded, but
      // the path node here is the concatenation, not `f` — and this function used
      // to bail on anything that was not a bare Identifier, so an allowlisted
      // filename still reported. The allowlist is the remediation, so reporting it
      // made the rule unsatisfiable for the one fix most people reach for.
      //
      // EVERY tainted part must be validated, not merely one: `base + a + b` with
      // only `a` checked still lets `b` traverse.
      if (pathNode.type !== AST_NODE_TYPES.Identifier) {
        const parts: TSESTree.Node[] = [];
        const collect = (n: TSESTree.Node): void => {
          if (
            n.type === AST_NODE_TYPES.BinaryExpression &&
            n.operator === '+'
          ) {
            collect(n.left as TSESTree.Node);
            collect(n.right);
            return;
          }
          if (n.type === AST_NODE_TYPES.TemplateLiteral) {
            n.expressions.forEach((e) => collect(e));
            return;
          }
          if (n.type === AST_NODE_TYPES.CallExpression) {
            n.arguments.forEach((a) => {
              if (a.type !== AST_NODE_TYPES.SpreadElement) collect(a);
            });
            return;
          }
          if (readsTaintSource(n)) parts.push(n);
        };
        collect(pathNode);
        return (
          parts.length > 0 &&
          parts.every(
            (p) => p.type === AST_NODE_TYPES.Identifier && hasPathValidation(p),
          )
        );
      }

      const varName = pathNode.name;

      // AST-based validation detection (faster than getText + regex)
      const isValidationCall = (testNode: TSESTree.Node): boolean => {
        // Handle negation: !path.startsWith(...). The negation flag was
        // tracked here but never read afterwards (CodeQL:
        // `js/useless-assignment-to-local`); current callers only need to
        // know whether the call matches a validation idiom.
        if (
          testNode.type === AST_NODE_TYPES.UnaryExpression &&
          testNode.operator === '!' &&
          testNode.argument.type === AST_NODE_TYPES.CallExpression
        ) {
          testNode = testNode.argument;
        }

        if (testNode.type !== AST_NODE_TYPES.CallExpression) {
          return false;
        }

        // Pattern 1: varName.startsWith(...) or varName.includes(...)
        if (
          testNode.callee.type === AST_NODE_TYPES.MemberExpression &&
          testNode.callee.object.type === AST_NODE_TYPES.Identifier &&
          testNode.callee.object.name === varName &&
          testNode.callee.property.type === AST_NODE_TYPES.Identifier &&
          (propertyName(testNode.callee) === 'startsWith' ||
            propertyName(testNode.callee) === 'includes')
        ) {
          // A prefix test only contains the path if it is anchored to a
          // SEPARATOR. Measured: `'/safebad'.startsWith('/safe')` is TRUE, so
          // `resolve(base, p).startsWith(base)` lets a sibling directory whose
          // name merely begins with the base through — a real escape, and the
          // classic incomplete fix for this weakness.
          //
          // This rule's own remediation text recommended the unanchored form
          // until 2026-08-17. Accepting it here meant SUPPRESSING the vulnerable
          // shape on the strength of a guard that does not hold, which is the
          // worst direction for a suppression to be wrong in.
          return propertyName(testNode.callee) === 'includes'
            ? true
            : isSeparatorAnchored(testNode.arguments[0]);
        }

        // Pattern 2: ALLOWED_FILES.includes(varName) - allowlist validation
        if (
          testNode.callee.type === AST_NODE_TYPES.MemberExpression &&
          testNode.callee.property.type === AST_NODE_TYPES.Identifier &&
          propertyName(testNode.callee) === 'includes'
        ) {
          // Check if varName is in the arguments
          for (const arg of testNode.arguments) {
            if (
              arg.type === AST_NODE_TYPES.Identifier &&
              arg.name === varName
            ) {
              return true;
            }
          }
        }

        // Pattern 3: /regex/.test(varName) - regex validation
        if (
          testNode.callee.type === AST_NODE_TYPES.MemberExpression &&
          testNode.callee.property.type === AST_NODE_TYPES.Identifier &&
          propertyName(testNode.callee) === 'test'
        ) {
          // Check if varName is in the arguments
          for (const arg of testNode.arguments) {
            if (
              arg.type === AST_NODE_TYPES.Identifier &&
              arg.name === varName
            ) {
              return true;
            }
          }
        }

        return false;
      };

      const hasEarlyExit = (consequent: TSESTree.Statement): boolean => {
        if (consequent.type === AST_NODE_TYPES.BlockStatement) {
          return consequent.body.some(
            (stmt) =>
              stmt.type === AST_NODE_TYPES.ThrowStatement ||
              stmt.type === AST_NODE_TYPES.ReturnStatement,
          );
        }
        return (
          consequent.type === AST_NODE_TYPES.ThrowStatement ||
          consequent.type === AST_NODE_TYPES.ReturnStatement
        );
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
        if (
          current.type === AST_NODE_TYPES.BlockStatement &&
          current.parent &&
          (current.parent.type === AST_NODE_TYPES.FunctionDeclaration ||
            current.parent.type === AST_NODE_TYPES.FunctionExpression ||
            current.parent.type === AST_NODE_TYPES.ArrowFunctionExpression)
        ) {
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
            if (
              stmt.type === AST_NODE_TYPES.IfStatement &&
              isValidationCall(stmt.test) &&
              hasEarlyExit(stmt.consequent)
            ) {
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
      let methodName = fsMethodName(node.callee, fsNamespaces, fsNamedMethods);

      if (methodName === undefined) {
        // Fallback: resolve the callee back to its source module. The namespace tracking
        // above follows `fs.readFile` and `const { readFile } = require('fs')`, but not a
        // method plucked onto a variable (`var one = require('fs').readFile; one(p)`), a
        // `promises` namespace bound through a variable, or a drop-in module such as
        // `fs-extra` — 8 of the competitor-corpus cases were exactly those shapes.
        const binding = resolveModuleBinding(
          node.callee,
          context.sourceCode.getScope(node),
          {
            equivalents: FS_MODULE_EQUIVALENTS,
          },
        );
        if (binding?.module !== 'fs') return;
        const [first, second] = binding.path;
        methodName =
          binding.path.length === 1
            ? first
            : binding.path.length === 2 && first === 'promises'
              ? second
              : undefined;
        if (methodName === undefined) return;
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
        if (
          candidate === undefined ||
          candidate.type === AST_NODE_TYPES.SpreadElement
        )
          continue;
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
        const present = indices.some(
          (index) => node.arguments[index] !== undefined,
        );
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
          });
        }
        return;
      }
      const operation =
        FS_OPERATIONS.find((op) => op.method === method) ?? null;

      const riskLevel = determineRiskLevel(operation || FS_OPERATIONS[0], path);
      const steps = operation
        ? generateRefactoringSteps(operation)
        : 'Review file system access patterns';
      const safePattern =
        operation?.safePattern || 'Use path.resolve() with validation';

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
          effort: operation?.effort || '15-20 minutes',
        },
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
              : (staticString(prop.key) ?? undefined);
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
