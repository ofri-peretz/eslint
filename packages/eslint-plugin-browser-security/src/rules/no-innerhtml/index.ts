/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-innerhtml
 * Detects dangerous innerHTML/outerHTML assignments that can lead to XSS
 * CWE-79: Improper Neutralization of Input During Web Page Generation (XSS)
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://owasp.org/www-community/attacks/xss/
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createPayloadResolver, isStaticExpression, isTestFilePath, staticString } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';
import { resolveInitializer } from '../../utils/resolve-binding';

/**
 * `useSanitizer` is gone.
 *
 * It was attached as ``,
 * and ESLint DISCARDS any suggestion whose fix yields no edit — verified with
 * `linter.verify`, which returns the message with no `suggestions` array at all.
 * So the advice never rendered for a single user, while `hasSuggestions: true`
 * advertised that it would.
 *
 * The remediation it carried ("wrap the value in DOMPurify.sanitize") is already
 * the `fix:` line of the primary message, which does render. Deleting the dead
 * suggestion loses nothing and stops the rule overstating what it offers.
 */
type MessageIds = 'dangerousInnerHTML';

export interface Options {
  /** Allow innerHTML in test files. Default: false */
  allowInTests?: boolean;

  /** Trusted sanitizer function names. Default: ['DOMPurify.sanitize', 'sanitize', 'sanitizeHtml'] */
  trustedSanitizers?: string[];

  /** Allow innerHTML with literal strings. Default: true */
  allowLiteralStrings?: boolean;
}

type RuleOptions = [Options?];

/**
 * Recognised by CALLEE NAME, so each entry must be a function that actually
 * neutralises markup — not a word that appears near one.
 *
 * `escapeHtml` and `escape` are the entity-escapers (`escape-html`, lodash);
 * they were absent, which made the single most common hand-rolled defence a
 * false positive on this rule's own corpus.
 */
const DEFAULT_SANITIZERS = [
  'DOMPurify.sanitize',
  'sanitize',
  'sanitizeHtml',
  'xss',
  'purify',
  'escapeHtml',
  'escapeHTML',
  'escape',
];

/**
 * Check if the right side is sanitized
 */
/**
 * Is this value the result of calling a trusted sanitiser?
 *
 * Structural, not textual. The old implementation was
 * `sourceCode.getText(node).includes(name)`, which is wrong in both directions
 * at once:
 *
 *   - it accepted `el.innerHTML = notSanitized + '<!-- DOMPurify.sanitize -->'`,
 *     because the printed text contains the name;
 *   - it accepted `purify(userInput)` only by accident, because `purify` happens
 *     to be a substring of a default entry — rename the alias and the FP returns;
 *   - and it is defeated by whitespace: `DOMPurify . sanitize(x)` prints
 *     differently from `DOMPurify.sanitize(x)`.
 *
 * Now: the value must BE a call, and the callee must name a trusted sanitiser —
 * either directly (`DOMPurify.sanitize(x)`, `escapeHtml(x)`) or through a
 * single-assignment local alias (`const purify = DOMPurify.sanitize`), resolved
 * in scope.
 */
