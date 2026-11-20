/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-sensitive-data-exposure
 * Detects PII/credentials in logs, responses, or error messages
 * Priority 5: Security with Data Flow Analysis
 * CWE-532: Information Exposure Through Log Files
 *
 * @see https://cwe.mitre.org/data/definitions/532.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  AST_NODE_TYPES,
  unwrapTypeSyntax,
  isStaticExpression,
  objectKeyName,
  propertyName,
  staticString,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'sensitiveDataExposure';

/**
 * `checkApiResponses` (default `true`) used to be declared here and in
 * `meta.schema`, and was never read by `create()` — there is no API-response
 * path in this rule at all; it visits `CallExpression` for loggers and
 * `NewExpression` for `Error`, and nothing else. `meta.docs.description` still
 * says "logs, responses, or error messages"; the third of those has never been
 * true, and the description is left alone here only because rewording it is a
 * separate, docs-wide change.
 */
export interface Options {
  /** Sensitive data patterns. Default: ['password', 'secret', 'token', 'key', 'ssn', 'credit', 'card'] */
  sensitivePatterns?: string[];

  /** Check console.log statements. Default: true */
  checkConsoleLog?: boolean;

  /** Check error messages. Default: true */
  checkErrorMessages?: boolean;

  /**
   * Trailing name segments that describe a secret rather than hold one, so a
   * credential-ish name ending in one is NOT reported. Compared as the whole
   * final segment of the name, never as a substring. REPLACES the built-in
   * list. Default: DESCRIPTOR_SEGMENTS
   */
  descriptorSegments?: string[];

  /** Extra descriptor segments, ON TOP of `descriptorSegments`. Default: [] */
  additionalDescriptorSegments?: string[];
}

type RuleOptions = [Options?];

/**
 * Stands in for each `${…}` when a template's text is read: it cannot occur
 * in source text, and it is never part of a value `literalCarriesSecret`
 * accepts.
 */
const INTERPOLATION = '\u0001';

/**
 * Does a *standalone string literal* carry a credential?
 *
 * Distinct from `containsSensitiveData`, and deliberately so — they answer
 * different questions. An identifier named `password` is sensitive because of
 * what it holds, so the plain word match is right there. A string literal is
 * sensitive only when it carries a value; merely naming the concept is not a
 * leak. These were all reported on the wild corpus:
 *
 *   throw new Error('Token not found')                  token.service.js:58
 *   throw new Error('Invalid token type')               passport.js:14
 *   throw new Error('Password must contain at least
 *                   one letter and one number')         user.model.js:33
 *
 * The last is a validation message quoting a policy. None contains a
 * credential; each mentions one. Requiring `<word><separator><value>` keeps
 * `'password: hunter2'` reported and lets prose through, while
 * `'password: ' + password` stays caught by the identifier check on the
 * concatenation's right-hand side — which is why that path must keep using
 * the plain word match.
 */
