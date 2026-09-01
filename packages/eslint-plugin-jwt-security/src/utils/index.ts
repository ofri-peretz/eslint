/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Shared utilities for JWT security rules
 *
 * Library detection, pattern matching, and common helpers.
 */
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createModuleEvidence,
  propertyName,
} from '@interlace/eslint-devkit';

/*
 * SHARED by seven rules, so this one gate was a blind spot in all of them.
 * `jwt['sign']({ password }, secret)` signs exactly what `jwt.sign(...)` does,
 * and 31 of `no-sensitive-payload`'s own true positives went silent when
 * written that way.
 */

/**
 * Supported JWT libraries
 */
export const JWT_LIBRARIES = {
  JSONWEBTOKEN: 'jsonwebtoken',
  JOSE: 'jose',
  EXPRESS_JWT: 'express-jwt',
  NESTJS_JWT: '@nestjs/jwt',
  JWKS_RSA: 'jwks-rsa',
  JWT_DECODE: 'jwt-decode',
} as const;

export type JwtLibrary = (typeof JWT_LIBRARIES)[keyof typeof JWT_LIBRARIES];

/**
 * Insecure algorithms that should be flagged
 */
export const INSECURE_ALGORITHMS = new Set([
  'none',
  'None',
  'NONE',
  'HS256', // Only insecure when used with public keys
  'HS384',
  'HS512',
]);

/**
 * Algorithms vulnerable to confusion attacks when used with asymmetric keys
 */
export const SYMMETRIC_ALGORITHMS = new Set(['HS256', 'HS384', 'HS512']);

/**
 * Recommended secure algorithms
 */
export const SECURE_ALGORITHMS = new Set([
  'RS256',
  'RS384',
  'RS512',
  'ES256',
  'ES384',
  'ES512',
  'PS256',
  'PS384',
  'PS512',
  'EdDSA',
]);

/**
 * Sensitive field names that should not be in JWT payload
 * All lowercase for case-insensitive matching
 */
export const SENSITIVE_PAYLOAD_FIELDS = new Set([
  // Passwords
  'password',
  'passwd',
  'pwd',
  'pass',
  'secret',
  // API Keys
  'apikey',
  'api_key',
  'api-key',
  'apisecret',
  'api_secret',
  'api-secret',
  // Tokens
  'accesstoken',
  'access_token',
  'access-token',
  'refreshtoken',
  'refresh_token',
  'refresh-token',
  'bearertoken',
  'bearer_token',
  'bearer-token',
  // Keys
  'privatekey',
  'private_key',
  'private-key',
  'secretkey',
  'secret_key',
  'secret-key',
  // PII - Personal Identifiable Information
  'email',
  'emailaddress',
  'email_address',
  'email-address',
  'phone',
  'phonenumber',
  'phone_number',
  'phone-number',
  'ssn',
  'socialsecuritynumber',
  'social_security_number',
  'dob',
  'dateofbirth',
  'date_of_birth',
  'birthdate',
  'address',
  'streetaddress',
  'street_address',
  // Financial
  'creditcard',
  'credit_card',
  'credit-card',
  'cardnumber',
  'card_number',
  'card-number',
  'cvv',
  'cvc',
  'securitycode',
  'security_code',
  'pin',
  'pincode',
  'pin_code',
  'bankaccount',
  'bank_account',
  'bank-account',
  'accountnumber',
  'account_number',
  'account-number',
  'routingnumber',
  'routing_number',
  'routing-number',
]);

/**
 * JWT method patterns for different operations
 */
