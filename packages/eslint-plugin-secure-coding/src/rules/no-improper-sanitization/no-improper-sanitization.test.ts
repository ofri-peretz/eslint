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

        // #398: Express's own examples/auth/index.js:89. A bare string literal
        // reaching res.send() is developer-authored — nothing an attacker
        // controls flows into it, so the `<` is markup the author typed. This
        // reported CWE-116 with a message about `replace()` on a statement that
        // has no replace() and no interpolation, one of 188 findings on
        // Express's own reference code.
        `res.send('Wahoo! restricted area, click to <a href="/logout">logout</a>');`,
        // Same shape on the other response sinks the rule watches.
        `res.write('<p>static</p>');`,
        `res.json('<b>ok</b>');`,
      ],
      invalid: [],
    });
  });

  describe('#398 regression: static output stays silent, real sinks do not', () => {
    ruleTester.run('static vs tainted response output', noImproperSanitization, {
      valid: [],
      invalid: [
        // Hardcoded but genuinely dangerous: the literal IS the vector, so
        // author-controlled is not a defence. Must still report.
        {
          code: `res.send('<script>alert(1)</script>');`,
          errors: [{ messageId: 'unsafeReplaceSanitization' }],
        },
        // User input concatenated into the response — the actual CWE-116 shape
        // the rule exists for.
        //
        // Two errors, not one: the Literal visitor fires per string literal, so
        // the opening `'<div>'` and closing `'</div>'` each report. That
        // duplicate is pre-existing behaviour on this branch and is asserted
        // here as-is rather than silently accepted by a looser matcher — if it
        // is ever deduplicated, this test should fail and be updated.
        {
          code: `res.send('<div>' + req.query.name + '</div>');`,
          errors: [
            { messageId: 'unsafeReplaceSanitization' },
            { messageId: 'unsafeReplaceSanitization' },
          ],
        },
        // The literal is a fallback, not the argument — tainted input still
        // reaches the sink. An earlier version of this exemption excluded
        // TemplateLiteral/BinaryExpression by name and silenced both of these,
        // turning a false-positive fix into a false negative. The exemption is
        // now an allowlist (literal IS the argument), so any wrapper falls
        // through to the normal checks.
        {
          code: `res.send(req.query.name || '<p>fallback</p>');`,
          errors: [{ messageId: 'unsafeReplaceSanitization' }],
        },
        {
          code: `res.send(flag ? req.query.name : '<p>x</p>');`,
          errors: [{ messageId: 'unsafeReplaceSanitization' }],
        },
      ],
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

  // The "custom sanitizer" checks that lived here asserted that calling a
  // function whose NAME contains sanitize/escape/clean on user input is a
  // finding — `mySanitize(req.body.content)`, `myEscape(req.query.data)`.
  //
  // That is the correct code. The rule fired on writing a sanitizer and using
  // it on user input, which is the behaviour it exists to encourage, and no
  // edit short of renaming the function resolved it. It also claimed an
  // impact it never established: "custom sanitizer may be incomplete or
  // bypassable" is a statement about an implementation the check never read.
  //
  // ILB-CWE-Corpus CWE-117/stripped-newlines.js was one of the 16 false
  // positives for exactly this reason:
  //
  //   logger.info('login attempt: ' + sanitizeForLog(req.body.username));
  //
  // 8 of this rule's 42 findings on the wild corpus came from the same path.
  // The detection and its messageId are gone; these tests went with them.


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

/**
 * ILB-CWE-Corpus and wild-corpus regressions.
 *
 * This rule produced 42 of the 411 findings on the 13-repo wild corpus — its
 * single largest contributor — and one of the 16 ILB-CWE-Corpus false
 * positives. 34 came from the literal-in-a-response-sink path below, 8 from
 * the removed custom-sanitizer path.
 *
 * The exemption is written as "no tainted leaf reaches the sink", not as a
 * node-type blacklist. #441 excluded TemplateLiteral/BinaryExpression by name
 * and silenced `res.send(req.query.name || '<p>x</p>')` — trading a false
 * positive for a false negative. Every widening here is paired with the
 * invalid case that pins its edge.
 */
describe('corpus regressions', () => {
  ruleTester.run('authored text reaching a response sink', noImproperSanitization, {
    valid: [
      // express/examples/cookies/index.js:28 — three string literals, zero
      // variables, reported three times.
      {
        code: `res.send('<form method="post"><p>Check to <label>'
          + '<input type="checkbox" name="remember"/> remember me</label> '
          + '<input type="submit" value="Submit"/>.</p></form>');`,
      },
      // express/examples/resource/index.js:80-87 — eight lines of static
      // markup in an array, joined. Eight findings.
      {
        code: `res.send(['<h1>Examples:</h1> <ul>', '<li>GET /users</li>', '</ul>'].join('\\n'));`,
      },
      // express/examples/route-map/index.js:47 — the input IS escaped. This
      // rule exists to demand escaping and was reporting the code that does it.
      {
        code: `res.send('user ' + escapeHtml(req.params.uid) + "'s pets")`,
      },
      // express/examples/web-service/index.js:110 — an object argument is
      // serialised as JSON and served as application/json; the apostrophe in
      // it is not markup. Reported because `'` is in dangerousChars.
      {
        code: `res.send({ error: "Sorry, can't find that" })`,
      },
      {
        code: `res.json({ message: 'Done <ok>' })`,
      },
      // A sanitizer reached through a member chain, not a bare identifier.
      {
        code: `res.send('<p>' + DOMPurify.sanitize(req.body.bio) + '</p>')`,
      },
      {
        code: `res.send('<p>' + he.encode(req.body.bio) + '</p>')`,
      },
    ],
    invalid: [
      // Each concatenation reports once per literal operand — two literals
      // bracketing a tainted value gives two findings, which is the existing
      // behaviour and not what these cases are pinning.
      //
      // An unescaped value inside an otherwise-static array still taints it,
      // so the `.join()` exemption cannot be reached by hiding input in the
      // array.
      {
        code: `res.send(['<li>', req.query.name, '</li>'].join(''))`,
        errors: [
          { messageId: 'unsafeReplaceSanitization' },
          { messageId: 'unsafeReplaceSanitization' },
        ],
      },
      // Only *named* sanitizers earn the exemption — an arbitrary call does
      // not, or `escapeHtml` recognition would become "any call launders
      // taint".
      {
        code: `res.send('<p>' + renderBio(req.body.bio) + '</p>')`,
        errors: [
          { messageId: 'unsafeReplaceSanitization' },
          { messageId: 'unsafeReplaceSanitization' },
        ],
      },
      // A tainted object property is still tainted — the JSON exemption is
      // per-value, not per-argument.
      {
        code: `res.send({ error: '<b>' + req.query.msg + '</b>' })`,
        errors: [
          { messageId: 'unsafeReplaceSanitization' },
          { messageId: 'unsafeReplaceSanitization' },
        ],
      },
      // A computed callee yields no resolvable name, so it cannot match the
      // sanitizer list — taint launders through nothing.
      {
        code: `res.send('<p>' + sanitizers[kind](req.body.bio) + '</p>')`,
        errors: [
          { messageId: 'unsafeReplaceSanitization' },
          { messageId: 'unsafeReplaceSanitization' },
        ],
      },
      // A deeper member chain (`lib.html.escape`) resolves to no name at all,
      // so it cannot match the sanitizer list. Widening the resolver to walk
      // arbitrary chains would let `attacker.controlled.escape()` launder taint.
      {
        code: `res.send('<p>' + lib.html.escape(req.body.bio) + '</p>')`,
        errors: [
          { messageId: 'unsafeReplaceSanitization' },
          { messageId: 'unsafeReplaceSanitization' },
        ],
      },
      // A template literal WITH expressions is interpolation, not authored text.
      {
        code: 'res.send(\'<p>\' + `${req.body.bio}` + \'</p>\')',
        errors: [
          { messageId: 'unsafeReplaceSanitization' },
          { messageId: 'unsafeReplaceSanitization' },
        ],
      },
      // A non-string literal operand is not authored text either.
      {
        code: `res.send('<b>' + count + '</b>')`,
        errors: [
          { messageId: 'unsafeReplaceSanitization' },
          { messageId: 'unsafeReplaceSanitization' },
        ],
      },
    ],
  });
});
