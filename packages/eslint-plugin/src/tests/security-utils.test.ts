/**
 * Comprehensive Tests for Security Utilities
 * Tests false positive reduction features with 100% coverage
 */
import { describe, it, expect } from 'vitest';
import type { TSESTree, TSESLint } from '@forge-js/eslint-plugin-utils';
import {
  SANITIZATION_FUNCTIONS,
  VALIDATION_PATTERNS,
  SAFE_ANNOTATIONS,
  SAFE_ORM_PATTERNS,
  isSanitizationCall,
  isSanitizedInput,
  hasSafeAnnotation,
  isOrmMethodCall,
  isParameterizedQuery,
  isInputSafe,
  createSafetyChecker,
  // New severity and compliance helpers
  meetsSeverityThreshold,
  getEffectiveSeverity,
  shouldReportSeverity,
  formatComplianceTags,
  buildTicketUrl,
  getDocumentationUrl,
  enhanceMessageData,
  type SeverityLevel,
  type SeverityOverride,
  type ComplianceContext,
} from '../utils/security-utils';

// Helper to create mock AST nodes
function createMockIdentifier(name: string): TSESTree.Identifier {
  return {
    type: 'Identifier',
    name,
    range: [0, name.length],
    loc: { start: { line: 1, column: 0 }, end: { line: 1, column: name.length } },
  } as TSESTree.Identifier;
}

function createMockCallExpression(
  callee: TSESTree.Expression,
  args: TSESTree.Expression[] = []
): TSESTree.CallExpression {
  return {
    type: 'CallExpression',
    callee,
    arguments: args,
    optional: false,
    range: [0, 10],
    loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
  } as TSESTree.CallExpression;
}

function createMockMemberExpression(
  objectName: string,
  propertyName: string
): TSESTree.MemberExpression {
  return {
    type: 'MemberExpression',
    object: createMockIdentifier(objectName),
    property: createMockIdentifier(propertyName),
    computed: false,
    optional: false,
    range: [0, 10],
    loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
  } as TSESTree.MemberExpression;
}

function createMockBlockStatement(): TSESTree.BlockStatement {
  return {
    type: 'BlockStatement',
    body: [],
    parent: {} as TSESTree.Node,
    loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
    range: [0, 50] as [number, number],
  } as unknown as TSESTree.BlockStatement;
}

function createMockFunctionDeclaration(name: string): TSESTree.FunctionDeclaration {
  return {
    type: 'FunctionDeclaration',
    id: createMockIdentifier(name),
    params: [],
    body: createMockBlockStatement(),
    range: [0, 50] as [number, number],
    loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
    async: false,
    generator: false,
    expression: false,
    declare: false,
  } as unknown as TSESTree.FunctionDeclaration;
}

function createMockFunctionExpression(): TSESTree.FunctionExpression {
  return {
    type: 'FunctionExpression',
    id: null,
    params: [],
    body: createMockBlockStatement(),
    range: [0, 50] as [number, number],
    loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
    async: false,
    generator: false,
    expression: false,
    declare: false,
  } as unknown as TSESTree.FunctionExpression;
}

function createMockArrowFunctionExpression(): TSESTree.ArrowFunctionExpression {
  return {
    type: 'ArrowFunctionExpression',
    params: [],
    body: createMockBlockStatement(),
    expression: false,
    range: [0, 50] as [number, number],
    loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
    async: false,
    generator: false,
    id: null,
  } as unknown as TSESTree.ArrowFunctionExpression;
}

function createMockMethodDefinition(name: string): TSESTree.MethodDefinition {
  return {
    type: 'MethodDefinition',
    key: createMockIdentifier(name),
    value: createMockFunctionExpression(),
    kind: 'method',
    computed: false,
    static: false,
    range: [0, 50] as [number, number],
    loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
  } as unknown as TSESTree.MethodDefinition;
}

function createMockContext(options: {
  getText?: (node: TSESTree.Node) => string;
  getScope?: () => { variables: Array<{ name: string; defs: Array<{ node: TSESTree.Node }> }> };
  getCommentsBefore?: (node: TSESTree.Node) => Array<{ type: string; value: string }>;
} = {}): TSESLint.RuleContext<string, unknown[]> {
  const {
    getText = () => '',
    getScope = () => ({ variables: [] }),
    getCommentsBefore = () => [],
  } = options;

  return {
    sourceCode: {
      getText,
      getScope,
      getCommentsBefore,
    },
    getScope,
  } as unknown as TSESLint.RuleContext<string, unknown[]>;
}

