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
  propertyName,
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
  /** Allow Math.random() in test files. Default: false */
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

/**
 * Is this expression a read of `Math.random` itself?
 *
 * Both spellings. `Math['random']()` is what a property-mangling build step or
 * a `no-restricted-properties` workaround leaves behind, and it produces the
 * identical value from the identical PRNG — only the callee's property node
 * type changes, from Identifier to Literal.
 */
function isMathRandomProperty(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (node.object.type !== AST_NODE_TYPES.Identifier) return false;
  if (node.object.name !== 'Math') return false;
  const property = node.property;
  if (!node.computed) {
    return (
      property.type === AST_NODE_TYPES.Identifier && property.name === 'random'
    );
  }
  return (
    property.type === AST_NODE_TYPES.Literal && property.value === 'random'
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
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
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
    const vocab: Vocabulary = {
      words: new Set(secretWords),
      correlationWords: new Set(correlationIdWords),
      suggestsCrypto: makeNameTest(secretWords),
    };

    const sourceCode = context.sourceCode;

    const filename = context.filename;
    const isTestFile = allowInTests && isTestFilePath(filename);

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
      let scope: TSESTree.Node | undefined = node.parent;
      while (
        scope !== undefined &&
        scope.type !== AST_NODE_TYPES.FunctionDeclaration &&
        scope.type !== AST_NODE_TYPES.FunctionExpression &&
        scope.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
        scope.type !== AST_NODE_TYPES.Program
      ) {
        scope = scope.parent;
      }
      // The walk always terminates: every node sits under a Program, and an
      // unreachable guard here reads as a check that runs.
      let found = false;
      const stack: TSESTree.Node[] = [scope as TSESTree.Node];
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

      // `rng.next()` where `rng` is a stable object literal.
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        !callee.computed &&
        callee.object.type === AST_NODE_TYPES.Identifier &&
        callee.property.type === AST_NODE_TYPES.Identifier
      ) {
        const init = stableDeclarator(callee.object)?.init;
        if (!init || init.type !== AST_NODE_TYPES.ObjectExpression)
          return false;
        const wanted = callee.property.name;
        return init.properties.some(
          (property) =>
            property.type === AST_NODE_TYPES.Property &&
            !property.computed &&
            property.key.type === AST_NODE_TYPES.Identifier &&
            property.key.name === wanted &&
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
      if (init.type !== AST_NODE_TYPES.Identifier || init.name !== 'Math')
        return false;
      return declarator.id.properties.some((property) => {
        if (property.type !== AST_NODE_TYPES.Property || property.computed)
          return false;
        if (property.value.type !== AST_NODE_TYPES.Identifier) return false;
        if (property.value.name !== callee.name) return false;
        const key = property.key;
        if (key.type === AST_NODE_TYPES.Identifier)
          return key.name === 'random';
        return key.type === AST_NODE_TYPES.Literal && key.value === 'random';
      });
    }

    /**
     * How many `const` hops the crypto meaning is allowed to be away from the
     * `Math.random()` call. Two covers `raw` → `apiKey` and the one-alias
     * relay; beyond that the flow stops being visible in one glance and the
     * answer stops being trustworthy.
     */
    const MAX_BINDING_HOPS = 2;

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
      depth: number,
    ): boolean {
      const variable = findVariable(sourceCode, id);
      if (!variable) return false;
      // `reference.init` skips the declarator's own write — the only reference
      // that is the identifier we started from. Every other reference is a
      // later USE, which is the question being asked.
      return variable.references.some(
        (reference) =>
          !reference.init &&
          isCryptoContext(reference.identifier as TSESTree.Node, depth),
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
      if (
        fn.type === AST_NODE_TYPES.ArrowFunctionExpression &&
        fn.body === cameFrom
      ) {
        return true;
      }
      return passedReturn;
    }

    function isCryptoContext(node: TSESTree.Node, depth = 0): boolean {
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
            if (nameSuggestsCrypto(varName, vocab)) {
              return true;
            }
            if (
              depth < MAX_BINDING_HOPS &&
              usedInCryptoContext(current.id, depth + 1)
            ) {
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
          if (
            current.left.type === AST_NODE_TYPES.MemberExpression &&
            current.left.property.type === AST_NODE_TYPES.Identifier
          ) {
            const propName = current.left.property.name;
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
          if (current.key.type === AST_NODE_TYPES.Identifier) {
            const propName = current.key.name;
            if (nameSuggestsCrypto(propName, vocab)) {
              return true;
            }
          }
        }

        // Check return in crypto-named function
        if (current.type === AST_NODE_TYPES.ReturnStatement) {
          const func = findContainingFunction(current);
          if (func) {
            if (
              (func.type === AST_NODE_TYPES.FunctionDeclaration ||
                func.type === AST_NODE_TYPES.FunctionExpression) &&
              func.id?.name
            ) {
              const funcName = func.id.name;
              if (
                functionNameSuggestsCrypto(funcName, vocab) ||
                nameSuggestsCrypto(funcName, vocab)
              ) {
                return true;
              }
            }
          }
        }

        child = current;
        current = current.parent;
      }

      return false;
    }

    function findContainingFunction(node: TSESTree.Node): TSESTree.Node | null {
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

    return {
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
          if (isCryptoContext(node) && !isCsprngFallback(node)) {
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
