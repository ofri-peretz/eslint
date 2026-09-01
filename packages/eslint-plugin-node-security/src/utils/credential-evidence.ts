/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared by `require-secure-credential-storage` and `require-storage-encryption`.
 *
 * Both rules previously reported ANY `.setItem(...)` or `.writeFile(...)` call with no
 * `encrypt*()` wrapper, and their two implementations were byte-identical — so every
 * match was reported twice, under two rule ids, with the same CWE. On
 * eslint-plugin-security's own corpus that meant
 * `fsp.writeFile(path.resolve(__dirname, './sitemap.xml'), sitemap)` came back as two
 * unencrypted-credential findings. A sitemap is not a credential, and `writeFile` is not
 * evidence of one.
 *
 * The two rules now answer different questions and both demand evidence:
 *
 *   require-secure-credential-storage — a credential in Web Storage (CWE-522)
 *   require-storage-encryption        — a credential written to disk (CWE-311)
 *
 * Evidence means the key or the value NAMES a credential. That is still a name match,
 * but it is a name match on the thing being stored rather than on the method doing the
 * storing — the difference between "this holds a token" and "this is a function call".
 */
import { AST_NODE_TYPES, resolveModuleBinding } from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

/**
 * Words that identify a secret. Deliberately narrow: `key` alone is absent because it
 * matches `keyboard`, `keyCode`, `objectKey` and, in the case that prompted this,
 * `const key = fs.readFileSync(path.join(__dirname, './ssl.key'))` — reading a TLS key
 * from disk at startup, which is how TLS is supposed to work.
 */
const CREDENTIAL_WORDS = [
  'password',
  'passwd',
  'secret',
  'token',
  'credential',
  'apikey',
  'api_key',
  'accesskey',
  'access_key',
  'privatekey',
  'private_key',
  'jwt',
  'sessionid',
  'session_id',
  'refreshtoken',
  'refresh_token',
  'clientsecret',
  'client_secret',
  'authtoken',
  'auth_token',
];

/**
 * Tails that make a name describe configuration ABOUT a credential rather than
 * the credential itself.
 *
 * `TOKEN_SIGNING_ALG = 'RS256'` names an algorithm. Substring matching read the
 * `token` in it and reported storing a credential in the environment — 110
 * findings from this one shape across the scanned corpus, the single largest
 * false positive this rule produces.
 *
 * Only the LAST segment is tested, so `API_TOKEN` and `CLIENT_SECRET` still
 * match on their own tails and nothing is narrowed for a real credential.
 *
 * @protocol-constant
 */
const CONFIG_ABOUT_A_CREDENTIAL: ReadonlySet<string> = new Set([
  'alg', 'algo', 'algorithm', 'cipher', 'digest',
  'expiry', 'expiration', 'ttl', 'lifetime', 'maxage', 'rotation',
  'type', 'kind', 'format', 'encoding', 'scheme',
  'length', 'len', 'size', 'count', 'limit',
  'name', 'label', 'id', 'prefix', 'suffix',
  'path', 'file', 'url', 'uri', 'endpoint', 'host', 'header',
  'issuer', 'audience', 'realm',
  'enabled', 'disabled', 'required', 'strategy', 'provider',
]);

/** Lowercase word segments of an identifier-ish name. */
function segmentsOf(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.toLowerCase());
}

function namesACredential(text: string): boolean {
  const normalized = text.toLowerCase();
  if (!CREDENTIAL_WORDS.some((word) => normalized.includes(word))) return false;

  const segments = segmentsOf(text);
  const tail = segments[segments.length - 1];
  // A name whose last word is configuration describes the credential, and a
  // description of a secret is not a secret.
  if (tail !== undefined && CONFIG_ABOUT_A_CREDENTIAL.has(tail)) return false;

  return true;
}

