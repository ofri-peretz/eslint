/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-math-random-crypto
 * Detects Math.random() used in cryptographic contexts
 * CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator
 *
 * Math.random() is not cryptographically secure and should never be used
 * for tokens, keys, IVs, salts, or any security-sensitive random values.
 *
 * @see https://cwe.mitre.org/data/definitions/338.html
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { identifierWords, makeNameTest } from '../../utils/names';
import { findVariable } from '../../utils/provenance';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
  AST_NODE_TYPES,
  isTestFilePath,
  memberPropertyName,
  propertyName,
  resolveModuleBinding,
  objectKeyName,
  staticString,
} from '@interlace/eslint-devkit';

type MessageIds = 'mathRandomCrypto' | 'pseudoRandomBytes';

/**
 * The APIs a developer reaches for when they want real randomness.
 *
 * Names of platform functions, not a vocabulary of guesses — `getRandomValues`
 * means one thing in every JavaScript runtime that has it.
 *
 * @protocol-constant
 */
const CSPRNG_CALLS = new Set([
  'getRandomValues',
  'randomBytes',
  'randomUUID',
  'randomFillSync',
  'randomFill',
  'generateKey',
  'subtle',
]);

export interface Options {
  /** Allow Math.random() in test files. Default: true */
  allowInTests?: boolean;

  /**
   * Words that name a security value in THIS codebase. Replaces the default
   * list; matched as whole words against the identifier.
   *
   * The rule decides by name — it says so below — and the space of names a
   * project might use is endless. Shipping a fixed vocabulary means guessing at
   * somebody else's conventions and being wrong in both directions: a house
   * that writes `nonce` for its CSRF value is missed, and one that writes
   * `keyboardHandler` is flagged. The default is what the corpus measured; the
   * list belongs to whoever runs the rule.
   */
  secretWords?: readonly string[];

  /**
   * Words that mark a trailing `id` as a correlation id rather than a
   * credential — `requestId`, `traceId`. Replaces the default list.
   */
  correlationIdWords?: readonly string[];
}

type RuleOptions = [Options?];

/**
 * Words that name a security value. Matched as whole words — see
 * {@link makeNameTest}.
 *
 * `random` is NOT here, and that omission is the measured fix. On the 8-repo
 * corpus `/random/i` alone produced four of six findings — `const random =
 * Math.floor(Math.random() * totalWeight)` picking a DNS SRV record by weight
 * (`redis/ioredis` `lib/cluster/util.ts:139`), `takeRandomFromArray`,
 * `getRandomDelay`, `generate_random_char` building a DOM id. Naming a variable
 * after the function that produced it says nothing about what it is FOR, which
 * is the only question CWE-338 asks.
 */
const CRYPTO_WORDS: readonly string[] = [
  'token',
  'tokens',
  'key',
  'keys',
  'secret',
  'secrets',
  'password',
  'passwd',
  'salt',
  'iv',
  'nonce',
  'seed',
  'hash',
  'cipher',
  'auth',
  'session',
  'csrf',
  'otp',
  'pin',
  'code',
  'codes',
  'verify',
  'signature',
  'credential',
  'jwt',
  'encryption',
  'apikey',
  // The same three gaps the adversarial wave found in no-weak-hash-algorithm,
  // present here too — the two rules keep separate lists, so a spelling missing
  // from one is not missing from the other by construction. `Math.random()` for
  // any of these is CWE-338.
  //
  // `pwd` is deliberately absent: in Node it is also the working directory,
  // and it made `pwdDirectory` and `pwdPath` report. `passphrase` and
  // `mnemonic` are long enough to match inside a compound, which is the same
  // behaviour the list's existing entries already have — the unmodified rule
  // reports `passwordHint` and `sessionLabel` too.
  'passphrase',
  'mnemonic',
];

// No module-level `CRYPTO_WORD_SET` or `baseNameSuggestsCrypto`. They were the
// hardcoded reads: a name test bound to a fixed vocabulary at module load, with
// no way for a consumer to replace it. The vocabulary is now built per file
// from the options and passed down as `Vocabulary`.

/**
 * The name vocabulary this run is using — the defaults, or whatever the
 * consumer supplied. Built once in `create` and passed down, so the module
 * never reads a hardcoded list at match time.
 */
type Vocabulary = {
  words: ReadonlySet<string>;
  correlationWords: ReadonlySet<string>;
  suggestsCrypto: (name: string) => boolean;
};

/**
 * Words that make the value a DURATION.
 *
 * A number of milliseconds cannot be a credential, whatever service it belongs
 * to. `const authRetryDelay = BASE_MS * 2 ** attempt + Math.random() * BASE_MS`
 * is retry jitter against the auth service — the same fixture as plain backoff
 * with the service named in the variable — and it reported purely because
 * `auth` is a word in it. Matched as the LAST word only: `delayToken` is a
 * token, `tokenDelay` is a delay.
 */
const DURATION_TAILS: ReadonlySet<string> = new Set([
  'delay',
  'timeout',
  'interval',
  'jitter',
  'backoff',
  'ms',
  'millis',
  'milliseconds',
  'seconds',
  'duration',
  'wait',
  'sleep',
  'ttl',
  'deadline',
  'elapsed',
  'latency',
  'budget',
]);

/**
 * Words that make the value a QUANTITY — the same argument as
 * {@link DURATION_TAILS}, one dimension over.
 *
 * `const tokenCount = Math.floor(200 + Math.random() * 1800)` in an LLM cost
 * simulator carries the strongest word in the vocabulary and is a number of
 * tokens, not a token. Nothing in CRYPTO_WORDS names a credential that is also
 * a count, so this subtracts no true positive.
 */
const QUANTITY_TAILS: ReadonlySet<string> = new Set([
  'count',
  'counts',
  'length',
  'size',
  'total',
  'limit',
  'quota',
  'offset',
  'index',
  'rank',
  'score',
  'percent',
  'ratio',
  'rate',
  'version',
  'page',
]);

/**
 * Crypto vocabulary that is ALSO ordinary English, keyed to the qualifiers that
 * settle which sense is meant.
 *
 * `code` earns its place in CRYPTO_WORDS because of "verification code", but
 * unqualified it is the commonest non-security noun in a Node codebase: an
 * HTTP status, an exit code, a country code. `key` is the same story — this
 * corpus caught `const cacheKey = \`_=${Math.floor(Math.random() * 1e9)}\``,
 * a CDN cache-buster.
 *
 * Both halves are EXACT word membership after {@link identifierWords}, never a
 * substring: `httpCode` splits to `['http','code']` and `http` is listed, so
 * the `code` match is a collision. `verifyCode` splits to `['verify','code']`,
 * `verify` is not listed, and the finding stands — as it also would on
 * `verify` alone, which is a strong word.
 */