function literalCarriesSecret(text: string, patterns: string[]): boolean {
  const normalized = text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return patterns.some((pattern) => {
    const escaped = pattern
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexPattern = escaped.replace(/[_ ]/g, '[_ ]');
    // Word, then a ':' or '=', then something non-empty.
    //
    // The gap between the word and the separator is at most ONE further short
    // word, which is what a multi-word label looks like ('phone number: ',
    // 'secret key: '). It used to be `[^:=\n]{0,24}` — 24 characters of
    // anything — and that is wide enough to swallow a clause. Shopify CLI
    // bin/github-utils.js:14 is the case:
    //
    //   console.warn(`Soft-error fetching password from dev: ${error.message}…`)
    //
    // "password" … "from dev" … ":" … an interpolation. The rule read that as
    // "label, separator, value" and reported a credential leak on a line that
    // logs an error message. A label sits against its separator; a sentence
    // that happens to contain a colon later does not become one.
    // …and what follows the separator is ONE token, not a clause.
    //
    // Tested against the RAW text, never the normalized copy. The camelCase
    // split that makes `secretKey` match `secret key` also shreds a JWT:
    // `'token=eyJhbGciOiJIUzI1NiJ9'` normalizes to `token=ey jhb gci…`, which
    // has spaces in it and would fail a one-token test that ran on it.
    //
    // Every credential this rule is asserted to catch is a single token:
    // `password: 123456`, `SSN: 123-45-6789`, `token=eyJhbGciOiJIUzI1NiJ9`,
    // `secret key: sk_live_9f2a`. Every false positive found on this corpus is
    // a sentence:
    //
    //   console.log('Reset your password: follow the link we emailed you')
    //   throw new Error('api_key: required in production')
    //   throw new Error('encryption_key: must be at least 32 bytes')
    //
    // The label-and-separator test cannot separate those - both sides look
    // identical to it. The number of words after the separator can, and it is
    // a property of the string itself rather than of anything around it.
    //
    // The cost is a multi-pair line (`password=x user=y`), where the value is
    // no longer last. That shape has not appeared in any corpus fixture; the
    // sentences have appeared in three.
    //
    // The value sits on the label's LINE (`[ \t]*`, not `\s*`). The MCP
    // TypeScript SDK's quickstart prints "set your API key:" and, on the next
    // line, `export ANTHROPIC_API_KEY=your-api-key-here` — a label at the end
    // of one sentence and a placeholder at the end of the next, which the old
    // `\s*` joined into "label, separator, value".
    //
    // And the value is TEXT. In a template the holes are joined in as
    // INTERPOLATION, and a value that is or contains one is a runtime value
    // this test cannot read — `Token: ${url}api/auth/mcp/token` is an endpoint,
    // `resumption token: ${eventId}` an event id. Whether a runtime value is a
    // secret is the value path's question (`namedValueExposure`), answered from
    // its name; the label in front of it is prose.
    return (
      new RegExp(
        `\\b${flexPattern}\\b[ _-]{0,2}(?:[a-z0-9]{1,12}[ _-]{0,2})?[:=][ \\t]*[^\\s${INTERPOLATION}]`,
        'i',
      ).test(normalized) &&
      new RegExp(`[:=]\\s*[^\\s${INTERPOLATION}]+\\s*$`).test(text)
    );
  });
}

/**
 * The trailing segment of these names describes the concept rather than
 * holding it. `apiKeyMsg` is a sentence about an API key; `passwordError` is
 * an error, not a password.
 *
 *   throw new Error("accountSid must start with AC" + apiKeyMsg)
 *       twilio-node src/base/BaseTwilio.ts:165
 *
 * `apiKeyMsg` holds ". The given SID indicates an API Key which requires …".
 * A credential-ish name is necessary but not sufficient — the same reasoning
 * `no-hardcoded-credentials` applies to values, applied to names.
 *
 * Fourteen English words deciding whether a finding is suppressed, so this is a
 * DEFAULT rather than a fixed surface: a codebase whose descriptor suffix is
 * spelled something else (`passwordCopy`, `tokenBlurb`) adds it through
 * `additionalDescriptorSegments`, and one where `pattern` or `notice` really
 * does hold the credential drops it through `descriptorSegments`. Neither
 * changes that the comparison is against the whole final segment of the name.
 */
const DESCRIPTOR_SEGMENTS = [
  'msg',
  'message',
  'error',
  'err',
  'label',
  'prompt',
  'hint',
  'description',
  'desc',
  'regex',
  'pattern',
  'placeholder',
  'warning',
  'notice',
];

/**
 * Does an IDENTIFIER (or property name) name a secret it actually holds?
 *
 * Only for names — never for prose. A string literal's words are checked by
 * `literalCarriesSecret`, which asks a different question.
 */
function identifierNamesSecret(
  name: string,
  patterns: string[],
  descriptors: ReadonlySet<string>,
): string | null {
  const matched = containsSensitiveData(name, patterns);
  if (!matched) return null;
  const last = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .slice(-1)
    .join('');
  return descriptors.has(last) ? null : matched;
}

/**
 * Does this property access name a secret? `user.password`, `cfg['apiKey']`.
 *
 * The property is what carries the value, so it is checked first. The object
 * is checked too, because `credentials.value` names the secret on the left.
 * Computed access is read only when the key is a string literal — `obj[k]`
 * names nothing, and guessing would report on every dynamic lookup.
 */