/** The identifier-ish name of an expression, for name evidence. Empty when there is none. */
function nameOf(node: TSESTree.Node): string {
  switch (node.type) {
    case AST_NODE_TYPES.Identifier:
      return node.name;
    case AST_NODE_TYPES.Literal:
      return typeof node.value === 'string' ? node.value : '';
    case AST_NODE_TYPES.TemplateLiteral:
      return node.quasis.map((q) => q.value.raw).join('');
    case AST_NODE_TYPES.MemberExpression:
      if (node.property.type === AST_NODE_TYPES.Identifier)
        return node.property.name;
      // `process.env['CLIENT_SECRET']` names the same slot as
      // `process.env.CLIENT_SECRET`. Reading only Identifier properties made
      // the evidence depend on bracket-versus-dot notation.
      return node.property.type === AST_NODE_TYPES.Literal &&
        typeof node.property.value === 'string'
        ? node.property.value
        : '';
    default:
      return '';
  }
}

/**
 * Does anything about this call say a credential is being stored?
 *
 * Checked against every argument, because the two receivers put the credential in
 * different positions: `localStorage.setItem('authToken', v)` names it in the key,
 * `fs.writeFile(p, apiToken)` names it in the value.
 */
export function storesACredential(node: TSESTree.CallExpression): boolean {
  return node.arguments.some((argument) => {
    if (argument.type === AST_NODE_TYPES.SpreadElement) return false;
    return namesACredential(nameOf(argument));
  });
}

/**
 * Does this single expression name a credential?
 *
 * The node-level form of the test `storesACredential` runs over a call's
 * arguments. `process.env.SESSION_TOKEN = value` is an assignment, not a call,
 * so there is no argument list to walk — the evidence is the assignment target
 * and the assigned expression, each judged on its own.
 *
 * Routed through the same `namesACredential` as every other caller on purpose:
 * a second copy of the word list is how this module's vocabulary would start
 * drifting between the rules that share it.
 */
export function expressionNamesACredential(node: TSESTree.Node): boolean {
  return namesACredential(nameOf(node));
}

/**
 * Modules whose exports are cryptography.
 *
 * `node:` prefixes are stripped by `resolveModuleBinding` before the lookup, so
 * `crypto` covers `require('node:crypto')` too. Membership is exact — this is a
 * closed list of package names, not a substring test, so a local
 * `./utils/crypto-helpers` does not join it by containing the word.
 */
const CRYPTO_MODULES: ReadonlySet<string> = new Set([
  'crypto',
  'crypto-js',
  'node-forge',
  'tweetnacl',
  'libsodium',
  'libsodium-wrappers',
  'libsodium-wrappers-sumo',
  'sodium-native',
  'jose',
  'node-jose',
  '@aws-crypto/client-node',
  '@google-cloud/kms',
]);

/**
 * Export names that ENCRYPT, as opposed to hash, sign, derive or decrypt.
 *
 * Exact membership against a closed API surface, and only ever consulted once
 * the callee has already been proven to come from a module in
 * {@link CRYPTO_MODULES} — so the bare `encrypt` entry cannot match a local
 * `function encrypt(v) { return v; }`. It is there for `CryptoJS.AES.encrypt`
 * and `subtle.encrypt`, whose terminal segment really is that word.
 *
 * `createHash`, `createHmac`, `pbkdf2`, `randomBytes` and `createDecipheriv`
 * are deliberately absent. Hashing a credential is a different control, and
 * `crypto.randomBytes(32)` next to a token is a nonce, not a ciphertext.
 */
const ENCRYPTION_APIS: ReadonlySet<string> = new Set([
  // node:crypto
  'publicEncrypt',
  'privateEncrypt',
  'createCipheriv',
  'createCipher',
  // WebCrypto / SubtleCrypto, and the jose/node-jose spellings of it
  'encrypt',
  'wrapKey',
  'CompactEncrypt',
  'FlattenedEncrypt',
  'GeneralEncrypt',
  'compactEncrypt',
  // libsodium
  'crypto_secretbox_easy',
  'crypto_box_easy',
  'crypto_box_seal',
  'crypto_aead_chacha20poly1305_ietf_encrypt',
  'crypto_aead_xchacha20poly1305_ietf_encrypt',
  'crypto_secretstream_xchacha20poly1305_push',
  // tweetnacl
  'secretbox',
  'box',
]);

