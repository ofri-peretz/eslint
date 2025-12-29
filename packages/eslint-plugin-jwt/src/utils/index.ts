/**
 * Shared utilities for JWT security rules
 *
 * Library detection, pattern matching, and common helpers.
 */
import type { TSESTree } from '@interlace/eslint-devkit';

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
  'password', 'passwd', 'pwd', 'pass', 'secret',
  // API Keys
  'apikey', 'api_key', 'api-key',
  'apisecret', 'api_secret', 'api-secret',
  // Tokens
  'accesstoken', 'access_token', 'access-token',
  'refreshtoken', 'refresh_token', 'refresh-token',
  'bearertoken', 'bearer_token', 'bearer-token',
  // Keys
  'privatekey', 'private_key', 'private-key',
  'secretkey', 'secret_key', 'secret-key',
  // PII - Personal Identifiable Information
  'email', 'emailaddress', 'email_address', 'email-address',
  'phone', 'phonenumber', 'phone_number', 'phone-number',
  'ssn', 'socialsecuritynumber', 'social_security_number',
  'dob', 'dateofbirth', 'date_of_birth', 'birthdate',
  'address', 'streetaddress', 'street_address',
  // Financial
  'creditcard', 'credit_card', 'credit-card',
  'cardnumber', 'card_number', 'card-number',
  'cvv', 'cvc', 'securitycode', 'security_code',
  'pin', 'pincode', 'pin_code',
  'bankaccount', 'bank_account', 'bank-account',
  'accountnumber', 'account_number', 'account-number',
  'routingnumber', 'routing_number', 'routing-number',
]);

/**
 * JWT method patterns for different operations
 */
export const JWT_METHODS = {
  SIGN: new Set(['sign', 'signJWT', 'SignJWT']),
  VERIFY: new Set(['verify', 'verifyJWT', 'jwtVerify']),
  DECODE: new Set(['decode', 'jwtDecode', 'decodeJWT']),
} as const;

/**
 * Check if a node represents a call to a JWT library method
 */
export function isJwtLibraryCall(
  node: TSESTree.CallExpression,
  targetMethods: Set<string>
): boolean {
  // Check member expression: jwt.verify(), jose.jwtVerify()
  if (node.callee.type === 'MemberExpression') {
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
  value?: string
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
  optionsNode: TSESTree.ObjectExpression
): string[] {
  const algorithms: string[] = [];

  for (const prop of optionsNode.properties) {
    if (prop.type !== 'Property' || prop.key.type !== 'Identifier') {
      continue;
    }

    const keyName = prop.key.name;
    if (keyName !== 'algorithms' && keyName !== 'algorithm' && keyName !== 'alg') {
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
  optionName: string
): boolean {
  return optionsNode.properties.some(
    (prop): prop is TSESTree.Property =>
      prop.type === 'Property' &&
      prop.key.type === 'Identifier' &&
      prop.key.name === optionName
  );
}

/**
 * Get the value of a specific option from options object
 */
export function getOptionValue(
  optionsNode: TSESTree.ObjectExpression,
  optionName: string
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
export function isWeakSecret(
  node: TSESTree.Node,
  minLength = 32
): boolean {
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
  optionsIndex = 2
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
  return /\.(test|spec)\.[jt]sx?$/.test(filename) ||
         /__(tests?|mocks?)__/.test(filename) ||
         /\/(tests?|specs?|__tests__)\//.test(filename);
}
