/**
 * Comprehensive tests for no-directive-injection rule
 * Security: CWE-96 (Improper Neutralization of Directives in Statically Saved Code)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noDirectiveInjection } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

// Use Flat Config format (ESLint 9+) with JSX support
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-directive-injection', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - safe directive usage', noDirectiveInjection, {
      valid: [
        // Safe innerHTML with text content (not innerHTML)
        {
          code: 'element.textContent = userInput;',
        },
        // Trusted directive names (string literal, not user input)
        {
          code: 'Vue.directive("my-directive", { /* safe */ });',
        },
        // Static HTML (no user input variables)
        {
          code: '<div dangerouslySetInnerHTML={{ __html: "static content" }} />',
        },
        // innerHTML with non-user input
        {
          code: 'element.innerHTML = staticContent;',
        },
        // Handlebars compile with non-user input
        {
          code: 'const compiled = Handlebars.compile(staticTemplate);',
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - dangerouslySetInnerHTML', () => {
    ruleTester.run('invalid - dangerous innerHTML usage', noDirectiveInjection, {
      valid: [],
      invalid: [
        // userInput is a recognized user input variable
        {
          code: '<div dangerouslySetInnerHTML={{ __html: userInput }} />',
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
          ],
        },
        // req.body.content contains 'body' which is a user input variable
        {
          code: '<div dangerouslySetInnerHTML={{ __html: req.body.content }} />',
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Template Injection', () => {
    ruleTester.run('invalid - template injection in JSX', noDirectiveInjection, {
      valid: [],
      invalid: [
        // Template literal with userInput in dangerouslySetInnerHTML
        // Only triggers dangerousInnerHTML (JSX context doesn't trigger templateInjection via TemplateLiteral visitor)
        {
          code: '<div dangerouslySetInnerHTML={{ __html: `Hello ${userInput}!` }} />',
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
            {
              messageId: 'templateInjection',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - innerHTML Assignments', () => {
    ruleTester.run('invalid - unsafe innerHTML assignments', noDirectiveInjection, {
      valid: [],
      invalid: [
        {
          code: 'element.innerHTML = userInput;',
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
          ],
        },
        {
          code: 'document.getElementById("content").innerHTML = req.body.html;',
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Dynamic Component Binding', () => {
    ruleTester.run('invalid - unsafe component binding', noDirectiveInjection, {
      valid: [],
      invalid: [
        // JSX is={userInput} - userInput is in user input variables
        // Rule only detects Identifiers (not MemberExpressions like req.query.x)
        {
          code: '<div is={userInput}></div>',
          errors: [
            {
              messageId: 'unsafeComponentBinding',
            },
          ],
        },
        // data is in user input variables
        {
          code: '<div is={data}></div>',
          errors: [
            {
              messageId: 'unsafeComponentBinding',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Template Compilation', () => {
    ruleTester.run('invalid - unsafe template compilation', noDirectiveInjection, {
      valid: [],
      invalid: [
        // Handlebars.compile with userInput variable
        {
          code: 'const compiled = Handlebars.compile(userInput);',
          errors: [
            {
              messageId: 'userControlledTemplate',
            },
          ],
        },
        // _.template with variable containing "input"
        {
          code: 'const template = _.template(userInput);',
          errors: [
            {
              messageId: 'userControlledTemplate',
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Dynamic Directive Creation', () => {
    ruleTester.run('invalid - dynamic directive creation', noDirectiveInjection, {
      valid: [],
      invalid: [
        // Vue.directive with userInput as directive name
        {
          code: 'Vue.directive(userInput, directiveDefinition);',
          errors: [
            {
              messageId: 'unsafeDirectiveName',
            },
          ],
        },
        // directive() with userInput as directive name
        {
          code: 'directive(userInput, function() { /* ... */ });',
          errors: [
            {
              messageId: 'dynamicDirectiveCreation',
            },
          ],
        },
      ],
    });
  });

  describe('Valid Code - False Positives Reduced', () => {
    ruleTester.run('valid - false positives reduced', noDirectiveInjection, {
      valid: [
        // safeHtml is not a user input variable, so it's valid
        {
          code: '<div dangerouslySetInnerHTML={{ __html: safeHtml }} />',
        },
        // safeTemplate doesn't contain user input variable names
        {
          code: 'const compiled = Handlebars.compile(safeTemplate);',
        },
        // Trusted directive names (string literal)
        {
          code: 'Vue.directive("my-safe-directive", definition);',
        },
        // Static HTML string doesn't trigger
        {
          code: 'element.innerHTML = "<strong>Safe</strong>";',
        },
      ],
      invalid: [],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - user input variables', noDirectiveInjection, {
      valid: [
        // customVar is not in default user input variables
        {
          code: '<div dangerouslySetInnerHTML={{ __html: customVar }} />',
        },
      ],
      invalid: [
        // requestData contains 'request' which is in user input variables
        {
          code: '<div dangerouslySetInnerHTML={{ __html: requestData }} />',
          errors: [
            {
              messageId: 'dangerousInnerHTML',
            },
          ],
        },
      ],
    });
  });

  describe('Complex Directive Injection Scenarios', () => {
    ruleTester.run('complex - real-world directive injection attacks', noDirectiveInjection, {
      valid: [],
      invalid: [
        // innerHTML assignment with template literal containing user input
        {
          code: 'element.innerHTML = `<div>${userInput}</div>`;',
          errors: [
            { messageId: 'dangerousInnerHTML' },
            { messageId: 'templateInjection' },
          ],
        },
        // Dangerous template literal inside dangerouslySetInnerHTML (Now properly detected by fix)
        {
          code: '<div dangerouslySetInnerHTML={{ __html: `Hello ${userInput}!` }} />',
          errors: [
            { messageId: 'dangerousInnerHTML' },
            { messageId: 'templateInjection' },
          ],
        },
        // Multiple dangerous patterns
        {
          code: `
            element.innerHTML = req.body.html;
            const tpl = Handlebars.compile(userInput);
          `,
          errors: [
            { messageId: 'dangerousInnerHTML' },
            { messageId: 'userControlledTemplate' },
          ],
        },
      ],
    });

    ruleTester.run('invalid - namespaced attributes', noDirectiveInjection, {
      valid: [],
      invalid: [
        // v:bind with user input
        {
          code: '<div v:bind={userInput}></div>',
          errors: [{ messageId: 'directiveInjection' }],
        },
        // ng:model with user input
        {
          code: '<input ng:model={userInput} />',
          errors: [{ messageId: 'directiveInjection' }],
        },
      ],
    });
  });

  // Layer 1: the safetyChecker.isSafe() early-return guards every report site.
  // A `/** @safe */` (or other SAFE_ANNOTATIONS entry) JSDoc comment immediately
  // before the flagged statement/expression is real, RuleTester-reachable
  // behavior (see createSafetyChecker -> isInputSafe -> hasSafeAnnotation in
  // @interlace/eslint-devkit), so each dangerous pattern gets a paired "but
  // annotated safe" valid case exercising the corresponding isSafe() branch.
  describe('Safe Annotation Suppression (safetyChecker.isSafe branches)', () => {
    ruleTester.run('valid - @safe annotation suppresses dangerouslySetInnerHTML', noDirectiveInjection, {
      valid: [
        {
          code: `
            /** @safe */
            const el = <div dangerouslySetInnerHTML={{ __html: userInput }} />;
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @trusted annotation suppresses namespaced directive injection', noDirectiveInjection, {
      valid: [
        {
          code: `
            /** @trusted */
            const el = <div v:bind={userInput}></div>;
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @validated annotation suppresses unsafeComponentBinding', noDirectiveInjection, {
      valid: [
        {
          code: `
            /** @validated */
            const el = <div is={userInput}></div>;
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @sanitized annotation suppresses innerHTML assignment', noDirectiveInjection, {
      valid: [
        {
          code: `
            /** @sanitized */
            element.innerHTML = userInput;
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @clean annotation suppresses userControlledTemplate', noDirectiveInjection, {
      valid: [
        {
          code: `
            /** @clean */
            const compiled = Handlebars.compile(userInput);
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @verified annotation suppresses unsafeDirectiveName', noDirectiveInjection, {
      valid: [
        {
          code: `
            /** @verified */
            Vue.directive(userInput, directiveDefinition);
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @escaped annotation suppresses dynamicDirectiveCreation', noDirectiveInjection, {
      valid: [
        {
          code: `
            /** @escaped */
            directive(userInput, function() { /* ... */ });
          `,
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - @timing-safe annotation suppresses templateInjection', noDirectiveInjection, {
      valid: [
        {
          code: `
            /** @timing-safe */
            element.innerHTML = \`Hello \${userInput}!\`;
          `,
        },
      ],
      invalid: [],
    });
  });

  // Layer 2: raw unit tests against rule.create() with a mock context, for the
  // remaining branch shapes RuleTester fixtures can't cheaply express (custom
  // options wiring and unrelated visitor keys never firing on empty input).
  describe('Layer 2 - mock context', () => {
    it('wires custom trustedSanitizers/trustedAnnotations/strictMode options through to the safety checker', () => {
      const { listeners, reports } = createWithMockContext(noDirectiveInjection, {
        options: [
          {
            trustedSanitizers: ['myCustomSanitizer'],
            trustedAnnotations: ['@my-custom-safe'],
            strictMode: true,
          },
        ],
      });

      expect(typeof listeners.JSXAttribute).toBe('function');
      expect(typeof listeners.AssignmentExpression).toBe('function');
      expect(typeof listeners.CallExpression).toBe('function');
      expect(typeof listeners.TemplateLiteral).toBe('function');
      expect(reports).toHaveLength(0);
    });

    it('does not report when JSXAttribute value is not a JSXExpressionContainer', () => {
      const { listeners, reports } = createWithMockContext(noDirectiveInjection);
      const jsxAttribute = listeners.JSXAttribute as (node: unknown) => void;

      jsxAttribute({
        type: 'JSXAttribute',
        name: { type: 'JSXIdentifier', name: 'dangerouslySetInnerHTML' },
        value: { type: 'Literal', value: 'static' },
      });

      expect(reports).toHaveLength(0);
    });

    it('does not report AssignmentExpression when left side is not a MemberExpression', () => {
      const { listeners, reports } = createWithMockContext(noDirectiveInjection);
      const assignmentExpression = listeners.AssignmentExpression as (node: unknown) => void;

      assignmentExpression({
        type: 'AssignmentExpression',
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'Identifier', name: 'userInput' },
      });

      expect(reports).toHaveLength(0);
    });

    it('does not report TemplateLiteral with no parent chain (unreachable dangerous context)', () => {
      const { listeners, reports } = createWithMockContext(noDirectiveInjection);
      const templateLiteral = listeners.TemplateLiteral as (node: unknown) => void;

      templateLiteral({
        type: 'TemplateLiteral',
        parent: null,
        expressions: [{ type: 'Identifier', name: 'userInput' }],
        quasis: [],
      });

      expect(reports).toHaveLength(0);
    });

    it('does not report CallExpression for an unrelated identifier callee', () => {
      const { listeners, reports } = createWithMockContext(noDirectiveInjection);
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      callExpression({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'somethingElse' },
        arguments: [],
      });

      expect(reports).toHaveLength(0);
    });

    // Every report call formats `line: String(node.loc?.start.line ?? 0)`.
    // RuleTester always attaches real `loc` info via the parser, so the `?? 0`
    // fallback is unreachable through fixtures — synthesize nodes with no
    // `loc` at all to force that branch across every report site.
    describe('node.loc fallback (?? 0) at every report site', () => {
      it('dangerousInnerHTML (JSXAttribute) falls back to line 0 when node.loc is absent', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection, {
          sourceText: 'userInput',
        });
        const jsxAttribute = listeners.JSXAttribute as (node: unknown) => void;

        jsxAttribute({
          type: 'JSXAttribute',
          name: { type: 'JSXIdentifier', name: 'dangerouslySetInnerHTML' },
          value: {
            type: 'JSXExpressionContainer',
            expression: { type: 'Identifier', name: 'userInput' },
          },
        });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.data?.['line']).toBe('0');
      });

      it('directiveInjection (namespaced JSXAttribute) falls back to line 0 when node.loc is absent', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const jsxAttribute = listeners.JSXAttribute as (node: unknown) => void;

        jsxAttribute({
          type: 'JSXAttribute',
          name: { type: 'JSXNamespacedName', namespace: { name: 'v' }, name2: undefined },
          value: {
            type: 'JSXExpressionContainer',
            expression: { type: 'Identifier', name: 'userInput' },
          },
        });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.data?.['line']).toBe('0');
      });

      it('unsafeComponentBinding (is= JSXAttribute) falls back to line 0 when node.loc is absent', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const jsxAttribute = listeners.JSXAttribute as (node: unknown) => void;

        jsxAttribute({
          type: 'JSXAttribute',
          name: { type: 'JSXIdentifier', name: 'is' },
          value: {
            type: 'JSXExpressionContainer',
            expression: { type: 'Identifier', name: 'userInput' },
          },
        });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.data?.['line']).toBe('0');
      });

      it('dangerousInnerHTML (AssignmentExpression) falls back to line 0 when node.loc is absent', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection, {
          sourceText: 'userInput',
        });
        const assignmentExpression = listeners.AssignmentExpression as (node: unknown) => void;

        assignmentExpression({
          type: 'AssignmentExpression',
          left: {
            type: 'MemberExpression',
            property: { type: 'Identifier', name: 'innerHTML' },
          },
          right: { type: 'Identifier', name: 'userInput' },
        });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.data?.['line']).toBe('0');
      });

      it('userControlledTemplate (CallExpression) falls back to line 0 when node.loc is absent', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const callExpression = listeners.CallExpression as (node: unknown) => void;

        callExpression({
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'Handlebars' },
            property: { type: 'Identifier', name: 'compile' },
          },
          arguments: [{ type: 'Identifier', name: 'userInput' }],
        });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.data?.['line']).toBe('0');
      });

      it('unsafeDirectiveName (Vue.directive CallExpression) falls back to line 0 when node.loc is absent', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const callExpression = listeners.CallExpression as (node: unknown) => void;

        callExpression({
          type: 'CallExpression',
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'Vue' },
            property: { type: 'Identifier', name: 'directive' },
          },
          arguments: [
            { type: 'Identifier', name: 'userInput' },
            { type: 'Identifier', name: 'directiveDefinition' },
          ],
        });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.data?.['line']).toBe('0');
      });

      it('dynamicDirectiveCreation (bare directive() CallExpression) falls back to line 0 when node.loc is absent', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const callExpression = listeners.CallExpression as (node: unknown) => void;

        callExpression({
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'directive' },
          arguments: [
            { type: 'Identifier', name: 'userInput' },
            { type: 'FunctionExpression' },
          ],
        });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.data?.['line']).toBe('0');
      });

      it('templateInjection (TemplateLiteral inside innerHTML assignment) falls back to line 0 when node.loc is absent', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const templateLiteral = listeners.TemplateLiteral as (node: unknown) => void;

        const assignmentParent = {
          type: 'AssignmentExpression',
          left: {
            type: 'MemberExpression',
            property: { type: 'Identifier', name: 'innerHTML' },
          },
          parent: undefined,
        };

        templateLiteral({
          type: 'TemplateLiteral',
          parent: assignmentParent,
          expressions: [{ type: 'Identifier', name: 'userInput' }],
          quasis: [],
        });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.data?.['line']).toBe('0');
      });
    });

    // callee.object.type === 'Identifier' ? callee.object.name : '' — the
    // false branch (non-Identifier callee object, e.g. a call expression like
    // `getEngine().compile(userInput)`) is not reachable through any fixture
    // that also matches a known method name via the generic `methodName`
    // check ('compile'/'template'/'$compile'/'$interpolate').
    it('userControlledTemplate fires via generic methodName when callee.object is not an Identifier', () => {
      const { listeners, reports } = createWithMockContext(noDirectiveInjection);
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      callExpression({
        type: 'CallExpression',
        loc: { start: { line: 7 } },
        callee: {
          type: 'MemberExpression',
          object: { type: 'CallExpression', callee: { type: 'Identifier', name: 'getEngine' } },
          property: { type: 'Identifier', name: 'compile' },
        },
        arguments: [{ type: 'Identifier', name: 'userInput' }],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0]?.messageId).toBe('userControlledTemplate');
      expect(reports[0]?.data?.['line']).toBe('7');
    });

    // `(objectName === 'Handlebars' && methodName === 'compile')` — the
    // `methodName === 'compile'` right-hand side is never evaluated by any
    // RuleTester fixture, because `Handlebars.compile(...)` always short-
    // circuits on the earlier generic `methodName` includes-check ('compile'
    // is itself in that array). Force objectName to match but methodName to
    // differ, so the `&&` must actually evaluate (and fail) its right side.
    it('does not report Handlebars.precompile (methodName !== "compile", forces the && right side to evaluate false)', () => {
      const { listeners, reports } = createWithMockContext(noDirectiveInjection);
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      callExpression({
        type: 'CallExpression',
        loc: { start: { line: 1 } },
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'Handlebars' },
          property: { type: 'Identifier', name: 'precompile' },
        },
        arguments: [{ type: 'Identifier', name: 'userInput' }],
      });

      expect(reports).toHaveLength(0);
    });

    // Each of the (objectName === X && methodName === Y) disjuncts is its own
    // branch; RuleTester fixtures above only ever exercised Handlebars.compile
    // and _.template. Cover the remaining named-engine disjuncts directly.
    describe('named template-engine disjuncts', () => {
      it('detects ejs.render(userInput)', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const callExpression = listeners.CallExpression as (node: unknown) => void;

        callExpression({
          type: 'CallExpression',
          loc: { start: { line: 1 } },
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'ejs' },
            property: { type: 'Identifier', name: 'render' },
          },
          arguments: [{ type: 'Identifier', name: 'userInput' }],
        });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.messageId).toBe('userControlledTemplate');
      });

      it('detects pug.render(userInput)', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const callExpression = listeners.CallExpression as (node: unknown) => void;

        callExpression({
          type: 'CallExpression',
          loc: { start: { line: 1 } },
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'pug' },
            property: { type: 'Identifier', name: 'render' },
          },
          arguments: [{ type: 'Identifier', name: 'userInput' }],
        });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.messageId).toBe('userControlledTemplate');
      });

      it('detects mustache.render(userInput)', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const callExpression = listeners.CallExpression as (node: unknown) => void;

        callExpression({
          type: 'CallExpression',
          loc: { start: { line: 1 } },
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'mustache' },
            property: { type: 'Identifier', name: 'render' },
          },
          arguments: [{ type: 'Identifier', name: 'userInput' }],
        });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.messageId).toBe('userControlledTemplate');
      });
    });

    // hasUserInput checks `(expr.type === 'Identifier' && isUserInput(...)) ||
    // (expr.type === 'MemberExpression' && expr.object.type === 'Identifier'
    // && isUserInput(expr.object.name))`. RuleTester fixtures only exercised
    // the Identifier disjunct; drive the MemberExpression disjunct (e.g.
    // `${req.body}`) directly, plus the false case where neither matches.
    describe('templateInjection hasUserInput MemberExpression disjunct', () => {
      it('detects a MemberExpression expression whose object is user input (e.g. req.body)', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const templateLiteral = listeners.TemplateLiteral as (node: unknown) => void;

        const assignmentParent = {
          type: 'AssignmentExpression',
          left: {
            type: 'MemberExpression',
            property: { type: 'Identifier', name: 'innerHTML' },
          },
        };

        templateLiteral({
          type: 'TemplateLiteral',
          loc: { start: { line: 3 } },
          parent: assignmentParent,
          expressions: [
            {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: 'req' },
              property: { type: 'Identifier', name: 'body' },
            },
          ],
          quasis: [],
        });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.messageId).toBe('templateInjection');
      });

      it('does not report when expressions are neither user-input Identifiers nor user-input MemberExpressions', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const templateLiteral = listeners.TemplateLiteral as (node: unknown) => void;

        const assignmentParent = {
          type: 'AssignmentExpression',
          left: {
            type: 'MemberExpression',
            property: { type: 'Identifier', name: 'innerHTML' },
          },
        };

        templateLiteral({
          type: 'TemplateLiteral',
          loc: { start: { line: 3 } },
          parent: assignmentParent,
          expressions: [
            { type: 'Identifier', name: 'safeName' },
            {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: 'safeObj' },
              property: { type: 'Identifier', name: 'prop' },
            },
          ],
          quasis: [],
        });

        expect(reports).toHaveLength(0);
      });
    });

    // `args.length > 0` / `args.length >= 2` guards: RuleTester fixtures only
    // ever called these with the "full" argument list, so the
    // too-few-arguments false branch of each guard needs a direct call.
    describe('CallExpression argument-count guards (false branches)', () => {
      it('does not report userControlledTemplate when the template-compile call has zero arguments', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const callExpression = listeners.CallExpression as (node: unknown) => void;

        callExpression({
          type: 'CallExpression',
          loc: { start: { line: 1 } },
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'Handlebars' },
            property: { type: 'Identifier', name: 'compile' },
          },
          arguments: [],
        });

        expect(reports).toHaveLength(0);
      });

      it('does not report unsafeDirectiveName when Vue.directive is called with fewer than 2 arguments', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const callExpression = listeners.CallExpression as (node: unknown) => void;

        callExpression({
          type: 'CallExpression',
          loc: { start: { line: 1 } },
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'Vue' },
            property: { type: 'Identifier', name: 'directive' },
          },
          arguments: [{ type: 'Identifier', name: 'userInput' }],
        });

        expect(reports).toHaveLength(0);
      });

      it('does not report dynamicDirectiveCreation when bare directive() is called with fewer than 2 arguments', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const callExpression = listeners.CallExpression as (node: unknown) => void;

        callExpression({
          type: 'CallExpression',
          loc: { start: { line: 1 } },
          callee: { type: 'Identifier', name: 'directive' },
          arguments: [{ type: 'Identifier', name: 'userInput' }],
        });

        expect(reports).toHaveLength(0);
      });
    });

    // TemplateLiteral's ancestor walk: the JSXExpressionContainer branch only
    // sets isInDangerousContext when current.parent is a dangerouslySetInnerHTML
    // JSXAttribute. Cover the "keeps walking past a non-matching container"
    // paths for both the JSXAttribute-name mismatch and the
    // MemberExpression-property mismatch, so the walk exhausts to `undefined`.
    describe('TemplateLiteral ancestor-walk non-matching branches', () => {
      it('does not report when the enclosing JSXExpressionContainer is not a dangerouslySetInnerHTML attribute', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const templateLiteral = listeners.TemplateLiteral as (node: unknown) => void;

        const container = {
          type: 'JSXExpressionContainer',
          parent: {
            type: 'JSXAttribute',
            name: { type: 'JSXIdentifier', name: 'someOtherAttr' },
          },
        };

        templateLiteral({
          type: 'TemplateLiteral',
          loc: { start: { line: 1 } },
          parent: container,
          expressions: [{ type: 'Identifier', name: 'userInput' }],
          quasis: [],
        });

        expect(reports).toHaveLength(0);
      });

      it('does not report when the enclosing AssignmentExpression does not target innerHTML', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const templateLiteral = listeners.TemplateLiteral as (node: unknown) => void;

        const assignmentParent = {
          type: 'AssignmentExpression',
          left: {
            type: 'MemberExpression',
            property: { type: 'Identifier', name: 'textContent' },
          },
        };

        templateLiteral({
          type: 'TemplateLiteral',
          loc: { start: { line: 1 } },
          parent: assignmentParent,
          expressions: [{ type: 'Identifier', name: 'userInput' }],
          quasis: [],
        });

        expect(reports).toHaveLength(0);
      });
    });

    // isNamespaceDirective (v:/ng: attributes) guards its report behind two
    // nested ifs: `attrValue.type === 'JSXExpressionContainer'` and then
    // `expression.type === 'Identifier' && isUserInput(...)`. RuleTester
    // fixtures only ever hit the true/true path; cover both false paths.
    describe('namespaced directive JSXAttribute guards (false branches)', () => {
      it('does not report directiveInjection when the namespaced attribute value is not a JSXExpressionContainer', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const jsxAttribute = listeners.JSXAttribute as (node: unknown) => void;

        jsxAttribute({
          type: 'JSXAttribute',
          name: { type: 'JSXNamespacedName', namespace: { name: 'v' }, name2: 'bind' },
          value: { type: 'Literal', value: 'static' },
        });

        expect(reports).toHaveLength(0);
      });

      it('does not report directiveInjection when the namespaced attribute expression is not user input', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const jsxAttribute = listeners.JSXAttribute as (node: unknown) => void;

        jsxAttribute({
          type: 'JSXAttribute',
          name: { type: 'JSXNamespacedName', namespace: { name: 'ng' }, name2: 'model' },
          value: {
            type: 'JSXExpressionContainer',
            expression: { type: 'Identifier', name: 'safeValue' },
          },
        });

        expect(reports).toHaveLength(0);
      });
    });

    // Same two-nested-if shape for the `is=` dynamic component binding.
    describe('is= dynamic component binding guards (false branches)', () => {
      it('does not report unsafeComponentBinding when the is= value is not a JSXExpressionContainer', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const jsxAttribute = listeners.JSXAttribute as (node: unknown) => void;

        jsxAttribute({
          type: 'JSXAttribute',
          name: { type: 'JSXIdentifier', name: 'is' },
          value: { type: 'Literal', value: 'my-component' },
        });

        expect(reports).toHaveLength(0);
      });

      it('does not report unsafeComponentBinding when the is= expression is not user input', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const jsxAttribute = listeners.JSXAttribute as (node: unknown) => void;

        jsxAttribute({
          type: 'JSXAttribute',
          name: { type: 'JSXIdentifier', name: 'is' },
          value: {
            type: 'JSXExpressionContainer',
            expression: { type: 'Identifier', name: 'safeComponentName' },
          },
        });

        expect(reports).toHaveLength(0);
      });
    });

    // The `(objectName === X && methodName === Y)` disjuncts on lines 409-413
    // each need their left-true/right-false combination exercised (the
    // generic methodName-list check above them is bypassed by using an
    // unrelated method name, so only the specific disjunct under test can
    // possibly match — and it doesn't, because objectName is right but
    // methodName is wrong).
    describe('named template-engine disjuncts: right-hand mismatch', () => {
      it('does not match the Handlebars.compile disjunct when objectName is "Handlebars" but methodName differs', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const callExpression = listeners.CallExpression as (node: unknown) => void;

        callExpression({
          type: 'CallExpression',
          loc: { start: { line: 1 } },
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'Handlebars' },
            property: { type: 'Identifier', name: 'registerHelper' },
          },
          arguments: [{ type: 'Identifier', name: 'userInput' }],
        });

        expect(reports).toHaveLength(0);
      });

      it('does not match the _.template disjunct when objectName is "_" but methodName differs', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const callExpression = listeners.CallExpression as (node: unknown) => void;

        callExpression({
          type: 'CallExpression',
          loc: { start: { line: 1 } },
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: '_' },
            property: { type: 'Identifier', name: 'escape' },
          },
          arguments: [{ type: 'Identifier', name: 'userInput' }],
        });

        expect(reports).toHaveLength(0);
      });

      it('does not match the ejs.render disjunct when objectName is "ejs" but methodName differs', () => {
        const { listeners, reports } = createWithMockContext(noDirectiveInjection);
        const callExpression = listeners.CallExpression as (node: unknown) => void;

        callExpression({
          type: 'CallExpression',
          loc: { start: { line: 1 } },
          callee: {
            type: 'MemberExpression',
            object: { type: 'Identifier', name: 'ejs' },
            property: { type: 'Identifier', name: 'compileFile' },
          },
          arguments: [{ type: 'Identifier', name: 'userInput' }],
        });

        expect(reports).toHaveLength(0);
      });
    });

    // Angular bare directive() creation guards its report behind
    // `directiveName.type === 'Identifier' && isUserInput(...)`; cover the
    // false branch where the first argument is not user input.
    it('does not report dynamicDirectiveCreation when the bare directive() first argument is not user input', () => {
      const { listeners, reports } = createWithMockContext(noDirectiveInjection);
      const callExpression = listeners.CallExpression as (node: unknown) => void;

      callExpression({
        type: 'CallExpression',
        loc: { start: { line: 1 } },
        callee: { type: 'Identifier', name: 'directive' },
        arguments: [
          { type: 'Identifier', name: 'safeDirectiveName' },
          { type: 'FunctionExpression' },
        ],
      });

      expect(reports).toHaveLength(0);
    });
  });
});
