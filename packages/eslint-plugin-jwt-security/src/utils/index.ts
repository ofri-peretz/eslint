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
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  childNodes,
  findVariable,
  importEqualsSpecifier,
  originModule,
  calleeExportName,
  requireSpecifier as requireSpecifierOf,
  resolveTerminal,
} from './value-flow';
export { staticNumber } from './value-flow';
import type { SourceCodeLike } from './value-flow';
import {
  AST_NODE_TYPES,
  createModuleEvidence,
  objectKeyName,
  propertyName,
  staticString,
  unwrapTypeSyntax,
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
  // Both take their key and algorithms in a config object rather than a
  // `sign`/`verify` call, so they are read by `jwtConfigOf`, not the method
  // matcher. Listing them also makes their own bindings count as JWT roots.
  PASSPORT_JWT: 'passport-jwt',
  FAST_JWT: 'fast-jwt',
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
  // A password hash is still the password's verifier, and a token is readable
  // by anyone holding it. Exact compounds, not a substring match: the valid
  // `emailVerified` case shows what substring matching would report.
  'passwordhash',
  'password_hash',
  'hashedpassword',
  'hashed_password',
  'passworddigest',
  'password_digest',
]);

/**
 * JWT method patterns for different operations
 */
export const JWT_METHODS = {
  // `signAsync` / `verifyAsync` are @nestjs/jwt's documented spellings. They
  // are only safe to match because `resolveCallOptions` knows NestJS takes its
  // options as the SECOND argument and merges them over module defaults —
  // matching the names without that would report every NestJS app.
  SIGN: new Set(['sign', 'signJWT', 'SignJWT', 'signAsync']),
  VERIFY: new Set(['verify', 'verifyJWT', 'jwtVerify', 'verifyAsync']),
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
  /**
   * jose's JWS-level verification, kept apart from VERIFY on purpose.
   *
   * `jwtVerify` verifies a signature AND the JWT claims. These three verify a
   * signature and nothing else: they take a JWS, not a JWT, so `audience`,
   * `issuer` and `maxTokenAge` are not options they accept. Folding them into
   * VERIFY would make the claim rules demand an option the API cannot take,
   * which is a false positive on every correct call.
   *
   * What they DO share with `jwtVerify` is `algorithms` — and without it the
   * token header picks the algorithm, which is the substitution attack this
   * plugin exists to catch. The measured surface reported all three as named
   * nowhere in these sources while the plugin published 100% coverage.
   *
   * Verified against the installed package:
   * `Object.keys(require('jose')).filter(k => /Verify$/.test(k))` is
   * `['compactVerify', 'flattenedVerify', 'generalVerify']`.
   */
  JWS_VERIFY: new Set(['compactVerify', 'flattenedVerify', 'generalVerify']),
} as const;

/** VERIFY ∪ JWS_VERIFY — every call that checks a signature. */
const SIGNATURE_VERIFY: ReadonlySet<string> = new Set([
  ...JWT_METHODS.VERIFY,
  ...JWT_METHODS.JWS_VERIFY,
]);

/** Package roots whose API these method names belong to. */
const JWT_LIBRARY_ROOTS: ReadonlySet<string> = new Set(
  Object.values(JWT_LIBRARIES),
);

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
  while (object.type === AST_NODE_TYPES.MemberExpression)
    object = object.object;
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
    const binds = (stmt.specifiers ?? []).some(
      (spec) => spec.local?.name === name,
    );
    return binds && typeof stmt.source.value === 'string'
      ? stmt.source.value
      : null;
  }
  // import argon = require('argon2')
  if (stmt.type === AST_NODE_TYPES.TSImportEqualsDeclaration) {
    return stmt.id.name === name ? importEqualsSpecifier(stmt) : null;
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
      declaration.declarations.some((declarator) =>
        patternBinds(declarator.id, name),
      )
    ) {
      return true;
    }
  }
  return false;
}

