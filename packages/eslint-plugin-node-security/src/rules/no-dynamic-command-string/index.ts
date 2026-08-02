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
} from '@interlace/eslint-devkit';

type MessageIds = 'shellFlagInjection' | 'commandStringInterpolation';

export interface Options {
  /** Extra command-runner functions that take a whole command line. */
  extraCommandRunners?: string[];
}

type RuleOptions = [Options?];

/** child_process functions that take (command, argsArray). */
const ARGV_FUNCTIONS = new Set([
  'spawn',
  'spawnSync',
  'execFile',
  'execFileSync',
  'fork',
]);

/** Interpreters that re-parse whatever follows their command flag. */
const SHELL_BINARIES = new Set([
  'sh',
  'bash',
  'zsh',
  'dash',
  'ksh',
  'busybox',
  'cmd',
  'cmd.exe',
  'powershell',
  'powershell.exe',
  'pwsh',
]);

/** Flags after which the next argv element is a command string. */
const COMMAND_FLAGS = new Set(['-c', '-e', '/c', '/C', '/k', '/K', '-Command', '-command']);

/** Library entry points that accept a full command line without escaping. */
const COMMAND_RUNNERS = new Set([
  'execaCommand',
  'execaCommandSync',
  '$.raw',
]);

/** The basename of a command path: '/bin/bash' → 'bash'. */
function basename(command: string): string {
  const segments = command.split(/[\\/]/);
  return segments[segments.length - 1];
}

/** A string assembled at runtime rather than written out in full. */
function isAssembledString(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.expressions.length > 0;
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression) {
    return node.operator === '+';
  }
  return (
    node.type === AST_NODE_TYPES.Identifier ||
    node.type === AST_NODE_TYPES.MemberExpression ||
    node.type === AST_NODE_TYPES.CallExpression
  );
}

/** The called name, flattened: `cp.spawn` → 'spawn', `$.raw` → '$.raw'. */
function calleeName(callee: TSESTree.Node): string | null {
  if (callee.type === AST_NODE_TYPES.Identifier) return callee.name;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return null;
  if (callee.property.type !== AST_NODE_TYPES.Identifier) return null;
  if (callee.computed) return null;
  if (
    callee.object.type === AST_NODE_TYPES.Identifier &&
    callee.object.name === '$'
  ) {
    return `$.${callee.property.name}`;
  }
  return callee.property.name;
}

export const noDynamicCommandString = createRule<RuleOptions, MessageIds>({
  name: 'no-dynamic-command-string',
  meta: {
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
            description:
              'Extra functions that accept a full command line without escaping',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options]) {
    const { extraCommandRunners } = options as Options;
    const runners = new Set([
      ...COMMAND_RUNNERS,
      ...(extraCommandRunners ?? []),
    ]);

    /** spawn('bash', ['-c', <assembled>]) */
    function checkShellFlag(node: TSESTree.CallExpression, fn: string): void {
      const command = node.arguments[0];
      if (
        !command ||
        command.type !== AST_NODE_TYPES.Literal ||
        typeof command.value !== 'string'
      ) {
        return;
      }
      const shell = basename(command.value);
      if (!SHELL_BINARIES.has(shell.toLowerCase())) return;

      const argv = node.arguments[1];
      if (!argv || argv.type !== AST_NODE_TYPES.ArrayExpression) return;

      for (let i = 0; i < argv.elements.length - 1; i += 1) {
        const flag = argv.elements[i];
        if (!flag || flag.type !== AST_NODE_TYPES.Literal) continue;
        if (typeof flag.value !== 'string') continue;
        if (!COMMAND_FLAGS.has(flag.value)) continue;

        const commandString = argv.elements[i + 1];
        if (!commandString) continue;
        if (!isAssembledString(commandString)) continue;

        context.report({
          node: commandString,
          messageId: 'shellFlagInjection',
          data: { fn, shell, flag: flag.value },
        });
        return;
      }
    }

    /** execaCommand(`git clone ${url}`) */
    function checkCommandRunner(
      node: TSESTree.CallExpression,
      fn: string,
    ): void {
      const commandLine = node.arguments[0];
      if (!commandLine) return;
      if (commandLine.type === AST_NODE_TYPES.Literal) return;
      if (!isAssembledString(commandLine)) return;

      context.report({
        node: commandLine,
        messageId: 'commandStringInterpolation',
        data: { fn },
      });
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const fn = calleeName(node.callee);
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
