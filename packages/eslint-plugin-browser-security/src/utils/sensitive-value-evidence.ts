/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Evidence shared by the **storage & cookie** rules of this plugin.
 *
 * WHY THIS FILE EXISTS
 *
 * Eight rules independently answered the same three questions — "is this key
 * naming a secret", "is this value provably a JWT", "which storage medium is
 * this" — and each answered them with a private `includes()` against a private
 * word list. That produced two distinct defects, both reproduced with
 * `scripts/probe-rule.mts` before this file was written:
 *
 * ```js
 * localStorage.setItem('article-author', name);   // "auth"   ⊂ author   → reported
 * localStorage.setItem('tokenizer-config', cfg);  // "token"  ⊂ tokenizer→ reported
 * sessionStorage.setItem('spinner-visible', '1'); // "pin"    ⊂ spinner  → reported
 * cacheMap.set('creditLimit', 5000);              // "credit" ⊂ creditLimit → reported
 * document.cookie = 'lastAccessed=2026-01-01';    // "access" ⊂ lastAccessed → reported
 * ```
 *
 * and, on one realistic line, three rules reporting the same defect at three
 * different CVSS scores:
 *
 * ```js
 * sessionStorage.setItem('access_token', res.data.token);
 * //  no-jwt-in-storage            CVSS 8.1
 * //  no-sensitive-localstorage    CVSS 5.5   ("localStorage is vulnerable" — of sessionStorage)
 * //  no-sensitive-sessionstorage  CVSS 7.5
 * ```
 *
 * THE PARTITION
 *
 * | rule                        | owns                                                        |
 * | --------------------------- | ----------------------------------------------------------- |
 * | `no-jwt-in-storage`         | Web Storage write of a **bearer credential** (JWT/token/session) |
 * | `no-sensitive-localstorage` | `localStorage` write of a **non-bearer** secret              |
 * | `no-sensitive-sessionstorage`| `sessionStorage` write of a **non-bearer** secret           |
 * | `no-sensitive-indexeddb`    | IndexedDB object stores and their `add`/`put`                |
 * | `no-sensitive-data-in-cache`| the **Cache Storage API** (`caches.open(...)` → `put`/`add`)  |
 * | `no-cookie-auth-tokens`     | `document.cookie` write of a **bearer credential**            |
 * | `no-sensitive-cookie-js`    | `document.cookie` write of a **non-bearer** secret            |
 *
 * The two vocabularies below are DISJOINT by construction, and the deferrals
 * are structural (`if (namesBearerCredential(key)) return;`), so a user who
 * adds `'token'` to a medium rule's `sensitivePatterns` still cannot resurrect
 * the double report.
 *
 * WHAT IS AND IS NOT A NAME MATCH HERE
 *
 * Every predicate below runs only after the rule has already proven its SINK —
 * `localStorage.setItem` resolved through `utils/global-object`, a Cache
 * resolved back to `caches.open()`, an IndexedDB store resolved back to
 * `objectStore()`. The key name narrows a proven sink; it is never the whole
 * verdict, which is the use CLAUDE.md permits. And it is whole-WORD membership
 * via `nameHasAnyWord`, never a substring — that is the difference between
 * `accessToken` and `lastAccessed`.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  identifierWords,
  nameHasAnyWord,
  resolveModuleBinding,
} from '@interlace/eslint-devkit';

import { resolveGlobalObject } from './global-object';
import { resolveInitializer, resolveStringKey } from './resolve-binding';

/* -------------------------------------------------------------------------- */
/* Vocabularies                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Words that name a **bearer credential** — something an attacker can replay to
 * become the user. Owned by `no-jwt-in-storage` (Web Storage) and
 * `no-cookie-auth-tokens` (cookies).
 *
 * Whole-word terms, so `token` matches `access_token`/`accessToken` and does
 * NOT match `tokenizer`; `auth` matches `auth_state` and does NOT match
 * `author`.
 */
export const BEARER_CREDENTIAL_TERMS: readonly string[] = [
  'jwt',
  'token',
  'bearer',
  'auth',
  'authorization',
  'session',
  'sid',
  'credential',
  'credentials',
];