export function isJwtLibraryCall(
  node: TSESTree.CallExpression,
  targetMethods: Set<string>,
  sourceCode?: SourceCodeLike,
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
  // The scope-aware receiver checks need the rule's SourceCode. Every rule
  // passes it; only the mock-node unit tests call without one.
  if (sourceCode !== undefined && receiverIsForeignValue(node, sourceCode)) {
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
export function extractAlgorithms(optionsNode: OptionsLike): string[] {
  const algorithms: string[] = [];

  for (const prop of optionsNode.properties) {
    if (prop.type !== 'Property') {
      continue;
    }

    /*
     * `objectKeyName`, not `key.name`. Requiring an Identifier key meant this
     * saw `{ algorithms: [...] }` and missed both `{ 'algorithms': [...] }` —
     * ordinary hand-written JS — and `{ ['algorithms']: [...] }`, which is what
     * a bundler emits. Same option, same JWT, three spellings, one read.
     *
     * This is the gate. `no-algorithm-confusion` also names the key in its
     * reporting loop, and fixing only that changed nothing, because the
     * algorithms never got extracted in the first place.
     */
    const keyName = objectKeyName(prop);
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
  optionsNode: OptionsLike,
  optionName: string,
): boolean {
  return optionsNode.properties.some(
    (prop): prop is TSESTree.Property =>
      // Same three spellings as extractAlgorithms. `{ ['noTimestamp']: true }`
      // sets exactly the option `{ noTimestamp: true }` sets.
      prop.type === 'Property' && objectKeyName(prop) === optionName,
  );
}

/**
 * Get the value of a specific option from options object
 */
export function getOptionValue(
  optionsNode: OptionsLike,
  optionName: string,
): TSESTree.Node | undefined {
  // Last one wins, exactly as it does at runtime: `{ ...base, maxAge: '1h' }`
  // overrides whatever `base` said.
  let found: TSESTree.Node | undefined;
  for (const prop of optionsNode.properties) {
    if (prop.type === 'Property' && objectKeyName(prop) === optionName) {
      found = prop.value;
    }
  }
  return found;
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
 * The literal inside a byte-key expression, or null.
 *
 * jose takes `Uint8Array` for symmetric keys, and its documented idiom is
 * `new TextEncoder().encode(secret)`. `Buffer.from(secret)` is the Node
 * equivalent. Both are `CallExpression`s, and both rules that inspect the key
 * treated any call as a safe source — so the single most common way to hand
 * jose a hardcoded HMAC secret was the one shape neither rule could see.
 *
 * Returns the inner node so the caller can apply its own judgement to it:
 * `no-hardcoded-secret` asks whether it is a literal, `no-weak-secret` asks
 * how long it is. Neither has to know about encoders.
 *
 * Only the literal-argument form is unwrapped. `encoder.encode(loadSecret())`
 * wraps a call whose value is not visible here, and stays opaque.
 */
export interface ByteKeyLiteral {
  /** The node holding the key material. */
  literal: TSESTree.Node;
  /**
   * The `Buffer.from` encoding argument, when it is a string literal.
   *
   * It is the difference between a key's LENGTH and its STRENGTH.
   * `Buffer.from('00112233445566778899aabbccddeeff', 'hex')` is a 16-byte key
   * written as 32 characters, so measuring the source string called it 32 and
   * a key at half the configured floor went unreported.
   */
  encoding?: string;
}

export function byteKeyLiteral(node: TSESTree.Node): ByteKeyLiteral | null {
  if (node.type !== AST_NODE_TYPES.CallExpression) return null;
  const arg = node.arguments[0];
  if (arg === undefined) return null;

  const callee = node.callee;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return null;
  const method = propertyName(callee);

  // new TextEncoder().encode('…')
  if (
    method === 'encode' &&
    callee.object.type === AST_NODE_TYPES.NewExpression &&
    callee.object.callee.type === AST_NODE_TYPES.Identifier &&
    callee.object.callee.name === 'TextEncoder'
  ) {
    // TextEncoder is UTF-8 only, so it has no encoding to carry.
    return { literal: arg };
  }

  // Buffer.from('…', 'hex')
  if (
    method === 'from' &&
    callee.object.type === AST_NODE_TYPES.Identifier &&
    callee.object.name === 'Buffer'
  ) {
    const encodingArg = node.arguments[1];
    return {
      literal: arg,
      encoding:
        encodingArg?.type === AST_NODE_TYPES.Literal &&
        typeof encodingArg.value === 'string'
          ? encodingArg.value.toLowerCase()
          : undefined,
    };
  }

  return null;
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
    propertyName(node.object) === 'env'
  ) {
    return true;
  }

  return false;
}

/**
 * Check if this call looks like a JWT sign operation
 */
export function isSignOperation(
  node: TSESTree.CallExpression,
  sourceCode?: SourceCodeLike,
): boolean {
  return isJwtLibraryCall(node, JWT_METHODS.SIGN, sourceCode);
}

/**
 * Check if this call looks like a JWT verify operation
 */
export function isVerifyOperation(
  node: TSESTree.CallExpression,
  sourceCode?: SourceCodeLike,
): boolean {
  return isJwtLibraryCall(node, JWT_METHODS.VERIFY, sourceCode);
}

/**
 * Check if this call verifies a signature — a JWT verify, or a jose JWS verify.
 *
 * Use this for rules about the KEY and the ALGORITHM, which both kinds accept.
 * Rules about JWT claims (`audience`, `issuer`, `maxTokenAge`) must keep using
 * `isVerifyOperation`: a JWS carries no claims and takes no such option.
 */
export function isSignatureVerifyOperation(
  node: TSESTree.CallExpression,
  sourceCode?: SourceCodeLike,
): boolean {
  return isJwtLibraryCall(node, SIGNATURE_VERIFY as Set<string>, sourceCode);
}

/**
 * Check if this call looks like a JWT decode operation (no verification)
 */
export function isDecodeOperation(
  node: TSESTree.CallExpression,
  sourceCode?: SourceCodeLike,
): boolean {
  return isJwtLibraryCall(node, JWT_METHODS.DECODE, sourceCode);
}

// `isTestFile` used to live here. It is now `isTestFilePath` in
// @interlace/eslint-devkit — the `/(tests?|specs?)/` form above matched the
// substring anywhere in the path, so a repo checked out under `~/test/`
// disabled the rule for every file in it. Locked by
// rule-creation/skip-test-files.test.ts.

/* ===========================================================================
 * STRUCTURAL RESOLUTION
 *
 * Everything below answers one question: what does this call site say, once
 * the spellings TypeScript and ordinary refactoring introduce are seen
 * through? It follows a same-file `const` binding, strips `as` / `satisfies`,
 * and flattens a spread of such a const. It never follows a value through a
 * function call, a parameter or an import — that is data flow, and a rule
 * that guesses there trades a false positive for a false negative it cannot
 * see. What it cannot resolve it marks OPAQUE, and a rule asking "is option X
 * missing?" must stay silent on an opaque answer.
 * ======================================================================== */

export type { SourceCodeLike } from './value-flow';

/** Anything with object-literal properties: an ObjectExpression or a `ResolvedObject`. */
export interface OptionsLike {
  readonly properties: readonly TSESTree.ObjectLiteralElement[];
}

/** An object whose visible properties are known, and whether any part was not. */
export interface ResolvedObject extends OptionsLike {
  readonly properties: TSESTree.Property[];
  /** Some part of the value could not be seen (a parameter, an import, a call…). */
  readonly opaque: boolean;
  /**
   * The spreads that made it opaque: `{ ...user }` where `user` is a
   * parameter, a call result, a database row. Each one copies fields this
   * file cannot see.
   */
  readonly opaqueSpreads: TSESTree.SpreadElement[];
}

/** What a name in this file is bound to. */
type Binding =
  | {
      kind: 'const';
      init: TSESTree.Expression;
      variable: TSESLint.Scope.Variable;
    }
  | { kind: 'other' }
  | { kind: 'unbound' };

/** Bounds every recursive walk; resolution is a lookup, not a solver. */
const MAX_RESOLUTION_DEPTH = 4;

/**
 * The binding an identifier refers to.
 *
 * Only a single `const x = <init>` with a plain identifier target counts as
 * resolvable: `let`/`var` can be reassigned, a destructured const is a read of
 * something else, and a parameter or import is supplied from outside.
 */
function bindingOf(
  sourceCode: SourceCodeLike,
  node: TSESTree.Identifier,
): Binding {
  const variable = findVariable(sourceCode, node);
  // A configured global (`crypto`, `window`) has a variable but no definition.
  const def = variable?.defs[0];
  if (def === undefined) return { kind: 'unbound' };
  if (
    def.type === 'Variable' &&
    def.parent.kind === 'const' &&
    def.node.id.type === AST_NODE_TYPES.Identifier &&
    def.node.init !== null
  ) {
    return { kind: 'const', init: def.node.init, variable: variable! };
  }
  return { kind: 'other' };
}

/** `{ properties }` of an object literal, with resolvable spreads flattened in. */
function flattenObject(
  object: TSESTree.ObjectExpression,
  sourceCode: SourceCodeLike,
  depth: number,
): ResolvedObject {
  const properties: TSESTree.Property[] = [];
  const opaqueSpreads: TSESTree.SpreadElement[] = [];
  for (const element of object.properties) {
    if (element.type === AST_NODE_TYPES.Property) {
      properties.push(element);
      continue;
    }
    const spread = resolveObject(element.argument, sourceCode, depth + 1);
    // `...'x'`: not an object at all, so nothing here can list its fields.
    if (spread === null) {
      opaqueSpreads.push(element);
      continue;
    }
    properties.push(...spread.properties);
    // `...user` (a parameter, a call, a row) is opaque itself; a resolved
    // object that carries opaque spreads of its own passes those on.
    if (spread.opaque) {
      opaqueSpreads.push(
        ...(spread.opaqueSpreads.length > 0 ? spread.opaqueSpreads : [element]),
      );
    }
  }
  return { properties, opaque: opaqueSpreads.length > 0, opaqueSpreads };
}

/** What an opaque value resolves to: nothing visible. */
const OPAQUE: ResolvedObject = {
  properties: [],
  opaque: true,
  opaqueSpreads: [],
};

/**
 * Resolve an expression that should be an options object.
 *
 * The value is followed within this file (`resolveTerminal`): a `const` or a
 * never-reassigned `let`, a destructure, a member of an object literal, an
 * `await`, a cast, the single `return` of a same-file function.
 *
 * - `null`: the expression is definitely NOT an options object (a callback,
 *   a string, a number) — or there is no expression at all.
 * - `{ opaque: true }`: it may be one, but its contents are not visible here.
 * - `{ opaque: false }`: every property it can carry is in `properties`.
 */
export function resolveObject(
  node: TSESTree.Node | undefined,
  sourceCode: SourceCodeLike,
  depth = 0,
): ResolvedObject | null {
  if (node === undefined || depth > MAX_RESOLUTION_DEPTH) return null;
  const value = resolveTerminal(node, sourceCode);
  switch (value.type) {
    case AST_NODE_TYPES.ObjectExpression:
      return flattenObject(value, sourceCode, depth);
    case AST_NODE_TYPES.ArrowFunctionExpression:
    case AST_NODE_TYPES.FunctionExpression:
    case AST_NODE_TYPES.FunctionDeclaration:
    case AST_NODE_TYPES.Literal:
    case AST_NODE_TYPES.TemplateLiteral:
      return null;
    default:
      return OPAQUE;
  }
}

/**
 * The method a call names, or `null` for a dynamic `x[m]()`.
 *
 * Only reached for calls `isJwtLibraryCall` already accepted, whose callee is
 * always an Identifier or a MemberExpression.
 */
function calledName(node: TSESTree.CallExpression): string | null {
  return node.callee.type === AST_NODE_TYPES.Identifier
    ? node.callee.name
    : propertyName(node.callee as TSESTree.MemberExpression);
}

/** Root of a member chain: `this.a.b` -> `this`, `x.y.z` -> `x`. */
function chainRoot(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    current = current.object;
  }
  return current;
}

/**
 * The JWT library a `this.<member>` is POSITIVELY known to come from, or null.
 *
 * An injected member is a JWT client only on structural evidence the class
 * itself gives — never on its name:
 *
 * - a type annotation that resolves to a JWT import
 *   (`private readonly jwt: JwtService`, `lib: typeof jsonwebtoken`);
 * - an `@Inject(X)` decorator whose argument resolves to a JWT import;
 * - a value assigned from one — a property initialiser, a defaulted
 *   parameter property, or `this.member = …` anywhere in the class
 *   (`= jsonwebtoken`, `= new JwtService()`, `= await createVerifier()`).
 *
 * Without any of these the member is treated as foreign: an untyped
 * `constructor(private readonly hashing)` says nothing, and assuming it is a
 * JWT client is what reported `this.hashing.verify(pw, hash)`.
 */
function thisMemberJwtSource(
  member: TSESTree.MemberExpression,
  sourceCode: SourceCodeLike,
): string | null {
  const name = propertyName(member);
  // `Program.parent` is `null` in ESLint's tree, so the walk ends on a falsy
  // parent rather than on `undefined`.
  let classBody: TSESTree.Node | null | undefined = member.parent;
  while (classBody && classBody.type !== AST_NODE_TYPES.ClassBody) {
    classBody = classBody.parent;
  }
  if (!classBody || name === null) return null;

  const evidence: TSESTree.Node[] = [];
  const declare = (
    annotation: TSESTree.TSTypeAnnotation | undefined,
    decorators: readonly TSESTree.Decorator[],
    value: TSESTree.Node | null | undefined,
  ): void => {
    const type = annotation?.typeAnnotation;
    if (type?.type === AST_NODE_TYPES.TSTypeReference) {
      evidence.push(type.typeName);
    }
    if (type?.type === AST_NODE_TYPES.TSTypeQuery) evidence.push(type.exprName);
    for (const decorator of decorators) {
      const call = decorator.expression;
      if (call.type === AST_NODE_TYPES.CallExpression && call.arguments[0]) {
        evidence.push(call.arguments[0]);
      }
    }
    if (value) evidence.push(value);
  };

  for (const element of classBody.body) {
    if (
      element.type === AST_NODE_TYPES.PropertyDefinition &&
      objectKeyName(element) === name
    ) {
      declare(element.typeAnnotation, element.decorators, element.value);
    }
    if (
      element.type === AST_NODE_TYPES.MethodDefinition &&
      element.kind === 'constructor'
    ) {
      for (const param of element.value.params) {
        if (param.type !== AST_NODE_TYPES.TSParameterProperty) continue;
        const target =
          param.parameter.type === AST_NODE_TYPES.AssignmentPattern
            ? param.parameter.left
            : param.parameter;
        // TypeScript admits only an identifier (optionally defaulted) as a
        // parameter property, so the target always has a name.
        if ((target as TSESTree.Identifier).name === name) {
          declare(
            (target as TSESTree.Identifier).typeAnnotation,
            param.decorators,
            param.parameter.type === AST_NODE_TYPES.AssignmentPattern
              ? param.parameter.right
              : null,
          );
        }
      }
    }
  }
  collectThisAssignments(classBody, name, evidence);

  for (const node of evidence) {
    const source = originModule(node, sourceCode);
    if (source !== null && isJwtSource(source)) return source;
  }
  return null;
}

/** Every `this.<name> = value` right-hand side inside a class body. */
function collectThisAssignments(
  node: TSESTree.Node,
  name: string,
  out: TSESTree.Node[],
): void {
  if (
    node.type === AST_NODE_TYPES.AssignmentExpression &&
    node.left.type === AST_NODE_TYPES.MemberExpression &&
    node.left.object.type === AST_NODE_TYPES.ThisExpression &&
    propertyName(node.left) === name
  ) {
    out.push(node.right);
  }
  for (const child of childNodes(node)) {
    collectThisAssignments(child, name, out);
  }
}

function programOf(node: TSESTree.Node): TSESTree.Program {
  let root = node;
  while (root.parent) root = root.parent;
  return root as TSESTree.Program;
}

/** Whether a module specifier belongs to a JWT library. */
function isJwtSource(source: string): boolean {
  return JWT_LIBRARY_ROOTS.has(packageRootOf(source));
}

/**
 * Platform namespaces whose `sign` / `verify` / `decode` are not JWT APIs.
 *
 * `subtle` is WebCrypto's `SubtleCrypto` (`crypto.subtle.verify('HMAC', …)`),
 * and `base64url` is jose's own codec namespace — `base64url.decode(secret)`
 * decodes bytes, not a token.
 */
const NON_JWT_NAMESPACES: ReadonlySet<string> = new Set([
  'subtle',
  'base64url',
]);

/** The export name an imported identifier was bound from, if any. */
function importedNameOf(
  sourceCode: SourceCodeLike,
  node: TSESTree.Identifier,
): string | null {
  const def = findVariable(sourceCode, node)?.defs[0];
  return def?.node.type === AST_NODE_TYPES.ImportSpecifier &&
    def.node.imported.type === AST_NODE_TYPES.Identifier
    ? def.node.imported.name
    : null;
}

/**
 * Scope-aware receiver rejection — the half of the gate that needs bindings.
 *
 * A receiver is rejected only on STRUCTURAL evidence that it is not a JWT
 * client: a `const` built by a call or construction whose callee comes from a
 * non-JWT module or is a platform constructor (`createSign()` from
 * `node:crypto`, `new TextDecoder()`), a `this.<member>` whose declared type is
 * imported from a non-JWT module, the WebCrypto global, or jose's codec
 * namespace. A receiver nothing can be said about is left alone, because a
 * JWT client is very often injected without a resolvable type.
 */
function receiverIsForeignValue(
  node: TSESTree.CallExpression,
  sourceCode: SourceCodeLike,
): boolean {
  if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return false;
  const receiver = node.callee.object;

  const namespace =
    receiver.type === AST_NODE_TYPES.MemberExpression
      ? propertyName(receiver)
      : receiver.type === AST_NODE_TYPES.Identifier
        ? importedNameOf(sourceCode, receiver)
        : null;
  if (namespace !== null && NON_JWT_NAMESPACES.has(namespace)) return true;

  const root = chainRoot(receiver);
  if (root.type === AST_NODE_TYPES.ThisExpression) {
    // `this.verify()` names no member to look up.
    if (receiver.type !== AST_NODE_TYPES.MemberExpression) return false;
    // A member is a JWT client only on positive evidence the class gives.
    return thisMemberJwtSource(innermostMember(receiver), sourceCode) === null;
  }
  if (root.type !== AST_NODE_TYPES.Identifier) return false;

  const binding = bindingOf(sourceCode, root);
  // The WebCrypto global. Node's `crypto` module, when imported, is already
  // rejected as a foreign import by `receiverIsForeignImport`.
  if (binding.kind === 'unbound') return root.name === 'crypto';
  if (binding.kind !== 'const') return false;
  return valueIsForeign(binding.init);
}

/** `this.a.b.c` -> `this.a`: the member read straight off `this`. */
function innermostMember(
  member: TSESTree.MemberExpression,
): TSESTree.MemberExpression {
  let current = member;
  while (current.object.type === AST_NODE_TYPES.MemberExpression) {
    current = current.object;
  }
  return current;
}

/** Was this value produced by something that is demonstrably not a JWT library? */
function valueIsForeign(init: TSESTree.Expression): boolean {
  let value = unwrapTypeSyntax(init);
  if (value.type === AST_NODE_TYPES.AwaitExpression) value = value.argument;
  if (
    value.type !== AST_NODE_TYPES.CallExpression &&
    value.type !== AST_NODE_TYPES.NewExpression
  ) {
    return false;
  }
  // `const crypto = require('crypto')` inside a function body.
  const required = requireSpecifierOf(value);
  if (required !== null) return !isJwtSource(required);
  const callee = chainRoot(value.callee);
  if (callee.type !== AST_NODE_TYPES.Identifier) return false;
  if (
    value.type === AST_NODE_TYPES.NewExpression &&
    NON_JWT_CONSTRUCTORS.has(callee.name)
  ) {
    return true;
  }
  for (const stmt of programOf(value).body) {
    const source = bindingSourceOf(stmt, callee.name);
    if (source !== null) return !isJwtSource(source);
  }
  return false;
}

/**
 * Whether a call is shaped like `@nestjs/jwt`'s `JwtService`.
 *
 * NestJS takes `sign(payload, options?)` / `verify(token, options?)` — the
 * options are the SECOND argument — and merges them over the module's
 * `signOptions` / `verifyOptions`, which live in a different file. Three
 * structural signals, any one sufficient:
 *
 * - the async spellings, which only `JwtService` has;
 * - a `this.<member>` declared with a type imported from `@nestjs/jwt`;
 * - exactly two arguments, the second an object literal that is not a key
 *   (`{ key, passphrase }` is jsonwebtoken's encrypted-key form and `kty`
 *   marks a JWK, both of which ARE the key).
 */
export function isNestJwtShape(
  node: TSESTree.CallExpression,
  sourceCode: SourceCodeLike,
): boolean {
  const name = calledName(node);
  if (name === 'signAsync' || name === 'verifyAsync') return true;
  if (
    node.callee.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.object.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.object.object.type === AST_NODE_TYPES.ThisExpression &&
    // Reached only for a call `isJwtLibraryCall` accepted, and a `this`
    // member is accepted only on evidence — so the source is never null.
    packageRootOf(thisMemberJwtSource(node.callee.object, sourceCode)!) ===
      JWT_LIBRARIES.NESTJS_JWT
  ) {
    return true;
  }
  if (node.arguments.length !== 2) return false;
  const second = resolveObject(node.arguments[1], sourceCode);
  return (
    second !== null &&
    !second.opaque &&
    !['key', 'passphrase', 'kty'].some((key) => hasOption(second, key))
  );
}

/**
 * The options a sign/verify call passes, resolved.
 *
 * jsonwebtoken and jose put options third. A NestJS-shaped call puts them
 * second and merges them over module defaults this file cannot see, so its
 * answer is always opaque: a property it shows is real, a property it lacks
 * may still be set on the module.
 */
export function resolveCallOptions(
  node: TSESTree.CallExpression,
  sourceCode: SourceCodeLike,
): ResolvedObject | null {
  if (isNestJwtShape(node, sourceCode)) {
    const own = resolveObject(node.arguments[1], sourceCode);
    return own === null ? OPAQUE : { ...own, opaque: true };
  }
  return resolveObject(node.arguments[2], sourceCode);
}

/** The jose builder a trailing `.sign(key)` hangs off: `new SignJWT(claims)`. */
const JOSE_SIGN_BUILDERS: ReadonlySet<string> = new Set([
  'SignJWT',
  'CompactSign',
  'FlattenedSign',
  'GeneralSign',
]);

/** A jose builder and every method called on it before `.sign(key)`. */
export interface JoseBuilderChain {
  /** `new SignJWT(claims)` and friends. */
  readonly builder: TSESTree.NewExpression;
  /** The constructor's name: `SignJWT`, `CompactSign`, … */
  readonly kind: string;
  /** Methods called on the chain (`setExpirationTime`, `setIssuedAt`, …). */
  readonly calls: ReadonlySet<string | null>;
}

/**
 * `new SignJWT(claims).setX().sign(key)` -> the builder, and what was set on it.
 *
 * Also follows a builder held in a `const`, collecting the methods called on
 * that binding in its own statements:
 * `const jwt = new SignJWT(claims); jwt.setExpirationTime('1h'); jwt.sign(key)`.
 * That is a structural read of one binding's uses, not data flow.
 */
export function joseBuilderChain(
  node: TSESTree.CallExpression,
  sourceCode: SourceCodeLike,
): JoseBuilderChain | null {
  if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return null;
  const calls = new Set<string | null>();
  let current: TSESTree.Node = node.callee.object;
  let hops = 0;
  while (current.type !== AST_NODE_TYPES.NewExpression) {
    if (current.type === AST_NODE_TYPES.CallExpression) {
      if (current.callee.type === AST_NODE_TYPES.MemberExpression) {
        calls.add(propertyName(current.callee));
      }
      current = current.callee;
    } else if (current.type === AST_NODE_TYPES.MemberExpression) {
      current = current.object;
    } else if (
      current.type === AST_NODE_TYPES.Identifier &&
      hops++ < MAX_RESOLUTION_DEPTH
    ) {
      const binding = bindingOf(sourceCode, current);
      if (binding.kind !== 'const') return null;
      for (const reference of binding.variable.references) {
        const use = reference.identifier.parent!;
        // Only calls before this `.sign()` configure it; a setter written
        // after it applies to the next sign of a reused builder.
        if (
          reference.identifier.range[0] < node.range[0] &&
          use.type === AST_NODE_TYPES.MemberExpression &&
          use.parent.type === AST_NODE_TYPES.CallExpression
        ) {
          calls.add(propertyName(use));
        }
      }
      current = binding.init;
    } else {
      return null;
    }
  }
  const kind =
    current.callee.type === AST_NODE_TYPES.Identifier
      ? current.callee.name
      : current.callee.type === AST_NODE_TYPES.MemberExpression
        ? propertyName(current.callee)
        : null;
  return kind !== null && JOSE_SIGN_BUILDERS.has(kind)
    ? { builder: current, kind, calls }
    : null;
}

/** Option names that carry key material, per API. */
const KEY_OPTION_NAMES: readonly string[] = [
  'secret',
  'privateKey',
  'publicKey',
];

/**
 * Every node that holds the key for a sign/verify call.
 *
 * - jose's builder: `.sign(key)` — the only argument.
 * - NestJS: `secret` / `privateKey` / `publicKey` in the options object.
 * - jsonwebtoken / jose verify: the second argument.
 */
export function keyNodesOf(
  node: TSESTree.CallExpression,
  sourceCode: SourceCodeLike,
): TSESTree.Node[] {
  if (joseBuilderChain(node, sourceCode) !== null) {
    return node.arguments.slice(0, 1);
  }
  if (isNestJwtShape(node, sourceCode)) {
    const options = resolveObject(node.arguments[1], sourceCode);
    return keyValuesOf(options, KEY_OPTION_NAMES);
  }
  return node.arguments.slice(1, 2);
}

function keyValuesOf(
  options: ResolvedObject | null,
  names: readonly string[],
): TSESTree.Node[] {
  if (options === null) return [];
  return options.properties
    .filter((prop) => names.includes(objectKeyName(prop) ?? ''))
    .map((prop) => prop.value);
}

/** A string literal (or byte-wrapped one) that could become the key. */
export interface KeyLiteral {
  readonly literal: TSESTree.Literal | TSESTree.TemplateLiteral;
  readonly encoding?: string;
}

/**
 * Every static string that can reach the key position, structurally.
 *
 * Follows a same-file value (`resolveTerminal`), both arms of `||` / `??` / `&&` (the
 * `process.env.JWT_SECRET || 'secret'` fallback that ships the literal the
 * moment the variable is unset), `as` casts, and the byte wrappers jose is
 * fed (`new TextEncoder().encode('…')`, `Buffer.from('…', 'hex')`).
 */
export function keyLiterals(
  node: TSESTree.Node,
  sourceCode: SourceCodeLike,
  depth = 0,
): KeyLiteral[] {
  if (depth > MAX_RESOLUTION_DEPTH) return [];
  const value = unwrapTypeSyntax(node);
  if (staticString(value) !== null) {
    return [{ literal: value as TSESTree.Literal | TSESTree.TemplateLiteral }];
  }
  if (value.type === AST_NODE_TYPES.LogicalExpression) {
    // `||` / `??`: the right side is the fallback key when the left is absent.
    // `&&`: the right side is the key whenever the guard is truthy — still a
    // literal that ships in the bundle, so it is reported too.
    return [
      ...keyLiterals(value.left, sourceCode, depth + 1),
      ...keyLiterals(value.right, sourceCode, depth + 1),
    ];
  }
  // A const, a never-reassigned let, a member of an object literal, a
  // same-file function's return: follow it one value-flow step at a time.
  const resolved = resolveTerminal(value, sourceCode);
  if (resolved !== value) {
    return keyLiterals(resolved, sourceCode, depth + 1);
  }
  const bytes = byteKeyLiteral(value);
  if (bytes === null) return [];
  return keyLiterals(bytes.literal, sourceCode, depth + 1).map((found) => ({
    literal: found.literal,
    encoding: bytes.encoding,
  }));
}

/**
 * PEM public-key material is not a secret.
 *
 * Pinning an identity provider's public verification key in source is common
 * and harmless; CWE-798 is about credentials, and a public key is published
 * on purpose.
 */
const PUBLIC_PEM =
  /-----BEGIN (?:RSA |EC )?PUBLIC KEY-----|-----BEGIN CERTIFICATE-----/;

export function isPublicKeyMaterial(literal: KeyLiteral['literal']): boolean {
  // `keyLiterals` only yields static strings, so this always has a value.
  return PUBLIC_PEM.test(staticString(literal)!);
}

/** Files that hold public key material by convention of their format. */
const PUBLIC_KEY_FILE = /\.(?:pub|crt|cer)$/;

/** File readers whose first argument is the path. */
const FILE_READERS: ReadonlySet<string> = new Set(['readFileSync', 'readFile']);

/** Package -> exports that can only produce PUBLIC key material. */
const PUBLIC_KEY_EXPORTS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['crypto', new Set(['createPublicKey', 'X509Certificate'])],
  [
    JWT_LIBRARIES.JOSE,
    new Set([
      'importSPKI',
      'importX509',
      'createRemoteJWKSet',
      'createLocalJWKSet',
    ]),
  ],
]);