export const JWT_METHODS = {
  SIGN: new Set(['sign', 'signJWT', 'SignJWT']),
  VERIFY: new Set(['verify', 'verifyJWT', 'jwtVerify']),
  // `decodeJwt` is jose's actual export. The set listed `decodeJWT` — an
  // all-caps spelling no JWT library ships — so every `decodeJwt(token)` call
  // in a file importing jose went unreported, despite jose being a listed
  // library in JWT_LIBRARIES. Verified against the installed package:
  // `Object.keys(require('jose')).filter(k => /decode/i.test(k))` is
  // `['decodeJwt', 'decodeProtectedHeader']`.
  //
  // `decodeProtectedHeader` is deliberately NOT here: reading the header to
  // pick a key before verifying is the documented jose flow, and the rule
  // already carries `allowHeaderInspection` for that case.
  DECODE: new Set(['decode', 'jwtDecode', 'decodeJWT', 'decodeJwt']),
} as const;

/** Package roots whose API these method names belong to. */
const JWT_LIBRARY_ROOTS: ReadonlySet<string> = new Set(
  Object.values(JWT_LIBRARIES),
);

/**
 * `import argon = require('argon2')` -> `'argon2'`.
 *
 * TypeScript's grammar only admits a string literal in an external module
 * reference, so the value is read straight through and the caller's
 * `typeof === 'string'` check is the only guard needed. A namespace alias
 * (`import A = B.C`) loads nothing and yields `null`.
 */
function importEqualsSpecifierOf(
  stmt: TSESTree.TSImportEqualsDeclaration,
): string | null {
  const ref = stmt.moduleReference;
  if (ref.type !== AST_NODE_TYPES.TSExternalModuleReference) return null;
  // TypeScript's grammar only admits a string literal in an external module
  // reference, so a `typeof !== 'string'` arm here is a branch no parser can
  // reach — and an unreachable branch is a permanently red coverage gate.
  return String((ref.expression as TSESTree.Literal).value);
}

/**
 * `require('x')` -> `'x'`, including when member-accessed.
 *
 * `const { sign } = require('jose').default` and
 * `const jwt = require('jsonwebtoken')` are the same load; anything that is not
 * a call to `require` with a string literal is not one at all.
 */
function requireSpecifierOf(node: TSESTree.Node | null | undefined): string | null {
  if (node == null) return null;
  // `require('jose').jwtVerify` — the call is the receiver.
  const call =
    node.type === AST_NODE_TYPES.MemberExpression ? node.object : node;
  if (
    call.type !== AST_NODE_TYPES.CallExpression ||
    call.callee.type !== AST_NODE_TYPES.Identifier ||
    call.callee.name !== 'require'
  ) {
    return null;
  }
  const [arg] = call.arguments;
  return arg?.type === AST_NODE_TYPES.Literal && typeof arg.value === 'string'
    ? arg.value
    : null;
}

/**
 * `jose/jwt/verify` -> `jose`; `@nestjs/jwt/dist/x` -> `@nestjs/jwt`.
 *
 * Deno's prefixes are stripped first, matching the devkit probe that now opens
 * the file gate. Without that the two disagree: `import jwt from
 * 'npm:jsonwebtoken'` opens the gate and is then rejected as a *foreign*
 * receiver, which is the worst of both — the file is judged to use JWT and
 * every call in it is judged not to.
 *
 * `String.split` always returns at least one element, so index 0 needs no
 * fallback — a `?? ''` there is a branch no test could ever reach.
 */
function packageRootOf(rawSource: string): string {
  const source = denormalizeDenoSpecifier(rawSource);
  const parts = source.split('/');
  return source.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
}

/** `npm:jose` -> `jose`; `https://deno.land/x/jose@v5.0.0/index.ts` -> `jose`. */
function denormalizeDenoSpecifier(source: string): string {
  if (source.startsWith('npm:')) return source.slice(4);
  const deno = /^https?:\/\/deno\.land\/x\/([^@/]+)/.exec(source);
  return deno ? deno[1]! : source;
}

