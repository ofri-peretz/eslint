/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-dynamic-command-string
 * CWE-77: Improper Neutralization of Special Elements used in a Command
 *
 * Two shapes hand a dynamically assembled string to something that parses it
 * as a command — both survive the "we use the array form, we're safe" review:
 *
 *   1. The shell-flag escape hatch. `spawn('bash', ['-c', `kill ${pid}`])`
 *      passes the array-args form, but everything after `-c` is parsed by the
 *      shell again. The parameterization is decorative.
 *
 *   2. Command-runner libraries that take a whole command line:
 *      `execaCommand(`git clone ${url}`)`, `$.raw`…`` (zx's quoting escape
 *      hatch). Unlike execa's and zx's tagged-template forms, these do NOT
 *      escape interpolated values.
 *
 * Detection: structural-api. The rule checks the SHAPE of the call — a shell
 * binary in argv[0] with a `-c`-style flag, or a named command-runner with an
 * interpolated argument. It never reasons about what value flows in.
 *
 * Relationship to the neighbouring rules:
 *   - `no-shell-injection` (CWE-78) covers `exec()`/`execSync()` — a shell
 *     command string built by concatenation.
 *   - `detect-child-process` (CWE-78) is the broad medium-confidence net over
 *     all child_process usage.
 *   This rule is the precise, high-confidence CWE-77 case: the command string
 *   is re-parsed by a shell that the argument array was supposed to avoid.
 *
 * @see https://cwe.mitre.org/data/definitions/77.html
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
  objectKeyName,
  propertyName,
} from '@interlace/eslint-devkit';
import {
  constInitializerOf,
  resolveConstantString,
} from '../../utils/const-value';
import { findVariable } from '../../utils/provenance';

type MessageIds = 'shellFlagInjection' | 'commandStringInterpolation';

export interface Options {
  /** Extra command-runner functions that take a whole command line. */
  extraCommandRunners?: string[];
}

type RuleOptions = [Options?];

/**
 * Functions that take (command, argsArray).
 *
 * `execa`/`execaSync` are here for the same reason the child_process four are:
 * their argument-array form is the API execa documents as the safe one, and it
 * is safe exactly because no shell is involved — `execa('bash', ['-c', line])`
 * puts the whole escape hatch back and passes review as "we use the array form".
 */
const ARGV_FUNCTIONS = new Set([
  'spawn',
  'spawnSync',
  'execFile',
  'execFileSync',
  'fork',
  'execa',
  'execaSync',
]);

/**
 * Interpreters that re-parse whatever follows a command flag → the flags that
 * actually do the re-parsing, per interpreter.
 *
 * The sets are deliberately not shared: `-e` means `set -e` (errexit) to a
 * POSIX shell and would make the next element a *script path*, not a command
 * string, whereas to PowerShell `-e` is `-EncodedCommand`. Treating them alike
 * produced a report whose message was wrong for bash.
 */
const POSIX_COMMAND_FLAGS = new Set(['-c']);
const CMD_COMMAND_FLAGS = new Set(['/c', '/C', '/k', '/K']);
const POWERSHELL_COMMAND_FLAGS = new Set([
  '-Command',
  '-command',
  '-c',
  '-EncodedCommand',
  '-encodedcommand',
  '-e',
  '-ec',
]);

const SHELL_COMMAND_FLAGS: Record<string, Set<string>> = {
  sh: POSIX_COMMAND_FLAGS,
  bash: POSIX_COMMAND_FLAGS,
  zsh: POSIX_COMMAND_FLAGS,
  dash: POSIX_COMMAND_FLAGS,
  ksh: POSIX_COMMAND_FLAGS,
  busybox: POSIX_COMMAND_FLAGS,
  cmd: CMD_COMMAND_FLAGS,
  'cmd.exe': CMD_COMMAND_FLAGS,
  powershell: POWERSHELL_COMMAND_FLAGS,
  'powershell.exe': POWERSHELL_COMMAND_FLAGS,
  pwsh: POWERSHELL_COMMAND_FLAGS,
};