/**
 * Whether a key is public key material, on STRUCTURAL evidence only.
 *
 * The value is followed within the file to where it was made, and only that
 * decides: a PEM `PUBLIC KEY` / `CERTIFICATE` string; `createPublicKey()` /
 * `new X509Certificate()` from `node:crypto`; jose's `importSPKI`,
 * `importX509`, `createRemoteJWKSet`, `createLocalJWKSet`; anything a
 * `jwks-rsa` client produces; a file read whose path ends in `.pub`, `.crt`
 * or `.cer`. What the key is CALLED is never consulted — `publicKey` may hold
 * an HMAC secret and `cert` may hold an RSA key.
 */
export function isPublicKeySource(
  node: TSESTree.Node,
  sourceCode: SourceCodeLike,
): boolean {
  const value = resolveTerminal(node, sourceCode);
  const text = staticString(value);
  if (text !== null) return PUBLIC_PEM.test(text);
  if (
    value.type !== AST_NODE_TYPES.CallExpression &&
    value.type !== AST_NODE_TYPES.NewExpression
  ) {
    return false;
  }
  const module = originModule(value.callee, sourceCode);
  if (module === null) return false;
  const root = packageRootOf(module.replace(/^node:/, ''));
  if (root === JWT_LIBRARIES.JWKS_RSA) return true;
  const exportName = String(calleeExportName(value.callee, sourceCode));
  if (root === 'fs' && FILE_READERS.has(exportName)) {
    const [path] = value.arguments;
    const file =
      path === undefined
        ? null
        : staticString(resolveTerminal(path, sourceCode));
    return file !== null && PUBLIC_KEY_FILE.test(file);
  }
  return PUBLIC_KEY_EXPORTS.get(root)?.has(exportName) ?? false;
}