/**
 * Whether this file loads a JWT library at all.
 *
 * Through the devkit probe, not a private scanner. The private one read
 * `Program.body` — top-level statements only — which is a narrower gate than it
 * looks: `function handler() { const jwt = require('jsonwebtoken'); … }` is
 * ordinary lazy-loading CommonJS and was exempt from every rule, as were
 * `await import('jsonwebtoken')`, `export { sign } from 'jose'` and Deno's
 * `npm:jsonwebtoken`. `createModuleEvidence` walks the whole tree, covers all
 * of those, and knows that `function f(require) { require('jose') }` is a
 * parameter call rather than a module load.
 */
const fileUsesJwtLibrary = createModuleEvidence({
  packages: Object.values(JWT_LIBRARIES),
});

function fileImportsJwtLibrary(node: TSESTree.Node): boolean {
  let root: TSESTree.Node = node;
  while (root.parent) root = root.parent;
  if (root.type !== 'Program') return false;
  return fileUsesJwtLibrary(root);
}

/**
 * Whether the call's receiver is a binding imported from something that is
 * *not* a JWT library.
 *
 * The file-level gate above is not enough on its own: a JWT tutorial imports
 * `jsonwebtoken` **and** `argon2`, so `argon.verify(user.hash, dto.password)`
 * sits in a file that passes it (measured on vladwulf/nestjs-jwts).
 *
 * Only an explicit foreign import rejects. A receiver that resolves to nothing
 * — `this.jwtService.sign(...)`, a destructured local, a re-export — is left
 * alone, because a JWT client is very often injected rather than imported, and
 * demanding a resolvable import would trade this false-positive class for a
 * false-negative one.
 *
 * It reads every load spelling, not just `ImportDeclaration`, and that is not a
 * nicety. Opening the file gate to CommonJS without opening this check too is
 * strictly worse than leaving both shut: the file passes the gate, the receiver
 * resolves to nothing, and the foreign call is reported. Measured on the exact
 * `argon2` + `jsonwebtoken` pair above, written CommonJS, four rules —
 * `require-algorithm-whitelist`, `require-issuer-validation`,
 * `require-audience-validation`, `require-max-age` — fired on
 * `argon.verify(user.hash, dto.password)` while the identical ESM file was
 * correctly silent.
 */
function receiverIsForeignImport(node: TSESTree.CallExpression): boolean {
  if (node.callee.type !== 'MemberExpression') return false;
  // Walk to the root of the receiver chain. `sdk.token.decode(t)` has a
  // MemberExpression receiver, so reading `callee.object` alone found no
  // Identifier and gave up before ever checking where `sdk` came from — the
  // gate simply did not apply to any call more than one member deep.
  let object: TSESTree.Node = node.callee.object;
  while (object.type === AST_NODE_TYPES.MemberExpression) object = object.object;
  if (object.type !== AST_NODE_TYPES.Identifier) return false;

  // Reached only after `fileImportsJwtLibrary` returned true, which already
  // proved the root is a Program — so no type guard here would be reachable.
  let root = node as TSESTree.Node;
  while (root.parent) root = root.parent;

  for (const stmt of (root as TSESTree.Program).body) {
    const source = bindingSourceOf(stmt, object.name);
    if (source === null) continue;
    // Found where this receiver came from: foreign package -> not a JWT call.
    return !JWT_LIBRARY_ROOTS.has(packageRootOf(source));
  }
  return false;
}

/**
 * The specifier a top-level statement binds `name` to, in any load spelling.
 *
 * A relative specifier is returned as-is: `packageRootOf('./crypto')` is
 * `'.'`, which is not a JWT root, so a local wrapper reads as foreign — the
 * same verdict `import x from './crypto'` already produced.
 */
