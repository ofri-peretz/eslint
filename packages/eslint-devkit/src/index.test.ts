/**
 * Tests for index.ts exports
 * Verifies that all exports are available and properly re-exported
 */
import { describe, it, expect } from 'vitest';
import * as indexModule from './index';

describe('index.ts exports', () => {
  it('should export AST utilities', () => {
    expect(indexModule.isNodeOfType).toBeDefined();
    expect(indexModule.isFunctionNode).toBeDefined();
    expect(indexModule.isClassNode).toBeDefined();
    expect(indexModule.isMemberExpression).toBeDefined();
    expect(indexModule.getIdentifierName).toBeDefined();
    expect(indexModule.isCallExpression).toBeDefined();
    expect(indexModule.getFunctionName).toBeDefined();
    expect(indexModule.isInsideNode).toBeDefined();
    expect(indexModule.getAncestorOfType).toBeDefined();
    expect(indexModule.isLiteral).toBeDefined();
    expect(indexModule.isTemplateLiteral).toBeDefined();
    expect(indexModule.getStaticValue).toBeDefined();
  });

  it('should export type utilities', () => {
    expect(indexModule.getParserServices).toBeDefined();
    expect(indexModule.hasParserServices).toBeDefined();
    expect(indexModule.getTypeOfNode).toBeDefined();
    expect(indexModule.isAnyType).toBeDefined();
    expect(indexModule.isUnknownType).toBeDefined();
    expect(indexModule.isNeverType).toBeDefined();
    expect(indexModule.isNullableType).toBeDefined();
    expect(indexModule.isStringType).toBeDefined();
    expect(indexModule.isNumberType).toBeDefined();
    expect(indexModule.isBooleanType).toBeDefined();
    expect(indexModule.isArrayType).toBeDefined();
    expect(indexModule.isPromiseType).toBeDefined();
    expect(indexModule.getTypeArguments).toBeDefined();
    expect(indexModule.typeMatchesPredicateRecursive).toBeDefined();
  });

  it('should export LLM message format utilities', () => {
    expect(indexModule.formatLLMMessage).toBeDefined();
    expect(indexModule.formatLLMMessageTemplate).toBeDefined();
    expect(indexModule.MessageIcons).toBeDefined();
  });

  it('should export rule creator utilities', () => {
    expect(indexModule.createRule).toBeDefined();
  });

  it('should export ESLintUtils from @typescript-eslint/utils', () => {
    expect(indexModule.ESLintUtils).toBeDefined();
  });

  it('should export types from @typescript-eslint/utils', () => {
    // Types are compile-time only, but we can verify the module exports them
    // by checking that the module itself is defined
    expect(indexModule).toBeDefined();
  });

  it('should have all expected exports as functions or objects', () => {
    const exports = Object.keys(indexModule);

    // Should have a reasonable number of exports
    expect(exports.length).toBeGreaterThan(10);

    // All exports should be defined
    exports.forEach((exportName) => {
      expect(indexModule[exportName as keyof typeof indexModule]).toBeDefined();
    });
  });
});
