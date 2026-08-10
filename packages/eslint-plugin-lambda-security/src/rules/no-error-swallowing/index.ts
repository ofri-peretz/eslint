/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-error-swallowing
 * Detects empty catch blocks and missing error logging
 * CWE-390: Detection of Error Condition Without Action
 *
 * @see https://cwe.mitre.org/data/definitions/390.html
 * @see https://owasp.org/www-project-serverless-top-10/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { fileIsLambda } from '../../utils/lambda-evidence';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'emptyCatchBlock' | 'addErrorLogging';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
  /** Allow comments as documentation of intentional swallowing. Default: true */
  allowWithComment?: boolean;
}

type RuleOptions = [Options?];

export const noErrorSwallowing = createRule<RuleOptions, MessageIds>({
  name: 'no-error-swallowing',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-lambda-security/docs/rules/no-error-swallowing.md',
      description:
        'Detects empty catch blocks and missing error logging in Lambda handlers',
      cwe: 'CWE-390',
      cvss: 5,
    },
    hasSuggestions: true,
    messages: {
      emptyCatchBlock: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Error Swallowing',
        cwe: 'CWE-390',
        cvss: 5.0,
        description:
          'Catch block swallows error without logging. Security incidents may go undetected.',
        severity: 'MEDIUM',
        fix: 'Log the error with context: console.error("Operation failed", { error, awsRequestId: context.awsRequestId })',
        documentationLink: 'https://cwe.mitre.org/data/definitions/390.html',
      }),
      addErrorLogging: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Error Logging',
        description: 'Log errors with context for security monitoring',
        severity: 'LOW',
        fix: 'console.error("Error:", error); // or use structured logger',
        documentationLink:
          'https://docs.aws.amazon.com/lambda/latest/dg/nodejs-logging.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
          },
          allowWithComment: {
            type: 'boolean',
            default: true, description: 'Allow an empty catch block that carries an explanatory comment'
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true, allowWithComment: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    // Every rule here is Lambda-specific, and none of them knew it: over 107,382
    // files, 98% of this plugin's findings were in files with no AWS anything.
    // Registering no visitors is both the gate and the cheap path.
    if (!fileIsLambda(context.sourceCode.ast)) return {};

    const { allowInTests = true, allowWithComment = true } = options as Options;
    const filename = context.filename;
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    /** Loggers whose methods count as recording the error. */
    const LOGGER_OBJECTS = /^(console|logger|log|winston|pino|bunyan|sentry|Sentry)$/;
    const LOGGER_METHODS = /^(log|error|warn|info|debug|captureException|captureMessage)$/;
    /** Bare calls that record: logError(), reportError(), captureError(), trackError(). */
    const LOGGING_FUNCTIONS = /^(log|report|capture|track|record|notify)\w*$/i;
    /**
     * Callbacks that hand the error onward. Passing the error to one of these
     * is propagation, not swallowing — it is `throw` spelled asynchronously,
     * and Express's own error middleware is reached no other way.
     */
    const FORWARDING_CALLBACKS = /^(next|reject|callback|cb|done|fail|emit)$/;
    /** Response objects whose terminal methods answer the request. */
    const RESPONSE_OBJECTS = /^(res|response|reply|ctx)$/;
    const RESPONSE_METHODS =
      /^(status|sendStatus|json|send|end|writeHead|render|redirect)$/;

    /**
     * Does the caught error appear anywhere in these arguments?
     *
     * Searches the whole subtree rather than the top level, so `next(err)`,
     * `next(err.message)` and `reject(new Error(err))` all count — the error
     * travels in each. `next()` does not.
     */
    function mentions(nodes: readonly TSESTree.Node[], name: string): boolean {
      const stack = [...nodes];
      while (stack.length > 0) {
        const node = stack.pop();
        if (!node || typeof node.type !== 'string') continue;
        if (node.type === AST_NODE_TYPES.Identifier && node.name === name) return true;
        for (const key of Object.keys(node)) {
          if (key === 'parent') continue;
          const value = (node as unknown as Record<string, unknown>)[key];
          if (Array.isArray(value)) stack.push(...(value as TSESTree.Node[]));
          else if (value && typeof value === 'object') stack.push(value as TSESTree.Node);
        }
      }
      return false;
    }

    /** The root identifier of a member chain: `a.b.c()` → `a`. */
    function rootName(node: TSESTree.Node): string | undefined {
      let current: TSESTree.Node = node;
      while (current.type === AST_NODE_TYPES.MemberExpression) current = current.object;
      return current.type === AST_NODE_TYPES.Identifier ? current.name : undefined;
    }

    /** Every property name in a member chain: `a.b.c()` → ['b','c']. */
    function memberNames(node: TSESTree.Node): string[] {
      const names: string[] = [];
      let current: TSESTree.Node = node;
      while (current.type === AST_NODE_TYPES.MemberExpression) {
        if (current.property.type === AST_NODE_TYPES.Identifier) {
          names.unshift(current.property.name);
        }
        current = current.object;
      }
      return names;
    }

    /**
     * Classify a single call. Read off the AST, never off printed source:
     * the previous implementation regexed `sourceCode.getText(block)` for
     * `/\b(log|error|warn)\w*\s*\(/`, which matched any identifier beginning
     * with "log" — and matched inside comments and string literals too.
     */
    function classifyCall(
      call: TSESTree.CallExpression,
      caughtName: string | undefined,
    ): 'log' | 'forward' | 'respond' | undefined {
      const callee = call.callee;

      if (callee.type === AST_NODE_TYPES.Identifier) {
        // Forwarding requires the caught error to actually travel. Classifying
        // on the callee name alone let `catch (err) { next(); }` pass as
        // handled while discarding the error entirely — the exact false
        // negative this exemption was supposed to avoid creating. A catch with
        // no binding at all has nothing to forward, so it cannot qualify.
        if (FORWARDING_CALLBACKS.test(callee.name)) {
          return caughtName !== undefined && mentions(call.arguments, caughtName)
            ? 'forward'
            : undefined;
        }
        if (LOGGING_FUNCTIONS.test(callee.name)) return 'log';
        return undefined;
      }

      if (callee.type !== AST_NODE_TYPES.MemberExpression) return undefined;

      const names = memberNames(callee);
      const method = names.at(-1) ?? '';

      // Nested loggers first, so `this.logger.error()` is recognised — its
      // chain roots at a ThisExpression, which has no name at all.
      if (
        names.length > 1 &&
        LOGGER_OBJECTS.test(names.at(-2) ?? '') &&
        LOGGER_METHODS.test(method)
      ) {
        return 'log';
      }

      const root = rootName(callee);
      if (root === undefined) return undefined;

      if (LOGGER_OBJECTS.test(root) && LOGGER_METHODS.test(method)) return 'log';
      // res.status(500).json(...) — the terminal method is what answers, so
      // check the whole chain rather than only its last link.
      if (RESPONSE_OBJECTS.test(root) && names.some((n) => RESPONSE_METHODS.test(n))) {
        return 'respond';
      }
      return undefined;
    }

    /**
     * Walk every node under the catch body and report what the block does with
     * the error. A nested function body is deliberately included: a `catch`
     * that logs from inside a callback still records the error.
     */
    function analyze(
      block: TSESTree.BlockStatement,
      caughtName: string | undefined,
    ): {
      logs: boolean;
      forwards: boolean;
      responds: boolean;
    } {
      const result = { logs: false, forwards: false, responds: false };
      const seen = new Set<TSESTree.Node>();

      const visit = (node: TSESTree.Node | null | undefined): void => {
        if (!node || typeof node.type !== 'string' || seen.has(node)) return;
        seen.add(node);

        if (node.type === AST_NODE_TYPES.CallExpression) {
          const kind = classifyCall(node, caughtName);
          if (kind === 'log') result.logs = true;
          else if (kind === 'forward') result.forwards = true;
          else if (kind === 'respond') result.responds = true;
        }

        for (const key of Object.keys(node)) {
          if (key === 'parent') continue;
          const value = (node as unknown as Record<string, unknown>)[key];
          if (Array.isArray(value)) {
            for (const item of value) visit(item as TSESTree.Node);
          } else if (value && typeof value === 'object') {
            visit(value as TSESTree.Node);
          }
        }
      };

      visit(block);
      return result;
    }

    /**
     * Check if block has comments indicating intentional swallowing
     */
    function hasIntentionalComment(node: TSESTree.CatchClause): boolean {
      if (!allowWithComment) return false;

      const sourceCode = context.sourceCode;
      const comments = sourceCode.getCommentsInside(node.body);

      return comments.some((comment) =>
        /intentional|expected|ignore|suppress|handled|silent/i.test(
          comment.value,
        ),
      );
    }

    /**
     * Check if catch has throw/rethrow
     */
    function hasThrow(block: TSESTree.BlockStatement): boolean {
      return block.body.some(
        (stmt) => stmt.type === AST_NODE_TYPES.ThrowStatement,
      );
    }

    /**
     * A `return <value>` from a catch handles the error only when it **fails
     * closed**. The distinction is not whether a value comes back — it is
     * what that value grants:
     *
     *   return '#';                    fail closed  — the safe sentinel
     *   return false;                  fail closed  — an explicit denial
     *   return [];                     fail closed  — no results
     *
     *   return;                        swallowed    — records and produces nothing
     *   return null; / undefined;      swallowed    — no signal a caller can
     *                                                tell from "no data"
     *   return true;                   FAIL OPEN    — `catch { return true }`
     *                                                in an auth check grants
     *                                                access on a malformed
     *                                                token (CWE-636)
     *   return { statusCode: 200 };    FAIL OPEN    — reports success on failure
     *
     * Getting this backwards is not a near-miss. `return false` and
     * `return true` are one token apart and sit on opposite sides of the
     * line: one is a hostname validator denying an untrusted host, the other
     * is an authorization check letting an expired token through. An earlier
     * revision of this fix treated every value-return as handled and turned
     * the CWE-636 fixture into a false negative — it caught the fail-open
     * auth bypass before, and stopped.
     */
    function returnsFallback(block: TSESTree.BlockStatement): boolean {
      return block.body.some((stmt) => {
        if (stmt.type !== AST_NODE_TYPES.ReturnStatement) return false;
        const value = stmt.argument;
        if (value === null) return false;

        // No signal at all.
        if (value.type === AST_NODE_TYPES.Literal && value.value === null) return false;
        if (value.type === AST_NODE_TYPES.Identifier && value.name === 'undefined') {
          return false;
        }

        // Permissive: grants whatever the caller was asking permission for.
        if (value.type === AST_NODE_TYPES.Literal && value.value === true) return false;

        // An object literal claiming a 2xx status is failure dressed as success.
        if (value.type === AST_NODE_TYPES.ObjectExpression) {
          const status = value.properties.find(
            (p): p is TSESTree.Property =>
              p.type === AST_NODE_TYPES.Property &&
              p.key.type === AST_NODE_TYPES.Identifier &&
              /^(statusCode|status|ok|allowed|authorized)$/.test(p.key.name),
          );
          if (status) {
            const literal =
              status.value.type === AST_NODE_TYPES.Literal ? status.value.value : undefined;
            if (literal === true) return false;
            const code = Number(literal);
            if (code >= 200 && code < 300) return false;
          }
        }

        return true;
      });
    }

    return {
      CatchClause(node: TSESTree.CatchClause) {
        const body = node.body;

        // Empty catch block
        if (body.body.length === 0) {
          if (!hasIntentionalComment(node)) {
            context.report({
              node,
              messageId: 'emptyCatchBlock',
              suggest: [
                {
                  messageId: 'addErrorLogging',
                  fix: (fixer) => {
                    const errorParam =
                      node.param?.type === AST_NODE_TYPES.Identifier
                        ? node.param.name
                        : 'error';
                    return fixer.replaceText(
                      body,
                      `{ console.error('Error:', ${errorParam}); }`,
                    );
                  },
                },
              ],
            });
          }
          return;
        }

        // Has throw - OK, error is propagated
        if (hasThrow(body)) {
          return;
        }

        // Four ways a catch handles rather than swallows. The rule previously
        // recognised only the first, and only by regexing the block's printed
        // text — so it fired on the *correct* form of four separate patterns
        // in the CWE corpus:
        //
        //   catch (err) { return '#'; }              a safe fallback value
        //   catch (err) { next(err); }               forwarding to a handler
        //   catch { res.status(404).end(); }         answering the request
        //
        // The old return check demanded the returned expression match
        // /500|error|fail/, so `return false` from a hostname validator read
        // as swallowing while `return errorish` did not.
        const caughtName =
          node.param?.type === AST_NODE_TYPES.Identifier ? node.param.name : undefined;
        const { logs, forwards, responds } = analyze(body, caughtName);
        if (logs || forwards || responds || returnsFallback(body)) {
          return;
        }

        if (!hasIntentionalComment(node)) {
          context.report({
            node,
            messageId: 'emptyCatchBlock',
          });
        }
      },
    };
  },
});
