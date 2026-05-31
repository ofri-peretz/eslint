/**
 * ESLint Rule: no-shell-injection
 * CWE-78: OS Command Injection
 *
 * Fires when child_process shell-execution functions receive a first
 * argument built via string concatenation or template literal expressions.
 *
 * Detection: structural-api. The rule checks the SHAPE of the first argument,
 * not what value flows into it. exec(`git ${cmd}`) fires regardless of what
 * `cmd` contains — the concatenation itself is the signal.
 *
 * Does NOT fire on:
 *   - exec('literal command') — static string, no injection surface
 *   - spawn('cmd', [args]) — args array is the safe parameterization form
 *   - exec(variable) — indirect; data-flow analysis required, out of scope
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'shellInjection';
type RuleOptions = [];

/** Shell-execution functions from child_process that run the first arg as a shell command. */
const SHELL_EXEC_FUNCTIONS = new Set([
  'exec', 'execSync',
]);

function isStringConcatOrTemplate(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length > 0) return true;
  if (
    node.type === AST_NODE_TYPES.BinaryExpression &&
    node.operator === '+' &&
    (
      node.left.type === AST_NODE_TYPES.Literal ||
      node.left.type === AST_NODE_TYPES.TemplateLiteral ||
      node.left.type === AST_NODE_TYPES.BinaryExpression ||
      node.right.type === AST_NODE_TYPES.Literal ||
      node.right.type === AST_NODE_TYPES.TemplateLiteral
    )
  ) return true;
  return false;
}

export const noShellInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-shell-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-shell-injection.md',
      description: 'Disallow string concatenation or template expressions in shell command arguments (CWE-78)',
      cwe: 'CWE-78',
      cvss: 9.8,
    },
    messages: {
      shellInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'OS Command Injection (CWE-78)',
        cwe: 'CWE-78',
        description: 'Shell command built via string concatenation or template literal. An attacker who controls any interpolated value can execute arbitrary OS commands.',
        severity: 'CRITICAL',
        fix: 'Use spawn(cmd, [arg1, arg2]) with separate arguments instead of exec(cmd + args). Never build shell commands via string interpolation.',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;
        let fnName: string | null = null;

        // exec('cmd') / execSync('cmd') — bare call
        if (callee.type === AST_NODE_TYPES.Identifier) {
          fnName = callee.name;
        }
        // require('child_process').exec('cmd') — member access
        else if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          callee.property.type === AST_NODE_TYPES.Identifier
        ) {
          fnName = callee.property.name;
        }

        if (!fnName || !SHELL_EXEC_FUNCTIONS.has(fnName)) return;

        const firstArg = node.arguments[0];
        if (!firstArg || firstArg.type === AST_NODE_TYPES.SpreadElement) return;

        if (isStringConcatOrTemplate(firstArg)) {
          context.report({ node: firstArg, messageId: 'shellInjection' });
        }
      },
    };
  },
});
