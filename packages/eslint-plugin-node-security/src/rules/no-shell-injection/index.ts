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
 *   - a concatenation whose every interpolated value folds to a literal
 *     written in the same file (see below)
 *
 * ## The constant-folding exemption
 *
 * "The shape is the signal" is right up to the point where the shape is the
 * only thing looked at. `Shopify/cli` `bin/get-graphql-schemas.js:207`:
 *
 * ```js
 * const localDir = schema.repo === 'world' ? '//' : schema.repo
 * const localRepoDirectory = execSync(`/opt/dev/bin/dev cd --no-chdir ${localDir}`)
 * ```
 *
 * `schema` iterates a module-level table whose seven rows all hardcode
 * `repo: 'world'`, so both arms of the ternary are the literal `'//'` and the
 * command has exactly one possible spelling. There is no attacker and no
 * injected value — the interpolation is a `const` written six lines up.
 *
 * The rule now folds the interpolated expressions through `const` bindings,
 * ternaries, `+` concatenation and `for…of` table rows (`utils/constant-folding`),
 * and stays silent only when EVERY one of them resolves to a literal in this
 * file. Anything unresolved — a parameter, a call result, an import — still
 * reports, because unresolved is not the same as safe.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons,
  isModuleBinding,
} from '@interlace/eslint-devkit';

import { makeIsLiteralConstant } from '../../utils/constant-folding';

type MessageIds = 'shellInjection';
/**
 * Only report when the callee resolves to `child_process`.
 *
 * The rule matched on the callee's NAME alone, so every `.exec()` in the
 * ecosystem qualified — better-sqlite3's `db.exec(sql)` was reported as CWE-78
 * at CVSS 9.8, in a rule shipping at `error` in `recommended` with no options
 * to turn it off.
 */
export interface Options {
  /** Require the callee to resolve to child_process. Default: `true`. */
  requireModuleEvidence?: boolean;
}

type RuleOptions = [Options?];

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
  /**
   * A test invoking its own build script — `execSync(`npm run sam:build:${suffix}`)` — composes the command from its own fixture data, not from anything a caller supplies.
   *
   * Found on alphagov/govuk-mobile-backend, which runs eslint-plugin-security
   * and would have seen this as added noise rather than added coverage.
   */
  skipTestFiles: true,
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
    schema: [
      {
        type: 'object',
        properties: {
          requireModuleEvidence: {
            type: 'boolean',
            default: true,
            description:
              'Only report when the callee resolves to child_process. Turning ' +
              'this off restores the pre-2026-08 behaviour, where any callee ' +
              'named exec/execSync/spawn was treated as a shell sink — which ' +
              'reported better-sqlite3 db.exec(sql) as CWE-78 at CVSS 9.8.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ requireModuleEvidence: true }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {}]) {
    const isLiteralConstant = makeIsLiteralConstant(context.sourceCode);
    const { requireModuleEvidence = true } = options;
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

        // The name `exec` is not evidence that this is child_process.
        //
        // `fnName` comes from `callee.property.name`, so EVERY `.exec()` in the
        // ecosystem matched: better-sqlite3's `db.exec(sql)`, knex, and any
        // local helper. Probed on the shipped rule, this reported CVSS 9.8
        // "Shell command injection" on a SQLite DDL statement — while
        // detect-child-process, which does resolve the binding, stayed
        // correctly quiet on the same file. The rule is `error` in
        // `recommended` and had `schema: []`, so a consumer using better-sqlite3
        // got a CRITICAL false positive with no way to configure it away.
        //
        // Same doctrine as the rest of this ecosystem: a rule decides on a
        // resolved binding, never on a spelling.
        if (
          requireModuleEvidence &&
          !isModuleBinding(callee, context.sourceCode.getScope(node), 'child_process')
        ) {
          return;
        }

        const firstArg = node.arguments[0];
        if (!firstArg || firstArg.type === AST_NODE_TYPES.SpreadElement) return;

        if (!isStringConcatOrTemplate(firstArg)) return;

        // Every interpolated part folds to a literal written in this file:
        // there is nothing for an attacker to supply. See the header note.
        if (isLiteralConstant(firstArg)) return;

        context.report({ node: firstArg, messageId: 'shellInjection' });
      },
    };
  },
});