function bindingSourceOf(stmt: TSESTree.Node, name: string): string | null {
  // import argon from 'argon2'  /  import { hash } from 'argon2'
  if (stmt.type === AST_NODE_TYPES.ImportDeclaration) {
    const binds = (stmt.specifiers ?? []).some((spec) => spec.local?.name === name);
    return binds && typeof stmt.source.value === 'string' ? stmt.source.value : null;
  }
  // import argon = require('argon2')
  if (stmt.type === AST_NODE_TYPES.TSImportEqualsDeclaration) {
    return stmt.id.name === name ? importEqualsSpecifierOf(stmt) : null;
  }
  // const argon = require('argon2')  /  const { verify } = require('argon2')
  if (stmt.type === AST_NODE_TYPES.VariableDeclaration) {
    for (const declarator of stmt.declarations) {
      if (!patternBinds(declarator.id, name)) continue;
      const source = requireSpecifierOf(declarator.init);
      if (source !== null) return source;
    }
  }
  return null;
}

/** Whether a declarator's target binds `name`, directly or by destructuring. */
function patternBinds(id: TSESTree.Node, name: string): boolean {
  if (id.type === AST_NODE_TYPES.Identifier) return id.name === name;
  if (id.type === AST_NODE_TYPES.ObjectPattern) {
    return id.properties.some(
      (prop) =>
        prop.type === AST_NODE_TYPES.Property &&
        prop.value.type === AST_NODE_TYPES.Identifier &&
        prop.value.name === name,
    );
  }
  return false;
}

/**
 * Check if a node represents a call to a JWT library method.
 *
 * **The file must import a JWT library.** `sign`, `verify` and `decode` are
 * among the most common method names in JavaScript, and matching them on name
 * alone reported, in real repositories:
 *
 * - `new TextDecoder('gbk').decode(data)` — a text decoder (buqiyuan/nest-admin)
 * - `textDecoder.decode(slice)` — likewise (the-mirror)
 * - `argon.verify(user.hash, dto.password)` — argon2 password verification
 *   (vladwulf/nestjs-jwts)
 *
 * None involve a JWT. Requiring the import is *local* evidence — no project
 * scan, nothing to go stale — and a file that never imports a JWT library is
 * one these rules genuinely have nothing to say about.
 *
 * A second, narrower gate then rejects a receiver that is *explicitly imported
 * from something else* — see `receiverIsForeignImport`. The file gate alone was
 * not enough: a JWT tutorial imports `jsonwebtoken` **and** `argon2`, so
 * `argon.verify(...)` lived in a file that passed it.
 *
 * Neither gate demands that the receiver trace back to a JWT import, because a
 * JWT client is very often injected (`private readonly jwtService: JwtService`)
 * rather than constructed from one. Requiring that would trade this
 * false-positive class for a false-negative one.
 */
/**
 * Built-ins whose instances answer to a JWT method name by coincidence.
 *
 * `decode` is the obvious collision — every `TextDecoder` has one — but the
 * general rule is that a receiver built from a platform constructor was never
 * a JWT client, whatever the file imports elsewhere.
 */
const NON_JWT_CONSTRUCTORS: ReadonlySet<string> = new Set([
  'TextDecoder',
  'TextEncoder',
  'URL',
  'URLSearchParams',
  'Buffer',
  'Uint8Array',
  'Response',
  'Request',
  'Headers',
]);

/** `new TextDecoder()` as the receiver of a call. */
function receiverIsForeignConstruction(receiver: TSESTree.Node): boolean {
  return (
    receiver.type === AST_NODE_TYPES.NewExpression &&
    receiver.callee.type === AST_NODE_TYPES.Identifier &&
    NON_JWT_CONSTRUCTORS.has(receiver.callee.name)
  );
}