const NON_SECURITY_QUALIFIERS: ReadonlyMap<
  string,
  ReadonlySet<string>
> = new Map([
  [
    'code',
    new Set([
      'http',
      'status',
      'error',
      'err',
      'exit',
      'country',
      'zip',
      'postal',
      'area',
      'language',
      'lang',
      'locale',
      'currency',
      'promo',
      'coupon',
      'discount',
      'color',
      'colour',
      'qr',
      'bar',
      'region',
      'iso',
      'mime',
      'media',
      'sort',
      'source',
      'char',
      'unicode',
      'ascii',
      'airport',
    ]),
  ],
  [
    'key',
    new Set([
      'cache',
      'map',
      'object',
      'row',
      'index',
      'partition',
      'primary',
      'foreign',
      'sort',
      'storage',
      'translation',
      'locale',
      'i18n',
      'react',
      'idempotency',
      'shortcut',
      'keyboard',
      'press',
      'modifier',
      // The identity a UI framework wants on a repeated element. A random one
      // is the idiomatic (if poor) way to get it, and nothing authenticates
      // against it.
      'dom',
      'element',
      'node',
      'item',
      'list',
      'child',
      'component',
      'render',
      'data',
      'color',
      'colour',
    ]),
  ],
]);

/** Does this name suggest the value is a security value? */

/**
 * Does this name suggest the value is a security value, after the two
 * collision classes the corpus proved?
 *
 * The base test is still the word list — this rule decides by name by design,
 * and the header comment above records why the list is what it is. What is
 * added here is subtraction only: a name that the list matched can be ruled
 * OUT by exact word membership, never ruled in.
 */
function nameSuggestsCrypto(name: string, vocab: Vocabulary): boolean {
  if (!vocab.suggestsCrypto(name)) return false;

  // Non-empty by construction: the base test cannot match a name with no words.
  const words = identifierWords(name);
  const tail = words[words.length - 1] as string;
  if (DURATION_TAILS.has(tail) || QUANTITY_TAILS.has(tail)) return false;

  const matched = words.filter((word) => vocab.words.has(word));
  // No whole-word hit means the base test matched through its long-substring
  // path (`apikey`, `password`, `session`) — those spellings are unambiguous.
  if (matched.length === 0) return true;

  return !matched.every((word) => {
    const qualifiers = NON_SECURITY_QUALIFIERS.get(word);
    return (
      qualifiers !== undefined && words.some((other) => qualifiers.has(other))
    );
  });
}

/** The global objects `Math` hangs off, in every runtime this lints. */
const GLOBAL_OBJECTS: ReadonlySet<string> = new Set([
  'globalThis',
  'global',
  'window',
  'self',
]);

/**
 * `Math`, or `globalThis.Math` / `window['Math']` — the same object reached
 * through the global it lives on.
 */
function isMathObject(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.Identifier) return node.name === 'Math';
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    node.object.type === AST_NODE_TYPES.Identifier &&
    GLOBAL_OBJECTS.has(node.object.name) &&
    propertyName(node) === 'Math'
  );
}

/**
 * Is this expression a read of `Math.random` itself?
 *
 * Both spellings. `Math['random']()` is what a property-mangling build step or
 * a `no-restricted-properties` workaround leaves behind, and it produces the
 * identical value from the identical PRNG — only the callee's property node
 * type changes, from Identifier to Literal.
 */
function isMathRandomProperty(node: TSESTree.Node): boolean {
  // `propertyName` reads every static spelling — `Math.random`,
  // `Math['random']` and `Math[\`random\`]` are one property.
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    isMathObject(node.object) &&
    propertyName(node) === 'random'
  );
}

// Function names that suggest cryptographic usage
/**
 * Words that make an `id` a CORRELATION id rather than a credential.
 *
 * `/generate.*id/i` is the loosest pattern in the list, and it matches the
 * single most common identifier factory in Node: arangojs `src/lib/util.ts:77`
 * defines
 *
 *   export function generateRequestId() {
 *     return `${Date.now() % THIRTY_MINUTES}_${Math.random().toString(36).substring(2, 15)}`;
 *   }
 *
 * documented `@internal Generate a unique request ID`. That is the value the
 * driver puts in a log line to match a response to a request; predicting it
 * grants nothing. It was the ONLY finding in the whole repository, reported at
 * CWE-338 CRITICAL.
 *
 * Subtraction only, exact word membership, same shape as
 * {@link NON_SECURITY_QUALIFIERS}: a name the pattern matched can be ruled
 * out, never ruled in. `generateSessionId` and `generateUserId` keep
 * reporting — a session id IS the credential — because neither `session` nor
 * `user` appears here.
 */
const NON_SECURITY_ID_QUALIFIERS: ReadonlySet<string> = new Set([
  'request',
  'req',
  'correlation',
  'trace',
  'span',
  'transaction',
  'txn',
  'message',
  'msg',
  'event',
  'job',
  'run',
  'task',
  'batch',
  'element',
  'node',
  'row',
  'record',
  'instance',
  'component',
  'widget',
  'dom',
  'operation',
  'call',
  'invocation',
  'frame',
  'render',
]);

/**
 * Did the function name match only through the `id` pattern, on an id the
 * qualifier list says is for correlation?
 */
function isCorrelationIdFactory(name: string, vocab: Vocabulary): boolean {
  const words = identifierWords(name);
  if (words[words.length - 1] !== 'id') return false;
  // A crypto word anywhere in the name outranks the correlation word.
  // `generateRequestTokenId` contains `request`, but it also contains `token`
  // and matches `/generate.*token/i` on its own — subtracting it would have
  // suppressed a match this list was never asked to judge. The subtraction is
  // only for names whose ONLY claim to being crypto is the trailing `id`.
  if (words.some((word) => vocab.words.has(word))) return false;
  return words.some((word) => vocab.correlationWords.has(word));
}

/**
 * Calls that take `(name, value)` and store the value under the name.
 *
 * The NAME is a string literal in the call, so the security meaning lives
 * there rather than in any identifier: `headers.set('X-SRF-TOKEN', draw)`.
 * `cookie`/`setCookie` and `setItem` are the same slot for a cookie jar and a
 * storage area.
 */
const NAME_VALUE_SETTERS: ReadonlySet<string> = new Set([
  'set',
  'append',
  'setHeader',
  'header',
  'cookie',
  'setCookie',
  'setItem',
]);

/** Receiver names that make a literal `'state'` an OAuth query parameter. */
const QUERY_RECEIVER = /param|query|search/i;