/** A JWT library configured through an object rather than a sign/verify call. */
export interface JwtConfig {
  /** The resolved config object. */
  readonly options: ResolvedObject;
  /** Nodes holding key material in that object. */
  readonly keys: TSESTree.Node[];
}

/**
 * Package -> the option names that hold its key.
 *
 * - `JwtModule.register({ secret })` from `@nestjs/jwt`
 * - `expressjwt({ secret })` (or v6's default `jwt({ secret })`) from `express-jwt`
 * - `new Strategy({ secretOrKey })` from `passport-jwt`
 * - `createSigner({ key })` / `createVerifier({ key })` from `fast-jwt`
 */
const CONFIG_KEY_OPTIONS: ReadonlyMap<string, readonly string[]> = new Map<
  string,
  readonly string[]
>([
  [JWT_LIBRARIES.NESTJS_JWT, KEY_OPTION_NAMES],
  [JWT_LIBRARIES.EXPRESS_JWT, ['secret']],
  [JWT_LIBRARIES.PASSPORT_JWT, ['secretOrKey']],
  [JWT_LIBRARIES.FAST_JWT, ['key']],
]);

/**
 * Read a JWT library's config-object API, identified by import binding.
 *
 * The callee's root must be bound by an import or `require` of one of the
 * packages above — a structural fact, not a name match. For `@nestjs/jwt`
 * only `JwtModule.register(...)` is a config call.
 */
export function jwtConfigOf(
  node: TSESTree.CallExpression | TSESTree.NewExpression,
  sourceCode: SourceCodeLike,
): JwtConfig | null {
  const root = chainRoot(node.callee);
  if (root.type !== AST_NODE_TYPES.Identifier) return null;
  let source: string | null = null;
  for (const stmt of programOf(node).body) {
    source ??= bindingSourceOf(stmt, root.name);
  }
  const keyNames =
    source === null ? undefined : CONFIG_KEY_OPTIONS.get(packageRootOf(source));
  if (keyNames === undefined) return null;
  if (
    source === JWT_LIBRARIES.NESTJS_JWT &&
    (node.callee.type !== AST_NODE_TYPES.MemberExpression ||
      propertyName(node.callee) !== 'register')
  ) {
    return null;
  }
  const options = resolveObject(node.arguments[0], sourceCode);
  if (options === null) return null;
  return { options, keys: keyValuesOf(options, keyNames) };
}