/**
 * The methods a cipher OBJECT exposes once a factory has produced it.
 *
 * `createCipheriv` does not return the ciphertext; `cipher.update(v)` and
 * `cipher.final()` do. These names are only ever consulted on a receiver that
 * has already been proven to come from an encryption call, so they are a
 * continuation of that proof rather than evidence of their own — `db.update(v)`
 * never reaches this set.
 */
const CIPHER_OUTPUT_METHODS: ReadonlySet<string> = new Set(['update', 'final']);

/** The function a callee identifier resolves to, when it is declared in this file. */
function localFunctionOf(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
): TSESTree.FunctionLike | null {
  if (node.type !== AST_NODE_TYPES.Identifier) return null;
  let current: TSESLint.Scope.Scope | null = scope;
  let variable: TSESLint.Scope.Variable | undefined;
  while (current && !variable) {
    variable = current.set?.get(node.name);
    current = current.upper;
  }
  if (!variable || variable.defs.length !== 1) return null;
  const def = variable.defs[0];
  if (def.type === 'FunctionName') return def.node as TSESTree.FunctionLike;
  if (def.type !== 'Variable') return null;
  const init = def.node.init;
  if (
    init?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    init?.type === AST_NODE_TYPES.FunctionExpression
  ) {
    return init as TSESTree.FunctionLike;
  }
  return null;
}

/** Every expression a function hands back to its caller. */
function returnedExpressions(fn: TSESTree.FunctionLike): TSESTree.Node[] {
  // `declare function seal(v: string): string;` and an interface method
  // signature are both `FunctionLike` with NO body — TSDeclareFunction spells
  // that `undefined`, not `null`, and reading `.type` off it threw out of the
  // rule. A rule must not crash the lint run because a file declares an ambient
  // function; the answer is "nothing to inspect", which is "not proven".
  const body: TSESTree.Node | null | undefined = fn.body;
  if (!body) return [];
  // `const encrypt = (v) => cipher.update(v)` — the concise body IS the return.
  if (body.type !== AST_NODE_TYPES.BlockStatement) return [body];
  const found: TSESTree.Node[] = [];
  const walk = (statements: readonly TSESTree.Statement[]): void => {
    for (const statement of statements) {
      if (statement.type === AST_NODE_TYPES.ReturnStatement) {
        if (statement.argument) found.push(statement.argument);
      } else if (statement.type === AST_NODE_TYPES.IfStatement) {
        walk([statement.consequent]);
        if (statement.alternate) walk([statement.alternate]);
      } else if (statement.type === AST_NODE_TYPES.BlockStatement) {
        walk(statement.body);
      } else if (statement.type === AST_NODE_TYPES.TryStatement) {
        walk(statement.block.body);
      }
    }
  };
  walk(body.body);
  return found;
}

/**
 * Does this expression PROVABLY carry the output of a cryptographic encryption?
 *
 * Three ways to prove it, and no way to prove it by spelling:
 *
 *  1. the callee resolves — through devkit's `resolveModuleBinding`, i.e. back
 *     through the import or `require` that introduced the name — to a module in
 *     {@link CRYPTO_MODULES}, with a terminal export in {@link ENCRYPTION_APIS};
 *  2. the RECEIVER resolves that way, which is how the real Node idiom reads:
 *     `const cipher = createCipheriv(…)` then
 *     `Buffer.concat([cipher.update(v), cipher.final()])`;
 *  3. the callee is a function declared in this file whose returned expression
 *     satisfies (1) or (2) — a wrapper that delegates is encryption, and a
 *     wrapper that does not is not, whatever it is called.
 *
 * The walk into arguments and array elements exists for (2): the ciphertext is
 * routinely handed straight to `Buffer.concat`, `.toString('base64')` or
 * `JSON.stringify` before it is stored, and the proof lives inside those.
 */