/**
 * Words that name a secret which is NOT a bearer credential — a reusable
 * secret, a key, or a regulated identifier. Owned by the medium rules.
 *
 * Deliberately excludes bare `key` (`cacheKey`, `rowKey`), bare `credit`
 * (`creditLimit`) and bare `pin` (`spinner`, `pinnedItems`) — each of those
 * produced a reproduced false positive before this list existed.
 */
export const NON_BEARER_SECRET_TERMS: readonly string[] = [
  'password',
  'passwd',
  'pwd',
  'passphrase',
  'secret',
  'api key',
  'apikey',
  'private key',
  'secret key',
  'encryption key',
  'signing key',
  'client secret',
  'credit card',
  'card number',
  'cvv',
  'cvc',
  'ssn',
  'social security',
  'seed phrase',
  'mnemonic',
  'recovery code',
];

/**
 * Turn a URL or path into something `identifierWords` can segment.
 *
 * `identifierWords` splits on `_`, `-`, `.` and case boundaries but not on URL
 * punctuation, so `/api/user/credit-card` tokenises as
 * `['/api/user/credit', 'card']` and the phrase `credit card` never matches.
 */
export function normalizeResourceKey(key: string): string {
  return key.replace(/[/?&=:#%+*]+/g, '-');
}

/**
 * Words that turn a secret's NAME into a fact ABOUT the secret.
 *
 * `tokenCount` is how many tokens there are. `passwordLength` is a policy
 * number. `sessionTimeout` is a duration. None of them is the credential, and
 * every one of them was reported before this list existed — `passwordLength`
 * is the exact shape CLAUDE.md records as "Password length requirement is too
 * weak" firing on `passengers.length`.
 *
 * This is a SUPPRESSION, so a wrong guess costs recall rather than a user's
 * trust. Recorded here rather than waved through.
 */
const MEASUREMENT_TERMS: readonly string[] = [
  'count',
  'length',
  'size',
  'limit',
  'total',
  'index',
  'offset',
  'expiry',
  'expires',
  'expiration',
  'ttl',
  'timeout',
  'version',
  'enabled',
  'visible',
];

/**
 * Fold a key's regular plurals to singular so `passwords` matches `password`.
 *
 * `nameHasWord` is exact segment equality, and an IndexedDB store is almost
 * always named in the plural — `passwords`, `apiKeys`, `credentials`. Without
 * this the whole-word fix would have traded a false-positive class for a
 * false-negative one. `-ss` endings (`access`, `address`) are left alone.
 */
function singularizeWords(key: string): string {
  return identifierWords(normalizeResourceKey(key))
    .map((w) =>
      w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w,
    )
    .join(' ');
}

/** Is this key a fact about a secret rather than the secret itself? */
export function namesMeasurementOnly(key: string): boolean {
  return nameHasAnyWord(singularizeWords(key), MEASUREMENT_TERMS);
}

/**
 * Does this key name a bearer credential (whole-word)?
 *
 * @param key - the key the code actually writes, already resolved
 * @param terms - the vocabulary. The default is
 *   {@link BEARER_CREDENTIAL_TERMS} and reproduces today's behaviour exactly;
 *   `no-jwt-in-storage` and `no-cookie-auth-tokens` — the two rules for which
 *   this predicate is the FINDING rather than a deferral — pass their
 *   `bearerPatterns` option here, which REPLACES the default.
 *
 * ### Why the deferral call sites do NOT take the option
 *
 * The five medium rules call this to hand a key OVER to its owner
 * (`if (namesBearerCredential(key)) return;`). That is a suppression, and it is
 * what keeps one line from being reported by three rules at three different
 * CVSS scores. If a user widens `no-jwt-in-storage`'s `bearerPatterns`, the
 * deferrals must widen with it or the double report comes back — but a rule
 * cannot read another rule's options, so the deferrals stay on the default and
 * a user who customises the vocabulary must set the same list on the medium
 * rules' `sensitivePatterns` to keep the partition. Recorded here rather than
 * left to be discovered.
 */
export function namesBearerCredential(
  key: string,
  terms: readonly string[] = BEARER_CREDENTIAL_TERMS,
): boolean {
  return (
    !namesMeasurementOnly(key) && nameHasAnyWord(singularizeWords(key), terms)
  );
}

/**
 * Does this key name a non-bearer secret (whole-word)?
 *
 * @param key - the key the code actually writes, already resolved
 * @param terms - the vocabulary; a rule with a `sensitivePatterns` option passes
 *   the user's list here, which REPLACES the default (the contract those options
 *   already had)
 */
export function namesNonBearerSecret(
  key: string,
  terms: readonly string[] = NON_BEARER_SECRET_TERMS,
): boolean {
  return (
    !namesMeasurementOnly(key) && nameHasAnyWord(singularizeWords(key), terms)
  );
}

/* -------------------------------------------------------------------------- */
/* Scope                                                                      */
/* -------------------------------------------------------------------------- */

/** The variable `name` resolves to from `scope`, or `null` for a free global. */
function lookupVariable(
  name: string,
  scope: TSESLint.Scope.Scope | null,
): TSESLint.Scope.Variable | null {
  for (let s = scope; s !== null; s = s.upper) {
    const found = s.variables.find((v) => v.name === name);
    if (found !== undefined) return found;
  }
  return null;
}

const GLOBAL_ALIASES: ReadonlySet<string> = new Set([
  'window',
  'self',
  'globalThis',
]);

/**
 * `const { localStorage } = window;` / `const { localStorage: store } = window;`
 *
 * The SSR-safety pattern. The binding IS the global, but its identifier no
 * longer spells the global's name, so an exact-membership test on the spelling
 * misses it entirely.
 */
function destructuredGlobalName(
  variable: TSESLint.Scope.Variable,
  names: ReadonlySet<string>,
): string | null {
  const def = variable.defs[0];
  if (def === undefined || def.type !== 'Variable') return null;
  if (def.node.id.type !== AST_NODE_TYPES.ObjectPattern) return null;
  const init = def.node.init;
  if (
    init === null ||
    init.type !== AST_NODE_TYPES.Identifier ||
    !GLOBAL_ALIASES.has(init.name)
  ) {
    return null;
  }
  for (const property of def.node.id.properties) {
    if (property.type !== AST_NODE_TYPES.Property) continue;
    if (property.key.type !== AST_NODE_TYPES.Identifier) continue;
    if (!names.has(property.key.name)) continue;
    if (
      property.value.type === AST_NODE_TYPES.Identifier &&
      property.value.name === variable.name
    ) {
      return property.key.name;
    }
  }
  return null;
}

/**
 * Which storage area does this expression denote?
 *
 * Three accepted shapes, and one deliberate rejection:
 *   - `localStorage` — but only when the identifier is a FREE reference. A
 *     `function seed(localStorage)` parameter holding an in-memory test double
 *     is not the browser global, and reporting it is a false positive the
 *     spelling test cannot distinguish.
 *   - `window.localStorage` / `self.` / `globalThis.` — via resolveGlobalObject.
 *   - `const { localStorage: store } = window` — the SSR-safety destructure.
 */
export function resolveStorageArea(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  names: ReadonlySet<string>,
): string | null {
  if (node.type === AST_NODE_TYPES.Identifier) {
    const variable = lookupVariable(node.name, sourceCode.getScope(node));
    // A free reference, or a configured global with no declaration site.
    if (variable === null || variable.defs.length === 0) {
      return names.has(node.name) ? node.name : null;
    }
    return destructuredGlobalName(variable, names);
  }
  return resolveGlobalObject(node, names);
}

/* -------------------------------------------------------------------------- */
/* Member access                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The property name of a member access, however it is written.
 *
 * `storage['setItem'](…)` is the same call as `storage.setItem(…)`, and every
 * rule in this group used to see only the second spelling.
 */
export function memberName(
  member: TSESTree.MemberExpression,
  sourceCode?: TSESLint.SourceCode,
): string | null {
  if (!member.computed) {
    return member.property.type === AST_NODE_TYPES.Identifier
      ? member.property.name
      : null;
  }
  if (
    member.property.type === AST_NODE_TYPES.Literal &&
    typeof member.property.value === 'string'
  ) {
    return member.property.value;
  }
  // `const WRITE = 'setItem'; storage[WRITE](…)` — the method name arrives
  // through a binding. Without resolving it the sink itself disappears.
  if (member.property.type === AST_NODE_TYPES.Identifier && sourceCode) {
    const init = resolveInitializer(member.property, sourceCode);
    if (
      init !== undefined &&
      init.type === AST_NODE_TYPES.Literal &&
      typeof init.value === 'string'
    ) {
      return init.value;
    }
  }
  return null;
}

/** Marks a span of a key that could not be resolved. Splits words, reads as a wildcard. */
const UNKNOWN = '*';

/**
 * The text of a storage KEY, with unresolvable spans marked.
 *
 * `resolveStringKey` understands a literal and a `const` bound to one. Real
 * front ends namespace their keys — `` `${tenantId}:access_token` `` and
 * `PREFIX + 'refresh_token'` — and both were invisible, which is a false
 * negative on the commonest multi-tenant idiom there is.
 */
export function resolveKeyText(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  followBinding = true,
): string | null {
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.quasis.map((q) => q.value.raw).join(UNKNOWN);
  }
  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    const left = resolveKeyText(node.left, sourceCode, followBinding);
    const right = resolveKeyText(node.right, sourceCode, followBinding);
    if (left === null && right === null) return null;
    return (left ?? UNKNOWN) + (right ?? UNKNOWN);
  }
  if (node.type === AST_NODE_TYPES.Identifier && followBinding) {
    const init = resolveInitializer(node, sourceCode);
    if (
      init !== undefined &&
      (init.type === AST_NODE_TYPES.TemplateLiteral ||
        init.type === AST_NODE_TYPES.BinaryExpression)
    ) {
      const composed = resolveKeyText(init, sourceCode, false);
      if (composed !== null) return composed;
    }
  }
  // A plain literal, and the one `const KEY = 'literal'` hop, are exactly what
  // resolveStringKey already proves. This function only adds the COMPOSED
  // spellings above it.
  return resolveStringKey(node, sourceCode);
}

