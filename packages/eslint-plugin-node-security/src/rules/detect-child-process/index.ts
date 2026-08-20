/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: detect-child-process
 * Detects instances of child_process & non-literal exec() calls
 * LLM-optimized with comprehensive command injection prevention guidance
 *
 * @see https://owasp.org/www-community/attacks/Command_Injection
 * @see https://cwe.mitre.org/data/definitions/78.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule, isStaticExpression } from '@interlace/eslint-devkit';
import { makeReadsTaintSource } from '../../utils/provenance';

/**
 * `strategyValidate`, `strategySanitize` and `strategyRestrict` used to sit
 * here, alongside a `strategy: 'validate' | 'sanitize' | 'restrict' | 'auto'`
 * option meant to select between them. Neither half was ever finished:
 * `create()` never read `strategy`, and every `context.report` in this file
 * names one of the three messages below.
 *
 * Not wired up, and deliberately so. The sibling `detect-eval-with-expression`
 * does implement the same shape, which is presumably where this was copied
 * from — but there the strategy messages ARE the finding. Here they would
 * REPLACE a CRITICAL CWE-78 "Command injection" or a HIGH CWE-88 "Argument
 * injection" with a severity-LOW "Validate Strategy" carrying no CWE and no
 * description of what was found. Emitting them would downgrade every finding
 * this rule makes. The advice they held is already the `fix:` line of the three
 * that fire.
 */
type MessageIds =
  | 'childProcessCommandInjection'
  | 'untrustedProgram'
  | 'argumentInjection';

export interface Options {
  /** Allow exec() with literal strings. Default: false (stricter) */
  allowLiteralStrings?: boolean;

  /** Allow spawn() with literal arguments. Default: false (stricter) */
  allowLiteralSpawn?: boolean;

  /** Additional child_process methods to check */
  additionalMethods?: string[];

  /**
   * Identifier roots treated as attacker-reachable.
   * Default: `['req', 'request', 'ctx', 'event', 'process']`.
   */
  taintSources?: string[];

  /**
   * Report a command whose provenance cannot be resolved — a bare parameter, a
   * `let` reassigned across branches, an opaque helper's return value.
   * Default: `false`.
   *
   * `true` restores the pre-inversion behaviour: any dynamic argument is a
   * finding. Measured on an 8-repo corpus that produced 14 findings, every one
   * of them a build script running a command it assembled from its own
   * literals and paths.
   */
  reportUnresolvedCommands?: boolean;
}

type RuleOptions = [Options?];

/** Roots an attacker can actually steer a command through. */
const DEFAULT_TAINT_SOURCES = ['req', 'request', 'ctx', 'event', 'process'];

/**
 * Commands that ARE a shell. Spawning one with `-c` re-opens every
 * metacharacter the argv vector was supposed to close off, so these can never
 * qualify for the "literal command, no shell" exemption. Matched on the
 * basename, so `/bin/sh` and `sh` are the same binary.
 */
/**
 * The one taint root that is the operator rather than a remote party.
 *
 * `process.argv` and `process.env` are supplied by whoever launched the
 * program, from a shell they already control. That still matters where the
 * value is spliced into a shell string — `execSync('rm -rf ' + process.argv[2])`
 * turns an argument into code — so `process` stays a root for the shell path.
 * It is not a lever for the two questions the no-shell path asks, both of which
 * are about someone reaching a binary they could not otherwise reach. See
 * `remoteRoots` below.
 */
const LOCAL_TAINT_ROOT = 'process';

const SHELL_BINARIES: ReadonlySet<string> = new Set([
  'sh', 'bash', 'zsh', 'dash', 'ksh', 'csh', 'tcsh', 'fish', 'ash', 'busybox',
  'cmd', 'cmd.exe', 'powershell', 'powershell.exe', 'pwsh', 'pwsh.exe', 'env',
]);

/**
 * Flags whose following argument is SOURCE TEXT rather than a filename or a
 * value: `sh -c`, `node -e`, `cmd /c`, `perl -e`. Any binary invoked with one
 * of these is an interpreter for that call, so the literal-command exemption
 * must not apply.
 */
const EVAL_FLAGS: ReadonlySet<string> = new Set([
  '-c', '-e', '--eval', '-e:', '/c', '/k', '-command', '-encodedcommand',
]);

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
      // oxlint-disable-next-line no-template-curly-in-string
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
    // oxlint-disable-next-line no-template-curly-in-string
    example: {
      // oxlint-disable-next-line no-template-curly-in-string
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
  },
  {
    method: 'execFile',
    dangerous: true,
    vulnerability: 'command-injection',
    safeAlternatives: ['spawn'],
    example: {
      bad: 'execFile(userCommand, userArgs, callback)',
      good: [
        'spawn(validatedCommand, validatedArgs, {shell: false})',
        '// Validate command and args first'
      ]
    },
    effort: '10-15 minutes'
  },
  {
    method: 'execFileSync',
    dangerous: true,
    vulnerability: 'command-injection',
    safeAlternatives: ['spawnSync'],
    example: {
      bad: 'execFileSync(userCommand, userArgs)',
      good: [
        'spawnSync(validatedCommand, validatedArgs, {shell: false})',
        '// Validate command and args first'
      ]
    },
    effort: '10-15 minutes'
  },
  {
    method: 'spawnSync',
    dangerous: false,
    vulnerability: 'argument-injection',
    safeAlternatives: ['spawnSync with validation'],
    example: {
      bad: 'spawnSync(\'bash\', [\'-c\', userCommand])',
      good: [
        'spawnSync(validatedCommand, validatedArgs, {shell: false})',
        '// Validate command and args first'
      ]
    },
    effort: '15-20 minutes'
  },
  {
    method: 'fork',
    dangerous: true,
    vulnerability: 'command-injection',
    safeAlternatives: ['spawn'],
    example: {
      bad: 'fork(userScript)',
      good: [
        'spawn(\'node\', [validatedScript], {shell: false})',
        '// Validate script path first'
      ]
    },
    effort: '15-20 minutes'
  },
  {
    method: 'forkSync',
    dangerous: true,
    vulnerability: 'command-injection',
    safeAlternatives: ['spawnSync'],
    example: {
      bad: 'forkSync(userScript)',
      good: [
        'spawnSync(\'node\', [validatedScript], {shell: false, stdio: \'inherit\'})',
        '// Validate script path first'
      ]
    },
    effort: '15-20 minutes'
  }
];