/**
 * Whether a BARE callee — `verify(a, b)`, not `jwt.verify(a, b)` — resolves to
 * something that is not a JWT library's.
 *
 * The file gate is what a foreign `verify` normally dies on, and on its own it
 * is one import away from failing. shardeum/json-rpc-server
 * `src/middlewares/debugMiddleware.ts:66` declares its own
 * `function verify(obj: crypto.SignedObject, expectedPk?: string)` over Shardus
 * ed25519 and calls it bare; LavaMoat's `packages/harden` imports `verify`
 * from a local module. Both were reported as JWT verification without an
 * algorithm whitelist. Neither repo contains a JWT — but a single unrelated
 * `import jwt from 'jsonwebtoken'` elsewhere in either file is all it would
 * take to bring the finding back.
 *
 * So the callee is resolved the same way a member receiver already is: an
 * explicit binding to a non-JWT specifier rejects, and so does a definition in
 * this very file. A name that resolves to nothing is still left alone, for the
 * injected-client reason in `receiverIsForeignImport`.
 */
function calleeIsForeign(node: TSESTree.CallExpression): boolean {
  if (node.callee.type !== AST_NODE_TYPES.Identifier) return false;
  const name = node.callee.name;

  // Reached only after `fileImportsJwtLibrary` proved the root is a Program.
  let root = node as TSESTree.Node;
  while (root.parent) root = root.parent;

  for (const stmt of (root as TSESTree.Program).body) {
    // `export function verify(…)` and `export default function verify(…)` bind
    // exactly as the unexported spelling does. `export { verify } from './x'`
    // is an ExportNamedDeclaration with no declaration of its own, which is why
    // this falls back to the statement rather than assuming one is there.
    const declaration =
      stmt.type === AST_NODE_TYPES.ExportNamedDeclaration ||
      stmt.type === AST_NODE_TYPES.ExportDefaultDeclaration
        ? (stmt.declaration ?? stmt)
        : stmt;

    if (declaration.type === AST_NODE_TYPES.FunctionDeclaration) {
      // `export default function () {}` binds no name at all, so it cannot be
      // what a bare `verify(…)` resolves to.
      if (declaration.id !== null && declaration.id.name === name) return true;
      continue;
    }

    const source = bindingSourceOf(declaration, name);
    if (source !== null) return !JWT_LIBRARY_ROOTS.has(packageRootOf(source));

    // A local value — `const verify = (obj, pk) => …`. `bindingSourceOf`
    // returns null both for "does not bind" and "binds to something that is
    // not a module load", so the binding has to be re-asked here.
    if (
      declaration.type === AST_NODE_TYPES.VariableDeclaration &&
      declaration.declarations.some((declarator) => patternBinds(declarator.id, name))
    ) {
      return true;
    }
  }
  return false;
}

export function isJwtLibraryCall(
  node: TSESTree.CallExpression,
  targetMethods: Set<string>,
): boolean {
  if (!fileImportsJwtLibrary(node)) {
    return false;
  }
  if (receiverIsForeignImport(node)) {
    return false;
  }
  if (calleeIsForeign(node)) {
    return false;
  }

  // Check member expression: jwt.verify(), jose.jwtVerify()
  if (node.callee.type === 'MemberExpression') {
    // `new TextDecoder().decode(bytes)` shares a method name with JWT decoding
    // and nothing else. A receiver constructed from a global built-in is not a
    // JWT client, and auth0's express-openid-connect has exactly this line in
    // `lib/appSession.js` — reported as decoding a token without verifying it.
    if (receiverIsForeignConstruction(node.callee.object)) {
      return false;
    }
    // A dynamic `jwt[m](...)` names no method and matches nothing.
    const method = propertyName(node.callee);
    if (method !== null) {
      return targetMethods.has(method);
    }
  }

  // Check direct calls: jwtVerify(), jwtDecode()
  if (node.callee.type === 'Identifier') {
    return targetMethods.has(node.callee.name);
  }

  return false;
}

/**
 * Check if a node is a string literal with a specific value
 */
export function isStringLiteral(
  node: TSESTree.Node,
  value?: string,
): node is TSESTree.Literal {
  if (node.type !== 'Literal' || typeof node.value !== 'string') {
    return false;
  }
  return value === undefined || node.value === value;
}

/**
 * Extract algorithm from options object
 */