function memberCarriesSecret(
  node: TSESTree.MemberExpression,
  patterns: string[],
  descriptors: ReadonlySet<string>,
): string | null {
  const prop = node.property;
  // `node.computed` is the whole distinction. In `user.password` the property
  // Identifier IS the name; in `user[password]` the identically-shaped node is
  // a *variable holding* the name, and reading it would report `obj[password]`
  // for a lookup whose key nobody can see statically.
  // A non-computed property is an Identifier or, in a class, a
  // PrivateIdentifier: `this.#password` holds a password as `this.password` does.
  const propName = node.computed
    ? staticString(prop)
    : (prop as TSESTree.Identifier | TSESTree.PrivateIdentifier).name;
  const fromProp = propName
    ? identifierNamesSecret(propName, patterns, descriptors)
    : null;
  if (fromProp) return fromProp;
  // The object-name fallback must not fire through a property that cannot
  // carry the value. `token.length` is a number and `buffer.byteLength` is a
  // number; neither can be replayed, and `logger.debug('token length',
  // token.length)` was reported as a credential leak because the fallback read
  // the receiver's name and ignored what was actually taken from it.
  //
  // These are language semantics, not vocabulary: `.length` on a string, an
  // array or a TypedArray is its size, in every codebase.
  //
  // A diagnostic accessor blocks it for the same reason: `tokenResponse.status`
  // is an HTTP status code, and reporting it read the RECEIVER's name and
  // ignored what was actually taken from it — the identical mistake, one
  // property set over.
  if (
    propName &&
    (VALUE_FREE_PROPERTIES.has(propName) || DIAGNOSTIC_ACCESSORS.has(propName))
  )
    return null;
  return node.object.type === AST_NODE_TYPES.Identifier
    ? identifierNamesSecret(node.object.name, patterns, descriptors)
    : null;
}

/**
 * Properties whose value is a measurement of the receiver rather than the
 * receiver's contents. Exact membership against a fixed language surface.
 *
 * @protocol-constant These four are ECMAScript's own size accessors —
 * `String`/`Array`/`TypedArray.prototype.length`, `Map`/`Set.prototype.size`,
 * and `byteLength` / `byteOffset` on `ArrayBuffer` and the typed-array views.
 * The language, not the codebase, guarantees that each yields a number that
 * cannot be replayed as the credential its receiver holds, so this is a
 * statement about the platform rather than a vocabulary. Making it editable
 * would let a consumer delete `length` and re-assert the false positive it was
 * added for — `logger.debug('token length', token.length)` reported as a
 * credential leak — or add a property that really does carry the secret
 * (`.value`, `.raw`) and silence every genuine finding reached through it.
 */
const VALUE_FREE_PROPERTIES = new Set([
  'length',
  'size',
  'byteLength',
  'byteOffset',
]);

/**
 * Properties that describe how an operation ENDED rather than what it carried.
 *
 * @protocol-constant Every entry is defined by a platform, not by a codebase:
 * `message`, `stack` and `name` are `Error.prototype`'s own (ECMAScript),
 * `status` / `statusText` are the HTTP response code and reason phrase
 * (WHATWG Fetch, and `XMLHttpRequest` before it), and `type`, `algorithm`,
 * `extractable` and `usages` are `CryptoKey`'s attributes (Web Crypto). What they have in common is
 * that the platform decides their contents, so none of them can be the
 * credential the surrounding prose is talking about.
 *
 * Deliberately NOT here: `code`. Node stamps `err.code = 'ENOENT'`, but an
 * authorization code, a 2FA code and a recovery code are all called `code` too,
 * and the rule cannot tell them apart — so `code` keeps reporting.
 */
const DIAGNOSTIC_ACCESSORS = new Set([
  'message',
  'stack',
  'name',
  'status',
  'statusText',
  // `CryptoKey`'s own public attributes (W3C Web Crypto, section 13): the kind
  // of key (`'public' | 'private' | 'secret'`), its algorithm, whether it can
  // be exported and what it may be used for. `${privateKey.type}` prints the
  // word `private`, never the key (honojs/hono src/utils/jws.ts:110).
  'type',
  'algorithm',
  'extractable',
  'usages',
]);