/* -------------------------------------------------------------------------- */
/* JWT value evidence                                                         */
/* -------------------------------------------------------------------------- */

const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Decode a base64url segment. The caller has already constrained the charset
 * with {@link JWT_SHAPE}, so every character is in the alphabet and there is no
 * failure mode to report.
 */
function decodeBase64Url(segment: string): string {
  let bits = 0;
  let acc = 0;
  let out = '';
  for (const ch of segment) {
    acc = (acc << 6) | BASE64URL_ALPHABET.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((acc >> bits) & 0xff);
    }
  }
  return out;
}

/** header.payload.signature, each base64url. */
const JWT_SHAPE = /^([A-Za-z0-9_-]{8,})\.([A-Za-z0-9_-]{2,})\.([A-Za-z0-9_-]*)$/;

/**
 * Is this string provably a JWT?
 *
 * Not a prefix test on `eyJ`. The header segment is base64url-DECODED and
 * parsed as JSON, and it must carry an `alg` claim — which is what RFC 7515
 * requires and what a semver string or a dotted object path can never satisfy.
 */
export function isJwtLiteral(value: string): boolean {
  const shape = JWT_SHAPE.exec(value);
  if (shape === null) return false;
  let header: unknown;
  try {
    header = JSON.parse(decodeBase64Url(shape[1]));
  } catch {
    return false;
  }
  return typeof header === 'object' && header !== null && 'alg' in header;
}