export function extractAlgorithms(
  optionsNode: TSESTree.ObjectExpression,
): string[] {
  const algorithms: string[] = [];

  for (const prop of optionsNode.properties) {
    if (prop.type !== 'Property' || prop.key.type !== 'Identifier') {
      continue;
    }

    const keyName = prop.key.name;
    if (
      keyName !== 'algorithms' &&
      keyName !== 'algorithm' &&
      keyName !== 'alg'
    ) {
      continue;
    }

    // Single algorithm: { algorithm: 'HS256' }
    if (prop.value.type === 'Literal' && typeof prop.value.value === 'string') {
      algorithms.push(prop.value.value);
    }

    // Array of algorithms: { algorithms: ['RS256', 'ES256'] }
    if (prop.value.type === 'ArrayExpression') {
      for (const elem of prop.value.elements) {
        if (elem && elem.type === 'Literal' && typeof elem.value === 'string') {
          algorithms.push(elem.value);
        }
      }
    }
  }

  return algorithms;
}

/**
 * Check if options object has a specific property set
 */
export function hasOption(
  optionsNode: TSESTree.ObjectExpression,
  optionName: string,
): boolean {
  return optionsNode.properties.some(
    (prop): prop is TSESTree.Property =>
      prop.type === 'Property' &&
      prop.key.type === 'Identifier' &&
      prop.key.name === optionName,
  );
}

/**
 * Get the value of a specific option from options object
 */
export function getOptionValue(
  optionsNode: TSESTree.ObjectExpression,
  optionName: string,
): TSESTree.Node | undefined {
  for (const prop of optionsNode.properties) {
    if (
      prop.type === 'Property' &&
      prop.key.type === 'Identifier' &&
      prop.key.name === optionName
    ) {
      return prop.value;
    }
  }
  return undefined;
}

/**
 * Check if a literal appears to be a weak secret (short string)
 */
export function isWeakSecret(node: TSESTree.Node, minLength = 32): boolean {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value.length < minLength;
  }
  return false;
}

/**
 * Check if a node is an environment variable access (safe pattern)
 */
export function isEnvVariable(node: TSESTree.Node): boolean {
  // process.env.JWT_SECRET
  if (
    node.type === 'MemberExpression' &&
    node.object.type === 'MemberExpression' &&
    node.object.object.type === 'Identifier' &&
    node.object.object.name === 'process' &&
    node.object.property.type === 'Identifier' &&
    node.object.property.name === 'env'
  ) {
    return true;
  }

  return false;
}

/**
 * Check if this call looks like a JWT sign operation
 */
export function isSignOperation(node: TSESTree.CallExpression): boolean {
  return isJwtLibraryCall(node, JWT_METHODS.SIGN);
}

/**
 * Check if this call looks like a JWT verify operation
 */
export function isVerifyOperation(node: TSESTree.CallExpression): boolean {
  return isJwtLibraryCall(node, JWT_METHODS.VERIFY);
}

/**
 * Check if this call looks like a JWT decode operation (no verification)
 */
export function isDecodeOperation(node: TSESTree.CallExpression): boolean {
  return isJwtLibraryCall(node, JWT_METHODS.DECODE);
}

/**
 * Get the options argument from a JWT call
 * For jwt.verify(token, secret, options) -> returns options
 * For jwt.sign(payload, secret, options) -> returns options
 */
export function getOptionsArgument(
  node: TSESTree.CallExpression,
  optionsIndex = 2,
): TSESTree.ObjectExpression | undefined {
  const arg = node.arguments[optionsIndex];
  if (arg && arg.type === 'ObjectExpression') {
    return arg;
  }
  return undefined;
}

// `isTestFile` used to live here. It is now `isTestFilePath` in
// @interlace/eslint-devkit — the `/(tests?|specs?)/` form above matched the
// substring anywhere in the path, so a repo checked out under `~/test/`
// disabled the rule for every file in it. Locked by
// rule-creation/skip-test-files.test.ts.