/**
 * @vocabulary ECMAScript built-in Error constructors.
 *
 * @protocol-constant The complete set ECMA-262 defines (§20.5). A codebase's own
 * error subclass is a different question, and not one a word list answers.
 */
const ERROR_CONSTRUCTORS: ReadonlySet<string> = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'ReferenceError',
  'EvalError',
  'URIError',
  'AggregateError',
]);

function containsSensitiveData(
  text: string,
  patterns: string[],
): string | null {
  // Normalize camelCase → space separated for matching (secretKey → secret key)
  const normalized = text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();

  for (const pattern of patterns) {
    const escaped = pattern
      .toLowerCase()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Allow spaces or underscores as word separators (e.g. 'credit card' matches 'credit_card')
    const flexPattern = escaped.replace(/[_ ]/g, '[_ ]');
    if (new RegExp(`\\b${flexPattern}\\b`, 'i').test(normalized)) {
      return pattern;
    }
  }
  return null;
}

/**
 * There used to be three advisory suggestions here — `redactData`,
 * `useMasking`, `removeFromLogs` — each with `fix: () => null`, attached to
 * every report site. ESLint's report translator drops a suggestion whose fix
 * resolves to nothing, so none of them ever reached an editor and their
 * remediation text was never rendered; `hasSuggestions` was advertising a
 * capability the rule did not have. Removed, together with the three
 * messageIds. The remediation advice lives in the `fix:` line of
 * `sensitiveDataExposure`, which IS shown.
 */

