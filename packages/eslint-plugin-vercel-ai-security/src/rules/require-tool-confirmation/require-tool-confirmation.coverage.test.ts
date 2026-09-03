/**
 * @fileoverview Branch-coverage tests for require-tool-confirmation.
 *
 * Layer 1: parser-reachable key/parent shapes through RuleTester.
 * Layer 2: the orphan-Property guard (parent nullish) via devkit's
 * createWithMockContext with a synthetic AST object.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { requireToolConfirmation } from './index';

/**
 * The module gate reads `sourceCode.ast`, so a synthetic context needs a
 * Program that actually contains the SDK — otherwise the rule correctly
 * abstains and registers no listeners, and these branch tests would be
 * asserting against a handler that no longer exists.
 */
const AI_PROGRAM = {
  type: 'Program',
  body: [
    {
      type: 'ImportDeclaration',
      specifiers: [],
      source: { type: 'Literal', value: 'ai' },
    },
  ],
  tokens: [],
  comments: [],
};


/**
 * Every fixture imports the AI SDK, because the rules now abstain in files with
 * no `ai` / `@ai-sdk` in them. Wrapping the arrays rather than editing each
 * fixture means one cannot be left behind — a fixture missing the import would
 * pass vacuously on the gate instead of exercising the detection it was written
 * for. `output` and errors[].suggestions[].output are prefixed too, since
 * autofix fixtures assert the whole file back.
 */
// A SIDE-EFFECT import: it satisfies the gate without reserving any binding,
// so fixtures that already declare `generateText`/`openai` do not redeclare.
const asAi = (code: string): string => `import 'ai';\n${code}`;
type AiSuggestion = { output?: string | null };
type AiCase = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly AiSuggestion[] } | string>;
};
const xai = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asAi(c) as T;
    const test = c as AiCase;
    return {
      ...c,
      code: asAi(test.code),
      ...(typeof test.output === 'string' ? { output: asAi(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asAi(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-tool-confirmation (branch coverage)', requireToolConfirmation, {
  valid: xai([
    // Computed (non-Identifier, non-Literal) key — handler bails immediately.
    {
      code: `const t = { [cfg.name]: { execute: run } };`,
    },
    // Destructive tool outside a tools object — grandparent is not a Property.
    {
      code: `const x = { deleteUser: { execute: run } };`,
    },
    // Wrapper key is not literally 'tools'.
    {
      code: `generateText({ notTools: { deleteUser: { execute: run } } });`,
    },
    // Wrapper key is a string literal — toolsKey.type check rejects it.
    {
      code: `generateText({ 'tools': { deleteUser: { execute: run } } });`,
    },
    // Destructive tool defined via the tool() helper CallExpression — assumed handled.
    {
      code: `generateText({ tools: { deleteUser: tool({ requiresConfirmation: true }) } });`,
    },
  ]),
  invalid: xai([
    // Spread inside the tool definition — skipped by hasConfirmationFlag,
    // no confirmation prop found, reported.
    {
      code: `generateText({ tools: { deleteUser: { ...baseTool } } });`,
      errors: [
        {
          messageId: 'missingConfirmation',
          data: { toolName: 'deleteUser', operation: 'delete' },
        },
      ],
    },
    // String-literal confirmation key — keyName resolves to null so the flag
    // is not recognized (documented FN: only Identifier keys are matched).
    {
      code: `generateText({ tools: { deleteUser: { 'requiresConfirmation': true } } });`,
      errors: [
        {
          messageId: 'missingConfirmation',
          data: { toolName: 'deleteUser', operation: 'delete' },
        },
      ],
    },
    // String-literal tool name — resolved via String(key.value).
    {
      code: `generateText({ tools: { 'deleteUser': { execute: run } } });`,
      errors: [
        {
          messageId: 'missingConfirmation',
          data: { toolName: 'deleteUser', operation: 'delete' },
        },
      ],
    },
  ]),
});

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2: synthetic AST for the parser-unreachable orphan-Property guard.
// ─────────────────────────────────────────────────────────────────────────────

type Listener = (node: unknown) => void;

describe('require-tool-confirmation — synthetic AST', () => {
  it('does not report a destructive Property detached from any object (parent null)', () => {
    const { listeners, reports } = createWithMockContext(requireToolConfirmation, {
      ast: AI_PROGRAM,
      options: [{}],
    });
    const orphanProperty = {
      type: 'Property',
      key: { type: 'Identifier', name: 'deleteUser' },
      value: { type: 'ObjectExpression', properties: [] },
      parent: null,
    };
    (listeners.Property as Listener)(orphanProperty);
    expect(reports).toEqual([]);
  });
});