/** Modules whose exports mint JWTs. A call into one of them IS a JWT. */
const JWT_MINTING_MODULES: ReadonlySet<string> = new Set(['jsonwebtoken', 'jose']);

/**
 * Is the value being stored provably a JWT?
 *
 * Three kinds of proof, all structural:
 *   1. a string literal (or expression-free template) whose header decodes to
 *      a JOSE header,
 *   2. a `const` binding resolving to one of those,
 *   3. a call into a module binding of `jsonwebtoken` / `jose`.
 *
 * A variable *named* `jwt` is not proof and is not accepted here — that is the
 * key-name path, and it belongs to {@link namesBearerCredential}.
 */
export function hasProvableJwtValue(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  followBinding = true,
): boolean {
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
    return isJwtLiteral(node.value);
  }
  if (
    node.type === AST_NODE_TYPES.TemplateLiteral &&
    node.expressions.length === 0
  ) {
    return isJwtLiteral(node.quasis[0].value.raw);
  }
  if (node.type === AST_NODE_TYPES.CallExpression) {
    const binding = resolveModuleBinding(node.callee, sourceCode.getScope(node));
    return binding !== undefined && JWT_MINTING_MODULES.has(binding.module);
  }
  if (node.type === AST_NODE_TYPES.Identifier && followBinding) {
    const init = resolveInitializer(node, sourceCode);
    return init !== undefined && hasProvableJwtValue(init, sourceCode, false);
  }
  return false;
}