function isSanitized(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  sanitizers: string[],
): boolean {
  const names = (callee: TSESTree.Node): string[] => {
    if (callee.type === 'Identifier') return [callee.name];
    if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
      const prop = callee.property.name;
      const obj = callee.object.type === 'Identifier' ? callee.object.name : null;
      return obj ? [`${obj}.${prop}`, prop] : [prop];
    }
    return [];
  };

  const trusted = (candidates: string[]): boolean =>
    candidates.some((c) => sanitizers.includes(c));

  // A composite value is sanitised when EVERY dynamic part is.
  //
  // `el.innerHTML = '<b>' + escapeHtml(user.name) + '</b>'` is the commonest
  // correct hand-rolled defence there is, and judging only the top-level node
  // reported it — the expression is a BinaryExpression, not a call. Requiring
  // *every* part keeps the guarantee: one unsanitised operand and it reports.
  // A PART of a composite is safe if it is sanitised OR is a literal.
  //
  // The literal allowance belongs here and nowhere else. Hoisting it to the top
  // of this function made `isSanitized('<div>Hello</div>')` true, which
  // silenced the rule under `allowLiteralStrings: false` — the one option whose
  // entire job is to report constant HTML. Caught by the rule's own suite, not
  // by the corpus: the corpus has no fixture for that option, because the
  // corpus tests the vulnerability and this is a configuration promise.
  const partIsSafe = (part: TSESTree.Node): boolean =>
    isLiteralString(part) || isSanitized(part, sourceCode, sanitizers);

  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return partIsSafe(node.left as TSESTree.Node) && partIsSafe(node.right);
  }
  if (node.type === 'TemplateLiteral') {
    return node.expressions.every((e) => partIsSafe(e));
  }

  if (node.type !== 'CallExpression') return false;

  // A sanitiser defined IN THIS FILE is not evidence of anything.
  //
  //   const escapeHtml = (s) => s;
  //   el.innerHTML = escapeHtml(user.bio);
  //
  // The allowlist matches a callee NAME, so an identity function wearing a
  // trusted name silenced the rule completely. This is the evasion a
  // name-keyed allowlist invites, and it was found by writing fixtures against
  // the rule AFTER tuning it, not before.
  //
  // A real sanitiser is imported: DOMPurify, sanitize-html, escape-html. A
  // local definition is the user's own code, and the rule cannot know what it
  // does — so it does not get the benefit of the doubt.
  if (node.callee.type === 'Identifier') {
    const local = resolveInitializer(node.callee, sourceCode);
    if (
      local !== undefined &&
      (local.type === 'ArrowFunctionExpression' || local.type === 'FunctionExpression')
    ) {
      return false;
    }
    if (isLocallyDeclaredFunction(node.callee, sourceCode)) return false;
  }

  if (trusted(names(node.callee))) return true;

  // `const purify = DOMPurify.sanitize; el.innerHTML = purify(x)` — follow the
  // alias to what it was assigned, and judge that.
  if (node.callee.type === 'Identifier') {
    const init = resolveInitializer(node.callee, sourceCode);
    if (init !== undefined && trusted(names(init))) return true;
  }
  return false;
}

/**
 * A `let` whose EVERY write is a static expression.
 *
 * `isStaticExpression` refuses `let` outright, and it is right to: a binding
 * that can be reassigned proves nothing at the point of use. But that made
 *
 *   let markup = '<p>one</p>'; markup = '<p>two</p>'; el.innerHTML = markup;
 *
 * a false positive, while
 *
 *   let markup = '<p>loading</p>';
 *   markup = await fetch('/api/html').then((r) => r.text());
 *   el.innerHTML = markup;
 *
 * must stay a finding. The two differ in exactly one way — what the writes ARE —
 * so that is what this asks. Every write static, and the value is static; one
 * write from anywhere else, and it reports.
 *
 * Deliberately requires ALL writes, not the last one: ordering across branches
 * and loops is not something this rule can establish.
 */
function everyWriteIsStatic(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (node.type !== 'Identifier') return false;
  let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
  while (scope) {
    const variable = scope.variables.find((v) => v.name === node.name);
    if (variable) {
      const writes = variable.references.filter((r) => r.isWrite() && r.writeExpr);
      // No writes at all means an unresolved binding, not a proven constant.
      if (writes.length === 0) return false;
      return writes.every((r) =>
        isStaticExpression({
          node: r.writeExpr as TSESTree.Node,
          scope: sourceCode.getScope(r.writeExpr as TSESTree.Node),
        }),
      );
    }
    scope = scope.upper;
  }
  return false;
}

/** Was this identifier declared as a function in this file (not imported)? */
function isLocallyDeclaredFunction(
  node: TSESTree.Identifier,
  sourceCode: TSESLint.SourceCode,
): boolean {
  let scope: TSESLint.Scope.Scope | null = sourceCode.getScope(node);
  while (scope) {
    const variable = scope.variables.find((v) => v.name === node.name);
    if (variable) {
      // ONLY a `function name() {}` declaration.
      //
      // Including `Variable` defs here also rejected
      // `const purify = DOMPurify.sanitize` — an ALIAS to an imported
      // sanitiser, which is sanitised code. The distinction that matters is
      // implementation versus reference: a local function BODY is opaque to
      // this rule, a local name pointing at an import is not.
      return variable.defs.some((d) => d.type === 'FunctionName');
    }
    scope = scope.upper;
  }
  return false;
}

/**
 * Check if the value is a literal string
 */
// `staticString` answers for BOTH spellings, so the hand-rolled template arm
// that used to sit here is now unreachable rather than merely redundant.
const isLiteralString = (node: TSESTree.Node): boolean => staticString(node) !== null;