function provablyEncrypts(
  value: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth: number,
  seen: Set<TSESTree.Node>,
): boolean {
  // Eight, not the four this started at. The canonical Node wrapper —
  //
  //   function seal(v) { const c = createCipheriv(…); return Buffer.concat([c.update(v), c.final()]); }
  //   localStorage.setItem('authToken', seal(token));
  //
  // costs six hops before the proof is in hand (wrapper, `Buffer.concat`, the
  // array, `c.update`, the receiver, the declarator), and at four the walk gave
  // up one hop short and reported a correctly encrypted credential. `seen` is
  // what makes termination safe; the depth is only a work bound.
  if (depth > 8 || seen.has(value)) return false;
  seen.add(value);
  const recurse = (node: TSESTree.Node): boolean =>
    provablyEncrypts(node, sourceCode, depth + 1, seen);

  switch (value.type) {
    // `await subtle.encrypt(algorithm, key, data)` — WebCrypto is promise-based,
    // so every correct browser/Node-19+ encryption arrives wrapped in one.
    case AST_NODE_TYPES.AwaitExpression:
      return recurse(value.argument);
    case AST_NODE_TYPES.ArrayExpression:
      return value.elements.some(
        (element) => element !== null && recurse(element),
      );
    case AST_NODE_TYPES.Identifier: {
      // `const sealed = cipher.update(v); writeFile(p, sealed)` — one binding hop.
      let current: TSESLint.Scope.Scope | null = sourceCode.getScope(value);
      let variable: TSESLint.Scope.Variable | undefined;
      while (current && !variable) {
        variable = current.set?.get(value.name);
        current = current.upper;
      }
      if (!variable || variable.defs.length !== 1) return false;
      const def = variable.defs[0];
      if (def.type !== 'Variable' || !def.node.init) return false;
      return recurse(def.node.init);
    }
    case AST_NODE_TYPES.CallExpression: {
      const callee = value.callee;
      const scope = sourceCode.getScope(value);

      const binding = resolveModuleBinding(callee, scope);
      if (
        binding &&
        CRYPTO_MODULES.has(binding.module) &&
        binding.path.length > 0 &&
        ENCRYPTION_APIS.has(binding.path[binding.path.length - 1] as string)
      ) {
        return true;
      }

      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        !callee.computed &&
        callee.property.type === AST_NODE_TYPES.Identifier &&
        CIPHER_OUTPUT_METHODS.has(callee.property.name) &&
        recurse(callee.object)
      ) {
        return true;
      }

      const fn = localFunctionOf(callee, scope);
      if (fn && returnedExpressions(fn).some((returned) => recurse(returned))) {
        return true;
      }

      return value.arguments.some(
        (argument) =>
          argument.type !== AST_NODE_TYPES.SpreadElement && recurse(argument),
      );
    }
    default:
      return false;
  }
}

/**
 * Is the STORED VALUE encrypted on the way in?
 *
 * Argument 1 only, for both sinks — `setItem(key, value)` and `writeFile(path, data)`
 * agree on the position. Checking "any argument" meant
 * `localStorage.setItem('authToken', token, encrypt(metadata))` stored the token in
 * cleartext and silenced the rule with an encryption call on something else entirely.
 */
export function isEncrypted(
  node: TSESTree.CallExpression,
  sourceCode: TSESLint.SourceCode,
): boolean {
  return isEncryptedExpression(node.arguments[1], sourceCode);
}