/* -------------------------------------------------------------------------- */
/* Medium resolution — Cache Storage and IndexedDB                            */
/* -------------------------------------------------------------------------- */

const CACHE_STORAGE_GLOBAL: ReadonlySet<string> = new Set(['caches']);

function unwrapAwait(node: TSESTree.Node): TSESTree.Node {
  return node.type === AST_NODE_TYPES.AwaitExpression ? node.argument : node;
}

/** `caches.open(...)` / `self.caches.open(...)` — the only way to obtain a Cache. */
function isCachesOpenCall(node: TSESTree.Node): boolean {
  const call = unwrapAwait(node);
  return (
    call.type === AST_NODE_TYPES.CallExpression &&
    call.callee.type === AST_NODE_TYPES.MemberExpression &&
    !call.callee.computed &&
    call.callee.property.type === AST_NODE_TYPES.Identifier &&
    call.callee.property.name === 'open' &&
    resolveGlobalObject(call.callee.object, CACHE_STORAGE_GLOBAL) !== null
  );
}

/** `caches.open('v1').then((cache) => cache.put(...))` — `cache` is the parameter. */
function isCachesOpenThenParameter(
  node: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): boolean {
  for (
    let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.variables.find((v) => v.name === node.name);
    if (variable === undefined) continue;
    const def = variable.defs[0];
    if (def === undefined || def.type !== 'Parameter') return false;
    const call = def.node.parent;
    return (
      call !== undefined &&
      call.type === AST_NODE_TYPES.CallExpression &&
      call.callee.type === AST_NODE_TYPES.MemberExpression &&
      !call.callee.computed &&
      call.callee.property.type === AST_NODE_TYPES.Identifier &&
      call.callee.property.name === 'then' &&
      isCachesOpenCall(call.callee.object)
    );
  }
  return false;
}

/**
 * Does this expression denote a `Cache` from the Cache Storage API?
 *
 * The rule that used to own this checked nothing at all — any `.set`/`.put`/
 * `.store` call with a string first argument counted, so `new Map().set('token_count', 42)`
 * was a CWE-200 finding. A Cache can only come from `caches.open()`, so that is
 * what is proven here.
 */
export function isCacheStorageReceiver(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (isCachesOpenCall(node)) return true;
  if (node.type !== AST_NODE_TYPES.Identifier) return false;
  const init = resolveInitializer(node, sourceCode);
  if (init !== undefined && isCachesOpenCall(init)) return true;
  return isCachesOpenThenParameter(node, sourceCode);
}

/** `tx.objectStore('vault')` / `db.createObjectStore('vault')` — the only ways to get an IDBObjectStore. */
function isObjectStoreCall(node: TSESTree.Node): boolean {
  const call = unwrapAwait(node);
  return (
    call.type === AST_NODE_TYPES.CallExpression &&
    call.callee.type === AST_NODE_TYPES.MemberExpression &&
    !call.callee.computed &&
    call.callee.property.type === AST_NODE_TYPES.Identifier &&
    (call.callee.property.name === 'objectStore' ||
      call.callee.property.name === 'createObjectStore')
  );
}

/**
 * Does this expression denote an `IDBObjectStore`?
 *
 * Without this, `no-sensitive-indexeddb` reported every `.add`/`.put` in the
 * program — `jobQueue.add({ credentials })` is a job queue, not a database.
 */
