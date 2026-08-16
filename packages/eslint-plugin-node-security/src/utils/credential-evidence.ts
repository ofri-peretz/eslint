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
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';

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

function namesACredential(text: string): boolean {
  const normalized = text.toLowerCase();
  return CREDENTIAL_WORDS.some((word) => normalized.includes(word));
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
      if (node.property.type === AST_NODE_TYPES.Identifier) return node.property.name;
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
 * Does this callee name encrypt?
 *
 * Matched at a TOKEN boundary, not by substring: `decrypt` contains `encrypt`, so a
 * plain `.includes('encrypt')` read `writeFile(path, decrypt(blob))` as safely encrypted
 * — the exact inverse of the truth, and the reason both rules sat in
 * `scripts/lint-name-inference.ts` as recorded debt. Splitting on camelCase and
 * underscores means `encryptSync` and `aes256Encrypt` match while `decrypt` does not.
 */
function calleeEncrypts(name: string): boolean {
  return name
    .split(/(?=[A-Z])|_/)
    .some((token) => token.toLowerCase().startsWith('encrypt'));
}

/**
 * Is the STORED VALUE encrypted on the way in?
 *
 * Argument 1 only, for both sinks — `setItem(key, value)` and `writeFile(path, data)`
 * agree on the position. Checking "any argument" meant
 * `localStorage.setItem('authToken', token, encrypt(metadata))` stored the token in
 * cleartext and silenced the rule with an encryption call on something else entirely.
 *
 * Only a CALL whose callee names encryption counts — `encrypt(v)`, `crypto.encrypt(v)`,
 * `encryptSync(v)`. A variable that happens to be named `encrypted` is not proof that
 * anything encrypted it.
 */
export function isEncrypted(node: TSESTree.CallExpression): boolean {
  return isEncryptedExpression(node.arguments[1]);
}

/**
 * Is this expression the RESULT of an encryption call?
 *
 * Split out of `isEncrypted` so the environment sink can share it: there the
 * value is the right-hand side of an assignment, not an argument, but the
 * question is identical. `undefined` — a call with no second argument, an
 * assignment the caller could not read — is not encrypted.
 */
export function isEncryptedExpression(value: TSESTree.Node | undefined): boolean {
  if (value?.type !== AST_NODE_TYPES.CallExpression) return false;

  const callee = value.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return calleeEncrypts(callee.name);
  }
  return (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    calleeEncrypts(callee.property.name)
  );
}

/**
 * Client-side persistent stores that keep what you give them, in the clear:
 * `localStorage` and `sessionStorage` in the browser, `AsyncStorage` in React Native.
 * React Native's own docs say AsyncStorage is unencrypted, which is exactly why a
 * credential in it is a finding.
 */
const CLIENT_STORES = new Set(['localStorage', 'sessionStorage', 'AsyncStorage']);

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
export function isEnvironmentWrite(node: TSESTree.AssignmentExpression): boolean {
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
  return ['writeFile', 'writeFileSync', 'appendFile', 'appendFileSync'].includes(
    callee.property.name,
  );
}