export const noSensitiveDataExposure = createRule<RuleOptions, MessageIds>({
  name: 'no-sensitive-data-exposure',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-sensitive-data-exposure.md',
      description:
        'Detects PII/credentials in logs, responses, or error messages',
      cwe: 'CWE-532',
      cvss: 5.3,
    },
    messages: {
      sensitiveDataExposure: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Sensitive data exposure',
        cwe: 'CWE-532',
        description: 'Sensitive data detected in {{context}}: {{dataType}}',
        severity: 'HIGH',
        fix: 'Redact or mask sensitive data before logging/exposing',
        documentationLink: 'https://cwe.mitre.org/data/definitions/532.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          sensitivePatterns: {
            type: 'array',
            items: { type: 'string' },
            default: [
              'password',
              'passwd',
              'secret',
              'token',
              'access_token',
              'auth_token',
              'ssn',
              'credit_card',
              'creditcard',
              'api_key',
              'apikey',
              'secret_key',
              'private_key',
              'encryption_key',
            ],
            description: 'Sensitive data patterns',
          },
          checkConsoleLog: {
            type: 'boolean',
            default: true,
            description: 'Check console.log statements',
          },
          checkErrorMessages: {
            type: 'boolean',
            default: true,
            description: 'Check error messages',
          },
          descriptorSegments: {
            type: 'array',
            items: { type: 'string' },
            default: DESCRIPTOR_SEGMENTS,
            description:
              'Trailing name segments that describe a secret rather than hold one, so `apiKeyMsg` and `passwordError` are not reported. Compared as the whole FINAL segment of the name, never as a substring. Replaces the built-in list.',
          },
          additionalDescriptorSegments: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Extra descriptor segments, on top of `descriptorSegments`.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      sensitivePatterns: [
        'password',
        'passwd',
        'secret',
        'token',
        'access_token',
        'auth_token',
        'ssn',
        'credit_card',
        'creditcard',
        'api_key',
        'apikey',
        'secret_key',
        'private_key',
        'encryption_key',
      ],
      checkConsoleLog: true,
      checkErrorMessages: true,
      descriptorSegments: DESCRIPTOR_SEGMENTS,
      additionalDescriptorSegments: [],
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let sensitivePatterns: string[];
    let checkConsoleLog: boolean;
    let checkErrorMessages: boolean;
    let descriptorSegments: string[];
    let additionalDescriptorSegments: string[];
    let descriptors: ReadonlySet<string>;
    let LOGGER_RECEIVERS: Set<string>;
    let LOG_METHODS: Set<string>;

    /**
     * Is this receiver a logger? `console`, `logger`, `log` - written bare, or
     * reached through one property hop (`this.logger`, `req.log`,
     * `container.logger`). The hop is a property NAME matched exactly, not a
     * search through the printed receiver text.
     */
    function isLoggerReceiver(node: TSESTree.Node): boolean {
      if (node.type === AST_NODE_TYPES.Identifier) {
        return LOGGER_RECEIVERS.has(node.name.toLowerCase());
      }
      // One expression rather than an early return: the old `&&` chain tested
      // the member-ness inline, and splitting it out added a branch nothing
      // reaches, since every caller passes an Identifier or a MemberExpression.
      const name =
        node.type === AST_NODE_TYPES.MemberExpression
          ? propertyName(node)
          : null;
      return name !== null && LOGGER_RECEIVERS.has(name.toLowerCase());
    }

    /**
     * Does this argument carry a secret into the sink? Returns the node to
     * report and the pattern that matched, or null.
     *
     * One helper for both sinks. The two paths had drifted: the logging path
     * grew Member and Template arms that the `new Error(...)` path never got,
     * so ``throw new Error(`token: ${accessToken}`)`` was silent while
     * ``logger.error(`token: ${accessToken}`)`` reported. Same leak, same
     * evidence, two different answers.
     */
    function describeExposure(
      argument: TSESTree.Node,
    ): { node: TSESTree.Node; pattern: string } | null {
      // `payload.apiKey as string` reads exactly what `payload.apiKey` reads.
      // The cast is erased at compile time; leaving it unwrapped meant the rule
      // never fired on the dialect TypeScript users are forced to write.
      const arg = unwrapTypeSyntax(argument) as TSESTree.Node;

      const staticText1 = staticString(arg);
      if (staticText1 !== null) {
        const pattern = literalCarriesSecret(staticText1, sensitivePatterns)
          ? containsSensitiveData(staticText1, sensitivePatterns)
          : null;
        return pattern ? { node: arg, pattern } : null;
      }

      if (
        arg.type === AST_NODE_TYPES.BinaryExpression &&
        arg.operator === '+'
      ) {
        // Either side can carry the exposure: `'Error: ' + userPassword` by
        // the value's name, `'password: hunter2 ' + suffix` by a literal that
        // writes the credential out. A literal that only LABELS the other side
        // — `'password: ' + value` — is prose: the label says what the author
        // thinks follows, and the value is judged by its own name.
        //
        // Recursion handles `'a: ' + b + '/' + c.d`, which parses as a
        // left-leaning tree of BinaryExpressions rather than one flat argument.
        return describeExposure(arg.left) ?? describeExposure(arg.right);
      }

      if (arg.type === AST_NODE_TYPES.TemplateLiteral) {
        // ``logger.debug(`token=${t}`)`` - an interpolation is exactly the
        // evidence the static-string guard looks for: unlike a constant, a
        // template splices a runtime value into the record.
        // Each hole goes through the same analysis as an argument, so
        // `${String(password)}` and `${isProd ? '***' : password}` read what
        // `String(password)` and the conditional read on their own.
        const fromExpression = arg.expressions
          .map((e) => describeExposure(e))
          .find((m): m is { node: TSESTree.Node; pattern: string } =>
            Boolean(m),
          );
        if (fromExpression)
          return { node: arg, pattern: fromExpression.pattern };

        // The quasis are joined with a placeholder standing in for each
        // interpolation, rather than tested one by one, so a value written out
        // after the label (`${user} logged in with password: hunter2`) is read
        // in the text it sits in. A label whose value IS a hole —
        // `token: ${t}`, `Token: ${url}/token` — is not evidence here: the
        // hole was already judged by its name above, and `literalCarriesSecret`
        // never accepts an INTERPOLATION as a value.
        const joined = arg.quasis
          .map((q) => q.value.cooked)
          .join(INTERPOLATION);
        const fromText = literalCarriesSecret(joined, sensitivePatterns)
          ? containsSensitiveData(joined, sensitivePatterns)
          : null;
        return fromText ? { node: arg, pattern: fromText } : null;
      }

      if (arg.type === AST_NODE_TYPES.ObjectExpression) {
        // Structured logging - how every modern Node service logs.
        // `logger.error('rejected', { deliveryId, apiKey })` puts the
        // credential in a shorthand property, and the argument loop had no
        // ObjectExpression arm at all, so the whole idiom was invisible.
        //
        // The KEY names the field and the VALUE decides whether anything
        // runtime is being written. `{ passwordPolicy: 'strong' }` names a
        // credential and carries a constant, so it is not an exposure - a
        // hardcoded secret is no-hardcoded-credentials' finding, not this
        // rule's. `isStaticExpression` draws that line, rather than a second
        // guess at the name.
        for (const property of arg.properties) {
          if (property.type !== AST_NODE_TYPES.Property || property.computed)
            continue;
          const keyName =
            property.key.type === AST_NODE_TYPES.Identifier
              ? property.key.name
              : property.key.type === AST_NODE_TYPES.Literal &&
                  typeof property.key.value === 'string'
                ? property.key.value
                : null;
          const pattern = keyName
            ? identifierNamesSecret(keyName, sensitivePatterns, descriptors)
            : null;
          if (!pattern) continue;
          if (
            isStaticExpression({
              node: property.value,
              scope: context.sourceCode.getScope(arg),
            })
          ) {
            continue;
          }
          return { node: property, pattern };
        }
        return null;
      }

      if (arg.type === AST_NODE_TYPES.ConditionalExpression) {
        // `isProduction ? '[redacted]' : user.password`. The branch that leaks
        // is reachable, and in every non-production environment it is the
        // branch that runs.
        return (
          describeExposure(arg.consequent) ?? describeExposure(arg.alternate)
        );
      }

      if (
        arg.type === AST_NODE_TYPES.CallExpression &&
        arg.callee.type === AST_NODE_TYPES.Identifier &&
        arg.callee.name === 'String' &&
        arg.arguments.length === 1 &&
        arg.arguments[0].type !== AST_NODE_TYPES.SpreadElement &&
        !isShadowed('String', arg)
      ) {
        // `String(account.password)` is an identity transform on a string, and
        // it is what TypeScript users write when the declared type is wider
        // than `string`. Exact membership on the global, and only when nothing
        // in scope has redeclared it.
        return describeExposure(arg.arguments[0]);
      }

      return namedValueExposure(arg);
    }

    /** Does anything in scope declare this name, rather than it being the global? */
    function isShadowed(name: string, node: TSESTree.Node): boolean {
      const scope = context.sourceCode.getScope(node);
      for (
        let current: typeof scope | null = scope;
        current;
        current = current.upper
      ) {
        const variable = current.variables.find((v) => v.name === name);
        if (variable) return variable.defs.length > 0;
      }
      return false;
    }

    /**
     * An identifier or property access whose NAME says it holds a secret,
     * following one binding hop.
     *
     * `const submitted = account.password; logger.warn('failed', submitted)` was
     * silent: `submitted` names nothing, and the rule never looked at what it
     * holds. Aliasing a value to a role-shaped name is what destructuring a
     * payload looks like, so this was not an exotic shape - it was the common
     * one.
     */
    function namedValueExposure(
      node: TSESTree.Node,
      seen: Set<TSESTree.Node> = new Set(),
    ): { node: TSESTree.Node; pattern: string } | null {
      const value = unwrapTypeSyntax(node) as TSESTree.Node;
      if (seen.has(value)) return null;
      seen.add(value);

      // `session?.accessToken` reads exactly what `session.accessToken` reads.
      // The optional-chaining wrapper is the only difference, and a
      // `type === 'MemberExpression'` test does not match it.
      if (value.type === AST_NODE_TYPES.ChainExpression) {
        return namedValueExposure(value.expression, seen);
      }
      if (value.type === AST_NODE_TYPES.Identifier) {
        const pattern = identifierNamesSecret(
          value.name,
          sensitivePatterns,
          descriptors,
        );
        if (pattern) return { node: value, pattern };
        const init = resolveBindingInit(value);
        const viaBinding = init ? namedValueExposure(init, seen) : null;
        // Report at the identifier the author wrote, with the pattern the
        // initializer proved.
        return viaBinding ? { node: value, pattern: viaBinding.pattern } : null;
      }
      if (value.type === AST_NODE_TYPES.MemberExpression) {
        const pattern = memberCarriesSecret(
          value,
          sensitivePatterns,
          descriptors,
        );
        if (pattern) return { node: value, pattern };
        // `const error = { message: accessToken }; log(`${error.message}`)` —
        // when the receiver is an object literal in this file, the property's
        // VALUE is visible, so it is read rather than judged by the key.
        const assigned = localPropertyValue(value);
        const viaLiteral = assigned ? namedValueExposure(assigned, seen) : null;
        return viaLiteral ? { node: value, pattern: viaLiteral.pattern } : null;
      }
      return null;
    }

    /**
     * The value a local object literal assigns to this property, when the
     * receiver is a once-written binding to one and the key is spelled out.
     */
    function localPropertyValue(
      member: TSESTree.MemberExpression,
    ): TSESTree.Node | null {
      if (member.object.type !== AST_NODE_TYPES.Identifier) return null;
      const key = propertyName(member);
      if (key === null) return null;
      const init = resolveBindingInit(member.object);
      if (init?.type !== AST_NODE_TYPES.ObjectExpression) return null;
      // The object must still hold what the literal put there: every other
      // reference is a plain property read. A property write
      // (`entry.message = '[redacted]'`), a delete, or the object handed to
      // other code may have replaced the value, and the initializer then
      // proves nothing.
      // `resolveBindingInit` found an initializer, so the binding exists.
      if (
        !onlyReadsProperties(
          findBinding(member.object) as TSESLint.Scope.Variable,
        )
      )
        return null;
      // The LAST definition of the key is the one the object holds. A spread
      // or a computed key met first, reading from the end, may overwrite it.
      for (const property of [...init.properties].reverse()) {
        if (property.type !== AST_NODE_TYPES.Property || property.computed)
          return null;
        if (objectKeyName(property) === key) return property.value;
      }
      return null;
    }

    /** Is every use of this binding, besides its declaration, `obj.key` read? */
    function onlyReadsProperties(variable: TSESLint.Scope.Variable): boolean {
      return variable.references.every((reference) => {
        if (reference.init) return true;
        const parent = reference.identifier.parent as TSESTree.Node;
        if (
          parent.type !== AST_NODE_TYPES.MemberExpression ||
          parent.object !== reference.identifier
        )
          return false;
        const use = parent.parent as TSESTree.Node;
        const written =
          (use.type === AST_NODE_TYPES.AssignmentExpression &&
            use.left === parent) ||
          use.type === AST_NODE_TYPES.UpdateExpression ||
          (use.type === AST_NODE_TYPES.UnaryExpression &&
            use.operator === 'delete');
        return !written;
      });
    }

    /** The variable this identifier resolves to, walking up the scopes. */
    function findBinding(
      node: TSESTree.Identifier,
    ): TSESLint.Scope.Variable | null {
      const scope = context.sourceCode.getScope(node);
      for (
        let current: typeof scope | null = scope;
        current;
        current = current.upper
      ) {
        const variable = current.variables.find((v) => v.name === node.name);
        if (variable) return variable;
      }
      return null;
    }

    /**
     * The initializer of the variable this identifier resolves to, when the
     * binding is written exactly once. A binding written twice holds neither
     * value with certainty, and reading the declaration would be reading code
     * the author did not run.
     */
    function resolveBindingInit(
      node: TSESTree.Identifier,
    ): TSESTree.Expression | null {
      const variable = findBinding(node);
      if (!variable || variable.defs.length !== 1) return null;
      const [def] = variable.defs;
      if (def.type !== 'Variable' || !def.node.init) return null;
      return variable.references.filter((r) => r.isWrite()).length === 1
        ? def.node.init
        : null;
    }

    /** Report the first argument that carries a secret; at most one per call. */
    function reportFirstExposure(
      argumentList: readonly TSESTree.Node[],
      exposureContext: 'logs' | 'error messages',
    ): void {
      for (const argument of argumentList) {
        const exposure = describeExposure(argument);
        if (exposure) {
          context.report({
            node: exposure.node,
            messageId: 'sensitiveDataExposure',
            data: { context: exposureContext, dataType: exposure.pattern },
          });
          return;
        }
      }
    }

    /**
     * Check CallExpression for logging calls with sensitive data
     */
    function checkCallExpression(node: TSESTree.CallExpression) {
      const isLoggingCall = (() => {
        if (node.callee.type === AST_NODE_TYPES.MemberExpression) {
          // `console['log'](secret)` reaches the same sink as
          // `console.log(secret)`. `propertyName` resolves the dotted form and
          // a static subscript alike, and still returns null for a genuinely
          // dynamic `console[m]`, which is not a log call we can name.
          const method = propertyName(node.callee);
          return (
            method !== null &&
            LOG_METHODS.has(method.toLowerCase()) &&
            isLoggerReceiver(node.callee.object)
          );
        }
        if (node.callee.type === AST_NODE_TYPES.Identifier) {
          // `log(...)`, `customLogger(...)`, `logDebug(...)` - a bare function
          // whose NAME says it logs.
          //
          // Word boundaries, not substrings. `'completeLogin'.includes('log')`
          // is true, so Shopify CLI's `completeLogin(page, url, email,
          // password)` was read as a logging call and its `password` argument
          // reported - 7 of this rule's 12 wild-corpus findings, on a function
          // that submits a login form and logs nothing.
          const words = node.callee.name
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .toLowerCase()
            .split(/[^a-z0-9]+/);
          return words.includes('log') || words.includes('logger');
        }
        return false;
      })();

      if (isLoggingCall && checkConsoleLog) {
        reportFirstExposure(node.arguments, 'logs');
      }
    }

    /**
     * Check NewExpression for Error with sensitive data
     */
    function checkNewExpression(node: TSESTree.NewExpression) {
      if (!checkErrorMessages) {
        return;
      }
      // Every built-in Error constructor carries its message the same way.
      if (
        node.callee.type === AST_NODE_TYPES.Identifier &&
        ERROR_CONSTRUCTORS.has(node.callee.name)
      ) {
        reportFirstExposure(node.arguments, 'error messages');
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        ({
          sensitivePatterns = [
            'password',
            'passwd',
            'secret',
            'token',
            'access_token',
            'auth_token',
            'ssn',
            'credit_card',
            'creditcard',
            'api_key',
            'apikey',
            'secret_key',
            'private_key',
            'encryption_key',
          ],
          checkConsoleLog = true,
          checkErrorMessages = true,
          descriptorSegments = DESCRIPTOR_SEGMENTS,
          additionalDescriptorSegments = [],
        } = options || {});

        descriptors = new Set([
          ...descriptorSegments,
          ...additionalDescriptorSegments,
        ]);

        /**
         * Receivers whose log methods write to a log stream. Exact membership on a
         * closed set, never a substring: `login`, `logout`, `dialog`, `catalog` and
         * `blog` all contain "log" and none of them is a logger.
         *
         * `log` earns its place next to `console` and `logger` because
         * `const log = rootLogger.child({ requestId })` is how pino is used in
         * every Node service, and `req.log.info(...)` is what pino-http installs.
         * Those calls were silent: the receiver check required a bare Identifier
         * named exactly `console` or `logger`, so a class-held `this.logger` and a
         * request-bound `log` both walked through with their credentials.
         */
        LOGGER_RECEIVERS = new Set(['console', 'logger', 'log']);

        /** Methods that write a record. Exact membership, closed set. */
        LOG_METHODS = new Set([
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
      },
      CallExpression: checkCallExpression,
      NewExpression: checkNewExpression,
    };
  },
});
