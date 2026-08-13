/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-log-injection
 * Detects attacker-controlled values concatenated into a log *message*.
 * CWE-117: Improper Output Neutralization for Logs
 *
 * A log file is a record with line boundaries. When a request field reaches the
 * message text unneutralized, a `\r\n` inside that field ends the record early
 * and starts a new one the attacker writes:
 *
 *   logger.info('login attempt: ' + req.body.username)
 *   // username = "bob\n[INFO] login ok for admin"
 *
 * The forged line is indistinguishable from a real one to every downstream
 * consumer — SIEM rules, on-call greps, incident timelines.
 *
 * @see https://cwe.mitre.org/data/definitions/117.html
 * @see https://owasp.org/www-community/attacks/Log_Injection
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'logInjection';

export interface Options {
  /** Extra receiver names to treat as a logger (e.g. `audit`, `tracer`). Default: [] */
  loggerNames?: string[];

  /** Extra identifier roots that denote an inbound request. Default: [] */
  requestRoots?: string[];
}

type RuleOptions = [Options?];

/**
 * Receivers whose level methods write a log line.
 *
 * Deliberately short. The sink is `<receiver>.<level>(…)`, and `<level>` alone
 * is worthless as evidence — `error`, `warn` and `trace` are method names on
 * assertion libraries, on span objects and on every event emitter in the
 * ecosystem. The receiver is what says "this string becomes a log record", so
 * it has to be a name that only a logger carries. `log` and `logger` cover the
 * ecosystem's two conventions (`fastify.log`, `this.logger`, pino/winston
 * instances); the named libraries cover the case where the module export is
 * used directly.
 */
const DEFAULT_LOGGER_RECEIVERS: ReadonlySet<string> = new Set([
  'console',
  'log',
  'logger',
  'winston',
  'pino',
  'bunyan',
]);

/** Methods that emit a record rather than configure the logger. */
const LOG_LEVEL_METHODS: ReadonlySet<string> = new Set([
  'log',
  'info',
  'warn',
  'error',
  'debug',
  'trace',
  'fatal',
  'verbose',
  'silly',
]);

/**
 * Identifier roots that denote an inbound request.
 *
 * Mirrors `no-unsafe-regex-construction`'s set — the two rules answer the same
 * question ("can a caller steer this value?") and must not disagree about what
 * a request looks like.
 */
const REQUEST_ROOTS: ReadonlySet<string> = new Set([
  'req',
  'request',
  'ctx',
  'event',
  'message',
]);

/** Properties of a request that carry caller-supplied data. */
const REQUEST_PROPERTIES: ReadonlySet<string> = new Set([
  'query',
  'params',
  'body',
  'headers',
  'url',
  'path',
  'cookies',
  'data',
]);

/**
 * The request field this member expression reads, or `null`.
 *
 * Walks to the root of `req.headers['x-forwarded-for']` and judges *that*,
 * exactly as the sibling regex rule does. Both an identifier property and a
 * computed string key count as a step; a computed non-literal key
 * (`req.headers[name]`) contributes no name but does not disqualify the chain —
 * `headers` is already on it.
 *
 * Returns the attributed path so the finding can name its evidence instead of
 * asserting "user input" and leaving the reader to guess which part.
 */
function requestFieldOf(
  node: TSESTree.Node,
  roots: ReadonlySet<string>,
): string | null {
  if (node.type !== 'MemberExpression') return null;

  const properties: string[] = [];
  let root: TSESTree.Node = node;
  while (root.type === 'MemberExpression') {
    const property = root.property;
    if (!root.computed && property.type === 'Identifier') {
      properties.unshift(property.name);
    } else if (property.type === 'Literal' && typeof property.value === 'string') {
      properties.unshift(property.value);
    }
    // `req.headers[name]` contributes no name: the Identifier there is a
    // *variable*, not a property. Reading it as one would attribute
    // `req.headers[name]` to a field called `name`, which does not exist.
    root = root.object;
  }

  if (root.type !== 'Identifier') return null;
  if (!roots.has(root.name)) return null;
  if (!properties.some((p) => REQUEST_PROPERTIES.has(p))) return null;
  return `${root.name}.${properties.join('.')}`;
}

/**
 * The variable this identifier resolves to, searched no further than the
 * function it appears in.
 *
 * Log statements read locals constantly, and a local declared *outside* the
 * handler cannot be this request's data — by the time control reaches a
 * module-level binding the value has no attributable provenance. Stopping at
 * the function boundary is what keeps the one-hop lookup below from turning
 * into an unbounded (and unsound) whole-program search.
 */
function findLocalVariable(
  scope: TSESLint.Scope.Scope,
  name: string,
): TSESLint.Scope.Variable | null {
  let current: TSESLint.Scope.Scope = scope;
  for (;;) {
    const variable = current.set.get(name);
    if (variable) return variable;
    if (current.type === 'function' || !current.upper) return null;
    current = current.upper;
  }
}