/**
 * Keys that, together with `state`, make an object literal an OAuth/OIDC
 * authorization request. Compared lower-cased with `_` and `-` removed, so
 * `redirect_uri` and `redirectUri` are one entry.
 */
const OAUTH_REQUEST_KEYS: ReadonlySet<string> = new Set([
  'clientid',
  'redirecturi',
  'responsetype',
  'codechallenge',
  'scope',
]);

const normalizeKey = (key: string): string =>
  key.toLowerCase().replaceAll(/[_-]/g, '');

/** Calls a value passes through unchanged for the purpose of where it ends up. */
const TRANSPARENT_WRAPPERS: ReadonlySet<string> = new Set([
  'encodeURIComponent',
  'encodeURI',
  'String',
]);

/**
 * Operators a draw passes through on its way to being an index or a delay.
 * Arithmetic keeps it a number; `in` and `instanceof` do not.
 */
const NUMERIC_OPERATORS: ReadonlySet<string> = new Set([
  '+',
  '-',
  '*',
  '/',
  '%',
  '**',
  '|',
  '&',
  '^',
  '<<',
  '>>',
  '>>>',
]);

/** A comparison consumes the number and yields a yes or no, never a value. */
const COMPARISON_OPERATORS: ReadonlySet<string> = new Set([
  '<',
  '>',
  '<=',
  '>=',
  '==',
  '===',
  '!=',
  '!==',
]);

/** `Math.*` functions that turn a number into a number. */
const NUMERIC_MATH_FUNCTIONS: ReadonlySet<string> = new Set([
  'floor',
  'ceil',
  'round',
  'trunc',
  'abs',
  'min',
  'max',
]);

/** Timers whose delay is a number of milliseconds. @protocol-constant */
const TIMER_FUNCTIONS: ReadonlySet<string> = new Set([
  'setTimeout',
  'setInterval',
]);

/** Wrappers that change a node's type and nothing about its value. */
const TRANSPARENT_NODE_TYPES: ReadonlySet<string> = new Set([
  AST_NODE_TYPES.TSAsExpression,
  AST_NODE_TYPES.TSNonNullExpression,
  AST_NODE_TYPES.TSSatisfiesExpression,
  AST_NODE_TYPES.AwaitExpression,
  AST_NODE_TYPES.ChainExpression,
]);

/** The name says this function builds a security value. */
function functionNameSuggestsCrypto(name: string, vocab: Vocabulary): boolean {
  if (!CRYPTO_FUNCTION_PATTERNS.some((pattern) => pattern.test(name)))
    return false;
  return !isCorrelationIdFactory(name, vocab);
}

const CRYPTO_FUNCTION_PATTERNS = [
  /generate.*token/i,
  /generate.*key/i,
  /generate.*id/i,
  /create.*secret/i,
  /create.*token/i,
  // A general-purpose random STRING builder is the shape CWE-338 is about:
  // `okta/okta-auth-js` `lib/util/misc.ts:21` defines `genRandomString`, and
  // `lib/oidc/util/oauth.ts:18` calls it for the OAuth `state` and `nonce`.
  // Preserved deliberately — this is a true positive, and narrowing the rule
  // must not reach it.
  /random.*string/i,
  // `get.*random` used to match `getRandomDelay` — a retry jitter, which is
  // exactly the "not a security decision" case. The suffix is what makes the
  // value a credential rather than a coin flip.
  /get.*random.*(string|bytes|token|key|secret|value|id)/i,
  /make.*salt/i,
  /gen.*password/i,
];

