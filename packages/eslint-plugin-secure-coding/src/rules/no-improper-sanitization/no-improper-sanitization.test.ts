/**
 * Tests for no-improper-sanitization rule
 * Security: CWE-116 (Improper Encoding or Escaping of Output)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { noImproperSanitization } from './index';

// Configure RuleTester for Vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-improper-sanitization', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - proper sanitization', noImproperSanitization, {
      valid: [
        // Safe sanitization with trusted libraries
        'element.innerHTML = DOMPurify.sanitize(userInput);',
        'const safe = he.encode(userInput);',
        'const encoded = encodeURIComponent(userInput);',
        // textContent is safe (doesn't interpret HTML)
        'element.textContent = userInput;',
        // Direct assignment without user input indicators isn't flagged
        'element.innerHTML = userInput;',
        // String concatenation without dangerous context
        'const html = "<div>" + req.body.content + "</div>";',
        // Safe annotation
        `
          /** @safe */
          myCustomSanitize(req.body.data);
        `,
        // Proper HTML entity escaping

      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Incomplete HTML Escaping', () => {
    ruleTester.run('invalid - incomplete HTML escaping', noImproperSanitization, {
      valid: [],
      invalid: [
        // Incomplete escaping - only escapes < but not other dangerous chars
        {
          code: 'element.innerHTML = userInput.replace(/</g, "&lt;");',
          errors: [
            {
              messageId: 'incompleteHtmlEscaping',
            },
          ],
        },
        // Incomplete escaping - only escapes > but not other dangerous chars
        {
          code: 'const safe = data.replace(/>/g, "&gt;");',
          errors: [
            {
              messageId: 'incompleteHtmlEscaping',
            },
          ],
        },

        // Chained replacement flagged individually (Known Limitation)
        {
          code: 'element.innerHTML = userInput.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/&/g, "&amp;");',
          errors: [
            { messageId: 'incompleteHtmlEscaping' },
            { messageId: 'incompleteHtmlEscaping' },
            { messageId: 'incompleteHtmlEscaping' },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Custom Sanitizer Functions', () => {
    ruleTester.run('invalid - custom sanitizer with user input', noImproperSanitization, {
      valid: [],
      invalid: [
        // Custom sanitize function with user input
        {
          code: 'const clean = mySanitize(req.body.content);',
          errors: [{ messageId: 'dangerousSanitizerUsage' }],
        },
        // Custom escape function with user data
        {
          code: 'const safe = myEscape(req.query.data);',
          errors: [{ messageId: 'dangerousSanitizerUsage' }],
        },
        // Custom clean function with user input
        {
          code: 'const result = myClean(req.params.id);',
          errors: [{ messageId: 'dangerousSanitizerUsage' }],
        },
      ],
    });
  });

  describe('Invalid Code - innerHTML Without Sanitization', () => {
    ruleTester.run('invalid - innerHTML with user input', noImproperSanitization, {
      valid: [],
      invalid: [
        // innerHTML with unsanitized user input
        {
          code: 'element.innerHTML = req.body.content;',
          errors: [{ messageId: 'insufficientXssProtection' }],
        },
        // innerHTML with query parameter
        {
          code: 'div.innerHTML = req.query.html;',
          errors: [{ messageId: 'insufficientXssProtection' }],
        },
      ],
    });
  });

  describe('Invalid Code - String Literals in Dangerous Contexts', () => {
    ruleTester.run('invalid - unescaped strings in dangerous contexts', noImproperSanitization, {
      valid: [],
      invalid: [
        // String with dangerous chars in innerHTML context
        {
          code: 'element.innerHTML = "<script>alert(1)</script>";',
          errors: [{ messageId: 'unsafeReplaceSanitization' }],
        },
        // String with dangerous chars in response send
        {
          code: 'res.send("<img src=x onerror=alert(1)>");',
          errors: [{ messageId: 'unsafeReplaceSanitization' }],
        },
      ],
    });
  });

  describe('Context Encoding Detection', () => {
    ruleTester.run('context - URL and SQL context detection', noImproperSanitization, {
      valid: [
        // Proper URL encoding
        'const url = "https://example.com?q=" + encodeURIComponent(userInput);',
        // Parameterized query (not direct)
        'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
      ],
      invalid: [],
    });
  });

  describe('Coverage - branch gaps', () => {
    // id 6 FALSE: replace pattern doesn't escape < or > → escapesOnlyTags = false → return false
    ruleTester.run('coverage - replace without tag escaping', noImproperSanitization, {
      valid: [{ code: 'const clean = text.replace(/\\s+/g, " ");' }],
      invalid: [],
    });

    // id 10 TRUE: URL context in needsContextEncoding (innerText + url in text)
    ruleTester.run('coverage - innerText with url context', noImproperSanitization, {
      valid: [{ code: 'element.innerText = req.body.url;' }],
      invalid: [],
    });

    // id 12 TRUE: SQL context in needsContextEncoding
    ruleTester.run('coverage - textContent with sql context', noImproperSanitization, {
      valid: [{ code: 'element.textContent = getSqlQuery();' }],
      invalid: [],
    });

    // id 14 TRUE: command context in needsContextEncoding (exec in text)
    ruleTester.run('coverage - textContent with exec-command context', noImproperSanitization, {
      valid: [{ code: 'element.textContent = execResult;' }],
      invalid: [],
    });

    // id 19 TRUE: safetyChecker.isSafe in replace handler → early return
    ruleTester.run('coverage - @safe annotation bypasses replace report', noImproperSanitization, {
      valid: [{ code: '/** @safe */\nelement.innerHTML = userInput.replace(/</g, "&lt;");' }],
      invalid: [],
    });

    // id 20: hasQuoteEscaping && hasAmpersandEscaping both true → complete escaping → valid
    ruleTester.run('coverage - single replace with complete escaping', noImproperSanitization, {
      valid: [{ code: 'element.innerHTML = text.replace(/</g, "&lt;&amp;&quot;");' }],
      invalid: [],
    });

    // id 24 FALSE: function in safeSanitizers list ('escape' matches escapeHTML)
    ruleTester.run('coverage - escapeHTML is in safe list', noImproperSanitization, {
      valid: [{ code: 'const safe = escapeHTML(req.body.x);' }],
      invalid: [],
    });

    // ids 25+27 FALSE: no user input in args (all OR arms false) → hasUserInput stays false
    ruleTester.run('coverage - custom sanitizer with static arg', noImproperSanitization, {
      valid: [{ code: 'const r = mySanitize("static text");' }],
      invalid: [],
    });

    // id 26: 6-way OR binary-expr arms [1-5] - body/query/params/input/data without req. prefix
    ruleTester.run('coverage - custom sanitizer user input variants', noImproperSanitization, {
      valid: [],
      invalid: [
        { code: 'mySanitize(bodyParam);',  errors: [{ messageId: 'dangerousSanitizerUsage' }] },
        { code: 'mySanitize(queryParam);', errors: [{ messageId: 'dangerousSanitizerUsage' }] },
        { code: 'mySanitize(paramsValue);',errors: [{ messageId: 'dangerousSanitizerUsage' }] },
        { code: 'mySanitize(inputValue);', errors: [{ messageId: 'dangerousSanitizerUsage' }] },
        { code: 'mySanitize(dataValue);',  errors: [{ messageId: 'dangerousSanitizerUsage' }] },
      ],
    });

    // id 30 FALSE: AssignmentExpression left is not MemberExpression
    ruleTester.run('coverage - assignment to identifier left side', noImproperSanitization, {
      valid: [{ code: 'x = req.body.content;' }],
      invalid: [],
    });

    // id 32 FALSE: MemberExpression property not in innerHTML list
    ruleTester.run('coverage - assignment to non-innerHTML property', noImproperSanitization, {
      valid: [{ code: 'element.style = req.body.css;' }],
      invalid: [],
    });

    // id 38 TRUE: safetyChecker.isSafe in innerHTML assignment handler
    ruleTester.run('coverage - @safe annotation bypasses innerHTML report', noImproperSanitization, {
      valid: [{ code: '/** @safe */\nelement.innerHTML = req.body.content;' }],
      invalid: [],
    });

    // ids 43+48 FALSE: Literal in assignment to non-innerHTML property
    ruleTester.run('coverage - literal assigned to textContent (non-innerHTML)', noImproperSanitization, {
      valid: [{ code: 'element.textContent = "<div>hello</div>";' }],
      invalid: [],
    });

    // id 46 TRUE: !hasDangerousMarkup → early return for safe static HTML
    ruleTester.run('coverage - safe static HTML in innerHTML is valid', noImproperSanitization, {
      valid: [{ code: 'element.innerHTML = "<div>hello</div>";' }],
      invalid: [],
    });

    // id 57 TRUE: safetyChecker.isSafe in Literal handler → early return
    ruleTester.run('coverage - @safe annotation bypasses literal report', noImproperSanitization, {
      valid: [{ code: '/** @safe */\nelement.innerHTML = "<script>alert(1)</script>";' }],
      invalid: [],
    });
  });

  // Layer 2 — mock context for node.loc?.start.line ?? 0 fallback
  describe('Layer 2 - mock context', () => {
    it('CallExpression incompleteHtmlEscaping falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noImproperSanitization, {
        sourceText: 'userInput.replace(/</g, "&lt;")',
      });
      (listeners.CallExpression as (n: unknown) => void)({
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'userInput' },
          property: { type: 'Identifier', name: 'replace' },
          computed: false,
        },
        arguments: [],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('CallExpression dangerousSanitizerUsage falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noImproperSanitization, {
        sourceText: 'mySanitize(req.body.data)',
      });
      (listeners.CallExpression as (n: unknown) => void)({
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'mySanitize' },
        arguments: [{ type: 'Identifier', name: 'reqBodyData' }],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('AssignmentExpression insufficientXssProtection falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noImproperSanitization, {
        sourceText: 'element.innerHTML = req.body.data',
      });
      (listeners.AssignmentExpression as (n: unknown) => void)({
        type: 'AssignmentExpression',
        left: {
          type: 'MemberExpression',
          property: { type: 'Identifier', name: 'innerHTML' },
          computed: false,
        },
        right: { type: 'Identifier', name: 'data' },
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('Literal unsafeReplaceSanitization falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(noImproperSanitization, {
        sourceText: '<script>alert(1)</script>',
      });
      const literalNode: Record<string, unknown> = {
        type: 'Literal',
        value: '<script>alert(1)</script>',
      };
      const parentNode: Record<string, unknown> = {
        type: 'AssignmentExpression',
        right: literalNode,
        left: {
          type: 'MemberExpression',
          property: { type: 'Identifier', name: 'innerHTML' },
        },
        parent: undefined,
      };
      literalNode.parent = parentNode;
      (listeners.Literal as (n: unknown) => void)(literalNode);
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });
  });
});
