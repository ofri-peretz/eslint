/**
 * Tests for JWT utilities
 */
import { describe, it, expect } from 'vitest';
import {
  isJwtLibraryCall,
  isStringLiteral,
  extractAlgorithms,
  hasOption,
  getOptionValue,
  isWeakSecret,
  isEnvVariable,
  isSignOperation,
  isVerifyOperation,
  isDecodeOperation,
  getOptionsArgument,
  isTestFile,
  SENSITIVE_PAYLOAD_FIELDS,
  SYMMETRIC_ALGORITHMS,
  SECURE_ALGORITHMS,
  INSECURE_ALGORITHMS,
  JWT_LIBRARIES,
} from './index';
import type { TSESTree } from '@interlace/eslint-devkit';

// Helper to create mock nodes
/**
 * Attach a Program root that imports `source`, so `isJwtLibraryCall` can see it.
 *
 * The matcher walks `parent` to the Program and requires a JWT-library import
 * before it will match a method name — `verify`, `sign` and `decode` are far too
 * common to key on alone (it reported `TextDecoder.decode()` and `argon.verify()`
 * in real repos). A bare mock node with no parent chain therefore matches
 * nothing, which is the correct behaviour and not something to work around.
 */
function withProgram<T extends object>(
  node: T,
  source: string | null = 'jsonwebtoken',
): T {
  const program = {
    type: 'Program',
    body:
      source === null
        ? []
        : [
            {
              type: 'ImportDeclaration',
              source: { value: source },
              // Real ImportDeclarations always carry specifiers; the mock does
              // too, so the receiver-origin check is exercised rather than
              // short-circuited.
              specifiers: [
                { type: 'ImportDefaultSpecifier', local: { name: 'jwt' } },
              ],
            },
          ],
  };
  (node as { parent?: unknown }).parent = program;
  return node;
}

function mockCallExpression(
  calleeName: string,
  importSource: string | null = 'jsonwebtoken',
): TSESTree.CallExpression {
  return withProgram(
    {
      type: 'CallExpression',
      callee: { type: 'Identifier', name: calleeName } as TSESTree.Identifier,
      arguments: [],
    },
    importSource,
  ) as unknown as TSESTree.CallExpression;
}

function mockMemberCallExpression(
  objectName: string,
  methodName: string,
  importSource: string | null = 'jsonwebtoken',
): TSESTree.CallExpression {
  return withProgram(
    {
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: objectName } as TSESTree.Identifier,
        property: {
          type: 'Identifier',
          name: methodName,
        } as TSESTree.Identifier,
      },
      arguments: [],
    },
    importSource,
  ) as unknown as TSESTree.CallExpression;
}

function mockLiteral(value: string | number | boolean): TSESTree.Literal {
  return {
    type: 'Literal',
    value,
  } as TSESTree.Literal;
}

function mockObjectExpression(
  props: Record<string, TSESTree.Node>,
): TSESTree.ObjectExpression {
  return {
    type: 'ObjectExpression',
    properties: Object.entries(props).map(([key, value]) => ({
      type: 'Property',
      key: { type: 'Identifier', name: key } as TSESTree.Identifier,
      value,
    })),
  } as unknown as TSESTree.ObjectExpression;
}