export function isIndexedDbStoreReceiver(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  hops = 3,
): boolean {
  if (isObjectStoreCall(node)) return true;
  if (node.type !== AST_NODE_TYPES.Identifier || hops === 0) return false;
  const init = resolveInitializer(node, sourceCode);
  // `const store = tx.objectStore(…); const target = store;` — an alias is still
  // the store. Bounded so a cyclic-looking chain cannot spin.
  return (
    init !== undefined && isIndexedDbStoreReceiver(init, sourceCode, hops - 1)
  );
}

/** Modules whose default entry point hands back an IndexedDB database facade. */
const IDB_WRAPPER_MODULES: ReadonlySet<string> = new Set(['idb']);

/**
 * Does this expression denote an `idb` database handle?
 *
 * `idb` is how most production code touches IndexedDB, and its API is
 * `db.put(storeName, value)` rather than `objectStore(name).put(value)`. A rule
 * that only understands the raw API misses the shape people actually write.
 */
export function isIdbWrapperDatabase(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (node.type !== AST_NODE_TYPES.Identifier) return false;
  const init = resolveInitializer(node, sourceCode);
  if (init === undefined) return false;
  const call = unwrapAwait(init);
  if (call.type !== AST_NODE_TYPES.CallExpression) return false;
  const binding = resolveModuleBinding(call.callee, sourceCode.getScope(node));
  return binding !== undefined && IDB_WRAPPER_MODULES.has(binding.module);
}

/* -------------------------------------------------------------------------- */
/* Cookie strings                                                             */
/* -------------------------------------------------------------------------- */

const DOCUMENT_GLOBAL: ReadonlySet<string> = new Set(['document']);

/**
 * Is this assignment target `document.cookie`?
 *
 * Accepts `window.document.cookie` and `document['cookie']` as well — the same
 * sink, and both were invisible to all three cookie rules, which compared
 * `object.name === 'document'` against a bare identifier only.
 */
export function isDocumentCookieTarget(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    memberName(node) === 'cookie' &&
    resolveGlobalObject(node.object, DOCUMENT_GLOBAL) !== null
  );
}

/** A stand-in for an interpolated expression, so attribute scanning survives concatenation. */
const OPAQUE = '\u0000';

/**
 * The statically-known text of a cookie assignment, with every interpolated
 * expression replaced by an opaque placeholder.
 *
 * `document.cookie = 'sid=' + id + '; Path=/'` used to be invisible to
 * `require-cookie-secure-attrs`, which only understood a bare literal or a
 * template — so the single most common way to set a cookie in real code was
 * the one shape it could not check.
 *
 * Returns `null` when nothing static is known.
 */
export function staticCookieText(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  followBinding = true,
): string | null {
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
    return node.value;
  }
  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    return node.quasis.map((q) => q.value.raw).join(OPAQUE);
  }
  if (
    node.type === AST_NODE_TYPES.BinaryExpression &&
    node.operator === '+'
  ) {
    const left = staticCookieText(node.left, sourceCode, followBinding);
    const right = staticCookieText(node.right, sourceCode, followBinding);
    if (left === null && right === null) return null;
    return (left ?? OPAQUE) + (right ?? OPAQUE);
  }
  if (node.type === AST_NODE_TYPES.Identifier && followBinding) {
    const init = resolveInitializer(node, sourceCode);
    return init === undefined ? null : staticCookieText(init, sourceCode, false);
  }
  return null;
}

/**
 * The cookie NAME a `document.cookie` assignment writes, or `null`.
 *
 * The name is everything before the first `=`. A placeholder anywhere in it
 * means the name itself is computed and nothing can be claimed about it.
 */
export function cookieNameFrom(text: string): string | null {
  const equals = text.indexOf('=');
  if (equals <= 0) return null;
  const name = text.slice(0, equals).trim();
  return name.includes(OPAQUE) ? null : name;
}

/**
 * Is this assignment DELETING a cookie rather than setting one?
 *
 * `document.cookie = 'sid=; Max-Age=0'` is the standard removal idiom. Demanding
 * `Secure`/`SameSite` on it is noise about a value that no longer exists.
 */
export function isCookieDeletion(text: string): boolean {
  const [pair] = text.split(';');
  const equals = pair.indexOf('=');
  if (equals < 0 || pair.slice(equals + 1).trim().length > 0) return false;
  return /;\s*(?:max-age\s*=\s*(?:0|-\d+)|expires\s*=)/i.test(text);
}
