/**
 * Layer-2 unit tests: parser-unreachable branches.
 *
 * These call `rule.create(mockContext)` (via `createWithMockContext` from
 * @interlace/eslint-devkit) and invoke the returned listeners with synthetic
 * AST objects to reach branches a real parse can never produce:
 *   - `options: [null]` to exercise the `options || {}` fallbacks (the
 *     RuleCreator wrapper passes a `null` first option through unchanged,
 *     while RuleTester always materializes an object),
 *   - a constructor whose FunctionExpression body is not a BlockStatement,
 *   - a missing first token in the `no-mutable-exports` fixer.
 */
import { describe, it, expect, vi } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import type { TSESLint } from '@interlace/eslint-devkit';

import { dddAnemicDomainModel } from '../rules/ddd-anemic-domain-model';
import { dddValueObjectImmutability } from '../rules/ddd-value-object-immutability';
import { enforceRestConventions } from '../rules/enforce-rest-conventions';
import { noExternalApiCallsInUtils } from '../rules/no-external-api-calls-in-utils';
import { noMutableExports } from '../rules/no-mutable-exports';

type Listener = (node: unknown) => void;

describe('null first option falls back to defaults (options || {})', () => {
  it('ddd-anemic-domain-model reports an anemic class with default options', () => {
    const { listeners, reports } = createWithMockContext(dddAnemicDomainModel, {
      options: [null],
    });

    (listeners.ClassDeclaration as Listener)({
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name: 'Customer' },
      body: { type: 'ClassBody', body: [] },
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'anemicDomainModel',
      data: { className: 'Customer' },
    });
  });

  it('ddd-value-object-immutability applies default value-object patterns', () => {
    const { listeners, reports } = createWithMockContext(dddValueObjectImmutability, {
      options: [null],
    });

    (listeners.ClassDeclaration as Listener)({
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name: 'PriceValue' },
      body: {
        type: 'ClassBody',
        body: [{ type: 'PropertyDefinition', readonly: false }],
      },
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'mutableValueObject',
      data: { className: 'PriceValue' },
    });
  });

  it('enforce-rest-conventions keeps resource-naming check enabled by default', () => {
    const { listeners, reports } = createWithMockContext(enforceRestConventions, {
      options: [null],
    });

    (listeners.CallExpression as Listener)({
      type: 'CallExpression',
      callee: {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'app' },
        property: { type: 'Identifier', name: 'get' },
      },
      arguments: [{ type: 'Literal', value: '/user' }],
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'restConventionViolation',
      data: {
        violation: 'Resource naming',
        details: 'Resource "user" should be plural (e.g., /users, /orders)',
      },
    });
  });

  it('no-external-api-calls-in-utils keeps default network methods and patterns', () => {
    const { listeners, reports } = createWithMockContext(noExternalApiCallsInUtils, {
      options: [null],
      filename: '/src/utils/http.ts',
    });

    (listeners.CallExpression as Listener)({
      type: 'CallExpression',
      callee: { type: 'Identifier', name: 'fetch' },
      arguments: [],
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'externalApiCallInUtils' });
  });
});

describe('ddd-value-object-immutability: constructor body is not a BlockStatement', () => {
  it('skips Object.freeze detection and still reports the mutable property', () => {
    const { listeners, reports } = createWithMockContext(dddValueObjectImmutability);

    (listeners.ClassDeclaration as Listener)({
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name: 'MoneyVO' },
      body: {
        type: 'ClassBody',
        body: [
          {
            type: 'MethodDefinition',
            kind: 'constructor',
            value: {
              type: 'FunctionExpression',
              // Synthetic: a FunctionExpression body is always a BlockStatement
              // in a real parse; here it is not, so usesObjectFreeze bails out.
              body: { type: 'ExpressionStatement' },
            },
          },
          { type: 'PropertyDefinition', readonly: false },
        ],
      },
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      messageId: 'mutableValueObject',
      data: { className: 'MoneyVO' },
    });
  });
});

describe('no-mutable-exports: fixer bails when the first token is missing', () => {
  it('returns null from fix() without attempting a replacement', () => {
    const { listeners, reports, context } = createWithMockContext(noMutableExports);

    // Synthetic source code stub without a first token for the declaration.
    (context.sourceCode as unknown as Record<string, unknown>).getFirstToken =
      () => null;

    (listeners.ExportNamedDeclaration as Listener)({
      type: 'ExportNamedDeclaration',
      declaration: {
        type: 'VariableDeclaration',
        kind: 'let',
        declarations: [],
      },
    });

    expect(reports).toHaveLength(1);
    const report = reports[0] as TSESLint.ReportDescriptor<string> & {
      fix?: (fixer: TSESLint.RuleFixer) => unknown;
      data?: Record<string, unknown>;
    };
    expect(report.messageId).toBe('noMutableExport');
    expect(report.data).toEqual({ kind: 'let' });

    const replaceText = vi.fn();
    const fixer = { replaceText } as unknown as TSESLint.RuleFixer;
    expect(report.fix?.(fixer)).toBeNull();
    expect(replaceText).not.toHaveBeenCalled();
  });
});