/**
 * Is this expression the RESULT of an encryption call?
 *
 * Split out of `isEncrypted` so the environment sink can share it: there the
 * value is the right-hand side of an assignment, not an argument, but the
 * question is identical. `undefined` — a call with no second argument, an
 * assignment the caller could not read — is not encrypted.
 *
 * This used to decide from the callee's SPELLING: any call whose callee had a
 * camelCase token starting `encrypt` counted, so
 *
 * ```js
 * const encrypt = (v) => v;                       // encrypts nothing
 * localStorage.setItem('authToken', encrypt(token));
 * ```
 *
 * silenced the finding, and so did every unresolvable global that happened to be
 * spelled that way. It was suppress-direction name inference — it cost recall
 * without ever announcing itself — and it is the "behind a helper" shape
 * CLAUDE.md records as having shipped green past `lint:name-inference`, because
 * the substring test lived in `calleeEncrypts(name)` one call away from any
 * `.name`. The question is now answered by {@link provablyEncrypts}, which reads
 * where the callee came from instead of what it is called.
 */
export function isEncryptedExpression(
  value: TSESTree.Node | undefined,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (value === undefined) return false;
  return provablyEncrypts(value, sourceCode, 0, new Set());
}

/**
 * Client-side persistent stores that keep what you give them, in the clear:
 * `localStorage` and `sessionStorage` in the browser, `AsyncStorage` in React Native.
 * React Native's own docs say AsyncStorage is unencrypted, which is exactly why a
 * credential in it is a finding.
 */
const CLIENT_STORES = new Set([
  'localStorage',
  'sessionStorage',
  'AsyncStorage',
]);

/** `localStorage.setItem(...)` / `AsyncStorage.setItem(...)` — client persistent storage. */
export function isWebStorageWrite(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (callee.property.type !== AST_NODE_TYPES.Identifier) return false;
  if (callee.property.name !== 'setItem') return false;

  const object = callee.object;
  if (object.type === AST_NODE_TYPES.Identifier) {
    return CLIENT_STORES.has(object.name);
  }
  // `window.localStorage.setItem(...)` / `globalThis.sessionStorage.setItem(...)`
  return (
    object.type === AST_NODE_TYPES.MemberExpression &&
    object.property.type === AST_NODE_TYPES.Identifier &&
    CLIENT_STORES.has(object.property.name)
  );
}

/**
 * `process.env.X = …` / `process.env['X'] = …` — the environment as a store.
 *
 * The Node sink this pair of rules was missing entirely. `isWebStorageWrite`
 * recognises `localStorage`, `sessionStorage` and `AsyncStorage`; none of the
 * three exists in Node, so inside `eslint-plugin-node-security`
 * `require-secure-credential-storage` had no reachable sink at all — it was a
 * browser rule filed under Node, quiet on every server codebase it ever ran on.
 *
 * Writing a secret here is CWE-526: the value is inherited by every child
 * process the app spawns, readable at `/proc/<pid>/environ`, captured verbatim
 * by crash dumps and by the `process.env` dumps that error reporters send
 * upstream. Reading `process.env.TOKEN` is fine and extremely common — only the
 * WRITE is the finding, which is why this takes an AssignmentExpression rather
 * than looking at member reads.
 *
 * Distinct from `no-env-injection`, which judges the environment variable's
 * KEY for request taint and never looks at the value. A literal key holding a
 * secret is invisible to it.
 */
export function isEnvironmentWrite(
  node: TSESTree.AssignmentExpression,
): boolean {
  const target = node.left;
  if (target.type !== AST_NODE_TYPES.MemberExpression) return false;
  const object = target.object;
  return (
    object.type === AST_NODE_TYPES.MemberExpression &&
    !object.computed &&
    object.object.type === AST_NODE_TYPES.Identifier &&
    object.object.name === 'process' &&
    object.property.type === AST_NODE_TYPES.Identifier &&
    object.property.name === 'env'
  );
}

/** `fs.writeFile(...)` / `writeFileSync` / `appendFile` — a credential landing on disk. */
export function isFileWrite(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  if (callee.property.type !== AST_NODE_TYPES.Identifier) return false;
  return [
    'writeFile',
    'writeFileSync',
    'appendFile',
    'appendFileSync',
  ].includes(callee.property.name);
}