describe('security-utils', () => {
  // ============================================================
  // CONSTANT ARRAYS
  // ============================================================

  describe('SANITIZATION_FUNCTIONS', () => {
    it('should include common sanitization functions', () => {
      expect(SANITIZATION_FUNCTIONS).toContain('sanitize');
      expect(SANITIZATION_FUNCTIONS).toContain('escape');
      expect(SANITIZATION_FUNCTIONS).toContain('validate');
      expect(SANITIZATION_FUNCTIONS).toContain('DOMPurify');
    });

    it('should include encoding functions', () => {
      expect(SANITIZATION_FUNCTIONS).toContain('encodeURIComponent');
      expect(SANITIZATION_FUNCTIONS).toContain('encodeURI');
      expect(SANITIZATION_FUNCTIONS).toContain('htmlEncode');
    });

    it('should include type coercion functions', () => {
      expect(SANITIZATION_FUNCTIONS).toContain('parseInt');
      expect(SANITIZATION_FUNCTIONS).toContain('parseFloat');
      expect(SANITIZATION_FUNCTIONS).toContain('Number');
      expect(SANITIZATION_FUNCTIONS).toContain('Boolean');
      expect(SANITIZATION_FUNCTIONS).toContain('String');
      expect(SANITIZATION_FUNCTIONS).toContain('BigInt');
    });

    it('should include library-specific functions', () => {
      expect(SANITIZATION_FUNCTIONS).toContain('xss');
      expect(SANITIZATION_FUNCTIONS).toContain('filterXSS');
      expect(SANITIZATION_FUNCTIONS).toContain('bleach');
      expect(SANITIZATION_FUNCTIONS).toContain('validator');
    });

    it('should include all escaping variants', () => {
      expect(SANITIZATION_FUNCTIONS).toContain('escapeHtml');
      expect(SANITIZATION_FUNCTIONS).toContain('escapeSql');
      expect(SANITIZATION_FUNCTIONS).toContain('escapeRegExp');
      expect(SANITIZATION_FUNCTIONS).toContain('escapeShell');
    });
  });

  describe('VALIDATION_PATTERNS', () => {
    it('should include validator.js patterns', () => {
      expect(VALIDATION_PATTERNS).toContain('validator.escape');
      expect(VALIDATION_PATTERNS).toContain('validator.isEmail');
      expect(VALIDATION_PATTERNS).toContain('validator.isURL');
      expect(VALIDATION_PATTERNS).toContain('validator.isUUID');
      expect(VALIDATION_PATTERNS).toContain('validator.trim');
    });

    it('should include Zod patterns', () => {
      expect(VALIDATION_PATTERNS).toContain('z.string');
      expect(VALIDATION_PATTERNS).toContain('z.number');
      expect(VALIDATION_PATTERNS).toContain('z.boolean');
      expect(VALIDATION_PATTERNS).toContain('z.array');
      expect(VALIDATION_PATTERNS).toContain('z.object');
      expect(VALIDATION_PATTERNS).toContain('schema.parse');
      expect(VALIDATION_PATTERNS).toContain('schema.safeParse');
    });

    it('should include Yup patterns', () => {
      expect(VALIDATION_PATTERNS).toContain('yup.string');
      expect(VALIDATION_PATTERNS).toContain('yup.number');
      expect(VALIDATION_PATTERNS).toContain('string().email');
    });

    it('should include Joi patterns', () => {
      expect(VALIDATION_PATTERNS).toContain('Joi.string');
      expect(VALIDATION_PATTERNS).toContain('Joi.number');
      expect(VALIDATION_PATTERNS).toContain('joi.string');
    });

    it('should include DOMPurify patterns', () => {
      expect(VALIDATION_PATTERNS).toContain('DOMPurify.sanitize');
      expect(VALIDATION_PATTERNS).toContain('purify.sanitize');
    });

    it('should include express-validator patterns', () => {
      expect(VALIDATION_PATTERNS).toContain('body().escape');
      expect(VALIDATION_PATTERNS).toContain('body().trim');
      expect(VALIDATION_PATTERNS).toContain('validationResult');
      expect(VALIDATION_PATTERNS).toContain('matchedData');
    });

    it('should include class-validator patterns', () => {
      expect(VALIDATION_PATTERNS).toContain('IsEmail');
      expect(VALIDATION_PATTERNS).toContain('IsUrl');
      expect(VALIDATION_PATTERNS).toContain('IsUUID');
      expect(VALIDATION_PATTERNS).toContain('IsString');
    });
  });

  describe('SAFE_ANNOTATIONS', () => {
    it('should include all safe annotations', () => {
      expect(SAFE_ANNOTATIONS).toContain('@safe');
      expect(SAFE_ANNOTATIONS).toContain('@validated');
      expect(SAFE_ANNOTATIONS).toContain('@sanitized');
      expect(SAFE_ANNOTATIONS).toContain('@trusted');
      expect(SAFE_ANNOTATIONS).toContain('@escaped');
      expect(SAFE_ANNOTATIONS).toContain('@clean');
      expect(SAFE_ANNOTATIONS).toContain('@verified');
    });

    it('should have exactly 7 annotations', () => {
      expect(SAFE_ANNOTATIONS).toHaveLength(7);
    });
  });

  describe('SAFE_ORM_PATTERNS', () => {
    it('should include Prisma patterns', () => {
      expect(SAFE_ORM_PATTERNS).toContain('prisma.');
      expect(SAFE_ORM_PATTERNS).toContain('.findUnique(');
      expect(SAFE_ORM_PATTERNS).toContain('.findFirst(');
      expect(SAFE_ORM_PATTERNS).toContain('.findMany(');
      expect(SAFE_ORM_PATTERNS).toContain('.create(');
      expect(SAFE_ORM_PATTERNS).toContain('.createMany(');
      expect(SAFE_ORM_PATTERNS).toContain('.upsert(');
    });

    it('should include TypeORM patterns', () => {
      expect(SAFE_ORM_PATTERNS).toContain('.createQueryBuilder(');
      expect(SAFE_ORM_PATTERNS).toContain('.getRepository(');
      expect(SAFE_ORM_PATTERNS).toContain('.find(');
      expect(SAFE_ORM_PATTERNS).toContain('.findOne(');
      expect(SAFE_ORM_PATTERNS).toContain('.findOneBy(');
      expect(SAFE_ORM_PATTERNS).toContain('.save(');
      expect(SAFE_ORM_PATTERNS).toContain('.softDelete(');
    });

    it('should include Sequelize patterns', () => {
      expect(SAFE_ORM_PATTERNS).toContain('Model.findAll');
      expect(SAFE_ORM_PATTERNS).toContain('Model.findOne');
      expect(SAFE_ORM_PATTERNS).toContain('Model.findByPk');
      expect(SAFE_ORM_PATTERNS).toContain('Model.create');
      expect(SAFE_ORM_PATTERNS).toContain('Model.update');
      expect(SAFE_ORM_PATTERNS).toContain('Model.destroy');
    });

    it('should include Knex patterns', () => {
      expect(SAFE_ORM_PATTERNS).toContain('.where(');
      expect(SAFE_ORM_PATTERNS).toContain('.andWhere(');
      expect(SAFE_ORM_PATTERNS).toContain('.orWhere(');
      expect(SAFE_ORM_PATTERNS).toContain('.whereIn(');
      expect(SAFE_ORM_PATTERNS).toContain('.whereNotIn(');
      expect(SAFE_ORM_PATTERNS).toContain('.whereBetween(');
      expect(SAFE_ORM_PATTERNS).toContain('.insert(');
      expect(SAFE_ORM_PATTERNS).toContain('.returning(');
    });

    it('should include Mongoose patterns', () => {
      expect(SAFE_ORM_PATTERNS).toContain('.findById(');
      expect(SAFE_ORM_PATTERNS).toContain('.findByIdAndUpdate(');
      expect(SAFE_ORM_PATTERNS).toContain('.findByIdAndDelete(');
      expect(SAFE_ORM_PATTERNS).toContain('.find({');
      expect(SAFE_ORM_PATTERNS).toContain('.findOne({');
      expect(SAFE_ORM_PATTERNS).toContain('.updateOne({');
      expect(SAFE_ORM_PATTERNS).toContain('.updateMany({');
      expect(SAFE_ORM_PATTERNS).toContain('.deleteOne({');
      expect(SAFE_ORM_PATTERNS).toContain('.deleteMany({');
    });
  });

  // ============================================================
  // isSanitizationCall
  // ============================================================

  describe('isSanitizationCall', () => {
    it('should return true for direct sanitization function calls', () => {
      const node = createMockCallExpression(createMockIdentifier('sanitize'));
      expect(isSanitizationCall(node)).toBe(true);
    });

    it('should return true for escape function calls', () => {
      const node = createMockCallExpression(createMockIdentifier('escape'));
      expect(isSanitizationCall(node)).toBe(true);
    });

    it('should return true for validate function calls', () => {
      const node = createMockCallExpression(createMockIdentifier('validate'));
      expect(isSanitizationCall(node)).toBe(true);
    });

    it('should return true for parseInt calls', () => {
      const node = createMockCallExpression(createMockIdentifier('parseInt'));
      expect(isSanitizationCall(node)).toBe(true);
    });

    it('should return true for Number calls', () => {
      const node = createMockCallExpression(createMockIdentifier('Number'));
      expect(isSanitizationCall(node)).toBe(true);
    });

    it('should return true for method calls on sanitization objects', () => {
      const memberExpr = createMockMemberExpression('DOMPurify', 'sanitize');
      const node = createMockCallExpression(memberExpr);
      expect(isSanitizationCall(node)).toBe(true);
    });

    it('should return true for validator.escape pattern', () => {
      const memberExpr = createMockMemberExpression('validator', 'escape');
      const node = createMockCallExpression(memberExpr);
      expect(isSanitizationCall(node)).toBe(true);
    });

    it('should return false for non-sanitization function calls', () => {
      const node = createMockCallExpression(createMockIdentifier('dangerousFunction'));
      expect(isSanitizationCall(node)).toBe(false);
    });

    it('should return false for non-CallExpression nodes', () => {
      const node = createMockIdentifier('sanitize');
      expect(isSanitizationCall(node)).toBe(false);
    });

    it('should support custom functions', () => {
      const node = createMockCallExpression(createMockIdentifier('myCustomSanitizer'));
      expect(isSanitizationCall(node)).toBe(false);
      expect(isSanitizationCall(node, ['myCustomSanitizer'])).toBe(true);
    });

    it('should handle member expressions with non-identifier properties', () => {
      const memberExpr: TSESTree.MemberExpression = {
        type: 'MemberExpression',
        object: createMockIdentifier('obj'),
        property: {
          type: 'Literal',
          value: 'method',
          raw: "'method'",
        } as TSESTree.Literal,
        computed: true,
        optional: false,
        range: [0, 10],
        loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      } as TSESTree.MemberExpression;
      const node = createMockCallExpression(memberExpr);
      expect(isSanitizationCall(node)).toBe(false);
    });

    it('should detect validation patterns in method paths', () => {
      // Create a nested member expression: z.string()
      const innerMember = createMockMemberExpression('z', 'string');
      const node = createMockCallExpression(innerMember);
      expect(isSanitizationCall(node)).toBe(true);
    });

    it('should return true for method name that is a sanitization function', () => {
      // obj.escape() where 'escape' is in SANITIZATION_FUNCTIONS
      const memberExpr = createMockMemberExpression('unknownObject', 'escape');
      const node = createMockCallExpression(memberExpr);
      expect(isSanitizationCall(node)).toBe(true);
    });

    it('should return false for method name that is NOT a sanitization function', () => {
      // obj.doSomething() where 'doSomething' is not in SANITIZATION_FUNCTIONS
      const memberExpr = createMockMemberExpression('unknownObject', 'doSomething');
      const node = createMockCallExpression(memberExpr);
      expect(isSanitizationCall(node)).toBe(false);
    });
  });

  // ============================================================
  // isSanitizedInput
  // ============================================================

  describe('isSanitizedInput', () => {
    it('should return true for direct sanitization calls', () => {
      const node = createMockCallExpression(createMockIdentifier('sanitize'));
      const context = createMockContext();
      expect(isSanitizedInput(node, context)).toBe(true);
    });

    it('should return true for identifier assigned from sanitization call', () => {
      const node = createMockIdentifier('cleanInput');
      
      // Mock the init node as a sanitization call
      const initNode = createMockCallExpression(createMockIdentifier('sanitize'));
      
      const context = createMockContext({
        getScope: () => ({
          variables: [{
            name: 'cleanInput',
            defs: [{
              node: {
                type: 'VariableDeclarator',
                init: initNode,
              } as unknown as TSESTree.VariableDeclarator,
            }],
          }],
        }),
      });

      // Need to set up sourceCode.getScope
      (context.sourceCode as unknown as { getScope: typeof context.getScope }).getScope = context.getScope;

      expect(isSanitizedInput(node, context)).toBe(true);
    });

    it('should return false for identifier not assigned from sanitization', () => {
      const node = createMockIdentifier('userInput');
      
      const context = createMockContext({
        getScope: () => ({
          variables: [{
            name: 'userInput',
            defs: [{
              node: {
                type: 'VariableDeclarator',
                init: createMockIdentifier('dangerousValue'),
              } as unknown as TSESTree.VariableDeclarator,
            }],
          }],
        }),
      });

      (context.sourceCode as unknown as { getScope: typeof context.getScope }).getScope = context.getScope;

      expect(isSanitizedInput(node, context)).toBe(false);
    });

    it('should return false for identifier with no definitions', () => {
      const node = createMockIdentifier('unknownVar');
      
      const context = createMockContext({
        getScope: () => ({
          variables: [],
        }),
      });

      (context.sourceCode as unknown as { getScope: typeof context.getScope }).getScope = context.getScope;

      expect(isSanitizedInput(node, context)).toBe(false);
    });

    it('should return false for non-identifier, non-call nodes', () => {
      const node: TSESTree.Literal = {
        type: 'Literal',
        value: 'test',
        raw: "'test'",
        range: [0, 6],
        loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 6 } },
      } as TSESTree.Literal;
      
      const context = createMockContext();
      expect(isSanitizedInput(node, context)).toBe(false);
    });

    it('should handle variable with definition but no init', () => {
      const node = createMockIdentifier('uninitializedVar');
      
      const context = createMockContext({
        getScope: () => ({
          variables: [{
            name: 'uninitializedVar',
            defs: [{
              node: {
                type: 'VariableDeclarator',
                init: null,
              } as unknown as TSESTree.VariableDeclarator,
            }],
          }],
        }),
      });

      (context.sourceCode as unknown as { getScope: typeof context.getScope }).getScope = context.getScope;

      expect(isSanitizedInput(node, context)).toBe(false);
    });

    it('should handle non-VariableDeclarator definitions', () => {
      const node = createMockIdentifier('paramVar');
      
      const context = createMockContext({
        getScope: () => ({
          variables: [{
            name: 'paramVar',
            defs: [{
              node: {
                type: 'FunctionDeclaration', // Not a VariableDeclarator
              } as unknown as TSESTree.Node,
            }],
          }],
        }),
      });

      (context.sourceCode as unknown as { getScope: typeof context.getScope }).getScope = context.getScope;

      expect(isSanitizedInput(node, context)).toBe(false);
    });

    it('should support custom sanitizer functions', () => {
      const node = createMockCallExpression(createMockIdentifier('myCustomClean'));
      const context = createMockContext();
      
      expect(isSanitizedInput(node, context)).toBe(false);
      expect(isSanitizedInput(node, context, ['myCustomClean'])).toBe(true);
    });

    it('should handle context without getScope', () => {
      const node = createMockIdentifier('someVar');
      
      const context = {
        sourceCode: {
          getScope: undefined,
        },
        getScope: undefined,
      } as unknown as TSESLint.RuleContext<string, unknown[]>;

      expect(isSanitizedInput(node, context)).toBe(false);
    });
  });

  // ============================================================
  // hasSafeAnnotation
  // ============================================================

  describe('hasSafeAnnotation', () => {
    it('should return true for function with @safe JSDoc', () => {
      const funcNode = createMockFunctionDeclaration('testFunc');

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = funcNode;

      const context = createMockContext({
        getCommentsBefore: (node) => {
          if (node === funcNode) {
            return [{ type: 'Block', value: '* @safe - validated by middleware ' }];
          }
          return [];
        },
      });

      expect(hasSafeAnnotation(innerNode, context)).toBe(true);
    });

    it('should return true for @validated annotation', () => {
      const funcNode = createMockFunctionDeclaration('testFunc');

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = funcNode;

      const context = createMockContext({
        getCommentsBefore: (node) => {
          if (node === funcNode) {
            return [{ type: 'Block', value: '* @validated ' }];
          }
          return [];
        },
      });

      expect(hasSafeAnnotation(innerNode, context)).toBe(true);
    });

    it('should return true for @sanitized annotation', () => {
      const funcNode = createMockFunctionExpression();

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = funcNode;

      const context = createMockContext({
        getCommentsBefore: (node) => {
          if (node === funcNode) {
            return [{ type: 'Block', value: '* @sanitized ' }];
          }
          return [];
        },
      });

      expect(hasSafeAnnotation(innerNode, context)).toBe(true);
    });

    it('should return true for ArrowFunctionExpression with annotation', () => {
      const funcNode = createMockArrowFunctionExpression();

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = funcNode;

      const context = createMockContext({
        getCommentsBefore: (node) => {
          if (node === funcNode) {
            return [{ type: 'Block', value: '* @trusted ' }];
          }
          return [];
        },
      });

      expect(hasSafeAnnotation(innerNode, context)).toBe(true);
    });

    it('should return true for MethodDefinition with annotation', () => {
      const methodNode = createMockMethodDefinition('method');

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = methodNode;

      const context = createMockContext({
        getCommentsBefore: (node) => {
          if (node === methodNode) {
            return [{ type: 'Block', value: '* @escaped ' }];
          }
          return [];
        },
      });

      expect(hasSafeAnnotation(innerNode, context)).toBe(true);
    });

    it('should return false when no annotations present', () => {
      const funcNode = createMockFunctionDeclaration('testFunc');

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = funcNode;

      const context = createMockContext({
        getCommentsBefore: () => [],
      });

      expect(hasSafeAnnotation(innerNode, context)).toBe(false);
    });

    it('should return false for non-JSDoc block comments', () => {
      const funcNode = createMockFunctionDeclaration('testFunc');

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = funcNode;

      const context = createMockContext({
        getCommentsBefore: (node) => {
          if (node === funcNode) {
            return [{ type: 'Block', value: ' not a jsdoc comment ' }];
          }
          return [];
        },
      });

      expect(hasSafeAnnotation(innerNode, context)).toBe(false);
    });

    it('should check inline comments on the node itself', () => {
      const node = createMockIdentifier('value');

      const context = createMockContext({
        getCommentsBefore: (n) => {
          if (n === node) {
            return [{ type: 'Line', value: ' @safe ' }];
          }
          return [];
        },
      });

      expect(hasSafeAnnotation(node, context)).toBe(true);
    });

    it('should support custom annotations', () => {
      const funcNode = createMockFunctionDeclaration('testFunc');

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = funcNode;

      const context = createMockContext({
        getCommentsBefore: (node) => {
          if (node === funcNode) {
            return [{ type: 'Block', value: '* @my-custom-safe ' }];
          }
          return [];
        },
      });

      expect(hasSafeAnnotation(innerNode, context)).toBe(false);
      expect(hasSafeAnnotation(innerNode, context, ['@my-custom-safe'])).toBe(true);
    });

    it('should handle nodes without parent', () => {
      const node = createMockIdentifier('orphan');
      
      const context = createMockContext({
        getCommentsBefore: () => [],
      });

      expect(hasSafeAnnotation(node, context)).toBe(false);
    });

    it('should be case-insensitive for annotations', () => {
      const funcNode = createMockFunctionDeclaration('testFunc');

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = funcNode;

      const context = createMockContext({
        getCommentsBefore: (node) => {
          if (node === funcNode) {
            return [{ type: 'Block', value: '* @SAFE ' }];
          }
          return [];
        },
      });

      expect(hasSafeAnnotation(innerNode, context)).toBe(true);
    });

    it('should detect non-JSDoc leading comments with safe annotation', () => {
      const funcNode = createMockFunctionDeclaration('testFunc');

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = funcNode;

      // Non-JSDoc comment (doesn't start with '*') but contains @safe
      const context = createMockContext({
        getCommentsBefore: (node) => {
          if (node === funcNode) {
            return [{ type: 'Line', value: ' @validated input ' }];
          }
          return [];
        },
      });

      expect(hasSafeAnnotation(innerNode, context)).toBe(true);
    });
  });

  // ============================================================
  // isOrmMethodCall
  // ============================================================

  describe('isOrmMethodCall', () => {
    it('should return true for prisma calls', () => {
      const node = createMockCallExpression(
        createMockMemberExpression('prisma', 'findMany')
      );
      
      const context = createMockContext({
        getText: () => 'prisma.user.findMany({ where: { id } })',
      });

      expect(isOrmMethodCall(node, context)).toBe(true);
    });

    it('should return true for findUnique pattern', () => {
      const node = createMockCallExpression(
        createMockMemberExpression('db', 'findUnique')
      );
      
      const context = createMockContext({
        getText: () => 'db.user.findUnique({ where: { id } })',
      });

      expect(isOrmMethodCall(node, context)).toBe(true);
    });

    it('should return true for createQueryBuilder pattern', () => {
      const node = createMockCallExpression(
        createMockMemberExpression('repository', 'createQueryBuilder')
      );
      
      const context = createMockContext({
        getText: () => 'repository.createQueryBuilder("user")',
      });

      expect(isOrmMethodCall(node, context)).toBe(true);
    });

    it('should return true for known ORM object names', () => {
      const node = createMockCallExpression(
        createMockMemberExpression('sequelize', 'query')
      );
      
      const context = createMockContext({
        getText: () => 'sequelize.query("SELECT 1")',
      });

      expect(isOrmMethodCall(node, context)).toBe(true);
    });

    it('should return true for knex pattern', () => {
      const node = createMockCallExpression(
        createMockMemberExpression('knex', 'select')
      );
      
      const context = createMockContext({
        getText: () => 'knex("users").where({ id })',
      });

      expect(isOrmMethodCall(node, context)).toBe(true);
    });

    it('should return true for repository pattern', () => {
      const node = createMockCallExpression(
        createMockMemberExpression('repository', 'find')
      );
      
      const context = createMockContext({
        getText: () => 'repository.find({ where: { id } })',
      });

      expect(isOrmMethodCall(node, context)).toBe(true);
    });

    it('should return true for model pattern', () => {
      const node = createMockCallExpression(
        createMockMemberExpression('Model', 'findAll')
      );
      
      const context = createMockContext({
        getText: () => 'Model.findAll({ where: { id } })',
      });

      expect(isOrmMethodCall(node, context)).toBe(true);
    });

    it('should return false for non-ORM calls', () => {
      const node = createMockCallExpression(
        createMockMemberExpression('someObject', 'someMethod')
      );
      
      const context = createMockContext({
        getText: () => 'someObject.someMethod()',
      });

      expect(isOrmMethodCall(node, context)).toBe(false);
    });

    it('should return false for non-CallExpression', () => {
      const node = createMockIdentifier('prisma');
      const context = createMockContext();

      expect(isOrmMethodCall(node, context)).toBe(false);
    });

    it('should support custom patterns', () => {
      const node = createMockCallExpression(
        createMockMemberExpression('customDb', 'customFind')
      );
      
      const context = createMockContext({
        getText: () => 'customDb.customFind({ id })',
      });

      expect(isOrmMethodCall(node, context)).toBe(false);
      expect(isOrmMethodCall(node, context, ['customDb.customFind'])).toBe(true);
    });

    it('should handle direct function call (not member expression)', () => {
      const node = createMockCallExpression(createMockIdentifier('findAll'));
      
      const context = createMockContext({
        getText: () => 'findAll({ where: { id } })',
      });

      expect(isOrmMethodCall(node, context)).toBe(false);
    });
  });

  // ============================================================
  // isParameterizedQuery
  // ============================================================

  describe('isParameterizedQuery', () => {
    it('should detect MySQL/SQLite style placeholders', () => {
      expect(isParameterizedQuery('SELECT * FROM users WHERE id = ?')).toBe(true);
      expect(isParameterizedQuery('INSERT INTO users (name, email) VALUES (?, ?)')).toBe(true);
    });

    it('should detect PostgreSQL style placeholders', () => {
      expect(isParameterizedQuery('SELECT * FROM users WHERE id = $1')).toBe(true);
      expect(isParameterizedQuery('SELECT * FROM users WHERE id = $1 AND name = $2')).toBe(true);
      expect(isParameterizedQuery('SELECT * FROM users WHERE id = $123')).toBe(true);
    });

    it('should detect named parameter placeholders', () => {
      expect(isParameterizedQuery('SELECT * FROM users WHERE id = :id')).toBe(true);
      expect(isParameterizedQuery('SELECT * FROM users WHERE id = :userId AND name = :name')).toBe(true);
    });

    it('should detect SQL Server style placeholders', () => {
      expect(isParameterizedQuery('SELECT * FROM users WHERE id = @id')).toBe(true);
      expect(isParameterizedQuery('SELECT * FROM users WHERE id = @userId')).toBe(true);
    });

    it('should return false for non-parameterized queries', () => {
      expect(isParameterizedQuery('SELECT * FROM users')).toBe(false);
      expect(isParameterizedQuery('SELECT * FROM users WHERE id = 1')).toBe(false);
      expect(isParameterizedQuery("SELECT * FROM users WHERE name = 'John'")).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isParameterizedQuery('')).toBe(false);
    });
  });

  // ============================================================
  // isInputSafe
  // ============================================================

  describe('isInputSafe', () => {
    it('should return true for sanitized input', () => {
      const node = createMockCallExpression(createMockIdentifier('sanitize'));
      const context = createMockContext();

      expect(isInputSafe(node, context)).toBe(true);
    });

    it('should return true for safe annotation', () => {
      const funcNode = createMockFunctionDeclaration('testFunc');

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = funcNode;

      const context = createMockContext({
        getCommentsBefore: (node) => {
          if (node === funcNode) {
            return [{ type: 'Block', value: '* @safe ' }];
          }
          return [];
        },
      });

      expect(isInputSafe(innerNode, context)).toBe(true);
    });

    it('should return true for ORM method call parent', () => {
      const callNode = createMockCallExpression(
        createMockMemberExpression('prisma', 'findMany')
      );
      
      const innerNode = createMockIdentifier('userId');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = callNode;

      const context = createMockContext({
        getText: () => 'prisma.user.findMany({ where: { id: userId } })',
      });

      expect(isInputSafe(innerNode, context)).toBe(true);
    });

    it('should return false for unsafe input', () => {
      const node = createMockIdentifier('userInput');
      const context = createMockContext({
        getScope: () => ({ variables: [] }),
        getCommentsBefore: () => [],
      });

      (context.sourceCode as unknown as { getScope: typeof context.getScope }).getScope = context.getScope;

      expect(isInputSafe(node, context)).toBe(false);
    });

    it('should support custom options', () => {
      const node = createMockCallExpression(createMockIdentifier('myClean'));
      const context = createMockContext();

      expect(isInputSafe(node, context)).toBe(false);
      expect(isInputSafe(node, context, { customSanitizers: ['myClean'] })).toBe(true);
    });
  });

  // ============================================================
  // createSafetyChecker
  // ============================================================

  describe('createSafetyChecker', () => {
    it('should create a checker with default options', () => {
      const checker = createSafetyChecker();
      
      expect(checker.isSafe).toBeInstanceOf(Function);
      expect(checker.isSanitized).toBeInstanceOf(Function);
      expect(checker.hasAnnotation).toBeInstanceOf(Function);
    });

    it('should return true for sanitized input via isSafe', () => {
      const checker = createSafetyChecker();
      const node = createMockCallExpression(createMockIdentifier('sanitize'));
      const context = createMockContext();

      expect(checker.isSafe(node, context)).toBe(true);
    });

    it('should return true for sanitized input via isSanitized', () => {
      const checker = createSafetyChecker();
      const node = createMockCallExpression(createMockIdentifier('escape'));
      const context = createMockContext();

      expect(checker.isSanitized(node, context)).toBe(true);
    });

    it('should return false in strict mode', () => {
      const checker = createSafetyChecker({ strictMode: true });
      const node = createMockCallExpression(createMockIdentifier('sanitize'));
      const context = createMockContext();

      expect(checker.isSafe(node, context)).toBe(false);
      expect(checker.isSanitized(node, context)).toBe(false);
    });

    it('should support custom sanitizers', () => {
      const checker = createSafetyChecker({
        trustedSanitizers: ['myCustomSanitize'],
      });
      
      const node = createMockCallExpression(createMockIdentifier('myCustomSanitize'));
      const context = createMockContext();

      expect(checker.isSafe(node, context)).toBe(true);
      expect(checker.isSanitized(node, context)).toBe(true);
    });

    it('should support custom annotations', () => {
      const checker = createSafetyChecker({
        trustedAnnotations: ['@my-safe'],
      });

      const funcNode = createMockFunctionDeclaration('testFunc');

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = funcNode;

      const context = createMockContext({
        getCommentsBefore: (node) => {
          if (node === funcNode) {
            return [{ type: 'Block', value: '* @my-safe ' }];
          }
          return [];
        },
      });

      expect(checker.hasAnnotation(innerNode, context)).toBe(true);
    });

    it('should return false for hasAnnotation in strict mode', () => {
      const checker = createSafetyChecker({ strictMode: true });

      const funcNode = createMockFunctionDeclaration('testFunc');

      const innerNode = createMockIdentifier('inner');
      (innerNode as TSESTree.Node & { parent?: TSESTree.Node }).parent = funcNode;

      const context = createMockContext({
        getCommentsBefore: (node) => {
          if (node === funcNode) {
            return [{ type: 'Block', value: '* @safe ' }];
          }
          return [];
        },
      });

      expect(checker.hasAnnotation(innerNode, context)).toBe(false);
    });

    it('should work with all options combined', () => {
      const checker = createSafetyChecker({
        trustedSanitizers: ['customSanitize'],
        trustedAnnotations: ['@custom-safe'],
        trustedOrmPatterns: ['customOrm.query'],
        strictMode: false,
      });

      const node = createMockCallExpression(createMockIdentifier('customSanitize'));
      const context = createMockContext();

      expect(checker.isSafe(node, context)).toBe(true);
    });
  });

  // ============================================================
  // SEVERITY AND COMPLIANCE HELPERS
  // ============================================================

  describe('meetsSeverityThreshold', () => {
    it('should return true when severity meets threshold', () => {
      expect(meetsSeverityThreshold('CRITICAL', 'CRITICAL')).toBe(true);
      expect(meetsSeverityThreshold('HIGH', 'MEDIUM')).toBe(true);
      expect(meetsSeverityThreshold('MEDIUM', 'LOW')).toBe(true);
      expect(meetsSeverityThreshold('LOW', 'INFO')).toBe(true);
    });

    it('should return true when severity exceeds threshold', () => {
      expect(meetsSeverityThreshold('CRITICAL', 'LOW')).toBe(true);
      expect(meetsSeverityThreshold('HIGH', 'INFO')).toBe(true);
      expect(meetsSeverityThreshold('MEDIUM', 'INFO')).toBe(true);
    });

    it('should return false when severity below threshold', () => {
      expect(meetsSeverityThreshold('LOW', 'CRITICAL')).toBe(false);
      expect(meetsSeverityThreshold('MEDIUM', 'HIGH')).toBe(false);
      expect(meetsSeverityThreshold('INFO', 'LOW')).toBe(false);
    });

    it('should handle all severity levels correctly', () => {
      const severities: SeverityLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
      
      // Each severity should meet its own threshold
      for (const severity of severities) {
        expect(meetsSeverityThreshold(severity, severity)).toBe(true);
      }
    });
  });

  describe('getEffectiveSeverity', () => {
    it('should return default severity when no override', () => {
      expect(getEffectiveSeverity('HIGH')).toBe('HIGH');
      expect(getEffectiveSeverity('CRITICAL')).toBe('CRITICAL');
    });

    it('should return default severity when override is undefined', () => {
      expect(getEffectiveSeverity('MEDIUM', undefined)).toBe('MEDIUM');
    });

    it('should use level override when provided', () => {
      const override: SeverityOverride = { level: 'CRITICAL' };
      expect(getEffectiveSeverity('LOW', override)).toBe('CRITICAL');
    });

    it('should use pattern-based override when context matches', () => {
      const override: SeverityOverride = {
        patterns: {
          'user-input': 'CRITICAL',
          'internal-api': 'MEDIUM',
        },
      };

      expect(getEffectiveSeverity('HIGH', override, { pattern: 'user-input' })).toBe('CRITICAL');
      expect(getEffectiveSeverity('HIGH', override, { pattern: 'internal-api' })).toBe('MEDIUM');
    });

    it('should fall back to default when pattern not found', () => {
      const override: SeverityOverride = {
        patterns: {
          'user-input': 'CRITICAL',
        },
      };

      expect(getEffectiveSeverity('HIGH', override, { pattern: 'unknown-pattern' })).toBe('HIGH');
    });

    it('should prioritize pattern over level', () => {
      const override: SeverityOverride = {
        level: 'LOW',
        patterns: {
          'user-input': 'CRITICAL',
        },
      };

      expect(getEffectiveSeverity('MEDIUM', override, { pattern: 'user-input' })).toBe('CRITICAL');
      // When pattern doesn't match, use level
      expect(getEffectiveSeverity('MEDIUM', override, { pattern: 'other' })).toBe('LOW');
    });

    it('should handle empty override object', () => {
      const override: SeverityOverride = {};
      expect(getEffectiveSeverity('HIGH', override)).toBe('HIGH');
    });
  });

  describe('shouldReportSeverity', () => {
    it('should return true when no override provided', () => {
      expect(shouldReportSeverity('LOW')).toBe(true);
      expect(shouldReportSeverity('INFO')).toBe(true);
    });

    it('should return true when no minSeverity in override', () => {
      const override: SeverityOverride = { level: 'HIGH' };
      expect(shouldReportSeverity('LOW', override)).toBe(true);
    });

    it('should return true when severity meets minSeverity', () => {
      const override: SeverityOverride = { minSeverity: 'MEDIUM' };
      expect(shouldReportSeverity('CRITICAL', override)).toBe(true);
      expect(shouldReportSeverity('HIGH', override)).toBe(true);
      expect(shouldReportSeverity('MEDIUM', override)).toBe(true);
    });

    it('should return false when severity below minSeverity', () => {
      const override: SeverityOverride = { minSeverity: 'MEDIUM' };
      expect(shouldReportSeverity('LOW', override)).toBe(false);
      expect(shouldReportSeverity('INFO', override)).toBe(false);
    });

    it('should filter low severity issues correctly', () => {
      const override: SeverityOverride = { minSeverity: 'HIGH' };
      expect(shouldReportSeverity('CRITICAL', override)).toBe(true);
      expect(shouldReportSeverity('HIGH', override)).toBe(true);
      expect(shouldReportSeverity('MEDIUM', override)).toBe(false);
      expect(shouldReportSeverity('LOW', override)).toBe(false);
      expect(shouldReportSeverity('INFO', override)).toBe(false);
    });
  });

  describe('formatComplianceTags', () => {
    it('should return empty string when no frameworks', () => {
      expect(formatComplianceTags([])).toBe('');
      expect(formatComplianceTags([], {})).toBe('');
    });

    it('should format default frameworks', () => {
      const result = formatComplianceTags(['SOC2', 'HIPAA']);
      expect(result).toBe('[SOC2,HIPAA]');
    });

    it('should combine default and custom frameworks', () => {
      const complianceContext: ComplianceContext = {
        frameworks: ['CUSTOM-1', 'CUSTOM-2'],
      };
      const result = formatComplianceTags(['SOC2'], complianceContext);
      expect(result).toContain('SOC2');
      expect(result).toContain('CUSTOM-1');
    });

    it('should limit to 4 frameworks', () => {
      const result = formatComplianceTags(['SOC2', 'HIPAA', 'PCI-DSS', 'GDPR', 'ISO27001', 'NIST-CSF']);
      expect(result).toBe('[SOC2,HIPAA,PCI-DSS,GDPR]');
    });

    it('should handle only custom frameworks', () => {
      const complianceContext: ComplianceContext = {
        frameworks: ['ACME-SEC-001'],
      };
      const result = formatComplianceTags([], complianceContext);
      expect(result).toBe('[ACME-SEC-001]');
    });
  });

  describe('buildTicketUrl', () => {
    it('should return undefined when no template', () => {
      expect(buildTicketUrl(undefined, { summary: 'Test' })).toBeUndefined();
      expect(buildTicketUrl({} as ComplianceContext['ticketTemplate'], { summary: 'Test' })).toBeUndefined();
    });

    it('should build URL with summary placeholder', () => {
      const template: ComplianceContext['ticketTemplate'] = {
        url: 'https://jira.test.com/create?summary={{summary}}',
      };
      const result = buildTicketUrl(template, { summary: 'SQL Injection Found' });
      expect(result).toContain('https://jira.test.com/create');
      expect(result).toContain('SQL%20Injection%20Found');
    });

    it('should build URL with all placeholders', () => {
      const template: ComplianceContext['ticketTemplate'] = {
        url: 'https://jira.test.com/create?summary={{summary}}&priority={{priority}}&labels={{labels}}&cwe={{cwe}}',
        priority: 'Critical',
        labels: ['security', 'urgent'],
      };
      const result = buildTicketUrl(template, {
        summary: 'Test Issue',
        cwe: 'CWE-89',
        file: '/src/app.ts',
        line: 42,
      });

      expect(result).toContain('priority=Critical');
      expect(result).toContain('labels=security,urgent');
      expect(result).toContain('cwe=CWE-89');
    });

    it('should use default priority when not specified in template', () => {
      const template: ComplianceContext['ticketTemplate'] = {
        url: 'https://jira.test.com/create?priority={{priority}}',
      };
      const result = buildTicketUrl(template, { summary: 'Test' });
      expect(result).toContain('priority=Medium');
    });

    it('should encode file path', () => {
      const template: ComplianceContext['ticketTemplate'] = {
        url: 'https://jira.test.com/create?file={{file}}',
      };
      const result = buildTicketUrl(template, {
        summary: 'Test',
        file: '/path/to/file.ts',
      });
      expect(result).toContain('file=%2Fpath%2Fto%2Ffile.ts');
    });

    it('should include line number', () => {
      const template: ComplianceContext['ticketTemplate'] = {
        url: 'https://jira.test.com/create?line={{line}}',
      };
      const result = buildTicketUrl(template, {
        summary: 'Test',
        line: 42,
      });
      expect(result).toContain('line=42');
    });

    it('should handle missing optional data gracefully', () => {
      const template: ComplianceContext['ticketTemplate'] = {
        url: 'https://jira.test.com/create?cwe={{cwe}}&file={{file}}&line={{line}}',
      };
      const result = buildTicketUrl(template, { summary: 'Test' });
      expect(result).toContain('cwe=');
      expect(result).toContain('line=0');
    });
  });

  describe('getDocumentationUrl', () => {
    it('should return default URL when no context', () => {
      expect(getDocumentationUrl('https://default.com')).toBe('https://default.com');
      expect(getDocumentationUrl('https://default.com', undefined)).toBe('https://default.com');
    });

    it('should return default URL when context has no override', () => {
      const context: ComplianceContext = { frameworks: ['SOC2'] };
      expect(getDocumentationUrl('https://default.com', context)).toBe('https://default.com');
    });

    it('should return override URL when provided', () => {
      const context: ComplianceContext = {
        documentationUrl: 'https://wiki.company.com/security',
      };
      expect(getDocumentationUrl('https://default.com', context)).toBe('https://wiki.company.com/security');
    });
  });

  describe('enhanceMessageData', () => {
    it('should pass through base data', () => {
      const baseData = { description: 'Test', severity: 'HIGH' };
      const result = enhanceMessageData(baseData, {}, {});
      
      expect(result['description']).toBe('Test');
      expect(result['severity']).toBe('HIGH');
    });

    it('should add compliance tags', () => {
      const result = enhanceMessageData(
        { description: 'Test' },
        {},
        { defaultFrameworks: ['SOC2', 'HIPAA'] }
      );
      
      expect(result['complianceTags']).toBe('[SOC2,HIPAA]');
    });

    it('should add ticket URL when template provided', () => {
      const result = enhanceMessageData(
        { description: 'SQL Injection' },
        {
          compliance: {
            ticketTemplate: {
              url: 'https://jira.com/create?summary={{summary}}',
            },
          },
        },
        { summary: 'Security Issue' }
      );
      
      expect(result['ticketUrl']).toContain('https://jira.com/create');
    });

    it('should add risk owner', () => {
      const result = enhanceMessageData(
        { description: 'Test' },
        {
          compliance: {
            riskOwner: 'security-team@company.com',
          },
        },
        {}
      );
      
      expect(result['riskOwner']).toBe('security-team@company.com');
    });

    it('should add custom metadata', () => {
      const result = enhanceMessageData(
        { description: 'Test' },
        {
          compliance: {
            metadata: {
              customField1: 'value1',
              customField2: 'value2',
            },
          },
        },
        {}
      );
      
      expect(result['customField1']).toBe('value1');
      expect(result['customField2']).toBe('value2');
    });

    it('should use context summary when provided', () => {
      const result = enhanceMessageData(
        { description: 'Base description' },
        {
          compliance: {
            ticketTemplate: {
              url: 'https://jira.com/create?summary={{summary}}',
            },
          },
        },
        { summary: 'Custom Summary' }
      );
      
      expect(result['ticketUrl']).toContain('Custom%20Summary');
    });

    it('should fall back to base description for ticket summary', () => {
      const result = enhanceMessageData(
        { description: 'Base description' },
        {
          compliance: {
            ticketTemplate: {
              url: 'https://jira.com/create?summary={{summary}}',
            },
          },
        },
        {} // No summary provided
      );
      
      expect(result['ticketUrl']).toContain('Base%20description');
    });

    it('should combine all compliance context features', () => {
      const result = enhanceMessageData(
        { description: 'Critical security issue', severity: 'CRITICAL' },
        {
          compliance: {
            frameworks: ['COMPANY-SEC-001'],
            ticketTemplate: {
              url: 'https://jira.com/create?summary={{summary}}&priority={{priority}}',
              priority: 'Critical',
            },
            documentationUrl: 'https://wiki.company.com',
            riskOwner: 'ciso@company.com',
            metadata: {
              team: 'security',
            },
          },
        },
        {
          defaultFrameworks: ['SOC2'],
          cwe: 'CWE-89',
          file: '/src/app.ts',
          line: 100,
        }
      );
      
      expect(result['complianceTags']).toContain('SOC2');
      expect(result['complianceTags']).toContain('COMPANY-SEC-001');
      expect(result['ticketUrl']).toContain('jira.com');
      expect(result['riskOwner']).toBe('ciso@company.com');
      expect(result['team']).toBe('security');
    });
  });
});