export const noMathRandomCrypto = createRule<RuleOptions, MessageIds>({
  name: 'no-math-random-crypto',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-math-random-crypto.md',
      description: 'Disallow Math.random() for cryptographic purposes',
      cwe: 'CWE-338',
      // 7.5 matches the primary emitted finding (pseudoRandomBytes, HIGH) —
      // the CVSS docs/message consistency lock holds these two in lockstep.
      cvss: 7.5,
      confidence: 'medium',
    },
    messages: {
      pseudoRandomBytes: formatLLMMessage({
        icon: MessageIcons.SECURITY,

        issueName: 'Non-cryptographic random bytes',

        cwe: 'CWE-338',

        owasp: 'A02:2021',

        cvss: 7.5,

        description:
          "crypto.pseudoRandomBytes() is not cryptographically secure. The name is the API's own warning: it was deprecated in Node 4 precisely because callers assumed otherwise.",

        severity: 'HIGH',

        compliance: ['SOC2', 'PCI-DSS', 'ISO27001'],

        fix: 'Use crypto.randomBytes(n), or crypto.randomUUID() for identifiers.',

        documentationLink: 'https://cwe.mitre.org/data/definitions/338.html',
      }),
      mathRandomCrypto: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Math.random() used for crypto',
        cwe: 'CWE-338',
        description:
          'Math.random() is not cryptographically secure. It uses a PRNG that can be predicted. Never use it for tokens, keys, passwords, or any security-sensitive values.',
        severity: 'CRITICAL',
        fix: 'Use crypto.randomBytes() or crypto.randomUUID() instead',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html#secure-random-number-generation',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
            description: 'Allow Math.random() in test files. Default: true',
          },
          secretWords: {
            type: 'array',
            items: { type: 'string' },
            // Spread: the schema type wants a mutable array, and CRYPTO_WORDS
            // is `readonly` so that nothing can edit the default in place.
            default: [...CRYPTO_WORDS],
            description:
              'Words that name a security value in this codebase. Replaces the default list.',
          },
          correlationIdWords: {
            type: 'array',
            items: { type: 'string' },
            default: [...NON_SECURITY_ID_QUALIFIERS],
            description:
              'Words that mark a trailing `id` as a correlation id rather than a credential. Replaces the default list.',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      /**
       * A throwaway value in a fixture is not a weak token.
       *
       * `Math.random()` filling a fake `session_state` on a stubbed OIDC user
       * is what a test double looks like — City-of-Helsinki/haitaton-ui's
       * `testUtils/userTestUtil.ts` was the whole of that repository's
       * remaining findings. Reporting it says nothing an author can act on,
       * because the fix — use `crypto.getRandomValues` — makes a fixture no
       * safer and the suite no better.
       *
       * The rule's subject is unpredictability at runtime, and a fixture has
       * no runtime. Set `false` to report everywhere.
       */
      allowInTests: true,

      /**
       * The measured defaults. Stated here rather than only in the destructure,
       * so `context.options[0]` shows a reader the vocabulary in force without
       * them having to find the fallback.
       */
      secretWords: [...CRYPTO_WORDS],
      correlationIdWords: [...NON_SECURITY_ID_QUALIFIERS],
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let vocab: Vocabulary;
    let sourceCode: Readonly<TSESLint.SourceCode>;
    let isTestFile: boolean;
    /**
     * The declarator this identifier is bound to, when the binding has exactly
     * one definition and is never written again after it.
     *
     * "Never written again" rather than `const`: `var secureRandom =
     * Math.random` in a CommonJS file is every bit as determined as the `const`
     * spelling, and the keyword is a style choice rather than evidence. A
     * binding that IS reassigned — `let rand = Math.random; rand = injected;` —
     * is rejected, because its initialiser then proves nothing about the value
     * at the call site.
     */
    function stableDeclarator(
      id: TSESTree.Identifier,
    ): TSESTree.VariableDeclarator | undefined {
      const variable = findVariable(sourceCode, id);
      if (!variable || variable.defs.length !== 1) return undefined;
      const def = variable.defs[0];
      if (def.type !== 'Variable') return undefined;
      const reassigned = variable.references.some(
        (reference) => reference.writeExpr != null && !reference.init,
      );
      return reassigned ? undefined : def.node;
    }

    /**
     * Is this callee `Math.random`, however it was bound?
     *
     * Beyond the two member spellings, the binding is resolved through the
     * scope analyser so the three aliasing shapes are the same sink:
     *
     * ```js
     * const secureRandom = Math.random;   // a local wearing a trusted name
     * const { random } = Math;            // shortening the call site
     * const rng = { next: Math.random };  // the "pluggable RNG" with one impl
     * ```
     */
    /**
     * The call is the fallback arm of a function that reaches for a CSPRNG first.
     *
     * IGNF/cartes.gouv.fr-entree-carto — the French national geoportal, and one
     * of our own adopters — writes this:
     *
     *   if (window.crypto && window.crypto.getRandomValues) {
     *     const bytes = new Uint8Array(16);
     *     window.crypto.getRandomValues(bytes);
     *     return …;
     *   }
     *   return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
     *
     * The author already knows. Reporting the `else` arm of code that does the
     * right thing whenever it can tells them nothing they have not written down,
     * and it is the kind of finding that makes a stranger close a pull request.
     *
     * The trade is stated rather than hidden: a function that draws a key from
     * `crypto` and a token from `Math.random()` goes unreported, because the
     * two are indistinguishable from here without following the values. Between
     * missing that and crying wolf on every documented fallback, the fallback
     * is the far more common shape in real code.
     */
    function isCsprngFallback(node: TSESTree.CallExpression): boolean {
      // The walk always terminates: every node sits under a Program.
      let scope: TSESTree.Node = node.parent;
      while (
        scope.type !== AST_NODE_TYPES.FunctionDeclaration &&
        scope.type !== AST_NODE_TYPES.FunctionExpression &&
        scope.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
        scope.type !== AST_NODE_TYPES.Program
      ) {
        scope = scope.parent as TSESTree.Node;
      }
      let found = false;
      const stack: TSESTree.Node[] = [scope];
      while (stack.length > 0 && !found) {
        const current = stack.pop() as TSESTree.Node;
        if (
          current.type === AST_NODE_TYPES.CallExpression &&
          // Only a call that RUNS BEFORE this one is a fallback for it.
          current.range[1] <= node.range[0]
        ) {
          const callee = current.callee;
          const name =
            callee.type === AST_NODE_TYPES.MemberExpression
              ? // `crypto['randomBytes'](n)` is the same CSPRNG call.
                (propertyName(callee) ?? '')
              : callee.type === AST_NODE_TYPES.Identifier
                ? callee.name
                : '';
          if (CSPRNG_CALLS.has(name)) found = true;
        }
        for (const key of Object.keys(current)) {
          if (key === 'parent') continue;
          const value = (current as unknown as Record<string, unknown>)[key];
          for (const child of Array.isArray(value) ? value : [value]) {
            if (
              child !== null &&
              typeof child === 'object' &&
              typeof (child as TSESTree.Node).type === 'string'
            ) {
              stack.push(child as TSESTree.Node);
            }
          }
        }
      }
      return found;
    }

    function isMathRandomCallee(callee: TSESTree.Node): boolean {
      if (isMathRandomProperty(callee)) return true;

      // `rng.next()` where `rng` is a stable object literal. `rng['next']()`
      // reaches the same aliased `Math.random`; resolved once, before the
      // guard, so the guard tests the binding the body then reads.
      const wanted = memberPropertyName(callee);
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.object.type === AST_NODE_TYPES.Identifier &&
        wanted !== null
      ) {
        const init = stableDeclarator(callee.object)?.init;
        if (!init || init.type !== AST_NODE_TYPES.ObjectExpression)
          return false;
        return init.properties.some(
          (property) =>
            property.type === AST_NODE_TYPES.Property &&
            // `{ ['next']: Math.random }` declares the same slot `{ next: … }`
            // declares — the object-KEY half of the same blind spot.
            objectKeyName(property) === wanted &&
            isMathRandomProperty(property.value),
        );
      }

      if (callee.type !== AST_NODE_TYPES.Identifier) return false;
      const declarator = stableDeclarator(callee);
      const init = declarator?.init;
      if (!declarator || !init) return false;

      if (declarator.id.type === AST_NODE_TYPES.Identifier) {
        return isMathRandomProperty(init);
      }
      if (declarator.id.type !== AST_NODE_TYPES.ObjectPattern) return false;
      if (!isMathObject(init)) return false;
      // `{ random: r }`, `{ 'random': r }` and `{ ['random']: r }` all bind
      // the same slot of Math; `objectKeyName` reads each spelling.
      return declarator.id.properties.some(
        (property) =>
          property.type === AST_NODE_TYPES.Property &&
          property.value.type === AST_NODE_TYPES.Identifier &&
          property.value.name === callee.name &&
          objectKeyName(property) === 'random',
      );
    }

    /**
     * Does any LATER use of this binding sit in a crypto context?
     *
     * The security meaning is routinely attached one statement after the draw:
     *
     * ```js
     * const raw = Math.random().toString(36).slice(2);
     * const apiKey = `sk_live_${raw}`;
     * ```
     *
     * and, the same shape one indent deeper, a helper whose NAME is the only
     * thing that says "token":
     *
     * ```js
     * function makeSessionToken() {
     *   const raw = Math.random().toString(36).slice(2);
     *   return raw;
     * }
     * ```
     *
     * The ancestor walk cannot see either — `raw` is not a crypto name, and the
     * `FunctionDeclaration` arm below only ever tested CRYPTO_FUNCTION_PATTERNS,
     * so `makeSessionToken` failed a check that the `ReturnStatement` arm (which
     * also consults nameSuggestsCrypto) would have passed. Following the
     * BINDING forward puts both back under the same predicate rather than
     * widening any name list.
     */
    function usedInCryptoContext(
      id: TSESTree.Identifier,
      followed: Set<TSESLint.Scope.Variable>,
    ): boolean {
      const variable = findVariable(sourceCode, id);
      // `followed` is what ends the walk. A hop budget used to, and it dropped
      // the fourth binding of `raw` → `padded` → `upper` → `apiKey`; the only
      // way the walk can loop is back through a binding already followed
      // (`var a = Math.random() + b; var b = a;`), and that binding's answer
      // does not change on a second visit.
      if (!variable || followed.has(variable)) return false;
      followed.add(variable);
      // `reference.init` skips the declarator's own write — the only reference
      // that is the identifier we started from. Every other reference is a
      // later USE, which is the question being asked.
      return variable.references.some(
        (reference) =>
          !reference.init &&
          isCryptoContext(reference.identifier as TSESTree.Node, followed),
      );
    }

    /**
     * Does the value still flow outward across this function boundary?
     *
     * Only two ways out: the expression body of a concise arrow, or a `return`
     * we already walked through. Anything else — a draw buried in a statement
     * body — stays inside.
     */
    function escapesFunction(
      fn: TSESTree.Node,
      cameFrom: TSESTree.Node,
      passedReturn: boolean,
    ): boolean {
      // `fn.expression`: a BLOCK body is also `fn.body`, and treating it as
      // the value let `const authRetry = setInterval(() => { delay =
      // Math.random() * 1000; })` report while the `function () {}` spelling
      // of the same callback stayed silent.
      if (
        fn.type === AST_NODE_TYPES.ArrowFunctionExpression &&
        fn.expression &&
        fn.body === cameFrom
      ) {
        return true;
      }
      return passedReturn;
    }

    /** The text a node ends with, when that text is static: `'&state='`, `` `…state=` ``. */
    function trailingText(start: TSESTree.Node): string {
      // Follow the right operand of `a + b + c` down; no recursion to bound.
      let node = start;
      while (
        node.type === AST_NODE_TYPES.BinaryExpression &&
        node.operator === '+'
      ) {
        node = node.right;
      }
      if (node.type === AST_NODE_TYPES.Literal) {
        return String(node.value);
      }
      if (node.type === AST_NODE_TYPES.TemplateLiteral) {
        // A template always has at least one quasi.
        return (node.quasis.at(-1) as TSESTree.TemplateElement).value.raw;
      }
      return '';
    }

    /** Does this object literal read as an OAuth/OIDC authorization request? */
    function looksLikeAuthorizeRequest(
      object: TSESTree.ObjectExpression,
    ): boolean {
      return object.properties.some((property) => {
        if (property.type !== AST_NODE_TYPES.Property) return false;
        const key = objectKeyName(property);
        return key !== null && OAUTH_REQUEST_KEYS.has(normalizeKey(key));
      });
    }

    /**
     * Is this use of a value the `state` of an OAuth request?
     *
     * `state` alone is the commonest name in a UI codebase, so the name never
     * decides. Where the value GOES does: after `state=` in a URL, as the value
     * of a `state` query parameter, or in an object that carries the other
     * members of an authorization request.
     */
    function isOAuthStateUse(reference: TSESTree.Identifier): boolean {
      let node: TSESTree.Node = reference;
      // `encodeURIComponent(state)` puts the same value in the same place.
      while (
        node.parent?.type === AST_NODE_TYPES.CallExpression &&
        node.parent.callee.type === AST_NODE_TYPES.Identifier &&
        TRANSPARENT_WRAPPERS.has(node.parent.callee.name) &&
        node.parent.arguments[0] === node
      ) {
        node = node.parent;
      }
      const parent = node.parent as TSESTree.Node;

      if (parent.type === AST_NODE_TYPES.TemplateLiteral) {
        const at = parent.expressions.indexOf(node as TSESTree.Expression);
        return /state=$/i.test(
          (parent.quasis[at] as TSESTree.TemplateElement).value.raw,
        );
      }
      if (
        parent.type === AST_NODE_TYPES.BinaryExpression &&
        parent.operator === '+' &&
        parent.right === node
      ) {
        return /state=$/i.test(trailingText(parent.left));
      }
      if (
        parent.type === AST_NODE_TYPES.Property &&
        parent.value === node &&
        objectKeyName(parent) === 'state' &&
        parent.parent.type === AST_NODE_TYPES.ObjectExpression
      ) {
        return looksLikeAuthorizeRequest(parent.parent);
      }
      if (
        parent.type === AST_NODE_TYPES.CallExpression &&
        parent.callee.type === AST_NODE_TYPES.MemberExpression &&
        // @vocabulary WHATWG URLSearchParams API
        ['set', 'append'].includes(propertyName(parent.callee) ?? '') &&
        parent.arguments[1] === node
      ) {
        return staticString(parent.arguments[0])?.toLowerCase() === 'state';
      }
      return false;
    }

    /** `const state = Math.random()…` whose value goes into an OAuth request. */
    function isOAuthStateBinding(id: TSESTree.Identifier): boolean {
      const words = identifierWords(id.name);
      if (words[words.length - 1] !== 'state') return false;
      const variable = findVariable(sourceCode, id) as TSESLint.Scope.Variable;
      return variable.references.some(
        (reference) =>
          !reference.init &&
          isOAuthStateUse(reference.identifier as TSESTree.Identifier),
      );
    }

    /**
     * `(name, value)` setter whose literal NAME says the value is a credential,
     * and `child` is one of the value arguments.
     */
    function isSecuritySlot(
      call: TSESTree.CallExpression,
      child: TSESTree.Node,
    ): boolean {
      const callee = call.callee;
      if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      const method = propertyName(callee);
      if (method === null || !NAME_VALUE_SETTERS.has(method)) return false;
      const at = call.arguments.indexOf(
        child as TSESTree.CallExpressionArgument,
      );
      if (at < 1) return false;
      const slot = staticString(call.arguments[0]);
      if (slot === null) return false;
      if (nameSuggestsCrypto(slot, vocab)) return true;
      // `params.set('state', draw)`: a query parameter called state.
      const receiver = callee.object;
      const receiverName =
        receiver.type === AST_NODE_TYPES.Identifier
          ? receiver.name
          : (memberPropertyName(receiver) ?? '');
      return (
        slot.toLowerCase() === 'state' &&
        ['set', 'append'].includes(method) &&
        QUERY_RECEIVER.test(receiverName)
      );
    }

    /**
     * The draw sits in a `.sort()` comparator: `list.sort(() => Math.random() - 0.5)`
     * is the one-line shuffle, and a shuffle's output is an order, not a secret.
     */
    function isShuffleComparator(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (
          current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          current.type === AST_NODE_TYPES.FunctionExpression
        ) {
          const call = current.parent as TSESTree.Node;
          return (
            call.type === AST_NODE_TYPES.CallExpression &&
            call.arguments[0] === current &&
            call.callee.type === AST_NODE_TYPES.MemberExpression &&
            (propertyName(call.callee) === 'sort' ||
              propertyName(call.callee) === 'toSorted')
          );
        }
        current = current.parent;
      }
      return false;
    }

    /**
     * A name that IS a secret, as opposed to an everyday word for an identifier.
     * `hash`, `key`, `code`, `pin` and `auth` are on the vocabulary because they
     * sometimes hold one; `token` and `salt` essentially always do.
     */
    const STRONG_SECRET_NAME =
      /token|secret|passw|salt|nonce|^iv$|otp|csrf|session|credential|jwt|apikey|cipher|encrypt|signature|seed|mnemonic/i;
    const FILE_EXTENSION_AFTER = /^\.[A-Za-z0-9]{1,8}(?![A-Za-z0-9_])/;
    /**
     * Node's path-only modules and its file-system modules.
     *
     * @vocabulary Node.js API (path, path.posix, path.win32, fs, fs/promises) —
     * defined by the runtime.
     */
    const PATH_MODULES = new Set(['path', 'posix', 'win32']);
    const FS_MODULES = new Set(['fs', 'fsp']);
    /**
     * `fs` methods whose SECOND argument is also a path (the first is always one).
     *
     * @vocabulary Node.js fs API (rename, copyFile, cp, link, symlink and their
     * Sync variants) — defined by the runtime.
     */
    const TWO_PATH_METHODS = /^(rename|copyFile|cp|link|symlink)(Sync)?$/;
    /** A binding that holds a file name or path, by what it is called. */
    const FILE_BINDING_NAME = /(file|path|dir|name)$/i;

    /**
     * What kind of file API is this `path` / `fs` receiver? Decided by the
     * module it RESOLVES to when the file declares it (so `import path from
     * 'node:fs'` is `fs`, whatever it is called, and a local object is neither),
     * and by its spelling only when the name is undeclared (a snippet, a global).
     */
    function fileApiKind(
      identifier: TSESTree.Identifier,
    ): 'path' | 'fs' | null {
      if (findVariable(context.sourceCode, identifier)) {
        const bound = resolveModuleBinding(
          identifier,
          context.sourceCode.getScope(identifier),
        );
        if (bound === undefined) return null;
        if (bound.module === 'path') return 'path';
        return bound.module === 'fs' || bound.module === 'fs/promises'
          ? 'fs'
          : null;
      }
      if (PATH_MODULES.has(identifier.name)) return 'path';
      return FS_MODULES.has(identifier.name) ? 'fs' : null;
    }

    /**
     * Is `argument` a PATH argument of this `path.*` / `fs.*` call? Every `path`
     * argument is a segment. For `fs`, only the first argument is a path
     * (`writeFileSync(file, data)` takes the data second), plus the second of
     * the few two-path methods.
     */
    function isPathArgument(
      call: TSESTree.CallExpression,
      argument: TSESTree.Node,
    ): boolean {
      if (call.callee.type !== AST_NODE_TYPES.MemberExpression) return false;
      // `path.posix.join(...)` / `path.win32.join(...)` are `path` too.
      let receiver = call.callee.object;
      if (
        receiver.type === AST_NODE_TYPES.MemberExpression &&
        (propertyName(receiver) === 'posix' ||
          propertyName(receiver) === 'win32')
      ) {
        receiver = receiver.object;
      }
      if (receiver.type !== AST_NODE_TYPES.Identifier) return false;
      const kind = fileApiKind(receiver);
      if (kind === null) return false;
      if (kind === 'path') return true;
      const index = call.arguments.indexOf(
        argument as TSESTree.CallExpressionArgument,
      );
      return (
        index === 0 ||
        (index === 1 && TWO_PATH_METHODS.test(propertyName(call.callee) ?? ''))
      );
    }

    /**
     * Does this expression end up as a file name or path: an argument in a path
     * position of a `path.*` / `fs.*` call, or the value of a binding named for a
     * file? Looks through the arms of a conditional.
     */
    function isFilePosition(expression: TSESTree.Node): boolean {
      let current = expression;
      let parent = current.parent as TSESTree.Node;
      while (
        parent.type === AST_NODE_TYPES.ConditionalExpression &&
        parent.test !== current
      ) {
        current = parent;
        parent = current.parent as TSESTree.Node;
      }
      if (parent.type === AST_NODE_TYPES.CallExpression) {
        return isPathArgument(parent, current);
      }
      return (
        parent.type === AST_NODE_TYPES.VariableDeclarator &&
        parent.id.type === AST_NODE_TYPES.Identifier &&
        FILE_BINDING_NAME.test(parent.id.name)
      );
    }

    /** Is this read of the binding part of a file name? */
    function isFileNameUse(id: TSESTree.Node): boolean {
      // Every read of a declared binding sits under a parent.
      const parent = id.parent as TSESTree.Node;
      if (parent.type === AST_NODE_TYPES.TemplateLiteral) {
        const index = parent.expressions.indexOf(id as TSESTree.Expression);
        // `quasis` is one longer than `expressions`: the next one always exists.
        // A `.ext` suffix alone is not enough (`${key}.v1` can be an HMAC key):
        // the template must also END UP as a file name.
        return (
          FILE_EXTENSION_AFTER.test(parent.quasis[index + 1].value.raw) &&
          isFilePosition(parent)
        );
      }
      return (
        parent.type === AST_NODE_TYPES.CallExpression &&
        isPathArgument(parent, id)
      );
    }

    /**
     * Does this binding exist only to name a file?
     *
     * Vite writes a temp config file named `${base}.${hash}.mjs`, where `hash` is
     * a timestamp and `Math.random()`. The name is on the vocabulary, but the
     * value is a uniquifier: every read of it lands in a file name, so nothing
     * about it has to be unguessable. Needs at least one read, only file-name
     * reads, and a name that is not itself a strong secret word.
     */
    function namesOnlyAFile(declarator: TSESTree.VariableDeclarator): boolean {
      // The only caller has already matched an Identifier id, which always
      // declares exactly one variable.
      const { name } = declarator.id as TSESTree.Identifier;
      if (STRONG_SECRET_NAME.test(name)) return false;
      const [variable] = context.sourceCode.getDeclaredVariables(
        declarator,
      ) as [TSESLint.Scope.Variable];
      const reads = variable.references.filter((ref) => ref.isRead());
      return (
        reads.length > 0 && reads.every((ref) => isFileNameUse(ref.identifier))
      );
    }

    function isCryptoContext(
      node: TSESTree.Node,
      followed: Set<TSESLint.Scope.Variable> = new Set(),
    ): boolean {
      // Check variable declaration context
      let child: TSESTree.Node = node;
      let current: TSESTree.Node | undefined = node.parent;
      /**
       * Whether the names met so far can still be naming THIS value.
       *
       * The ancestor walk used to read every enclosing `VariableDeclarator`,
       * `AssignmentExpression` and `Property` no matter how many function
       * bodies lay between, so an object-literal METHOD KEY named the draw
       * inside its body. shardeum/json-rpc-server `src/api.ts` reported six
       * times on exactly that:
       *
       *   eth_getBlockTransactionCountByHash: async function (args, callback) {
       *     const ticket = crypto.createHash('sha1')
       *       .update(api_name + Math.random() + Date.now()).digest('hex')
       *
       * `ticket` is a log-correlation id; `hash` and `code` were read out of
       * the RPC method names — `eth_getUncleCountByBlockHash`, `eth_getCode` —
       * one and two function boundaries away.
       *
       * The enclosing-FUNCTION arms below are unaffected: they ask what the
       * surrounding function is for, which is a question about the function.
       */
      let namesThisValue = true;
      let passedReturn = false;
      while (current) {
        if (
          current.type === AST_NODE_TYPES.FunctionDeclaration ||
          current.type === AST_NODE_TYPES.FunctionExpression ||
          current.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          if (!escapesFunction(current, child, passedReturn))
            namesThisValue = false;
          passedReturn = false;
        }
        if (current.type === AST_NODE_TYPES.ReturnStatement)
          passedReturn = true;

        // Check variable names
        if (
          namesThisValue &&
          current.type === AST_NODE_TYPES.VariableDeclarator
        ) {
          if (current.id.type === AST_NODE_TYPES.Identifier) {
            const varName = current.id.name;
            if (
              nameSuggestsCrypto(varName, vocab) &&
              !namesOnlyAFile(current)
            ) {
              return true;
            }
            if (isOAuthStateBinding(current.id)) {
              return true;
            }
            if (usedInCryptoContext(current.id, followed)) {
              return true;
            }
          }
        }

        // Check function names
        if (current.type === AST_NODE_TYPES.FunctionDeclaration && current.id) {
          const funcName = current.id.name;
          if (functionNameSuggestsCrypto(funcName, vocab)) {
            return true;
          }
        }

        // Check assignment to a crypto-named target.
        //
        // The bare-identifier arm is what catches the single commonest way an
        // insecure token is written:
        //
        // ```js
        // let token = '';
        // for (let i = 0; i < 32; i++) {
        //   token += CHARS[Math.floor(Math.random() * CHARS.length)];
        // }
        // ```
        //
        // The declarator arm above cannot see it — `let token = ''` initialises
        // to an empty string, and `Math.random()` never appears under that
        // declarator. Every character of the token comes from the `+=`, whose
        // left side is an `Identifier`, and only the `MemberExpression` shape
        // was handled. So the textbook accumulator loop was silent while
        // `const token = Math.random().toString(36)` reported.
        if (
          namesThisValue &&
          current.type === AST_NODE_TYPES.AssignmentExpression
        ) {
          // Non-null only for a MemberExpression target.
          const propName = memberPropertyName(current.left);
          if (propName !== null) {
            if (nameSuggestsCrypto(propName, vocab)) {
              return true;
            }
          }
          if (current.left.type === AST_NODE_TYPES.Identifier) {
            if (nameSuggestsCrypto(current.left.name, vocab)) {
              return true;
            }
          }
        }

        // Check object property
        if (namesThisValue && current.type === AST_NODE_TYPES.Property) {
          // `{ 'X-CSRF-Token': draw }` names its slot as a string.
          const propName = objectKeyName(current);
          if (propName !== null) {
            if (nameSuggestsCrypto(propName, vocab)) {
              return true;
            }
            // `{ client_id, redirect_uri, state: draw }`.
            if (
              propName === 'state' &&
              current.parent.type === AST_NODE_TYPES.ObjectExpression &&
              looksLikeAuthorizeRequest(current.parent)
            ) {
              return true;
            }
          }
        }

        // `headers.set('X-SRF-TOKEN', draw)`: the slot is named by a literal.
        if (
          namesThisValue &&
          current.type === AST_NODE_TYPES.CallExpression &&
          isSecuritySlot(current, child)
        ) {
          return true;
        }

        // Check return in crypto-named function
        if (current.type === AST_NODE_TYPES.ReturnStatement) {
          // An arrow's `id` is always null, so only a named function answers.
          const funcName = findContainingFunction(current)?.id?.name;
          if (
            funcName !== undefined &&
            (functionNameSuggestsCrypto(funcName, vocab) ||
              nameSuggestsCrypto(funcName, vocab))
          ) {
            return true;
          }
        }

        child = current;
        current = current.parent;
      }

      return false;
    }

    function findContainingFunction(
      node: TSESTree.Node,
    ):
      | TSESTree.FunctionDeclaration
      | TSESTree.FunctionExpression
      | TSESTree.ArrowFunctionExpression
      | null {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (
          current.type === AST_NODE_TYPES.FunctionDeclaration ||
          current.type === AST_NODE_TYPES.FunctionExpression ||
          current.type === AST_NODE_TYPES.ArrowFunctionExpression
        ) {
          return current;
        }
        current = current.parent;
      }
      return null;
    }

    /**
     * Is this a one-character-at-a-time ALPHABET: a string, a template, an
     * array of single characters, or `'…'.split('')`, bound once or written
     * inline? Picking from one of those BUILDS a value out of draws, which is
     * what CWE-338 is about; picking from anything else chooses among things
     * that already exist.
     */
    function isAlphabet(
      object: TSESTree.Node,
      seen: Set<TSESLint.Scope.Variable> = new Set(),
    ): boolean {
      if (object.type === AST_NODE_TYPES.Identifier) {
        const variable = findVariable(sourceCode, object);
        if (!variable || seen.has(variable)) return false;
        seen.add(variable);
        const init = stableDeclarator(object)?.init;
        return init != null && isAlphabet(init, seen);
      }
      if (object.type === AST_NODE_TYPES.TemplateLiteral) return true;
      if (object.type === AST_NODE_TYPES.Literal) {
        return typeof object.value === 'string';
      }
      if (object.type === AST_NODE_TYPES.ArrayExpression) {
        return (
          object.elements.length > 0 &&
          object.elements.every(
            (element) =>
              element?.type === AST_NODE_TYPES.Literal &&
              typeof element.value === 'string' &&
              element.value.length <= 1,
          )
        );
      }
      return (
        object.type === AST_NODE_TYPES.CallExpression &&
        object.callee.type === AST_NODE_TYPES.MemberExpression &&
        propertyName(object.callee) === 'split'
      );
    }

    /**
     * `list[draw]` picks an element that already exists. It is a selection, not a
     * new value, when the pick is stored, returned or passed on whole: an
     * accumulator (`token += list[draw]`), a concatenation, a callback body or a
     * `push` builds a NEW value out of many picks, and an alphabet is a source of
     * characters rather than of things to choose between.
     */
    function isWholePick(member: TSESTree.MemberExpression): boolean {
      if (isAlphabet(member.object)) return false;
      let pick: TSESTree.Node = member;
      for (;;) {
        const parent: TSESTree.Node = pick.parent as TSESTree.Node;
        if (
          TRANSPARENT_NODE_TYPES.has(parent.type) ||
          (parent.type === AST_NODE_TYPES.MemberExpression &&
            parent.object === pick)
        ) {
          pick = parent;
          continue;
        }
        return (
          (parent.type === AST_NODE_TYPES.VariableDeclarator &&
            parent.init === pick) ||
          parent.type === AST_NODE_TYPES.ReturnStatement ||
          (parent.type === AST_NODE_TYPES.Property && parent.value === pick) ||
          (parent.type === AST_NODE_TYPES.AssignmentExpression &&
            parent.operator === '=' &&
            parent.right === pick)
        );
      }
    }

    /**
     * Does every use of this binding select, delay or sample? At least one read,
     * none of them anything else, and the binding never written again.
     */
    function allReadsSelectOrSample(
      id: TSESTree.Identifier,
      followed: Set<TSESLint.Scope.Variable>,
    ): boolean {
      const variable = findVariable(sourceCode, id);
      if (!variable || followed.has(variable) || !stableDeclarator(id))
        return false;
      followed.add(variable);
      const reads = variable.references.filter((ref) => !ref.init);
      return (
        reads.length > 0 &&
        reads.every((ref) =>
          selectsOrSamples(ref.identifier as TSESTree.Node, followed),
        )
      );
    }

    /**
     * Does this number only ever pick, delay or sample?
     *
     * Three consumers turn a draw into a decision rather than a value: an array
     * INDEX whose pick is stored whole, a timer's DELAY, and a COMPARISON. The
     * draw may pass through arithmetic, `Math.floor` and friends and a
     * never-rewritten binding on the way, and EVERY use must end in one of the
     * three; a number that is also stringified, stored or sent anywhere keeps
     * the old verdict.
     */
    function selectsOrSamples(
      start: TSESTree.Node,
      followed: Set<TSESLint.Scope.Variable> = new Set(),
    ): boolean {
      let node: TSESTree.Node = start;
      for (;;) {
        const parent = node.parent as TSESTree.Node;
        if (parent.type === AST_NODE_TYPES.BinaryExpression) {
          if (COMPARISON_OPERATORS.has(parent.operator)) return true;
          if (!NUMERIC_OPERATORS.has(parent.operator)) return false;
        } else if (parent.type === AST_NODE_TYPES.UnaryExpression) {
          if (!['+', '-', '~'].includes(parent.operator)) return false;
        } else if (TRANSPARENT_NODE_TYPES.has(parent.type)) {
          // type-only wrapper: climb
        } else if (parent.type === AST_NODE_TYPES.CallExpression) {
          const callee = parent.callee;
          const args = parent.arguments as TSESTree.Node[];
          if (!args.includes(node)) return false;
          if (
            callee.type === AST_NODE_TYPES.MemberExpression &&
            isMathObject(callee.object) &&
            NUMERIC_MATH_FUNCTIONS.has(propertyName(callee) ?? '')
          ) {
            // a number in, a number out: climb
          } else {
            // `setTimeout(fn, delay)`, or `timers/promises`' `setTimeout(delay)`.
            return (
              callee.type === AST_NODE_TYPES.Identifier &&
              TIMER_FUNCTIONS.has(callee.name) &&
              (args[0] === node || args[1] === node) &&
              (findVariable(sourceCode, callee)?.defs.length ?? 0) === 0
            );
          }
        } else if (
          parent.type === AST_NODE_TYPES.MemberExpression &&
          parent.computed &&
          parent.property === node
        ) {
          return isWholePick(parent);
        } else if (
          parent.type === AST_NODE_TYPES.VariableDeclarator &&
          parent.init === node &&
          parent.id.type === AST_NODE_TYPES.Identifier
        ) {
          return allReadsSelectOrSample(parent.id, followed);
        } else {
          return false;
        }
        node = parent;
      }
    }

    return {
      before() {
        const [options = {}] = currentOptions();
        const {
          allowInTests = true,
          secretWords = CRYPTO_WORDS,
          correlationIdWords = [...NON_SECURITY_ID_QUALIFIERS],
        } = options as Options;

        /**
         * Built once per file, from the consumer's list or the measured default.
         * Nothing below reads a module-level word list directly — the vocabulary
         * arrives as data so that a project whose secrets are called `nonce` or
         * whose `keyHandler` is a keyboard handler can say so.
         */
        vocab = {
          words: new Set(secretWords),
          correlationWords: new Set(correlationIdWords),
          suggestsCrypto: makeNameTest(secretWords),
        };

        sourceCode = context.sourceCode;

        const filename = context.filename;
        isTestFile = allowInTests && isTestFilePath(filename);
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (isTestFile) return;

        /**
         * `crypto.pseudoRandomBytes()` needs no context test, unlike
         * `Math.random()`. Math.random has legitimate non-security uses —
         * jitter, sampling, a DOM id — which is why that path gates on
         * surrounding names. `pseudoRandomBytes` has exactly one meaning: the
         * caller asked for bytes that are explicitly not cryptographic, from an
         * API deprecated in Node 4 for being mistaken for one.
         */
        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          propertyName(node.callee) === 'pseudoRandomBytes'
        ) {
          context.report({ node, messageId: 'pseudoRandomBytes' });
          return;
        }

        // Check for Math.random(), in any of its bindings
        if (isMathRandomCallee(node.callee)) {
          // Check if used in cryptographic context
          if (
            !isShuffleComparator(node) &&
            !selectsOrSamples(node) &&
            isCryptoContext(node) &&
            !isCsprngFallback(node)
          ) {
            context.report({
              node,
              messageId: 'mathRandomCrypto',
            });
          }
        }
      },
    };
  },
});

export type { Options as NoMathRandomCryptoOptions };