/**
 * Generate refactoring steps based on the pattern.
 *
 * Module-scope (rather than inline in `create()`) so the `default` branch —
 * unreachable through COMMAND_PATTERNS, which only contains methods with
 * dedicated cases — is directly unit-testable.
 */
export const generateRefactoringSteps = (pattern: CommandPattern): string => {
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

    case 'execFile':
      return [
        '   1. Replace execFile() with spawn() for better security',
        '   2. Validate command path before execution',
        '   3. Ensure arguments are properly sanitized',
        '   4. Use {shell: false} option',
        '   5. Consider using execa library'
      ].join('\n');

    case 'execFileSync':
      return [
        '   1. Replace execFileSync() with spawnSync() for better security',
        '   2. Validate command path before execution',
        '   3. Ensure arguments are properly sanitized',
        '   4. Use {shell: false} option',
        '   5. Consider using execa library'
      ].join('\n');

    case 'spawnSync':
      return [
        '   1. Ensure first argument is a safe, validated command path',
        '   2. Pass arguments as separate array elements',
        '   3. Use {shell: false} to prevent shell injection',
        '   4. Validate command exists and is executable',
        '   5. Handle synchronous execution properly'
      ].join('\n');

    case 'fork':
      return [
        '   1. Replace fork() with spawn() for Node.js scripts',
        '   2. Validate script path exists and is readable',
        '   3. Use spawn(\'node\', [scriptPath], options) instead',
        '   4. Add proper error handling',
        '   5. Consider using child_process.execFile() for simple scripts'
      ].join('\n');

    case 'forkSync':
      return [
        '   1. Replace forkSync() with spawnSync() for Node.js scripts',
        '   2. Validate script path exists and is readable',
        '   3. Use spawnSync(\'node\', [scriptPath], options) instead',
        '   4. Add proper error handling and synchronous waiting',
        '   5. Consider using child_process.execFileSync() for simple scripts'
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

export type { CommandPattern };

export const detectChildProcess = createRule<RuleOptions, MessageIds>({
  name: 'detect-child-process',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/detect-child-process.md',
      description: 'Detects child_process usage that may allow command injection',
      cwe: 'CWE-78',
      cvss: 9.8,
      confidence: 'medium',
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
      /**
       * No shell was invoked, so this is not CWE-78.
       *
       * `spawn`/`execFile` default to `{ shell: false }`. When the BINARY is
       * attacker-steerable the defect is real — the caller chooses which program
       * runs — but that is process control, not shell-metacharacter injection,
       * and the two need different advice.
       *
       * Measured 2026-08-20 against eslint-plugin-security's own `valid` corpus:
       * `spawn(str)` drew `childProcessCommandInjection` at CVSS 9.8, telling
       * the reader to "use execFile/spawn with {shell: false}" — which is what
       * the reported line already does. Remediation that is a no-op on the line
       * it is attached to is a finding no developer can act on, and it fired on
       * 11 of their 19 valid cases for this class.
       */
      untrustedProgram: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Untrusted program',
        cwe: 'CWE-114',
        description:
          'The executable name is attacker-steerable. No shell runs here, so metacharacters are inert — but the caller still chooses which program executes.',
        severity: 'HIGH',
        fix: 'Resolve the name against a fixed allowlist of permitted executables before spawning it.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/114.html',
      }),
      argumentInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Argument injection',
        cwe: 'CWE-88',
        description:
          'An attacker-steered value sits in the argv vector with no `--` before it. There is no shell here, but the callee still parses a leading `-` as an option — `--upload-pack=` (git), `--to-command=` (tar), `-o ProxyCommand=` (ssh) all execute arbitrary programs.',
        severity: 'HIGH',
        fix: "Insert a literal '--' before the first attacker-controlled element, or reject values beginning with '-'.",
        documentationLink: 'https://cwe.mitre.org/data/definitions/88.html',
      }),

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
          },
          taintSources: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_TAINT_SOURCES,
            description:
              'Identifier roots treated as attacker-reachable (default: req, request, ctx, event, process)'
          },
          reportUnresolvedCommands: {
            type: 'boolean',
            default: false,
            description:
              'Report a command whose provenance cannot be resolved. Restores the pre-inversion "any dynamic argument is dangerous" behaviour.'
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
      additionalMethods: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      allowLiteralStrings = false,
      allowLiteralSpawn = false,
      additionalMethods = [],
    }: Options = options;
    const taintRoots = new Set(
      (options.taintSources ?? DEFAULT_TAINT_SOURCES).map((source) => source.toLowerCase()),
    );
    const readsTaintSource = makeReadsTaintSource(context.sourceCode, taintRoots);

    /**
     * The same reader minus `process` — "can a party who is NOT already at this
     * program's command line steer this value?"
     *
     * The no-shell path asks two questions and both are privilege-boundary
     * questions, not shape questions:
     *
     *   - argv[0]: can someone else choose which binary runs?
     *   - argv[1..]: can someone else smuggle in a flag (CWE-88)?
     *
     * An answer of "yes, via `process.argv` or `process.env`" is not an answer,
     * because whoever supplies those is standing at a shell and can invoke the
     * binary directly with any flags they like. Both labelled CWE-88 fixtures
     * (`benchmarks/corpus/CWE-088/vulnerable/{git-ls-remote-arg-injection,
     * tar-user-args}.js`) are `req`-rooted, and both keep reporting.
     *
     * Measured: this is the whole of the remaining corpus-scan gap. With
     * `process` counted, Shopify/cli reported twice —
     * `bin/changeset.js:17` `spawn(process.execPath, [changesetBinPath, ...args])`
     * where `args` is `process.argv.slice(2)`, i.e. a wrapper forwarding its own
     * command line, flagged as argument injection; and
     * `packages/plugin-cloudflare/src/install-cloudflared.ts:85`
     * `execFileSync(binTarget, ['--version'])` where `binTarget` traces back
     * through `getBinPathTarget(env, …)` to `install(env = process.env)` and the
     * documented `SHOPIFY_CLI_CLOUDFLARED_PATH` override. Neither crosses a
     * boundary; both were CWE-78 reports on a call with no shell and a literal
     * argv. Nothing else in the 8-repo corpus changes.
     *
     * NOT a name matcher: `env` there is an ordinary parameter, and renaming it
     * changes nothing. The taint was real resolution — a default-value write of
     * `process.env` picked up by the last-write-wins reader. The fix has to be
     * about what `process` MEANS, because the binding analysis was already right.
     */
    const readsRemoteTaintSource = makeReadsTaintSource(
      context.sourceCode,
      new Set([...taintRoots].filter((root) => root !== LOCAL_TAINT_ROOT)),
    );
    const reportUnresolvedCommands = options.reportUnresolvedCommands ?? false;

    /**
     * Child process methods that can be dangerous (Set for O(1) lookup)
     */
    const dangerousMethodsSet = new Set([
      'exec',
      'execSync',
      'execFile',
      'execFileSync',
      'spawn',
      'spawnSync',
      'fork',
      'forkSync',
      ...additionalMethods
    ]);

    /**
     * Track imported child_process identifiers so we can flag calls like
     * `exec()` or `cp.exec()` in addition to `child_process.exec()`.
     */
    /**
     * `node:child_process` and `child_process` are the same module. The trackers below
     * compared the specifier literally, so every `node:`-prefixed import was invisible.
     */
    const isChildProcessSpecifier = (value: unknown): boolean =>
      value === 'child_process' || value === 'node:child_process';

    const moduleAliases = new Set<string>(['child_process']);
    const importedMethods = new Set<string>();

    /**
     * Check if a node contains string interpolation or concatenation
     */
    // oxlint-disable-next-line consistent-function-scoping
    /**
     * "Dynamic" is precisely "not provably constant" — the negation of devkit's
     * static-expression analysis, not a node-type allowlist.
     *
     * The previous type-list version was wrong in BOTH directions:
     *   - `MemberExpression` and `CallExpression` fell through to `false`, so
     *     `exec(req.query.cmd)` was classified NOT dynamic. Combined with
     *     `allowLiteralStrings: true` that silently skipped the report — a false
     *     negative on the single most important input shape this rule exists to catch.
     *   - every `Identifier` and every `+` was classified dynamic, so
     *     `const CMD = 'ls'; exec(CMD)` reported — a false positive on a constant.
     */
    const containsDynamicStrings = (node: TSESTree.Node): boolean =>
      !isStaticExpression({ node, scope: context.sourceCode.getScope(node) });

    /**
     * A name — or the callee of a call — that is declared nowhere in the file.
     *
     * `exec(str)` and `exec(getCommand())` cannot be shown safe by anything
     * this file contains, which is the one case where an unresolved verdict is
     * genuinely unknown rather than merely unproven. `ref.resolved === null` is
     * the scope analyser's own answer, so it cannot drift from ESLint's.
     */
    const isFreeReference = (node: TSESTree.Node): boolean => {
      const name =
        node.type === AST_NODE_TYPES.Identifier
          ? node
          : node.type === AST_NODE_TYPES.CallExpression &&
              node.callee.type === AST_NODE_TYPES.Identifier
            ? node.callee
            : null;
      if (!name) return false;
      return context.sourceCode
        .getScope(name)
        .through.some((ref) => ref.identifier === name && ref.resolved === null);
    };

    /**
     * Check if command and arguments are literals (safe for execFile/spawn patterns)
     * We only care about the command (arg 0) and args array (arg 1).
     * The options object (arg 2) is irrelevant for command injection.
     */
    /** Provably-constant argument, resolving const bindings and static compositions. */
    const isStaticArg = (argument: TSESTree.Node): boolean =>
      isStaticExpression({ node: argument, scope: context.sourceCode.getScope(argument) });

    const hasOnlyLiteralArgs = (args: TSESTree.Node[]): boolean => {
      if (args.length === 0) return false;
      
      // Provably constant, not merely a string literal. A bare `type === 'Literal'` check
      // false-positives on `const CMD = 'ls'; exec(CMD)` — an identifier that can never
      // carry attacker input.
      if (!isStaticArg(args[0])) {
        return false;
      }
      
      // Second argument (if present) must be a literal array of literal strings
      if (args.length >= 2) {
        const argsArray = args[1];
        if (argsArray.type === 'ArrayExpression') {
          const allLiteralElements = argsArray.elements.every(
            (el: TSESTree.Node | null) => el !== null && isStaticArg(el),
          );
          if (!allLiteralElements) {
            return false;
          }
        } else if (!isStaticArg(argsArray)) {
          // If second arg is not array or literal, it's dynamic
          return false;
        }
      }
      
      // Options object (arg 2+) is irrelevant for command injection safety
      // It may contain callbacks, cwd, env, etc. which are not injection vectors
      return true;
    };

    /**
     * Does this call actually put a shell between the command and the OS?
     *
     * `exec`/`execSync` always do — that is what they are. `execFile` family
     * never does unless asked. `spawn`/`spawnSync` default to no shell.
     * The options object sits at a different index per method, so both the
     * `spawn(cmd, args, opts)` and `execFile(cmd, args, opts)` /
     * `exec(cmd, opts)` shapes are checked.
     */
    const usesShell = (node: TSESTree.CallExpression, method: string): boolean => {
      if (method === 'exec' || method === 'execSync') return true;
      // `spawn('bash', ['-c', userCommand])` has no `shell` option and needs
      // none — the command IS a shell, and everything after `-c` is a script.
      // Without this the literal-command exemption below would turn the single
      // most direct command injection in Node into a silent pass.
      const command = node.arguments[0];
      if (
        command !== undefined &&
        command.type === AST_NODE_TYPES.Literal &&
        typeof command.value === 'string' &&
        SHELL_BINARIES.has(command.value.replace(/^.*[/\\]/, '').toLowerCase())
      ) {
        return true;
      }
      // `execFile('node', ['-e', src])`, `spawn('cmd', ['/c', line])` — the
      // eval flag turns the NEXT argv entry into source text, which is the same
      // hazard under a different binary. Reading the flag rather than
      // enumerating interpreters keeps `execFile('node', [scriptPath])` — a
      // path, not a program — out of it.
      const argv = node.arguments[1];
      if (argv?.type === AST_NODE_TYPES.ArrayExpression) {
        for (const element of argv.elements) {
          if (
            element?.type === AST_NODE_TYPES.Literal &&
            typeof element.value === 'string' &&
            EVAL_FLAGS.has(element.value.toLowerCase())
          ) {
            return true;
          }
        }
      }
      for (const candidate of [node.arguments[1], node.arguments[2]]) {
        if (!candidate || candidate.type !== AST_NODE_TYPES.ObjectExpression) continue;
        for (const property of candidate.properties) {
          if (
            property.type !== AST_NODE_TYPES.Property ||
            property.key.type !== AST_NODE_TYPES.Identifier ||
            property.key.name !== 'shell'
          ) {
            continue;
          }
          // `shell: false` is the default restated; anything else — `true`, a
          // path to a shell, a variable — opts back in.
          return !(
            property.value.type === AST_NODE_TYPES.Literal && property.value.value === false
          );
        }
      }
      return false;
    };

    /**
     * Is this value's first character fixed by the code, and not a dash?
     *
     * `` `--file=${name}` `` and `'/tmp/' + name` cannot become an option
     * however the interpolation is steered, because the option position is
     * already spoken for. That is the same reasoning `--` relies on, applied
     * one element at a time.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const cannotStartWithDash = (node: TSESTree.Node): boolean => {
      if (node.type === AST_NODE_TYPES.TemplateLiteral) {
        // `cooked` is null only for an invalid escape in a TAGGED template,
        // which an argv element never is; `raw` carries the same first byte.
        const first = node.quasis[0].value.raw;
        return first.length > 0 && !first.startsWith('-');
      }
      if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
        const left = node.left;
        return (
          left.type === AST_NODE_TYPES.Literal &&
          typeof left.value === 'string' &&
          left.value.length > 0 &&
          !left.value.startsWith('-')
        );
      }
      return false;
    };

    /**
     * CWE-88 — the argv element an attacker can turn into an OPTION.
     *
     * With `shell: false` the vector reaches `execve` untouched, so there is no
     * CWE-78 shell to inject into. There is still the callee's own option
     * parser: every POSIX-conventional program reads a leading `-` as a flag,
     * so an attacker-steered positional becomes `--upload-pack=…` (git),
     * `--to-command=sh` (tar), `-o ProxyCommand=…` (ssh) — arbitrary execution
     * without a shell anywhere in the picture.
     *
     * Binary-independent on purpose. The alternative is a hand-maintained list
     * of dangerous flags per program, which is a list of the exploits somebody
     * already published, not of the ones that exist.
     *
     * Two things end the hazard, and both are recognised: a literal `--`
     * earlier in the vector (POSIX end-of-options — everything after it is
     * positional), and an element whose leading character the code already
     * fixed to something other than `-`.
     *
     * Returns the offending element so the report lands on it rather than on
     * the whole call.
     */
    const argumentInjectionSite = (node: TSESTree.CallExpression): TSESTree.Node | null => {
      const argv = node.arguments[1];
      if (argv?.type !== AST_NODE_TYPES.ArrayExpression) return null;
      for (const element of argv.elements) {
        if (element === null) continue;
        if (
          element.type === AST_NODE_TYPES.Literal &&
          element.value === '--'
        ) {
          return null;
        }
        if (!readsRemoteTaintSource(element)) continue;
        // A spread cannot be proven flag-proof: nothing here knows what is in
        // the array, and `[...userWords]` is precisely the tar fixture.
        const target =
          element.type === AST_NODE_TYPES.SpreadElement ? element.argument : element;
        if (cannotStartWithDash(target)) continue;
        return element;
      }
      return null;
    };

    /**
     * Check if spawn/spawnSync has { shell: false } option
     */
    const hasShellFalseOption = (node: TSESTree.CallExpression): boolean => {
      // Options is typically the 3rd argument for spawn(cmd, args, options)
      const optionsArg = node.arguments[2];
      if (!optionsArg || optionsArg.type !== AST_NODE_TYPES.ObjectExpression) {
        // No options = default shell: false for spawn
        return true;
      }
      
      for (const prop of optionsArg.properties) {
        if (prop.type === AST_NODE_TYPES.Property &&
            prop.key.type === AST_NODE_TYPES.Identifier &&
            prop.key.name === 'shell') {
          // shell: false is safe
          if (prop.value.type === AST_NODE_TYPES.Literal && prop.value.value === false) {
            return true;
          }
          // shell: true or shell: someVar is not safe
          return false;
        }
      }
      
      // No shell property = default is false = safe
      return true;
    };

    /**
     * Check if a variable is validated against an allowlist before use
     * Looks for patterns like: if (ALLOWED.includes(arg)) or if (!ALLOWED.includes(arg)) { return/throw }
     */
    const hasPrecedingAllowlistValidation = (node: TSESTree.CallExpression): boolean => {
      // Helper: check if an arg node contains a validated variable
      const makeArgChecker = (validatedVarNames: Set<string>) => {
        const check = (argNode: TSESTree.Node): boolean => {
          if (argNode.type === 'Identifier' && validatedVarNames.has(argNode.name)) return true;
          if (argNode.type === 'TemplateLiteral') {
            return argNode.expressions.some(e => e.type === 'Identifier' && validatedVarNames.has(e.name));
          }
          if (argNode.type === AST_NODE_TYPES.ArrayExpression) {
            return argNode.elements.some(el => el !== null && check(el));
          }
          return false;
        };
        return check;
      };

      // Helper: check if a guard clause IfStatement validates any of our call's args
      const checkGuardClause = (ifNode: TSESTree.IfStatement): boolean => {
        const test = ifNode.test;

        // Pattern 1: if (ALLOWED.includes(arg)) { ... our call is inside ... }
        if (test.type === 'CallExpression' &&
            test.callee.type === 'MemberExpression' &&
            test.callee.property.type === 'Identifier' &&
            test.callee.property.name === 'includes') {
          const validatedVarNames = new Set<string>();
          for (const testArg of test.arguments) {
            if (testArg.type === 'Identifier') validatedVarNames.add(testArg.name);
          }
          const check = makeArgChecker(validatedVarNames);
          for (const arg of node.arguments) {
            if (check(arg)) return true;
          }
        }

        // Pattern 2: if (!ALLOWED.includes(arg)) { throw/return } — guard clause
        if (test.type === AST_NODE_TYPES.UnaryExpression && test.operator === '!' &&
            test.argument.type === AST_NODE_TYPES.CallExpression &&
            test.argument.callee.type === AST_NODE_TYPES.MemberExpression &&
            test.argument.callee.property.type === AST_NODE_TYPES.Identifier &&
            test.argument.callee.property.name === 'includes') {
          const consequent = ifNode.consequent;
          const isGuardBody = (
            consequent.type === AST_NODE_TYPES.ReturnStatement ||
            consequent.type === AST_NODE_TYPES.ThrowStatement ||
            (consequent.type === AST_NODE_TYPES.BlockStatement && 
             consequent.body.length > 0 &&
             (consequent.body[0].type === AST_NODE_TYPES.ReturnStatement || 
              consequent.body[0].type === AST_NODE_TYPES.ThrowStatement))
          );
          if (isGuardBody) {
            const validatedVarNames = new Set<string>();
            for (const testArg of test.argument.arguments) {
              if (testArg.type === 'Identifier') validatedVarNames.add(testArg.name);
            }
            const check = makeArgChecker(validatedVarNames.size > 0 ? validatedVarNames : new Set(['*']));
            // If we have specific validated var names, check them; otherwise check any identifier
            if (validatedVarNames.size > 0) {
              for (const arg of node.arguments) {
                if (check(arg)) return true;
              }
            } else {
              // No specific args in includes() - treat as generic guard
              for (const arg of node.arguments) {
                if (arg.type === 'Identifier' || 
                    (arg.type === AST_NODE_TYPES.ArrayExpression && arg.elements.some(el => el?.type === 'Identifier'))) {
                  return true;
                }
              }
            }
          }
        }
        return false;
      };

      // Pass 1: Walk up parent chain looking for ancestor IfStatements
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (current.type === 'IfStatement') {
          if (checkGuardClause(current)) return true;
        }
        current = current.parent;
      }

      // Pass 2: Look for guard clause IfStatements as preceding siblings in the same block
      // This handles: function f(x) { if (!allowed.includes(x)) throw ...; execFile('cmd', [x]); }
      let stmt: TSESTree.Node | undefined = node.parent;
      // Walk up to find the statement that contains our call in a block
      while (stmt && stmt.parent && stmt.parent.type !== AST_NODE_TYPES.BlockStatement) {
        stmt = stmt.parent;
      }
      if (stmt && stmt.parent && stmt.parent.type === AST_NODE_TYPES.BlockStatement) {
        const block = stmt.parent as TSESTree.BlockStatement;
        const callIndex = block.body.indexOf(stmt as TSESTree.Statement);
        if (callIndex > 0) {
          // Check preceding siblings for guard clause IfStatements
          for (let i = 0; i < callIndex; i++) {
            const sibling = block.body[i];
            if (sibling.type === 'IfStatement') {
              if (checkGuardClause(sibling)) return true;
            }
          }
        }
      }
      
      return false;
    };

    /**
     * Extract command and arguments for analysis.
     * `method` comes from getChildProcessCall, which already resolved the
     * callee shape — re-deriving it here would duplicate that logic behind
     * an unreachable defensive branch.
     */
    const extractCommandInfo = (node: TSESTree.CallExpression, method: string): {
      args: string;
      pattern: CommandPattern | null;
      isDynamic: boolean;
    } => {
      const sourceCode = context.sourceCode;
      const args = node.arguments.map((arg: TSESTree.Node) => sourceCode.getText(arg)).join(', ');

      const pattern = COMMAND_PATTERNS.find(p => p.method === method) || null;

      // Check if arguments contain dynamic content
      // Only the command (arg 0) and an explicit argv array (arg 1) can carry injected
      // input. Arg 1+ is otherwise an options object or a callback — a FunctionExpression
      // is never "static", so including it here would mark every `exec(cmd, cb)` dynamic.
      const injectableArgs: TSESTree.Node[] = node.arguments.slice(0, 1);
      const argvArray = node.arguments[1];
      if (argvArray?.type === AST_NODE_TYPES.ArrayExpression) {
        injectableArgs.push(...argvArray.elements.filter((el): el is TSESTree.Expression => el !== null));
      }
      const isDynamic = injectableArgs.some((arg: TSESTree.Node) => containsDynamicStrings(arg));

      return { args, pattern, isDynamic };
    };

    /**
     * Determine risk level based on the call pattern
     */
    // oxlint-disable-next-line consistent-function-scoping
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
     * Determine whether the callee refers to a child_process API.
     */
    /** Is this node a `require('child_process')` / `require('node:child_process')` call? */
    const isChildProcessRequire = (node: TSESTree.Node): boolean =>
      node.type === AST_NODE_TYPES.CallExpression &&
      node.callee.type === AST_NODE_TYPES.Identifier &&
      node.callee.name === 'require' &&
      node.arguments[0]?.type === AST_NODE_TYPES.Literal &&
      isChildProcessSpecifier(node.arguments[0].value);

    /**
     * The child_process member this identifier is bound to, or null.
     *
     * Handles the two aliasing forms — `import { exec as run } from 'child_process'` and
     * `const { exec: run } = require('child_process')` — by reading the EXPORTED name off
     * the specifier or the destructuring pattern rather than the local binding.
     */
    const childProcessMemberName = (node: TSESTree.Node): string | null => {
      if (node.type !== AST_NODE_TYPES.Identifier) return null;

      for (
        let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(node);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.variables.find((v) => v.name === node.name);
        if (!variable) continue;

        const [def] = variable.defs;
        if (def?.type === 'ImportBinding') {
          const declaration = def.parent;
          if (
            declaration?.type !== AST_NODE_TYPES.ImportDeclaration ||
            !isChildProcessSpecifier(declaration.source.value) ||
            def.node.type !== AST_NODE_TYPES.ImportSpecifier
          ) {
            return null;
          }
          // `imported` is a StringLiteral for ES2022 arbitrary module namespace names —
          // `import { "exec" as run } from 'child_process'`. That names the same member,
          // so read it rather than giving up on the syntax.
          return def.node.imported.type === AST_NODE_TYPES.Identifier
            ? def.node.imported.name
            : String(def.node.imported.value);
        }

        if (def?.type === 'Variable') {
          const declarator = def.node;
          if (
            declarator.init == null ||
            !isChildProcessRequire(declarator.init) ||
            declarator.id.type !== AST_NODE_TYPES.ObjectPattern
          ) {
            return null;
          }
          for (const property of declarator.id.properties) {
            if (
              property.type === AST_NODE_TYPES.Property &&
              property.value.type === AST_NODE_TYPES.Identifier &&
              property.value.name === node.name &&
              property.key.type === AST_NODE_TYPES.Identifier
            ) {
              return property.key.name;
            }
          }
        }
        return null;
      }
      return null;
    };

    /**
     * Does this name still refer to child_process HERE?
     *
     * `moduleAliases` / `importedMethods` are flat name sets, so an inner binding that
     * reuses the name kept the alias alive:
     *
     * ```js
     * var foo = require('child_process');
     * function fn () { var foo = /hello/; foo.exec(str); }   // a RegExp, reported
     * ```
     *
     * That is a shape eslint-plugin-security's own corpus marks valid, and one their
     * rule gets right by resolving the binding. Scope analysis answers the question the
     * name sets only approximated.
     *
     * Both binding forms have to count, which is what the first attempt at this got
     * wrong: `import { execFile } from 'child_process'` is an ImportBinding, but
     * `const { execFile } = require('child_process')` is a Variable whose initializer is
     * the require call. Treating only the first as legitimate silently suppressed the
     * CWE-088 argument-injection fixtures, both written with the destructured require.
     *
     * @param fallback names recorded from shapes scope analysis does not model — reached
     *   only when the identifier resolves to no declaration in this file.
     */
    const resolvesToChildProcess = (
      node: TSESTree.Node,
      fallback: ReadonlySet<string>,
    ): boolean => {
      if (node.type !== AST_NODE_TYPES.Identifier) return false;

      for (
        let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(node);
        scope;
        scope = scope.upper
      ) {
        const variable = scope.variables.find((v) => v.name === node.name);
        if (!variable) continue;

        // A variable with no definition is one the environment declared, not this
        // file — never the module. `?.` rather than a separate guard: an undefined
        // def falls to the same `return false` as a parameter or a class.
        const [def] = variable.defs;
        if (def?.type === 'ImportBinding') {
          const declaration = def.parent;
          return (
            declaration?.type === AST_NODE_TYPES.ImportDeclaration &&
            isChildProcessSpecifier(declaration.source.value)
          );
        }
        // `const cp = require('child_process')` and `const { exec } = require(...)`
        // share this shape — the initializer is the require call in both.
        if (def?.type === 'Variable') {
          return def.node.init != null && isChildProcessRequire(def.node.init);
        }
        // A parameter, a function, a class, or a binding the environment owns:
        // whatever it is, it is not the module.
        return false;
      }

      // Declared nowhere in this file: the bare `child_process` global name, or an
      // alias recorded from a shape scope analysis does not model.
      return fallback.has(node.name);
    };

    const getChildProcessCall = (
      node: TSESTree.CallExpression
    ): { method: string; calleeNode: TSESTree.Node } | null => {
      // child_process.exec(...)
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.property.type === 'Identifier'
      ) {
        const methodName = node.callee.property.name;
        if (!dangerousMethodsSet.has(methodName)) {
          return null;
        }

        // child_process.exec(...) or alias.exec(...)
        if (resolvesToChildProcess(node.callee.object, moduleAliases)) {
          return { method: methodName, calleeNode: node.callee };
        }

        // require('child_process').exec(...) — chained straight off the require, so the
        // module never gets a name for `moduleAliases` to hold.
        if (isChildProcessRequire(node.callee.object)) {
          return { method: methodName, calleeNode: node.callee };
        }
      }

      // exec(...) when imported directly from child_process
      // The LOCAL name is not the member name. `import { exec as run } from
      // 'child_process'` binds `run`, so gating on `dangerousMethodsSet.has('run')`
      // missed a real command-injection sink — and an unrelated module's export aliased
      // to `exec` would have been reported on the name alone. Resolve to the member the
      // module actually exports, then ask whether THAT is dangerous.
      const member = childProcessMemberName(node.callee);
      if (member !== null && dangerousMethodsSet.has(member)) {
        return { method: member, calleeNode: node.callee };
      }

      if (node.callee.type === 'Identifier' && dangerousMethodsSet.has(node.callee.name)) {
        // Same shadowing question for a directly-imported method: an inner
        // `const exec = /re/.exec` must not inherit the import's meaning.
        if (resolvesToChildProcess(node.callee, importedMethods)) {
          return { method: node.callee.name, calleeNode: node.callee };
        }
      }

      return null;
    };

    /**
     * Check child_process calls for security issues
     */
    const checkChildProcessCall = (node: TSESTree.CallExpression) => {
      const detected = getChildProcessCall(node);
      if (!detected) {
        return;
      }

      const { method } = detected;
      const { args, pattern, isDynamic } = extractCommandInfo(node, method);

      // ALWAYS safe: exec/execSync called with a single string literal that
      // contains no interpolation — there is no user input to inject. The
      // rule discourages exec() in general (because it's easy to add a
      // template-literal later), but a fully-literal call is structurally
      // safe and shouldn't be flagged. Fire-on-stylistic-discouragement is
      // out of scope for a security rule.
      if ((method === 'exec' || method === 'execSync') && !isDynamic && hasOnlyLiteralArgs(node.arguments)) {
        return;
      }

      // Allow literal strings if configured (legacy option, kept for
      // backward compat with existing user configs).
      if (allowLiteralStrings && method === 'exec' && !isDynamic) {
        return;
      }

      // Allow safe methods with literal args if configured
      // execFile, execFileSync, spawn, spawnSync are inherently safer than exec
      // when using literal command + literal args array
      const saferMethods = new Set(['spawn', 'spawnSync', 'execFile', 'execFileSync']);
      if (allowLiteralSpawn && saferMethods.has(method) && hasOnlyLiteralArgs(node.arguments)) {
        return;
      }

      // ALWAYS safe: literal command + ALL literal args (no dynamic input at all).
      // For execFile/execFileSync: no shell by default, all-literal = nothing to inject.
      // For spawn/spawnSync: requires shell:false + all-literal args.
      if (saferMethods.has(method) && hasOnlyLiteralArgs(node.arguments)) {
        const isExecFile = method === 'execFile' || method === 'execFileSync';
        if (isExecFile || hasShellFalseOption(node)) {
          return;
        }
      }

      // Allow safe methods when args are validated against an allowlist
      // Pattern: if (ALLOWED.includes(arg)) { execFile('cmd', [arg]) }
      const allSafeMethods = ['execFile', 'execFileSync', 'spawn', 'spawnSync'];
      if (allSafeMethods.includes(method) && hasPrecedingAllowlistValidation(node)) {
        return;
      }

      // ALWAYS safe: a LITERAL command with no shell.
      //
      // `hasOnlyLiteralArgs` demands that the argv array be literal too, which
      // is a different — and much stronger — claim than command injection
      // needs. With `shell: false` (the default for spawn/spawnSync, and the
      // only mode execFile has) the argv vector goes to `execve` untouched:
      // there is no shell to interpret `;`, `|`, backticks or `$()`, so no
      // value in the array can start a second process.
      //
      // Shopify/cli `packages/cli-kit/src/public/node/tree-kill.ts` is the
      // archetype — three findings, all of the form
      // `spawn('pgrep', ['-lfP', parentPid])`, in a file whose comment says
      // "Use spawn instead of exec to avoid shell injection". The rule was
      // reporting the mitigation.
      //
      // What this does NOT claim: that an attacker-controlled *argument* is
      // harmless. Argument injection against a specific binary (`--upload-file`,
      // `-o ProxyCommand=…`) is real, but it is CWE-88 and depends on the
      // callee, not CWE-78 through a shell. A rule that cannot name the binary
      // cannot judge it, and it must not keep reporting CWE-78 as a proxy.
      // No shell, and a command the attacker cannot choose.
      //
      // Both halves are load-bearing and they guard different things. No shell
      // means no metacharacter is parsed, so a tainted *argument* cannot become
      // a second command. But argv[0] is the program itself: `spawn(userCmd,
      // args)` runs whatever binary the attacker names, shell or not, and that
      // stays a finding.
      //
      // This used to demand a string *literal* for the command, which is
      // stricter than the reasoning requires and produced two corpus false
      // positives — `spawn(process.execPath, [binPath, ...args])` in
      // Shopify/cli and `execFileSync(binTarget, ['--version'])` in its
      // cloudflare plugin. Neither command is attacker-steerable and both were
      // reported as command injection while being the documented fix for it.
      // They surfaced only once `node:child_process` specifiers began
      // resolving, so a false negative had been hiding a false positive.
      //
      // `readsRemoteTaintSource`, not `readsTaintSource`: a command the
      // operator points somewhere else through `process.env` is configuration,
      // not injection. See the reader's own comment for the measurement.
      const command = node.arguments[0];
      const commandIsSteerable =
        command === undefined ||
        isFreeReference(command) ||
        readsRemoteTaintSource(command);
      if (!usesShell(node, method) && !commandIsSteerable) {
        // …but the paragraph above says argument injection is real and that a
        // rule which cannot name the binary cannot judge it. Here the binary IS
        // named — it is the literal we just matched — so the judgement is
        // available, and declining to make it was a false negative on the
        // ecosystem's own labelled corpus:
        // benchmarks/corpus/CWE-088/vulnerable/git-ls-remote-arg-injection.js
        // and tar-user-args.js were both silent.
        const injected = argumentInjectionSite(node);
        if (injected === null) return;
        context.report({
          node: injected,
          messageId: 'argumentInjection',
        });
        return;
      }

      // Report only on evidence that an attacker can steer the command.
      //
      // INVERTED, following `detect-non-literal-fs-filename`. The gate used to
      // be `containsDynamicStrings` — an identifier, a `+`, or an interpolating
      // template was enough. Measured over an 8-repo corpus that produced 14
      // findings and zero command injections: `execSync(pseudoLocCmd)` where
      // `pseudoLocCmd` is a template of literals and `process.cwd()`,
      // `execSync(\`tar -xzf ${filename}\`)` where `filename` is a basename of a
      // path the installer just wrote.
      //
      // The trade: `exec(cmd)` where `cmd` is a bare parameter is now silent —
      // a caller-side decision this rule cannot see.
      // `reportUnresolvedCommands` restores the old sweep.
      // …except for a name bound nowhere in the file. "Resolved but not
      // provably constant" and "declared nowhere" are different verdicts and
      // must not share a branch: the corpus findings above all RESOLVE, while
      // `exec(str)` with `str` bound nowhere admits no local reasoning at all.
      // Same distinction as `detect-non-literal-fs-filename`.
      //
      // Scanned over the INJECTABLE positions only — argument 0 and the elements of
      // an explicit argv array — the same restriction `extractCommandInfo` applies,
      // for the same reason. Scanning every argument made `exec('ls', handleResult)`
      // report `childProcessCommandInjection` on a literal command whenever the
      // callback resolved nowhere: `hasOnlyLiteralArgs` rejects the Identifier at
      // position 1, `usesShell('exec')` skips the no-shell branch, and `unknowable`
      // then carried the call past this gate. A callback or an options value that
      // resolves to nothing says nothing about the command. Locked by the
      // `exec('ls', handleResult)` valid fixture below.
      const injectablePositions: TSESTree.Node[] = node.arguments.slice(0, 1);
      const argvVector = node.arguments[1];
      if (argvVector?.type === AST_NODE_TYPES.ArrayExpression) {
        injectablePositions.push(
          ...argvVector.elements.filter((el): el is TSESTree.Expression => el !== null),
        );
      }
      const unknowable = injectablePositions.some((argument) => isFreeReference(argument));

      if (
        !reportUnresolvedCommands &&
        !unknowable &&
        !node.arguments.some((argument) => readsTaintSource(argument))
      ) {
        return;
      }

      // Report the security issue
      const riskLevel = determineRiskLevel(pattern, isDynamic);
      const steps = pattern ? generateRefactoringSteps(pattern) : 'Review and secure command execution';
      const alternatives = pattern?.safeAlternatives.join(', ') || 'execFile, spawn with validation'; 

      // CWE-78 is a claim about a SHELL parsing metacharacters. Make it only
      // when a shell is actually in the picture; otherwise say what is true.
      context.report({
        node,
        messageId: usesShell(node, method) ? 'childProcessCommandInjection' : 'untrustedProgram',
        data: {
          method,
          args,
          riskLevel,
          vulnerability: pattern?.vulnerability || 'command injection',
          alternatives,
          steps,
          effort: pattern?.effort || '15-30 minutes'
        },});
    };

    /**
     * Track imports/requires of child_process to catch alias usage.
     */
    const trackChildProcessImport = (node: TSESTree.ImportDeclaration) => {
      if (!isChildProcessSpecifier(node.source.value)) {
        return;
      }

      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier') {
          moduleAliases.add(specifier.local.name);
        }

        if (specifier.type === 'ImportSpecifier') {
          importedMethods.add(specifier.local.name);
        }
      }
    };

    /**
     * Track CommonJS require patterns.
     */
    const trackChildProcessRequire = (node: TSESTree.VariableDeclarator) => {
      if (!node.init) {
        return;
      }

      // const cp = require('child_process');
      if (
        node.id.type === 'Identifier' &&
        node.init.type === 'CallExpression' &&
        node.init.callee.type === 'Identifier' &&
        node.init.callee.name === 'require' &&
        node.init.arguments[0] &&
        node.init.arguments[0].type === 'Literal' &&
        isChildProcessSpecifier(node.init.arguments[0].value)
      ) {
        moduleAliases.add(node.id.name);
        return;
      }

      // const { exec } = require('child_process');
      if (
        node.id.type === 'ObjectPattern' &&
        node.init?.type === 'CallExpression' &&
        node.init.callee.type === 'Identifier' &&
        node.init.callee.name === 'require' &&
        node.init.arguments[0] &&
        node.init.arguments[0].type === 'Literal' &&
        isChildProcessSpecifier(node.init.arguments[0].value)
      ) {
        for (const prop of node.id.properties) {
          if (prop.type === 'Property' && prop.key.type === 'Identifier') {
            importedMethods.add(prop.value.type === 'Identifier' ? prop.value.name : prop.key.name);
          }
        }
      }
    };

    /**
     * Report a `require('child_process')` that never becomes a named binding.
     *
     * Importing the module IS the risk signal — `sinon.stub(require('child_process'))` and a
     * bare `require('child_process')` both bring command execution into the module without
     * ever producing an `alias.exec(...)` call for the visitor above to see.
     *
     * Skipped when the require is:
     *   - a VariableDeclarator init  -> `trackChildProcessRequire` registers the alias and any
     *                                   real call site reports instead; reporting here too
     *                                   would emit two findings for one issue
     *   - the object of a member expression -> `require('cp').exec(x)` already reports as a call
     */
    const checkBareChildProcessRequire = (node: TSESTree.CallExpression) => {
      if (!isChildProcessRequire(node)) return;
      const parent = node.parent;
      if (parent?.type === AST_NODE_TYPES.VariableDeclarator && parent.init === node) return;
      if (parent?.type === AST_NODE_TYPES.MemberExpression && parent.object === node) return;

      context.report({
        node,
        messageId: 'childProcessCommandInjection',
        data: {
          method: 'require',
          riskLevel: 'MEDIUM',
          vulnerability: 'command-injection',
          safeAlternatives: 'execFile, spawn',
          refactoringSteps: '   1. Avoid importing child_process where it is not needed\n   2. If required, prefer execFile()/spawn() with {shell: false}\n   3. Validate any command or argument that is not a literal',
          effort: '10-15 minutes',
          badExample: 'require(\'child_process\')',
          goodExample: 'const { execFile } = require(\'node:child_process\')',
        },
      });
    };

    return {
      CallExpression(node: TSESTree.CallExpression) {
        checkChildProcessCall(node);
        checkBareChildProcessRequire(node);
      },
      ImportDeclaration: trackChildProcessImport,
      VariableDeclarator: trackChildProcessRequire
    };
  },
});
