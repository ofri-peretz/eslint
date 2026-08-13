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
import { AST_NODE_TYPES } from '@interlace/eslint-devkit';

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
 * The package a top-level statement loads, in any of the three spellings.
 *
 * The gate used to read `ImportDeclaration` only, which meant every CommonJS
 * file was exempt from every rule in this plugin — `const jwt =
 * require('jsonwebtoken'); jwt.sign(p, '', { algorithm: 'none' })` reported
 * nothing at all. `require` is not a legacy edge case in Node code, and
 * `import jwt = require('jsonwebtoken')` is TypeScript's own interop form; the
 * devkit's `module-evidence` has covered all three since an audit found 82
 * corpus files written the import-equals way with every rule silenced.
 */
function moduleSpecifierOf(stmt: TSESTree.Node): string | null {
  // import jwt from 'jsonwebtoken'
  if (stmt.type === AST_NODE_TYPES.ImportDeclaration) {
    return typeof stmt.source.value === 'string' ? stmt.source.value : null;
  }
  // import jwt = require('jsonwebtoken')
  if (stmt.type === AST_NODE_TYPES.TSImportEqualsDeclaration) {
    const ref = stmt.moduleReference;
    return ref.type === AST_NODE_TYPES.TSExternalModuleReference &&
      ref.expression.type === AST_NODE_TYPES.Literal &&
      typeof ref.expression.value === 'string'
      ? ref.expression.value
      : null;
  }
  // const jwt = require('jsonwebtoken')  /  const { sign } = require('jose')
  if (stmt.type === AST_NODE_TYPES.VariableDeclaration) {
    for (const declarator of stmt.declarations) {
      const source = requireSpecifierOf(declarator.init);
      if (source !== null) return source;
    }
  }
  // require('jsonwebtoken') as a bare statement, for its side effects
  if (stmt.type === AST_NODE_TYPES.ExpressionStatement) {
    return requireSpecifierOf(stmt.expression);
  }
  return null;
}

/** `require('x')` -> `'x'`, including when awaited or member-accessed. */
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
 * `String.split` always returns at least one element, so index 0 needs no
 * fallback — a `?? ''` there is a branch no test could ever reach.
 */
function packageRootOf(source: string): string {
  const parts = source.split('/');
  return source.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
}

/**
 * Whether this file imports a JWT library at all.
 *
 * Cached per Program: the answer is a property of the file, and recomputing it
 * for every call in a large module is wasted work.
 */
const importsJwtLibrary = new WeakMap<TSESTree.Program, boolean>();

function fileImportsJwtLibrary(node: TSESTree.Node): boolean {
  let root: TSESTree.Node = node;
  while (root.parent) root = root.parent;
  if (root.type !== 'Program') return false;
  const cached = importsJwtLibrary.get(root);
  if (cached !== undefined) return cached;

  const found = root.body.some(
    (stmt) => {
      const source = moduleSpecifierOf(stmt);
      return source !== null && JWT_LIBRARY_ROOTS.has(packageRootOf(source));
    },
  );
  importsJwtLibrary.set(root, found);
  return found;
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
    if (stmt.type !== 'ImportDeclaration') continue;
    const bindsReceiver = (stmt.specifiers ?? []).some(
      (spec) => spec.local?.name === object.name,
    );
    if (!bindsReceiver) continue;
    const source = stmt.source.value;
    if (typeof source !== 'string') return false;
    // Found where this receiver came from: foreign package -> not a JWT call.
    return !JWT_LIBRARY_ROOTS.has(packageRootOf(source));
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

  // Check member expression: jwt.verify(), jose.jwtVerify()
  if (node.callee.type === 'MemberExpression') {
    // `new TextDecoder().decode(bytes)` shares a method name with JWT decoding
    // and nothing else. A receiver constructed from a global built-in is not a
    // JWT client, and auth0's express-openid-connect has exactly this line in
    // `lib/appSession.js` — reported as decoding a token without verifying it.
    if (receiverIsForeignConstruction(node.callee.object)) {
      return false;
    }
    const property = node.callee.property;
    if (property.type === 'Identifier') {
      return targetMethods.has(property.name);
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

/**
 * Check if file is a test file
 */
export function isTestFile(filename: string): boolean {
  return (
    /\.(test|spec)\.[jt]sx?$/.test(filename) ||
    /__(tests?|mocks?)__/.test(filename) ||
    /\/(tests?|specs?|__tests__)\//.test(filename)
  );
}