/** Library entry points that accept a full command line without escaping. */
const COMMAND_RUNNERS = new Set(['execaCommand', 'execaCommandSync', '$.raw']);

/**
 * A POSIX shell option cluster that contains `c`: `-lc`, `-euc`, `-ce`.
 *
 * Not a spelling variant — it is the same flag. POSIX `-c` is a plain option,
 * not one that takes an argument: it makes the first OPERAND the command
 * string, so its place inside the cluster does not matter (`sh -ce '…'` and
 * `sh -ec '…'` run the same command line). Every single-letter POSIX shell
 * option is a letter, and the only other `c`-like one, noclobber, is an
 * upper-case `-C`, so the shape is decidable rather than a guess. CI runners
 * write `bash -lc` constantly so that nvm and rbenv shims are on PATH, and
 * matching only the exact string `-c` missed every one of them. A long option
 * (`--norc`) is not a cluster.
 */
const POSIX_COMMAND_CLUSTER = /^-[a-zA-Z]*c[a-zA-Z]*$/;

/** Does this flag make the NEXT argv element a command line for `shell`? */
function isCommandFlag(
  commandFlags: ReadonlySet<string>,
  flag: string,
): boolean {
  if (commandFlags.has(flag)) return true;
  return (
    commandFlags === POSIX_COMMAND_FLAGS && POSIX_COMMAND_CLUSTER.test(flag)
  );
}

/** The basename of a command path: '/bin/bash' → 'bash'. */
function basename(command: string): string {
  const segments = command.split(/[\\/]/);
  return segments[segments.length - 1];
}

/** The command-flag dialect of a program path, or null if it is not a shell. */
function shellDialect(
  command: string,
): { shell: string; flags: ReadonlySet<string> } | null {
  const shell = basename(command);
  const flags = SHELL_COMMAND_FLAGS[shell.toLowerCase()];
  return flags ? { shell, flags } : null;
}

/**
 * A string assembled at runtime rather than written out in full — SHAPE only.
 *
 * Callers must first ask `staticStringOf`, which resolves a `const` alias to
 * the literal behind it. This test alone says "a bare identifier is assembled",
 * which is true of `spawn('bash', ['-c', userCommand])` and false of
 * `const BUILD = 'npm ci'; spawn('bash', ['-c', BUILD])` — and hoisting a
 * command line to a module constant is ordinary style, not obfuscation.
 *
 * Deliberately stricter than `no-shell-injection`'s `isStringConcatOrTemplate`,
 * and NOT shared with it. That rule fires on `exec()` — where the whole first
 * argument IS the command line, so a bare identifier tells you nothing about
 * whether a shell metacharacter can appear, and it stays silent (`exec(cmd)` is
 * its documented coverage gap). Here the argv position is already known to be a
 * command string handed to an interpreter, so a bare identifier is exactly as
 * unverifiable as an interpolation and is reported. Consolidating the two would
 * either loosen this rule or make `no-shell-injection` fire on `exec(variable)`,
 * which is the false positive it was written to avoid. Pinned by the
 * `spawn('zsh', ['-c', userCommand])` (reported) and `exec(userCommand)`
 * (not reported by either rule) test pair.
 */
function isAssembledString(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.BinaryExpression) {
    return node.operator === '+';
  }
  // A template with nothing interpolated never gets here: `staticStringOf`
  // resolves it to its text first.
  return (
    node.type === AST_NODE_TYPES.TemplateLiteral ||
    node.type === AST_NODE_TYPES.Identifier ||
    node.type === AST_NODE_TYPES.MemberExpression ||
    node.type === AST_NODE_TYPES.CallExpression
  );
}

