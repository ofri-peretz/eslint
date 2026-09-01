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
import { createRule, formatLLMMessage, MessageIcons, propertyName } from '@interlace/eslint-devkit';

type MessageIds = 'logInjection';

export interface Options {
  /**
   * Receiver names whose level methods write a log line. REPLACES the built-in
   * list. Default: DEFAULT_LOGGER_RECEIVERS
   */
  loggerReceivers?: string[];

  /**
   * Extra receiver names to treat as a logger (e.g. `audit`, `tracer`), ON TOP
   * of `loggerReceivers`. Default: []
   */
  loggerNames?: string[];

  /**
   * Identifier roots that denote an inbound request, matched as the exact ROOT
   * of a member chain. REPLACES the built-in list.
   * Default: DEFAULT_REQUEST_ROOTS
   */
  requestRootNames?: string[];

  /**
   * Extra identifier roots that denote an inbound request, ON TOP of
   * `requestRootNames`. Default: []
   */
  requestRoots?: string[];

  /**
   * Request properties that carry caller-supplied data, matched as whole
   * property names on the chain. REPLACES the built-in list.
   * Default: DEFAULT_REQUEST_PROPERTIES
   */
  requestProperties?: string[];

  /**
   * Extra request properties, ON TOP of `requestProperties` — hapi's `payload`
   * belongs here. Default: []
   */
  additionalRequestProperties?: string[];
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
 *
 * Six names deciding whether a call is a log sink, so this is a DEFAULT rather
 * than a fixed surface: a house logger reached as `audit.info(...)` is added
 * through `loggerNames`, and a codebase where `log` is an ordinary domain noun
 * drops it through `loggerReceivers`. Neither changes that the comparison is
 * exact membership, never a substring — `dialog`, `catalog` and `blog` all
 * contain "log" and none of them is a logger.
 */
const DEFAULT_LOGGER_RECEIVERS = [
  'console',
  'log',
  'logger',
  'winston',
  'pino',
  'bunyan',
];

/**
 * Methods that emit a record rather than configure the logger.
 *
 * @protocol-constant This is a published method surface, not a vocabulary:
 * `log`, `info`, `warn`, `error`, `debug` and `trace` are the WHATWG console
 * standard's printing methods, and `fatal`, `verbose` and `silly` complete the
 * level APIs of pino, bunyan and winston's npm levels — the three libraries
 * this rule names. It is also only ever read AFTER the receiver has been proven
 * a logger, so a domain method that happens to be spelled `error` is never
 * reached through it. A consumer who could edit it could delete `error` or
 * `warn` and go green on `logger.error('user: ' + req.body.name)`, the exact
 * shape CWE-117 is about; a receiver they own belongs in `loggerReceivers`.
 */
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
 *
 * Five English words standing in for provenance, so this is a DEFAULT: a
 * framework that names its request object something else is added through
 * `requestRoots`, and a codebase where `event` or `message` is an ordinary
 * domain noun drops it through `requestRootNames`. Neither changes that the
 * root is compared by exact name.
 */
const DEFAULT_REQUEST_ROOTS = [
  'req',
  'request',
  'ctx',
  'event',
  'message',
];

/**
 * Properties of a request that carry caller-supplied data.
 *
 * A DEFAULT and not a fixed surface: the list is curated from the Express, Koa
 * and Fastify request objects plus the Lambda proxy event, so a framework whose
 * body lives elsewhere — hapi's `request.payload` — needs
 * `additionalRequestProperties`, and a codebase that must narrow it has
 * `requestProperties`. Membership is exact, per chain segment.
 */
const DEFAULT_REQUEST_PROPERTIES = [
  'query',
  'params',
  'body',
  'headers',
  'url',
  'path',
  'cookies',
  'data',
];

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
  requestProperties: ReadonlySet<string>,
): string | null {
  if (node.type !== 'MemberExpression') return null;

  const properties: string[] = [];
  let root: TSESTree.Node = node;
  while (root.type === 'MemberExpression') {
    // `propertyName` resolves the dotted form and a string subscript alike;
    // the two arms this replaces were the same question asked twice.
    const name = propertyName(root);
    if (name !== null) properties.unshift(name);
    // `req.headers[name]` contributes no name: the Identifier there is a
    // *variable*, not a property. Reading it as one would attribute
    // `req.headers[name]` to a field called `name`, which does not exist.
    root = root.object;
  }

  if (root.type !== 'Identifier') return null;
  if (!roots.has(root.name)) return null;
  if (!properties.some((p) => requestProperties.has(p))) return null;
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
  requestProperties: ReadonlySet<string>,
): string | null {
  if (node.type === 'Identifier') {
    const variable = findLocalVariable(scope, node.name);
    if (!variable) return null;
    const definition = variable.defs[0];
    if (!definition || definition.type !== 'Variable' || !definition.node.init) {
      return null;
    }
    return requestFieldOf(definition.node.init, roots, requestProperties);
  }
  return requestFieldOf(node, roots, requestProperties);
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
  if (object.type === 'MemberExpression') {
    // `this.logger`, `fastify.log`, `req['log']` — the logger is a property,
    // however it is spelled.
    const held = propertyName(object);
    return held !== null && receivers.has(held) ? held : null;
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
          loggerReceivers: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_LOGGER_RECEIVERS,
            description:
              'Receiver names whose level methods write a log line, compared as an exact name and never as a substring. Replaces the built-in list.',
          },
          loggerNames: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional receiver names whose level methods write a log line, on top of `loggerReceivers`',
          },
          requestRootNames: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_REQUEST_ROOTS,
            description:
              'Identifier roots that denote an inbound request, matched as the exact ROOT of a member chain. Replaces the built-in list.',
          },
          requestRoots: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional identifier roots that denote an inbound request, on top of `requestRootNames`',
          },
          requestProperties: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_REQUEST_PROPERTIES,
            description:
              'Request properties that carry caller-supplied data, matched as a whole segment of the member chain. Replaces the built-in list.',
          },
          additionalRequestProperties: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              "Extra request properties, on top of `requestProperties` — hapi's `request.payload` belongs here",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      loggerReceivers: DEFAULT_LOGGER_RECEIVERS,
      loggerNames: [],
      requestRootNames: DEFAULT_REQUEST_ROOTS,
      requestRoots: [],
      requestProperties: DEFAULT_REQUEST_PROPERTIES,
      additionalRequestProperties: [],
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    // Read the raw user options rather than the defaults-merged second
    // parameter: the merge always produces both keys, so a `?? []` on the
    // merged object would have one arm no configuration can reach.
    const options: Options = context.options[0] ?? {};

    const receivers = new Set([
      ...(options.loggerReceivers ?? DEFAULT_LOGGER_RECEIVERS),
      ...(options.loggerNames ?? []),
    ]);
    const roots = new Set([
      ...(options.requestRootNames ?? DEFAULT_REQUEST_ROOTS),
      ...(options.requestRoots ?? []),
    ]);
    const requestProperties = new Set([
      ...(options.requestProperties ?? DEFAULT_REQUEST_PROPERTIES),
      ...(options.additionalRequestProperties ?? []),
    ]);
    const sourceCode = context.sourceCode;

    /** `console.info(…)`, `this.logger.warn(…)`, `fastify.log.error(…)`. */
    function isLoggingCall(node: TSESTree.CallExpression): boolean {
      const callee = node.callee;
      if (callee.type !== 'MemberExpression') return false;
      // `logger['warn'](…)` writes the same line at the same level.
      if (!LOG_LEVEL_METHODS.has(propertyName(callee) as string)) return false;
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
              requestProperties,
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