/**
 * Are these arguments all string constants, and is there at least one?
 *
 * "At least one" matters: `make()()` tells us nothing about what `make`
 * closed over, so an empty argument list is not evidence of constness.
 */
function isConstantArgumentList(args: readonly TSESTree.Node[]): boolean {
  return args.length > 0 && args.every((arg) => isLiteralString(arg));
}

/**
 * Is this payload a **compiled constant template**, invoked with no arguments?
 *
 * `const template = hbs('<div class="captcha-footer">…</div>'); …
 * container.insertAdjacentHTML('beforeend', template())` is the shape in
 * okta-signin-widget `src/v2/view-builder/views/captcha/CaptchaView.js:294`.
 * The template text is a string literal written in that file, and the call
 * passes it nothing: there is no dynamic data anywhere in the expression, so
 * the rendered HTML is fixed at authoring time exactly as a literal is.
 *
 * The rule reported it because `reportSink` treated *every* CallExpression
 * payload as "function call result" — the predicate asked what SHAPE the
 * payload had, never whether any value could flow through it.
 *
 * The two conditions are what keep this from swallowing real findings.
 * Arguments at the call site (`template(user)`) are data flowing in;
 * a non-constant argument at construction (`hbs(userTemplate)`) is data
 * baked in. Either one and the payload is reported as before — which is why
 * okta's `getFallbackMessage(fallback)` / `getMessage(fallback)` sinks and
 * every `loc()`/`sprintf()` payload still report.
 */
function isConstantTemplateInvocation(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  if (node.type !== 'CallExpression') return false;
  // Anything passed at the call site is dynamic data by default.
  if (node.arguments.length > 0) return false;

  const callee = node.callee;
  // `hbs('<div/>')()` — compiled and invoked in one expression.
  if (callee.type === 'CallExpression') {
    return isConstantArgumentList(callee.arguments);
  }
  if (callee.type !== 'Identifier') return false;

  // Resolved through scope, not by scanning nearby text: a same-named binding
  // from an unrelated block must not answer for this one. `resolveInitializer`
  // also refuses any binding that is written more than once.
  const init = resolveInitializer(callee, sourceCode);
  if (init === undefined || init.type !== 'CallExpression') return false;
  return isConstantArgumentList(init.arguments);
}