/** The called name, flattened: `cp.spawn` → 'spawn', `$.raw` → '$.raw'. */
function calleeName(callee: TSESTree.Node): string | null {
  if (callee.type === AST_NODE_TYPES.Identifier) return callee.name;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return null;
  // `cp['spawn']('bash', args)` calls the same function.
  const method = propertyName(callee);
  if (method === null) return null;
  if (
    callee.object.type === AST_NODE_TYPES.Identifier &&
    callee.object.name === '$'
  ) {
    return `$.${method}`;
  }
  return method;
}

export const noDynamicCommandString = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-command-string',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-dynamic-command-string.md',
      description:
        'Disallow dynamically assembled command strings passed to a shell flag or to a command-runner that does not escape (CWE-77)',
      cwe: 'CWE-77',
      cvss: 9.8,
      confidence: 'high',
    },
    messages: {
      shellFlagInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Command Injection Through Shell Flag (CWE-77)',
        cwe: 'CWE-77',
        cvss: 9.8,
        description:
          '{{fn}}("{{shell}}", ["{{flag}}", …]) hands a dynamically built string to {{shell}}, which parses it as a command line. The argument array looks parameterized but everything after {{flag}} is re-parsed — `;`, `&&`, backticks and `$()` all execute.',
        severity: 'CRITICAL',
        fix: 'Invoke the target program directly with its own argument array — spawn("kill", [String(pid)]) — instead of routing it through a shell.',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html',
      }),
      commandStringInterpolation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Interpolated Command Line (CWE-77)',
        cwe: 'CWE-77',
        cvss: 9.8,
        description:
          '{{fn}}() takes a whole command line and does NOT escape interpolated values (unlike the execa/zx tagged-template forms). Any special character in the interpolated value changes which command runs.',
        severity: 'CRITICAL',
        // oxlint-disable-next-line no-template-curly-in-string
        fix: 'Use the tagged-template or array form that escapes for you: execa("git", ["clone", url]) or await $`git clone ${url}`.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/77.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          extraCommandRunners: {
            type: 'array',
            items: { type: 'string' },
            // `[]`, matching `...(extraCommandRunners ?? [])` in `create()`. The
            // built-in COMMAND_RUNNERS are always in the set; this option adds
            // to them, so the default is the empty addition.
            default: [],
            description:
              'Extra functions that accept a full command line without escaping. Added to the built-in runners, not a replacement for them.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let runners: Set<string>;
    let sourceCode: Readonly<TSESLint.SourceCode>;

    /**
     * The string this expression is *proven* to evaluate to, or null.
     *
     * Two hops, both of them ordinary style rather than obfuscation: a `const`
     * bound to a literal (`const SHELL = '/bin/bash'`) and a property of a
     * `const` object literal (`const SCRIPTS = { build: 'npm run build' }`),
     * including the `Object.freeze({…})` spelling. Anything else is null,
     * which means *no evidence*, never *safe*.
     */
    function staticStringOf(node: TSESTree.Node): string | null {
      const resolved = resolveConstantString(sourceCode, node);
      if (resolved) return resolved.value;

      if (node.type !== AST_NODE_TYPES.MemberExpression) return null;
      if (node.computed) return null;
      if (node.object.type !== AST_NODE_TYPES.Identifier) return null;
      if (node.property.type !== AST_NODE_TYPES.Identifier) return null;

      const init = constInitializerOf(sourceCode, node.object);
      if (!init) return null;
      // `Object.freeze({ … })` is the same object literal with a call around it.
      const literal =
        init.type === AST_NODE_TYPES.CallExpression &&
        calleeName(init.callee) === 'freeze' &&
        init.arguments[0]
          ? init.arguments[0]
          : init;
      if (literal.type !== AST_NODE_TYPES.ObjectExpression) return null;

      // The LAST write of a key is the one the object holds, so read from the
      // end. A spread or a computed key the file cannot name, met first, may
      // be that last write (`{ build: 'npm run build', ...overrides }`), so it
      // ends the search with no evidence.
      for (const property of [...literal.properties].reverse()) {
        if (property.type !== AST_NODE_TYPES.Property) return null;
        // `{ build: … }`, `{ 'build': … }` and `{ ['build']: … }` are one property.
        const key = objectKeyName(property);
        if (key === null) return null;
        if (key !== node.property.name) continue;
        return resolveConstantString(sourceCode, property.value)?.value ?? null;
      }
      return null;
    }

    /**
     * The variable a file-local function is bound to, when nothing outside
     * this file can call it: a `function` declaration or a `const` arrow or
     * function expression, not exported where it is declared. Methods,
     * callbacks and anything else have callers this file cannot enumerate.
     */
    function localFunctionVariable(
      fn: TSESTree.Node,
    ): TSESLint.Scope.Variable | null {
      let id: TSESTree.Identifier | null = null;
      let declaration: TSESTree.Node = fn;
      if (fn.type === AST_NODE_TYPES.FunctionDeclaration) {
        id = fn.id;
      } else if (
        // A NAMED function expression has a second, internal binding that can
        // call it recursively (`const run = function inner(c) { inner(x) }`),
        // and those calls are not references to `run`.
        !(fn.type === AST_NODE_TYPES.FunctionExpression && fn.id) &&
        fn.parent?.type === AST_NODE_TYPES.VariableDeclarator &&
        fn.parent.init === fn &&
        fn.parent.id.type === AST_NODE_TYPES.Identifier &&
        fn.parent.parent.kind === 'const'
      ) {
        id = fn.parent.id;
        declaration = fn.parent.parent;
      }
      if (id === null) return null;
      const exported = declaration.parent?.type;
      if (
        exported === AST_NODE_TYPES.ExportNamedDeclaration ||
        exported === AST_NODE_TYPES.ExportDefaultDeclaration
      ) {
        return null;
      }
      return findVariable(sourceCode, id);
    }

    /**
     * Is this identifier a parameter that only string literals ever reach?
     *
     * `function commandPath(command) { spawnSync('sh', ['-lc', \`command -v
     * ${command}\`]) }` called only as `commandPath('axe')` (tolaria's iOS QA
     * scripts). Sound only when every way into the parameter is visible: the
     * function is file-local and not exported (`localFunctionVariable`), every
     * reference to it is a direct call — so it is never exported by name or
     * passed on as a value — every call passes a string literal (or a `const`
     * the file resolves) in this position, and the parameter is never
     * reassigned. A function with no calls proves nothing and stays assembled.
     */
    function isCallerConstantParameter(node: TSESTree.Identifier): boolean {
      const variable = findVariable(sourceCode, node);
      if (variable === null || variable.defs.length !== 1) return false;
      const [def] = variable.defs;
      if (def.type !== 'Parameter') return false;
      if (variable.references.some((reference) => reference.isWrite()))
        return false;
      const fn = def.node as TSESTree.FunctionLike;
      const index = fn.params.indexOf(def.name as TSESTree.Parameter);
      // A destructured, defaulted or rest parameter is not the argument itself.
      if (index === -1) return false;
      // In sloppy mode `arguments[0] = x` rewrites the first parameter without
      // naming it. Any use of a non-arrow function's own `arguments` ends the
      // proof; an arrow has none of its own.
      const usesArguments =
        fn.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
        (sourceCode.scopeManager?.acquire(fn)?.set.get('arguments')?.references
          .length ?? 0) > 0;
      if (usesArguments) return false;
      const fnVariable = localFunctionVariable(fn);
      if (fnVariable === null) return false;
      // The `const f = …` initialisation is a write to the binding, not a use.
      const uses = fnVariable.references.filter((reference) => !reference.init);
      return (
        uses.length > 0 &&
        uses.every((reference) => {
          const call = reference.identifier.parent;
          if (
            call?.type !== AST_NODE_TYPES.CallExpression ||
            call.callee !== reference.identifier
          ) {
            return false;
          }
          const passed = call.arguments.slice(0, index + 1);
          const argument = passed[index];
          return (
            argument !== undefined &&
            passed.every(
              (entry) => entry.type !== AST_NODE_TYPES.SpreadElement,
            ) &&
            isProvenString(argument)
          );
        })
      );
    }

    /**
     * `staticStringOf`, with a property of a `const` object accepted only while
     * the object is untouched. `const` stops rebinding, not mutation:
     * `const commands = { tool: 'git' }; commands.tool = argv[2]` holds argv,
     * whatever the initializer said. Every other reference must be a plain
     * property read — no write, update or delete, and the object never handed
     * to other code.
     */
    function isProvenString(node: TSESTree.Node): boolean {
      if (staticStringOf(node) === null) return false;
      if (
        node.type !== AST_NODE_TYPES.MemberExpression ||
        node.object.type !== AST_NODE_TYPES.Identifier
      ) {
        return true;
      }
      // `staticStringOf` resolved the object, so it is bound in this file.
      const object = findVariable(
        sourceCode,
        node.object,
      ) as TSESLint.Scope.Variable;
      return object.references.every((reference) => {
        if (reference.init) return true;
        const member = reference.identifier.parent as TSESTree.Node;
        if (
          member.type !== AST_NODE_TYPES.MemberExpression ||
          member.object !== reference.identifier
        ) {
          return false;
        }
        const use = member.parent as TSESTree.Node;
        return !(
          (use.type === AST_NODE_TYPES.AssignmentExpression &&
            use.left === member) ||
          use.type === AST_NODE_TYPES.UpdateExpression ||
          (use.type === AST_NODE_TYPES.UnaryExpression &&
            use.operator === 'delete')
        );
      });
    }

    /**
     * Is every value this expression can hold written in this file? A proven
     * string, a template or `+` whose every part is one, or a parameter only
     * literals reach.
     */
    function isProvenConstant(root: TSESTree.Node): boolean {
      // A worklist over the operands rather than recursion: the walk only ever
      // descends into a node's own children, and this shape needs no guard.
      const pending: TSESTree.Node[] = [root];
      for (let node = pending.pop(); node !== undefined; node = pending.pop()) {
        if (isProvenString(node)) continue;
        if (node.type === AST_NODE_TYPES.TemplateLiteral) {
          pending.push(...node.expressions);
          continue;
        }
        if (
          node.type === AST_NODE_TYPES.BinaryExpression &&
          node.operator === '+'
        ) {
          pending.push(node.left, node.right);
          continue;
        }
        if (
          node.type === AST_NODE_TYPES.Identifier &&
          isCallerConstantParameter(node)
        ) {
          continue;
        }
        return false;
      }
      return true;
    }

    /** A command string the program builds, as opposed to one it spells out. */
    function isAssembled(node: TSESTree.Node): boolean {
      if (isProvenConstant(node)) return false;
      return isAssembledString(node);
    }

    /**
     * The known function this callee ultimately names.
     *
     * `const run = promisify(execFile)` is the form Node's own documentation
     * shows, and `const run = execFile` is the same aliasing one hop shorter.
     * Both are resolved through the binding, never through the spelling of the
     * local — `run` tells you nothing, its initializer tells you everything.
     */
    function canonicalName(callee: TSESTree.Node): string | null {
      // The callee's own spelling is the answer only when its binding names
      // no known function: an import, a destructured or bound alias, or a
      // const bound to something this file cannot resolve.
      const direct = calleeName(callee);
      if (callee.type !== AST_NODE_TYPES.Identifier) return direct;

      const init = constInitializerOf(sourceCode, callee);
      if (!init) return direct;
      const target =
        init.type === AST_NODE_TYPES.CallExpression &&
        calleeName(init.callee) === 'promisify'
          ? init.arguments[0]
          : init;
      if (!target) return direct;
      const resolved = calleeName(target);
      if (resolved === null) return direct;
      return ARGV_FUNCTIONS.has(resolved) || runners.has(resolved)
        ? resolved
        : direct;
    }

    /**
     * Every position in this call from which a shell reads a command line.
     *
     * argv[0] is the obvious one. The other is a shell sitting INSIDE the
     * argument vector, which is not an exotic shape — `sudo bash -c …` and
     * `docker exec <id> sh -c …` are how provisioning and container tooling
     * are normally written, and the re-parse is identical. The scan starts
     * after the shell element so that a `-c` belonging to the outer program
     * (`docker run -c <cpu-shares>`, `git -c user.name=…`) is never read as a
     * command flag.
     */
    function shellPositions(
      command: TSESTree.Node,
      argv: TSESTree.ArrayExpression,
    ): Array<{ shell: string; flags: ReadonlySet<string>; from: number }> {
      const positions: Array<{
        shell: string;
        flags: ReadonlySet<string>;
        from: number;
      }> = [];
      const commandText = staticStringOf(command);
      const outer = commandText === null ? null : shellDialect(commandText);
      if (outer) positions.push({ ...outer, from: 0 });

      argv.elements.forEach((element, index) => {
        if (!element) return;
        const text = staticStringOf(element);
        if (text === null) return;
        const nested = shellDialect(text);
        if (nested) positions.push({ ...nested, from: index + 1 });
      });
      return positions;
    }

    /** spawn('bash', ['-c', <assembled>]) */
    function checkShellFlag(node: TSESTree.CallExpression, fn: string): void {
      const argvNode = node.arguments[1];
      // `const argv = ['-c', `pkill ${pid}`]; spawn('sh', argv)` — the vector
      // hoisted one statement up is the same vector.
      const argv =
        argvNode?.type === AST_NODE_TYPES.Identifier
          ? constInitializerOf(sourceCode, argvNode)
          : argvNode;
      if (!argv || argv.type !== AST_NODE_TYPES.ArrayExpression) return;

      // An argv vector at index 1 means index 0 exists; the cast avoids a
      // `command === undefined` branch that no input can reach.
      const command = node.arguments[0] as TSESTree.Node;

      for (const { shell, flags, from } of shellPositions(command, argv)) {
        for (let i = from; i < argv.elements.length - 1; i += 1) {
          const flag = argv.elements[i];
          if (!flag) continue;
          const flagText = staticStringOf(flag);
          if (flagText === null) continue;
          if (!isCommandFlag(flags, flagText)) continue;

          const commandString = argv.elements[i + 1];
          if (!commandString) continue;
          if (!isAssembled(commandString)) continue;

          context.report({
            node: commandString,
            messageId: 'shellFlagInjection',
            data: { fn, shell, flag: flagText },
          });
          return;
        }
      }
    }

    /** execaCommand(`git clone ${url}`) */
    function checkCommandRunner(
      node: TSESTree.CallExpression,
      fn: string,
    ): void {
      const commandLine = node.arguments[0];
      if (!commandLine) return;
      if (!isAssembled(commandLine)) return;

      context.report({
        node: commandLine,
        messageId: 'commandStringInterpolation',
        data: { fn },
      });
    }

    return {
      before() {
        const [options] = currentOptions();
        const { extraCommandRunners } = options as Options;
        runners = new Set([...COMMAND_RUNNERS, ...(extraCommandRunners ?? [])]);
        ({ sourceCode } = context);
      },
      CallExpression(node: TSESTree.CallExpression) {
        const fn = canonicalName(node.callee);
        if (!fn) return;
        if (ARGV_FUNCTIONS.has(fn)) {
          checkShellFlag(node, fn);
          return;
        }
        if (runners.has(fn)) {
          checkCommandRunner(node, fn);
        }
      },

      // $.raw`git clone ${url}` — zx's documented "do not escape" escape hatch
      TaggedTemplateExpression(node: TSESTree.TaggedTemplateExpression) {
        const fn = calleeName(node.tag);
        if (!fn || !runners.has(fn)) return;
        if (node.quasi.expressions.length === 0) return;
        context.report({
          node: node.quasi,
          messageId: 'commandStringInterpolation',
          data: { fn },
        });
      },
    };
  },
});