/**
 * Can an attacker steer this expression, and through what?
 *
 * Two shapes qualify, and only two:
 *
 * 1. the request field itself — `req.query.user`;
 * 2. a local bound to one, *one hop*: `const forwardedFor =
 *    req.headers['x-forwarded-for']`.
 *
 * The one hop exists because the intermediate binding is how the value is
 * normally written, not because deeper flow is safe — it is simply not
 * evidence this rule can produce. Everything else abstains, and the abstention
 * is the point: `sanitizeForLog(req.body.username)` is a CallExpression, so it
 * is not attributable, so it is not reported. That is not a special case for a
 * function named "sanitize" — any call, any operator, any indirection breaks
 * the attribution, because at that point the rule can no longer say what
 * reaches the log line.
 */
function attributableSource(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  roots: ReadonlySet<string>,
): string | null {
  if (node.type === 'Identifier') {
    const variable = findLocalVariable(scope, node.name);
    if (!variable) return null;
    const definition = variable.defs[0];
    if (!definition || definition.type !== 'Variable' || !definition.node.init) {
      return null;
    }
    return requestFieldOf(definition.node.init, roots);
  }
  return requestFieldOf(node, roots);
}

/** Is this argument a *message* — text being assembled — rather than a value? */
function isMessageShaped(node: TSESTree.Node): boolean {
  return (
    node.type === 'TemplateLiteral' ||
    (node.type === 'BinaryExpression' && node.operator === '+')
  );
}

/**
 * The expressions a message argument embeds directly.
 *
 * Interpolations of a template and the operands of a `+` chain, flattened.
 * Nothing is followed *into*: a call's arguments are not collected, so wrapping
 * a value in anything at all removes it from this list.
 */
function directOperands(node: TSESTree.Node, out: TSESTree.Node[]): void {
  if (node.type === 'TemplateLiteral') {
    for (const expression of node.expressions) out.push(expression);
    return;
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    directOperands(node.left, out);
    directOperands(node.right, out);
    return;
  }
  out.push(node);
}

/** The receiver's name, when the receiver is a plain name or a `.log` member. */
function receiverName(
  object: TSESTree.Node,
  receivers: ReadonlySet<string>,
): string | null {
  if (object.type === 'Identifier') {
    return receivers.has(object.name) ? object.name : null;
  }
  if (
    object.type === 'MemberExpression' &&
    object.property.type === 'Identifier'
  ) {
    // `this.logger`, `fastify.log`, `req.log` — the logger is a property.
    return receivers.has(object.property.name) ? object.property.name : null;
  }
  return null;
}

export const noLogInjection = createRule<RuleOptions, MessageIds>({
  name: 'no-log-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-log-injection.md',
      description:
        'Detects request data concatenated into a log message, which lets an attacker forge log records',
      cwe: 'CWE-117',
      cvss: 5.3,
    },
    messages: {
      logInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Log Injection',
        cwe: 'CWE-117',
        description:
          'Log message embeds {{source}} directly - a CR/LF in that value forges a log record',
        severity: 'MEDIUM',
        fix: 'Log it as a structured field (logger.info({ value }, "message")) or strip CR/LF/control characters first',
        documentationLink: 'https://cwe.mitre.org/data/definitions/117.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          loggerNames: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional receiver names whose level methods write a log line',
          },
          requestRoots: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional identifier roots that denote an inbound request',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ loggerNames: [], requestRoots: [] }],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Read the raw user options rather than the defaults-merged second
    // parameter: the merge always produces both keys, so a `?? []` on the
    // merged object would have one arm no configuration can reach.
    const options: Options = context.options[0] ?? {};

    const receivers = new Set([
      ...DEFAULT_LOGGER_RECEIVERS,
      ...(options.loggerNames ?? []),
    ]);
    const roots = new Set([...REQUEST_ROOTS, ...(options.requestRoots ?? [])]);
    const sourceCode = context.sourceCode;

    /** `console.info(…)`, `this.logger.warn(…)`, `fastify.log.error(…)`. */
    function isLoggingCall(node: TSESTree.CallExpression): boolean {
      const callee = node.callee;
      if (callee.type !== 'MemberExpression') return false;
      if (callee.property.type !== 'Identifier') return false;
      if (!LOG_LEVEL_METHODS.has(callee.property.name)) return false;
      return receiverName(callee.object, receivers) !== null;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isLoggingCall(node)) return;

        for (const argument of node.arguments) {
          // Structured logging passes an object; the message stays constant.
          // An object argument is a *field carrier*, not a line fragment — the
          // logger JSON-encodes it, so a `\n` inside it cannot end the record.
          // That is why `logger.info({ username: req.body.username }, 'login')`
          // is silent while the `'login: ' + req.body.username` form is not.
          if (!isMessageShaped(argument)) continue;

          const operands: TSESTree.Node[] = [];
          directOperands(argument, operands);

          for (const operand of operands) {
            const source = attributableSource(
              operand,
              sourceCode.getScope(operand),
              roots,
            );
            if (source === null) continue;

            // One report per logging call, anchored on the message argument.
            // A template can interpolate four request fields; they are one
            // defect with one fix (log structured fields instead), and four
            // squiggles on one line would only make the fix harder to see.
            context.report({
              node: argument,
              messageId: 'logInjection',
              data: { source },
            });
            return;
          }
        }
      },
    };
  },
});