describe('JWT Utils', () => {
  describe('isJwtLibraryCall', () => {
    it('should detect direct calls', () => {
      const call = mockCallExpression('verify');
      expect(isJwtLibraryCall(call, new Set(['verify']))).toBe(true);
    });

    it('should detect member calls', () => {
      const call = mockMemberCallExpression('jwt', 'verify');
      expect(isJwtLibraryCall(call, new Set(['verify']))).toBe(true);
    });

    it('should return false for non-matching calls', () => {
      const call = mockCallExpression('somethingElse');
      expect(isJwtLibraryCall(call, new Set(['verify']))).toBe(false);
    });

    // The regression this gate exists for. `verify` and `decode` are among the
    // most common method names in JS; without a JWT import in the file these
    // matched `argon.verify(hash, password)` and `TextDecoder.decode(buf)` in
    // real repositories. See issue #471.
    it('does not match a JWT method name in a file with no JWT import', () => {
      const argon = mockMemberCallExpression('argon', 'verify', null);
      expect(isJwtLibraryCall(argon, new Set(['verify']))).toBe(false);

      const decoder = mockMemberCallExpression('textDecoder', 'decode', null);
      expect(isJwtLibraryCall(decoder, new Set(['decode']))).toBe(false);
    });

    it('matches through a subpath import of a JWT library', () => {
      // `jose/jwt/verify` and `@nestjs/jwt/dist/...` are both real spellings.
      const call = mockMemberCallExpression(
        'jose',
        'jwtVerify',
        'jose/jwt/verify',
      );
      expect(isJwtLibraryCall(call, new Set(['jwtVerify']))).toBe(true);

      const nest = mockMemberCallExpression(
        'jwtService',
        'sign',
        '@nestjs/jwt',
      );
      expect(isJwtLibraryCall(nest, new Set(['sign']))).toBe(true);
    });

    it('ignores non-import statements and non-string import sources', () => {
      // A Program whose body holds a statement that is not an ImportDeclaration,
      // and an import whose source is not a string literal (a parser can produce
      // this for `import x from someExpr` in malformed input).
      const call = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'jwt' },
          property: { type: 'Identifier', name: 'verify' },
        },
        arguments: [],
        parent: {
          type: 'Program',
          body: [
            { type: 'ExpressionStatement' },
            {
              type: 'ImportDeclaration',
              source: { value: 42 },
              specifiers: [],
            },
          ],
        },
      } as unknown as TSESTree.CallExpression;
      expect(isJwtLibraryCall(call, new Set(['verify']))).toBe(false);
    });

    it('rejects a receiver imported from a scoped non-JWT package', () => {
      // Exercises the scoped-package branch of the receiver check: `@scope/pkg`
      // resolves to two segments, and argon2 is not a JWT library.
      const call = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'argon' },
          property: { type: 'Identifier', name: 'verify' },
        },
        arguments: [],
        parent: {
          type: 'Program',
          body: [
            {
              type: 'ImportDeclaration',
              source: { value: 'jsonwebtoken' },
              specifiers: [
                { type: 'ImportDefaultSpecifier', local: { name: 'jwt' } },
              ],
            },
            {
              type: 'ImportDeclaration',
              source: { value: '@node-rs/argon2' },
              specifiers: [
                { type: 'ImportDefaultSpecifier', local: { name: 'argon' } },
              ],
            },
          ],
        },
      } as unknown as TSESTree.CallExpression;
      expect(isJwtLibraryCall(call, new Set(['verify']))).toBe(false);
    });

    it('does not reject a receiver whose import source cannot be read', () => {
      // The JWT import satisfies the file gate. The receiver check then walks
      // past an import with no `specifiers` at all, and finds the receiver bound
      // by one whose source is not a string literal.
      //
      // Expected `true`: only an import we can read and can see is *foreign*
      // rejects. An unreadable source is not evidence of anything, and treating
      // "unknown" as "foreign" would silence real findings — the false-negative
      // trade this gate is specifically designed to avoid.
      const call = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'weird' },
          property: { type: 'Identifier', name: 'verify' },
        },
        arguments: [],
        parent: {
          type: 'Program',
          body: [
            {
              type: 'ImportDeclaration',
              source: { value: 'jsonwebtoken' },
              specifiers: [
                { type: 'ImportDefaultSpecifier', local: { name: 'jwt' } },
              ],
            },
            // no `specifiers` key at all
            {
              type: 'ImportDeclaration',
              source: { value: 'side-effect-only' },
            },
            {
              type: 'ImportDeclaration',
              source: { value: 123 },
              specifiers: [
                { type: 'ImportDefaultSpecifier', local: { name: 'weird' } },
              ],
            },
          ],
        },
      } as unknown as TSESTree.CallExpression;
      expect(isJwtLibraryCall(call, new Set(['verify']))).toBe(true);
    });

    it('ignores an unparented node', () => {
      // No parent chain -> no Program -> no evidence -> no match.
      const call = {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'verify' },
        arguments: [],
      } as unknown as TSESTree.CallExpression;
      expect(isJwtLibraryCall(call, new Set(['verify']))).toBe(false);
    });

    it('should return false for non-identifier/member callee (line 117)', () => {
      // This covers the `return false` at line 117 for CallExpression, ArrowFunction, etc.
      const call = {
        type: 'CallExpression',
        callee: { type: 'ArrowFunctionExpression' }, // Not Identifier or MemberExpression
        arguments: [],
      } as unknown as TSESTree.CallExpression;
      expect(isJwtLibraryCall(call, new Set(['verify']))).toBe(false);
    });

    it('should return false for member with non-identifier property', () => {
      const call = {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'jwt' },
          property: { type: 'Literal', value: 'verify' }, // Literal, not Identifier
        },
        arguments: [],
      } as unknown as TSESTree.CallExpression;
      expect(isJwtLibraryCall(call, new Set(['verify']))).toBe(false);
    });
  });

  describe('isStringLiteral', () => {
    it('should return true for string literals', () => {
      const literal = mockLiteral('hello');
      expect(isStringLiteral(literal)).toBe(true);
    });

    it('should return true when value matches', () => {
      const literal = mockLiteral('test');
      expect(isStringLiteral(literal, 'test')).toBe(true);
    });

    it('should return false when value does not match', () => {
      const literal = mockLiteral('test');
      expect(isStringLiteral(literal, 'other')).toBe(false);
    });

    it('should return false for non-string literals', () => {
      const literal = mockLiteral(123);
      expect(isStringLiteral(literal)).toBe(false);
    });
  });

  describe('extractAlgorithms', () => {
    it('should extract single algorithm', () => {
      const obj = mockObjectExpression({
        algorithm: mockLiteral('HS256'),
      });
      expect(extractAlgorithms(obj)).toEqual(['HS256']);
    });

    it('should extract algorithms from array', () => {
      const obj = {
        type: 'ObjectExpression',
        properties: [
          {
            type: 'Property',
            key: { type: 'Identifier', name: 'algorithms' },
            value: {
              type: 'ArrayExpression',
              elements: [mockLiteral('RS256'), mockLiteral('ES256')],
            },
          },
        ],
      } as unknown as TSESTree.ObjectExpression;
      expect(extractAlgorithms(obj)).toEqual(['RS256', 'ES256']);
    });

    it('should return empty array for no algorithms', () => {
      const obj = mockObjectExpression({ other: mockLiteral('value') });
      expect(extractAlgorithms(obj)).toEqual([]);
    });

    it('should handle alg key', () => {
      const obj = mockObjectExpression({ alg: mockLiteral('ES512') });
      expect(extractAlgorithms(obj)).toEqual(['ES512']);
    });

    it('should skip SpreadElement properties (line 143)', () => {
      // This covers the `continue` at line 143 for non-Property types
      const obj = {
        type: 'ObjectExpression',
        properties: [
          {
            type: 'SpreadElement',
            argument: { type: 'Identifier', name: 'opts' },
          },
          {
            type: 'Property',
            key: { type: 'Identifier', name: 'algorithm' },
            value: mockLiteral('RS256'),
          },
        ],
      } as unknown as TSESTree.ObjectExpression;
      expect(extractAlgorithms(obj)).toEqual(['RS256']);
    });

    it('should skip properties with non-identifier keys', () => {
      // This also covers line 142 - when key.type !== 'Identifier'
      const obj = {
        type: 'ObjectExpression',
        properties: [
          {
            type: 'Property',
            key: { type: 'Literal', value: 'algorithm' }, // Literal key, not Identifier
            value: mockLiteral('RS256'),
          },
        ],
      } as unknown as TSESTree.ObjectExpression;
      expect(extractAlgorithms(obj)).toEqual([]);
    });
  });

  describe('hasOption', () => {
    it('should return true when option exists', () => {
      const obj = mockObjectExpression({ expiresIn: mockLiteral('1h') });
      expect(hasOption(obj, 'expiresIn')).toBe(true);
    });

    it('should return false when option missing', () => {
      const obj = mockObjectExpression({});
      expect(hasOption(obj, 'expiresIn')).toBe(false);
    });
  });

  describe('getOptionValue', () => {
    it('should return option value', () => {
      const value = mockLiteral('1h');
      const obj = mockObjectExpression({ expiresIn: value });
      expect(getOptionValue(obj, 'expiresIn')).toBe(value);
    });

    it('should return undefined for missing option', () => {
      const obj = mockObjectExpression({});
      expect(getOptionValue(obj, 'expiresIn')).toBeUndefined();
    });
  });

  describe('isWeakSecret', () => {
    it('should return true for short secrets', () => {
      const node = mockLiteral('short');
      expect(isWeakSecret(node, 32)).toBe(true);
    });

    it('should return false for long secrets', () => {
      const node = mockLiteral('a'.repeat(64));
      expect(isWeakSecret(node, 32)).toBe(false);
    });

    it('should return false for non-literals', () => {
      const node = {
        type: 'Identifier',
        name: 'secret',
      } as TSESTree.Identifier;
      expect(isWeakSecret(node)).toBe(false);
    });
  });

  describe('isEnvVariable', () => {
    it('should return true for process.env.X', () => {
      const node = {
        type: 'MemberExpression',
        object: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'process' },
          property: { type: 'Identifier', name: 'env' },
        },
        property: { type: 'Identifier', name: 'JWT_SECRET' },
      } as unknown as TSESTree.MemberExpression;
      expect(isEnvVariable(node)).toBe(true);
    });

    it('should return false for other nodes', () => {
      const node = {
        type: 'Identifier',
        name: 'secret',
      } as TSESTree.Identifier;
      expect(isEnvVariable(node)).toBe(false);
    });
  });

  describe('operation checkers', () => {
    it('isSignOperation detects sign calls', () => {
      expect(isSignOperation(mockCallExpression('sign'))).toBe(true);
      expect(isSignOperation(mockCallExpression('other'))).toBe(false);
    });

    it('isVerifyOperation detects verify calls', () => {
      expect(isVerifyOperation(mockCallExpression('verify'))).toBe(true);
      expect(isVerifyOperation(mockCallExpression('other'))).toBe(false);
    });

    it('isDecodeOperation detects decode calls', () => {
      expect(isDecodeOperation(mockCallExpression('decode'))).toBe(true);
      expect(isDecodeOperation(mockCallExpression('other'))).toBe(false);
    });
  });

  describe('getOptionsArgument', () => {
    it('should return options object at default index', () => {
      const options = mockObjectExpression({});
      const call = {
        ...mockCallExpression('verify'),
        arguments: [mockLiteral('token'), mockLiteral('secret'), options],
      } as unknown as TSESTree.CallExpression;
      expect(getOptionsArgument(call)).toBe(options);
    });

    it('should return undefined if no options', () => {
      const call = mockCallExpression('verify');
      expect(getOptionsArgument(call)).toBeUndefined();
    });
  });

  describe('isTestFile', () => {
    it('should return true for test files', () => {
      expect(isTestFile('file.test.ts')).toBe(true);
      expect(isTestFile('file.spec.js')).toBe(true);
      expect(isTestFile('/path/__tests__/file.ts')).toBe(true);
    });

    it('should return false for non-test files', () => {
      expect(isTestFile('index.ts')).toBe(false);
      expect(isTestFile('utils.js')).toBe(false);
    });
  });

  describe('constants', () => {
    it('should have sensitive fields', () => {
      expect(SENSITIVE_PAYLOAD_FIELDS.has('password')).toBe(true);
      expect(SENSITIVE_PAYLOAD_FIELDS.has('ssn')).toBe(true);
      expect(SENSITIVE_PAYLOAD_FIELDS.has('api_key')).toBe(true);
    });

    it('should have symmetric algorithms', () => {
      expect(SYMMETRIC_ALGORITHMS.has('HS256')).toBe(true);
    });

    it('should have secure algorithms', () => {
      expect(SECURE_ALGORITHMS.has('RS256')).toBe(true);
      expect(SECURE_ALGORITHMS.has('ES256')).toBe(true);
    });

    it('should have insecure algorithms', () => {
      expect(INSECURE_ALGORITHMS.has('none')).toBe(true);
    });

    it('should have JWT libraries', () => {
      expect(JWT_LIBRARIES.JSONWEBTOKEN).toBe('jsonwebtoken');
      expect(JWT_LIBRARIES.JOSE).toBe('jose');
    });
  });
});