export const noInnerhtml = createRule<RuleOptions, MessageIds>({
  name: 'no-innerhtml',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-innerhtml.md',
      description:
        'Disallow dangerous innerHTML/outerHTML assignments that can lead to XSS',
      cwe: 'CWE-79',
      cvss: 6.1,
      confidence: 'medium',
    },
    messages: {
      // Named by the sink that actually fired, not by `innerHTML`. This rule covers
      // `outerHTML`, `srcdoc`, `insertAdjacentHTML`, `document.write` and `writeln`
      // too, and `iframe.srcdoc = userHtml` reporting "XSS via innerHTML" — with a
      // remediation that names a property the code does not use — sends the reader
      // looking for an assignment that is not there. `{{property}}` is always
      // supplied at the single report site, so `innerHTML` findings read exactly as
      // they did before.
      dangerousInnerHTML: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Cross-Site Scripting (XSS) via {{property}}',
        cwe: 'CWE-79',
        description:
          'Assigning to {{property}} with {{source}} can execute malicious scripts. This is a critical XSS vulnerability.',
        severity: 'CRITICAL',
        fix: 'Sanitize with DOMPurify.sanitize() before it reaches {{property}}; where the value is plain text, set textContent instead.',
        documentationLink: 'https://owasp.org/www-community/attacks/xss/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: DEFAULT_SANITIZERS,
          },
          allowLiteralStrings: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      trustedSanitizers: DEFAULT_SANITIZERS,
      allowLiteralStrings: true,
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const {
      allowInTests = false,
      trustedSanitizers = DEFAULT_SANITIZERS,
      allowLiteralStrings = true,
    } = options as Options;

    const filename = context.filename;
    const isTestFile = allowInTests && isTestFilePath(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;
    // `srcdoc` sets an iframe's whole document from a string — the same parse-as-HTML sink
    // as innerHTML, and one eslint-plugin-no-unsanitized flags that we previously missed.
    const dangerousProperties = new Set(['innerHTML', 'outerHTML', 'srcdoc']);
    // Sibling DOM sinks that share the same XSS class — surfaced as
    // FN by the hand-curated stress test. See benchmarks/AUDIT_PATTERNS.md
    // §3.1 ("DOM XSS sink list"). Each takes user-controlled HTML and
    // injects it into the live DOM exactly the same way innerHTML does.
    const dangerousSinkMethods = new Set([
      'insertAdjacentHTML',
      'write',
      'writeln',
      // `range.createContextualFragment(html)` parses its argument as HTML with
      // exactly the semantics of innerHTML, and the resulting fragment is then
      // appended to the live DOM. It is the standard way to build nodes from a
      // markup string, and no competitor measured on this corpus reports it.
      'createContextualFragment',
    ]);

    /**
     * The property being assigned, whether written dotted or computed.
     *
     * `el.innerHTML` and `el['innerHTML']` are the same assignment; only a
     * computed key that is not a static string is unknowable.
     */
    function propertyNameOf(member: TSESTree.MemberExpression): string | null {
      if (!member.computed && member.property.type === 'Identifier') {
        return member.property.name;
      }
      if (!member.computed) return null;
      const staticText2 = staticString(member.property);
      if (staticText2 !== null) {
        return staticText2;
      }
      // `const PROP = 'innerHTML'; el[PROP] = payload` — resolve the key.
      // Without this the computed form is a one-line evasion of the whole rule,
      // and it is one no competitor on this corpus catches either.
      if (member.property.type === 'Identifier') {
        const init = resolveInitializer(member.property, sourceCode);
        if (init !== undefined && staticString(init) !== null) {
          return staticString(init);
        }
      }
      return null;
    }

    /**
     * `write` and `writeln` are DOM sinks only on a *document*.
     *
     * The method name alone is one of the most overloaded in JavaScript:
     * `process.stdout.write`, `stderr.write`, `socket.write`, `res.write`,
     * `stream.write`, `buffer.write`. Matching on it made every CLI progress
     * message an XSS finding — 23 of the 73 corpus findings for this rule were
     * Node streams, mostly `Shopify/cli` writing to stdout.
     *
     * `insertAdjacentHTML` needs no such gate: nothing outside the DOM is
     * called that.
     */
    function isDocumentReceiver(object: TSESTree.Node): boolean {
      // `document.write(...)`
      if (object.type === 'Identifier') {
        return object.name === 'document' || /^(?:.*[a-z])?[Dd]oc(?:ument)?$/.test(object.name);
      }
      // `window.document.write(...)`, `iframe.contentDocument.write(...)`,
      // `el.ownerDocument.write(...)`
      if (object.type === 'MemberExpression' && object.property.type === 'Identifier') {
        return /^(?:content|owner)?[Dd]ocument$/.test(object.property.name);
      }
      return false;
    }

    function reportSink(
      reportNode: TSESTree.Node,
      sinkName: string,
      taintedNode: TSESTree.Node,
      /**
       * Can a source-specific sibling rule see this sink SHAPE?
       *
       * The partition ("exactly one rule owns a site") only works if the other
       * rule can actually reach the site. `no-postmessage-innerhtml` and its
       * siblings match a plain dotted assignment; they do not model
       * `Object.assign(el, { innerHTML })`, computed access, or
       * `createContextualFragment`.
       *
       * When those shapes were added here, deferring on an attributed source
       * meant NOBODY reported them — probed with all five family rules enabled,
       * `window.addEventListener('message', e => Object.assign(el, { innerHTML: e.data }))`
       * produced zero findings. Widening one rule's sink list silently opened a
       * hole in another's coverage, which is the failure mode a partition
       * invites and the reason to re-probe the whole family after touching any
       * member of it.
       */
      siblingCanSee = true,
    ) {
      // Owned by a source-specific rule? Then this is not ours. The two tests
      // are complements — a source rule reports only what it can attribute, we
      // report only what it cannot — so exactly one rule reports any value.
      // Before this, both did, at the identical range, in `recommended`.
      if (siblingCanSee && payloadSource(taintedNode) !== undefined) return;
      // Allow constant HTML if configured. A no-argument call on a template
      // compiled from constant strings emits a fixed document, so it belongs
      // to the same category as a literal and rides the same switch — see
      // isConstantTemplateInvocation.
      if (
        allowLiteralStrings &&
        (isLiteralString(taintedNode) ||
          isConstantTemplateInvocation(taintedNode, sourceCode) ||
          // Resolved through scope, not guessed. `isStaticExpression` folds a
          // const binding, a concatenation and a template whose every
          // interpolation is itself static — so
          //   const EMPTY = '<p class="muted">Nothing yet</p>'; el.innerHTML = EMPTY
          // and
          //   const cls = 'badge'; el.innerHTML = `<span class="${cls}">New</span>`
          // are recognised as the literals they are.
          //
          // Both were false positives measured on this rule's own corpus, and
          // both are how real code keeps markup out of the middle of a function.
          // A rule that flags them teaches users that "constant" is not a
          // defence, which is the opposite of the lesson.
          isStaticExpression({
            node: taintedNode,
            scope: sourceCode.getScope(taintedNode),
          }) ||
          everyWriteIsStatic(taintedNode, sourceCode))
      ) {
        return;
      }
      // Allow if sanitized via a trusted sanitiser call.
      if (isSanitized(taintedNode, sourceCode, trustedSanitizers)) return;
      // Determine source type for the diagnostic message.
      let source = 'dynamic content';
      if (taintedNode.type === 'Identifier') {
        source = `variable "${taintedNode.name}"`;
      } else if (taintedNode.type === 'TemplateLiteral') {
        source = 'template literal with expressions';
      } else if (taintedNode.type === 'CallExpression') {
        source = 'function call result';
      }
      context.report({
        node: reportNode,
        messageId: 'dangerousInnerHTML',
        data: { property: sinkName, source },
      });
    }

    const payloadSource = createPayloadResolver(context.sourceCode);

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check for element.innerHTML = ... or element.outerHTML = ...
        if (node.left.type !== 'MemberExpression') {
          return;
        }

        // `el['innerHTML'] = x` is the same sink as `el.innerHTML = x`.
        //
        // Requiring an Identifier property missed it entirely, and so did every
        // competitor measured on the same corpus — Mozilla's no-unsanitized and
        // @microsoft/sdl both stay quiet on the computed form. It is not an
        // exotic shape: it is what you write when the property is picked from a
        // constant, and it is the obvious way to evade a linter that only reads
        // dotted access.
        const sinkName = propertyNameOf(node.left);
        if (sinkName === null || !dangerousProperties.has(sinkName)) {
          return;
        }

        // A computed key is invisible to the source-specific siblings.
        reportSink(node, sinkName, node.right, !node.left.computed);
      },

      // element.insertAdjacentHTML(position, htmlString) — same XSS class
      // as innerHTML but a different sink shape. Also covers
      // document.write(...) and document.writeln(...) which are the
      // historic parent injection sinks.
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'MemberExpression') return;
        // Computed method access is the same call: `document['write'](x)` and
        // `document.write(x)` differ only in syntax. Requiring an Identifier
        // here left the computed form completely unreported, and the coverage
        // suite pinned it as VALID.
        const methodName = propertyNameOf(node.callee);
        if (methodName === null) return;
        const property = { type: 'Identifier' as const, name: methodName };

        // `Object.assign(el, { innerHTML: payload })` writes the sink property
        // without ever forming a member assignment, so the AssignmentExpression
        // visitor never sees it. Same write, same XSS, different syntax.
        if (
          property.name === 'assign' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'Object'
        ) {
          for (const arg of node.arguments.slice(1)) {
            if (arg.type !== 'ObjectExpression') continue;
            for (const prop of arg.properties) {
              if (prop.type !== 'Property') continue;
              const key =
                prop.key.type === 'Identifier'
                  ? prop.key.name
                  : prop.key.type === 'Literal'
                    ? String(prop.key.value)
                    : null;
              if (key !== null && dangerousProperties.has(key)) {
                // Object.assign is invisible to the siblings.
                reportSink(node, key, prop.value as TSESTree.Node, false);
              }
            }
          }
          return;
        }

        if (!dangerousSinkMethods.has(property.name)) return;
        // `write`/`writeln` are only DOM sinks on a document — see
        // isDocumentReceiver. Without this, every `process.stdout.write` in a
        // CLI was reported as XSS.
        if (
          (property.name === 'write' || property.name === 'writeln') &&
          !isDocumentReceiver(node.callee.object)
        ) {
          return;
        }
        // The HTML payload is the LAST argument for insertAdjacentHTML
        // (`(position, html)`) and the only argument for write/writeln.
        const tainted = node.arguments[node.arguments.length - 1];
        if (!tainted) return;
        // `createContextualFragment` is a sink only this rule models; the
        // source-specific siblings handle insertAdjacentHTML and document.write
        // but not this one, so deferring on an attributed source would leave it
        // unreported by everybody.
        reportSink(
          node,
          property.name,
          tainted,
          property.name !== 'createContextualFragment',
        );
      },
    };
  },
});
