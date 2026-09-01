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
        // A hardcoded English sentence with an apostrophe, inside a structured
        // JSON payload. Reported on vercel/example-marketplace-integration
        // three times: `'` is in `dangerousChars`, and every literal nested
        // under a `.json()` call was measured against that character set.
        // Nothing here is user input and nothing here is markup.
        `Response.json([
          {
            type: "paragraph",
            children: [
              { type: "text", text: "You don't have permission to write to this resource" },
            ],
          },
        ]);`,
        // The same shape one level shallower, and with the apostrophe inside
        // quotes rather than as a contraction.
        `res.json({ error: { message: "Failed to validate metadata: metadata should have valid property 'region'" } });`,
        // `satisfies` is transparent. The ArrayExpression fix shipped with a
        // unit test using a BARE array, which passed while the real file — the
        // same payload with `satisfies Block[]` on it — still reported twice.
        // The wrapper stopped the climb. Verified against
        // vercel/example-marketplace-integration, not against a simplification
        // of it.
        `Response.json(
          [
            { type: "text", text: "You don't have permission to write to this resource" },
          ] satisfies Block[],
          { status: 200 },
        );`,
        `Response.json([{ text: "Invalid command 'error'" }] as Block[]);`,
        // A JSON primitive beside the string must not poison the payload.
        // Reported by review on the first pass of this fix: an `id` field is
        // the most common thing to sit next to a message, and a numeric
        // literal was making the whole array unsafe again.
        `res.json([{ id: 1, text: "You don't have permission" }]);`,
        `res.json([{ ok: true, total: null, text: "That's all" }]);`,
        // A hole is `undefined`, which carries no markup either.
        `res.json([, { text: "You don't have permission" }]);`,
        // A regex literal is NOT a safe primitive — its source can hold markup.
        // Markup in a nested payload still reports — see the invalid block.
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
    ruleTester.run(
      'static vs tainted response output',
      noImproperSanitization,
      {
        valid: [
          // express/examples/online/index.js:53. `.length` is a number in every
          // JavaScript engine, so there is nothing to escape — but the
          // concatenation was reported as an unescaped interpolation, twice.
          `res.send('<p>Users online: ' + ids.length + '</p>');`,
          `res.send('<ul>' + items.length + '</ul>');`,
        ],
        invalid: [
          // `obj[length]` reads a VARIABLE named length, not the array property,
          // so it carries whatever that variable holds. The `.length` exemption
          // is non-computed only and must never become a way to smuggle an
          // attacker-controlled key past the check.
          {
            name: 'a value concatenated into HTML with no escaping',
            code: `res.send('<p>' + data[length] + '</p>');`,
            errors: [
              { messageId: 'unsafeReplaceSanitization' },
              { messageId: 'unsafeReplaceSanitization' },
            ],
          },
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
      },
    );
  });

  describe('Invalid Code - Incomplete HTML Escaping', () => {
    ruleTester.run(
      'invalid - incomplete HTML escaping',
      noImproperSanitization,
      {
        valid: [],
        invalid: [
          // The array exemption must not become a false negative: markup nested
          // in an array is still the vector, whoever typed it.
          {
            code: `res.json([{ children: [{ text: "<script>alert(1)</script>" }] }]);`,
            errors: [{ messageId: 'unsafeReplaceSanitization' }],
          },
          // A regex literal's source can carry markup, so it is not a safe
          // primitive the way a number or a boolean is.
          {
            code: `res.json([/<script>/, { text: "it's here" }]);`,
            errors: 1,
          },
          // Seeing through the wrapper must not lose the finding underneath it.
          {
            code: `res.json([{ text: "<script>alert(1)</script>" }] satisfies Block[]);`,
            errors: 1,
          },
          {
            code: `res.json([{ text: "<b>" + req.query.name + "</b>" }] as Block[]);`,
            errors: 2,
          },
          // A non-literal element anywhere in the array taints the whole
          // payload — the array is only safe text when every leaf is.
          {
            code: `res.json([{ text: "<b>" + req.query.name + "</b>" }]);`,
            errors: [
              { messageId: 'unsafeReplaceSanitization' },
              { messageId: 'unsafeReplaceSanitization' },
            ],
          },
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

          // A chain that never becomes complete still reports — once.
          {
            code: 'element.innerHTML = userInput.replace(/</g, "&lt;").replace(/>/g, "&gt;");',
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
        ],
      },
    );
  });

  /**
   * Wild-corpus regressions — 14 findings, 0 true positives.
   *
   * Two defects, both "shape is not meaning":
   *
   * 1. `sourceCode.getText(node)` was read at EVERY link of a `.replace()`
   *    chain, so a chain that completes at its end reported once per link that
   *    was still incomplete halfway through. A complete five-character escaper
   *    reported twice.
   * 2. The trigger was the text probe `/replace\(\s*\/[<>]/` — a regex literal
   *    that merely STARTS with `<` or `>`. Whitespace trimming, comment
   *    stripping and `</head>` script injection all matched, and none of them
   *    is escaping anything.
   */
  describe('corpus regressions - replace() chains', () => {
    ruleTester.run(
      'complete escapers and non-escapers',
      noImproperSanitization,
      {
        valid: [
          // Shopify CLI packages/store/.../auth/callback.ts:18-19 — a complete
          // escaper reported twice, once at `.replace(/</…)` and once at
          // `.replace(/>/…)`, because the text read at those links did not yet
          // contain `&quot;`. Judged at the end of the chain it is complete.
          {
            name: 'the four HTML entities replaced',
            code: `const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')`,
          },
          // Shopify CLI theme-environment/hot-reload/error-page.ts:9 — all five
          // characters, still reported twice.
          {
            code: `function escapeHtml(unsafe) {
            return unsafe
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;')
          }`,
          },
          // okta-signin-widget babel-plugin-handlebars-inline-precompile/
          // handlebars/patch-precompile.js:6 — whitespace normalisation. Three
          // findings, because `/>\s+/` starts with `>`.
          {
            code: `template = template
            .replace(/\\s+</g, '<')
            .replace(/>\\s+/g, '>')
            .replace(/}}\\s+{{/g, '}}{{')
            .replace(/\\s+/g, ' ')
            .trim();`,
          },
          // Shopify CLI hot-reload/server.ts:468 — comment stripping. Three findings.
          {
            code: `otherContent = normalizeContent(
            otherContent
              .replace(/<!--[\\s\\S]*?-->/g, '')
              .replace(/{%\\s*comment\\s*%}[\\s\\S]*?{%\\s*endcomment\\s*%}/g, '')
              .replace(/{%\\s*doc\\s*%}[\\s\\S]*?{%\\s*enddoc\\s*%}/g, ''),
          )`,
          },
          // Shopify CLI hot-reload/server.ts:397 and :411 — injecting a <script>
          // tag before </head>. The rule called tag injection "incomplete HTML
          // escaping".
          {
            code: `return html.replace(/<\\/head>/, '<script src="x" defer></script></head>')`,
          },
          // Removing markup is not escaping it either.
          { code: `return html.replace(scriptRE, '')` },
          // The pattern must BE the tag character, not merely start with it.
          { code: `const s = html.replace(/<b>/g, '&lt;b&gt;')` },
          // A non-entity replacement is a rewrite, not an escape.
          { code: `const s = html.replace(/</g, '[')` },
          // A computed pattern yields no character the rule can name.
          { code: `const s = html.replace(tagRE, '&lt;')` },
          { code: `const s = html.replace(new RegExp(ch, 'g'), '&lt;')` },
          // A computed replacement yields no entity the rule can name.
          { code: `const s = html.replace(/</g, entityFor('<'))` },
          // A non-string literal on either side is not a pattern or an entity.
          { code: `const s = html.replace(/</g, 0)` },
          { code: `const s = html.replace(1, '&lt;')` },
          // A template replacement with an expression is not statically known.
          { code: 'const s = html.replace(/</g, `${entity}`)' },
          // Something other than `.replace` consuming the result ends the chain
          // at the replace, and the chain is complete.
          {
            code: `const s = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').trim()`,
          },
          // ofri-peretz/blog PR #162 (2026-08-23) — the RSS route's XML escaper,
          // reported twice at the `.replace` chain by the shipped rule. Complete
          // and correctly ordered (`&` first, so nothing double-escapes).
          {
            code: `const esc = (s) =>
            s.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&apos;')`,
          },
          // `&apos;` as the ONLY quote entity. Every other chain fixture spells
          // the quote `&quot;` or `&#039;`, so this is the sole cover for that
          // arm of the quote-entity alternation.
          {
            code: `const s = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/'/g, '&apos;')`,
          },
          // The single-pass table form: one regex, a character class, a lookup.
          // Quiet because a character-class pattern is not the character `<` or
          // `>`, so escapesTagChar is false and the chain logic never judges it.
          // Pinned so a future character-class expansion cannot begin reporting
          // a complete escaper. Note the cost of that quiet: an INCOMPLETE table
          // (`/[<>]/g` with a two-entry map) is equally quiet, and that is a real
          // false negative this rule does not yet cover.
          {
            code: `const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }
            const esc = (s) => s.replace(/[&<>"']/g, (c) => XML_ESCAPES[c] ?? c)`,
          },
          // The same idiom with the table inlined at the call site. Complete on
          // purpose: an INCOMPLETE table is also quiet today, but that is a known
          // false negative, not a property worth pinning as valid.
          {
            code: `const esc = (s) =>
            s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])`,
          },
        ],
        invalid: [
          // The genuine shape must still report: tags escaped, quotes and
          // ampersand left alone. If this ever goes quiet the narrowing above
          // has become a false negative.
          {
            code: `const s = html.replace(/</g, '&lt;').replace(/>/g, '&gt;')`,
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
          // A template-literal replacement with no expressions is static text
          // and counts as an entity.
          {
            code: 'const s = html.replace(/</g, `&lt;`)',
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
          // A string-literal pattern (not a regex) still names the character.
          {
            code: `const s = html.replace('<', '&lt;')`,
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
          // Escaping continues after a non-escaping link — the chain is walked
          // whole, so the trailing `.trim`-style link does not hide it.
          {
            code: `const s = html.replace(/</g, '&lt;').replace(/\\s+/g, ' ')`,
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
          // `&amp;` present, quotes missing.
          {
            code: `const s = html.replace(/&/g, '&amp;').replace(/</g, '&lt;')`,
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
          // Quotes present, `&amp;` missing — the classic double-escape hole.
          {
            code: `const s = html.replace(/</g, '&lt;').replace(/"/g, '&quot;')`,
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
          // A non-static replacement contributes nothing to the entity set, so
          // the chain stays incomplete rather than being skipped.
          {
            code: `const s = html.replace(/</g, '&lt;').replace(/x/g, fn)`,
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
          // --- isMidChain / isReplaceCall shapes that do NOT continue a chain.
          // The result is consumed by a computed member call.
          {
            code: `const s = html.replace(/</g, '&lt;')[key](x)`,
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
          // A `.replace()` grandparent whose callee is NOT this node's parent.
          {
            code: `foo.replace(bar[html.replace(/</g, '&lt;')], z)`,
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
          // A grandparent call with a plain-identifier callee.
          {
            code: `foo(bar[html.replace(/</g, '&lt;')])`,
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
          // A grandparent call whose callee property is a Literal, not an Identifier.
          {
            code: `foo['bar'](baz[html.replace(/</g, '&lt;')])`,
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
          // A grandparent call to a method that is not `replace`.
          {
            code: `foo.bar(baz[html.replace(/</g, '&lt;')])`,
            errors: [{ messageId: 'incompleteHtmlEscaping' }],
          },
        ],
      },
    );
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
    ruleTester.run(
      'invalid - innerHTML with user input',
      noImproperSanitization,
      {
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
      },
    );
  });

  describe('Invalid Code - String Literals in Dangerous Contexts', () => {
    ruleTester.run(
      'invalid - unescaped strings in dangerous contexts',
      noImproperSanitization,
      {
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
      },
    );
  });

  describe('Context Encoding Detection', () => {
    ruleTester.run(
      'context - URL and SQL context detection',
      noImproperSanitization,
      {
        valid: [
          // Proper URL encoding
          'const url = "https://example.com?q=" + encodeURIComponent(userInput);',
          // Parameterized query (not direct)
          'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
        ],
        invalid: [],
      },
    );
  });

  describe('Coverage - branch gaps', () => {
    // id 6 FALSE: replace pattern doesn't escape < or > → escapesOnlyTags = false → return false
    ruleTester.run(
      'coverage - replace without tag escaping',
      noImproperSanitization,
      {
        valid: [{ code: 'const clean = text.replace(/\\s+/g, " ");' }],
        invalid: [],
      },
    );

    // id 10 TRUE: URL context in needsContextEncoding (innerText + url in text)
    ruleTester.run(
      'coverage - innerText with url context',
      noImproperSanitization,
      {
        valid: [{ code: 'element.innerText = req.body.url;' }],
        invalid: [],
      },
    );

    // id 12 TRUE: SQL context in needsContextEncoding
    ruleTester.run(
      'coverage - textContent with sql context',
      noImproperSanitization,
      {
        valid: [{ code: 'element.textContent = getSqlQuery();' }],
        invalid: [],
      },
    );

    // id 14 TRUE: command context in needsContextEncoding (exec in text)
    ruleTester.run(
      'coverage - textContent with exec-command context',
      noImproperSanitization,
      {
        valid: [{ code: 'element.textContent = execResult;' }],
        invalid: [],
      },
    );

    // id 19 TRUE: safetyChecker.isSafe in replace handler → early return
    ruleTester.run(
      'coverage - @safe annotation bypasses replace report',
      noImproperSanitization,
      {
        valid: [
          {
            code: '/** @safe */\nelement.innerHTML = userInput.replace(/</g, "&lt;");',
          },
        ],
        invalid: [],
      },
    );

    // id 20: hasQuoteEscaping && hasAmpersandEscaping both true → complete escaping → valid
    ruleTester.run(
      'coverage - single replace with complete escaping',
      noImproperSanitization,
      {
        valid: [
          {
            code: 'element.innerHTML = text.replace(/</g, "&lt;&amp;&quot;");',
          },
        ],
        invalid: [],
      },
    );

    // id 24 FALSE: function in safeSanitizers list ('escape' matches escapeHTML)
    ruleTester.run(
      'coverage - escapeHTML is in safe list',
      noImproperSanitization,
      {
        valid: [{ code: 'const safe = escapeHTML(req.body.x);' }],
        invalid: [],
      },
    );

    // id 30 FALSE: AssignmentExpression left is not MemberExpression
    ruleTester.run(
      'coverage - assignment to identifier left side',
      noImproperSanitization,
      {
        valid: [{ code: 'x = req.body.content;' }],
        invalid: [],
      },
    );

    // id 32 FALSE: MemberExpression property not in innerHTML list
    ruleTester.run(
      'coverage - assignment to non-innerHTML property',
      noImproperSanitization,
      {
        valid: [{ code: 'element.style = req.body.css;' }],
        invalid: [],
      },
    );

    // id 38 TRUE: safetyChecker.isSafe in innerHTML assignment handler
    ruleTester.run(
      'coverage - @safe annotation bypasses innerHTML report',
      noImproperSanitization,
      {
        valid: [
          { code: '/** @safe */\nelement.innerHTML = req.body.content;' },
        ],
        invalid: [],
      },
    );

    // ids 43+48 FALSE: Literal in assignment to non-innerHTML property
    ruleTester.run(
      'coverage - literal assigned to textContent (non-innerHTML)',
      noImproperSanitization,
      {
        valid: [{ code: 'element.textContent = "<div>hello</div>";' }],
        invalid: [],
      },
    );

    // id 46 TRUE: !hasDangerousMarkup → early return for safe static HTML
    ruleTester.run(
      'coverage - safe static HTML in innerHTML is valid',
      noImproperSanitization,
      {
        valid: [{ code: 'element.innerHTML = "<div>hello</div>";' }],
        invalid: [],
      },
    );

    // id 57 TRUE: safetyChecker.isSafe in Literal handler → early return
    ruleTester.run(
      'coverage - @safe annotation bypasses literal report',
      noImproperSanitization,
      {
        valid: [
          {
            code: '/** @safe */\nelement.innerHTML = "<script>alert(1)</script>";',
          },
        ],
        invalid: [],
      },
    );
  });

  // Layer 2 — mock context for node.loc?.start.line ?? 0 fallback
  describe('Layer 2 - mock context', () => {
    it('CallExpression incompleteHtmlEscaping falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(
        noImproperSanitization,
        {
          sourceText: 'userInput.replace(/</g, "&lt;")',
        },
      );
      (listeners.CallExpression as (n: unknown) => void)({
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { type: 'Identifier', name: 'userInput' },
          property: { type: 'Identifier', name: 'replace' },
          computed: false,
        },
        arguments: [
          { type: 'Literal', value: null, regex: { pattern: '<', flags: 'g' } },
          { type: 'Literal', value: '&lt;' },
        ],
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].data?.line).toBe('0');
    });

    it('AssignmentExpression insufficientXssProtection falls back to line 0 when loc is missing', () => {
      const { listeners, reports } = createWithMockContext(
        noImproperSanitization,
        {
          sourceText: 'element.innerHTML = req.body.data',
        },
      );
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
      const { listeners, reports } = createWithMockContext(
        noImproperSanitization,
        {
          sourceText: '<script>alert(1)</script>',
        },
      );
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
  ruleTester.run(
    'authored text reaching a response sink',
    noImproperSanitization,
    {
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
          code: "res.send('<p>' + `${req.body.bio}` + '</p>')",
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
    },
  );
});

/**
 * Regression lock — HTML characters only.
 *
 * `dangerousChars` also carried the SHELL metacharacters ` $ { } | ; ( ) in a rule whose
 * messages are `incompleteHtmlEscaping` and `unsafeReplaceSanitization`. A pipe needs no
 * escaping in HTML, so `chalk.green(name + ' | ')` was reported as unescaped markup — as was
 * any literal containing a semicolon, parenthesis or brace, which is most of them. Shell
 * metacharacters belong to the command-injection rules, which have their own lists.
 */
ruleTester.run(
  'lock: dangerousChars is HTML, not shell',
  noImproperSanitization,
  {
    valid: [
      { code: "process.stdout.write(chalk.green(name + ' | '));" },
      { code: "const s = 'a; b(c)';" },
      { code: "const s = prefix + '${}';" },
      { code: 'const s = tag + "`" + value;' },
    ],
    invalid: [
      // Real HTML characters still report.
      { code: 'el.innerHTML = "<div>" + userInput + "</div>";', errors: 2 },
    ],
  },
);

/**
 * Option coverage — `safeSanitizers`, `trustedSanitizers`,
 * `trustedAnnotations`, `strictMode`.
 *
 * Every block below is a PAIR over one unchanged snippet: the `valid` entry
 * sets the option, the `invalid` entry runs the same source without it (or
 * with the option that overrides it), and the two verdicts disagree. An option
 * that produced the default verdict would execute the line while proving
 * nothing — the branch could be deleted and this file would stay green.
 *
 * `zzzWrap` and `@zzz-reviewed` are chosen so that no built-in list can match
 * them: `trustedSanitizers` extends `SANITIZATION_FUNCTIONS` by exact name,
 * the rule's own sanitizer set is exact too, and `@zzz-reviewed` contains none
 * of the built-in `SAFE_ANNOTATIONS` as a substring.
 */
ruleTester.run(
  'option: safeSanitizers accepts a project sanitizer at innerHTML',
  noImproperSanitization,
  {
    valid: [
      {
        // `safeSanitizers` REPLACES the default list rather than extending it,
        // so this configuration trusts `zzzWrap` and nothing else. That is
        // enough for the innerHTML assignment: the right-hand side is now a
        // recognised sanitizer call.
        code: 'el.innerHTML = zzzWrap(req.body.comment);',
        options: [{ safeSanitizers: ['zzzWrap'] }],
      },
    ],
    invalid: [
      {
        // Identical source under the defaults, where `zzzWrap` is not a known
        // sanitizer and `req.body` reaches innerHTML unescaped.
        code: 'el.innerHTML = zzzWrap(req.body.comment);',
        errors: [{ messageId: 'insufficientXssProtection' }],
      },
    ],
  },
);

ruleTester.run(
  'option: trustedSanitizers accepts a project sanitizer in output text',
  noImproperSanitization,
  {
    valid: [
      {
        // The output-literal path treats a concatenation as authored text only
        // when every leaf is a literal or a named sanitizer call.
        // `trustedSanitizers` is what adds `zzzWrap` to that set, so both
        // markup literals stop reporting.
        code: 'res.send("<p>" + zzzWrap(req.query.name) + "</p>");',
        options: [{ trustedSanitizers: ['zzzWrap'] }],
      },
    ],
    invalid: [
      {
        // Same source, option withheld: `zzzWrap` is an arbitrary call, so the
        // concatenation is tainted and each markup literal reports.
        code: 'res.send("<p>" + zzzWrap(req.query.name) + "</p>");',
        errors: [
          { messageId: 'unsafeReplaceSanitization' },
          { messageId: 'unsafeReplaceSanitization' },
        ],
      },
    ],
  },
);

ruleTester.run(
  'option: trustedAnnotations silences unescaped output',
  noImproperSanitization,
  {
    valid: [
      {
        // `hasSafeAnnotation` climbs from each literal to the enclosing call,
        // whose leading comment carries the custom annotation.
        code: '/* @zzz-reviewed by appsec */\nres.send("<p>" + req.query.name + "</p>");',
        options: [{ trustedAnnotations: ['@zzz-reviewed'] }],
      },
    ],
    invalid: [
      {
        // Same source, same comment, option withheld: the comment matches none
        // of the built-in annotations, so both markup literals report.
        code: '/* @zzz-reviewed by appsec */\nres.send("<p>" + req.query.name + "</p>");',
        errors: [
          { messageId: 'unsafeReplaceSanitization' },
          { messageId: 'unsafeReplaceSanitization' },
        ],
      },
    ],
  },
);

/**
 * `strictMode` only reaches report sites guarded by `safetyChecker.isSafe`.
 *
 * It is paired here against `trustedAnnotations` rather than against
 * `trustedSanitizers`, because the sanitizer set also feeds the rule's own
 * authored-text check (`isSafeText`), which returns before the safety checker
 * is ever consulted — a strictMode pair built on that snippet would stay quiet
 * in both directions and assert nothing.
 */
ruleTester.run(
  'option: strictMode overrides trustedAnnotations',
  noImproperSanitization,
  {
    valid: [
      {
        // Same snippet as the trustedAnnotations pair above: quiet only
        // because the annotation is trusted.
        code: '/* @zzz-reviewed by appsec */\nres.send("<p>" + req.query.name + "</p>");',
        options: [{ trustedAnnotations: ['@zzz-reviewed'] }],
      },
    ],
    invalid: [
      {
        // Same source, same annotation list, plus `strictMode`. The checker
        // now returns false unconditionally, so the annotation stops
        // suppressing and both findings return.
        code: '/* @zzz-reviewed by appsec */\nres.send("<p>" + req.query.name + "</p>");',
        options: [{ trustedAnnotations: ['@zzz-reviewed'], strictMode: true }],
        errors: [
          { messageId: 'unsafeReplaceSanitization' },
          { messageId: 'unsafeReplaceSanitization' },
        ],
      },
    ],
  },
);
