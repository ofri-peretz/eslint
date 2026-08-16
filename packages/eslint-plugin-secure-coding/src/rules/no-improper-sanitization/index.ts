/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-improper-sanitization
 * Detects improper sanitization of user input (CWE-94, CWE-79, CWE-116)
 *
 * Improper sanitization occurs when user input is not properly cleaned
 * before use in sensitive contexts. This can lead to injection attacks,
 * XSS, or other security vulnerabilities.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Known safe sanitization patterns
 * - Trusted sanitization libraries
 * - JSDoc annotations (@sanitized, @safe)
 * - Context-aware validation
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'insufficientXssProtection'
  | 'incompleteHtmlEscaping'
  | 'unsafeReplaceSanitization';

/**
 * `trustedLibraries` (default `['DOMPurify', 'he', 'validator',
 * 'express-validator']`) used to be declared here and in `meta.schema`, and
 * was never read by `create()`. It read as this rule's escape hatch — the one
 * knob a consumer would reach for to stop it reporting their sanitizer — and
 * it did nothing at all. `safeSanitizers`, immediately below, is the option
 * that actually works.
 */
export interface Options extends SecurityRuleOptions {
  /** Safe sanitization functions */
  safeSanitizers?: string[];

  /** Characters that should be escaped */
  dangerousChars?: string[];

  /** Contexts that require different encoding */
  contexts?: string[];
}

type RuleOptions = [Options?];

export const noImproperSanitization = createRule<RuleOptions, MessageIds>({
  name: 'no-improper-sanitization',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-improper-sanitization.md',
      description: 'Detects improper sanitization of user input',
      cwe: 'CWE-116',
    },
    messages: {
      insufficientXssProtection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Insufficient XSS Protection',
        cwe: 'CWE-79',
        description: 'XSS protection is incomplete or missing',
        severity: 'HIGH',
        fix: 'Use comprehensive XSS prevention or trusted sanitization library',
        documentationLink: 'https://owasp.org/www-community/attacks/xss/',
      }),
      incompleteHtmlEscaping: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Incomplete HTML Escaping',
        cwe: 'CWE-116',
        description: 'HTML escaping misses dangerous characters',
        severity: 'MEDIUM',
        fix: 'Escape all HTML special characters: & < > " \'',
        documentationLink: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
      }),
      unsafeReplaceSanitization: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Replace Sanitization',
        cwe: 'CWE-116',
        description: 'Simple replace() calls are insufficient for sanitization',
        severity: 'MEDIUM',
        fix: 'Use comprehensive sanitization libraries',
        documentationLink: 'https://cwe.mitre.org/data/definitions/116.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          safeSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: ['DOMPurify.sanitize', 'he.encode', 'encodeURIComponent', 'encodeURI', 'escape'], description: 'Sanitizer calls treated as sufficient'
          },
          // HTML-escaping characters only. This list used to also carry the SHELL
          // metacharacters ` $ { } | ; ( ) — in a rule whose messages are
          // `incompleteHtmlEscaping` and `unsafeReplaceSanitization`. A pipe needs no
          // escaping in HTML, so `chalk.green(name + ' | ')` was reported as unescaped
          // markup, as was any literal containing a semicolon, parenthesis or brace.
          // Shell metacharacters are the business of the command-injection rules, which
          // have their own lists.
          dangerousChars: {
            type: 'array',
            items: { type: 'string' },
            default: ['<', '>', '"', "'", '&'], description: 'Characters a sanitizer is expected to handle'
          },
          contexts: {
            type: 'array',
            items: { type: 'string' },
            default: ['html', 'url', 'sql', 'command', 'javascript', 'css'], description: 'Output contexts checked for a context-appropriate sanitizer'
          },
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional function names to consider as sanitizers',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description: 'Additional JSDoc annotations to consider as safe markers',
          },
          strictMode: {
            type: 'boolean',
            default: false,
            description: 'Disable all false positive detection (strict mode)',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      safeSanitizers: ['DOMPurify.sanitize', 'he.encode', 'encodeURIComponent', 'encodeURI', 'escape'],
      dangerousChars: ['<', '>', '"', "'", '&'],
      contexts: ['html', 'url', 'sql', 'command', 'javascript', 'css'],
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      safeSanitizers = ['DOMPurify.sanitize', 'he.encode', 'encodeURIComponent', 'encodeURI', 'escape'],
      dangerousChars = ['<', '>', '"', "'", '&'],
      trustedSanitizers = [],
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode;
    const filename = context.filename;

    // Create safety checker for false positive detection
    const safetyChecker = createSafetyChecker({
      trustedSanitizers,
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    /**
     * Check if sanitization is safe
     */
    const isSafeSanitizer = (callText: string): boolean => {
      return safeSanitizers.some(sanitizer => callText.includes(sanitizer));
    };

    /** `x.replace(…)` — the same predicate the CallExpression handler uses. */
    const isReplaceCall = (
      node: TSESTree.Node | undefined,
    ): node is TSESTree.CallExpression =>
      node?.type === 'CallExpression' &&
      node.callee.type === 'MemberExpression' &&
      node.callee.property.type === 'Identifier' &&
      node.callee.property.name === 'replace';

    /**
     * True when another `.replace()` consumes this call's result, i.e. this is
     * not the end of the chain.
     *
     * `a.replace(x).replace(y).replace(z)` is ONE escaping decision, not three.
     * The previous implementation read `sourceCode.getText(node)` at every link
     * and judged the prefix it happened to see, so a chain that is complete at
     * its end still reported once for every link that was incomplete so far.
     * Shopify CLI's `renderAuthCallbackPage` (`&`→`<`→`>`→`"`) reported twice
     * per escaper and its own `escapeHtml` (all five characters) reported twice
     * more — 8 of this rule's 14 wild-corpus findings were the rule reading its
     * own subject halfway through.
     */
    const isMidChain = (node: TSESTree.CallExpression): boolean => {
      const parent = node.parent as TSESTree.Node | undefined;
      const grandparent = parent?.parent as TSESTree.Node | undefined;
      // If the grandparent is a `.replace()` whose callee is this node's
      // parent, then that parent is the `…​.replace` member access and this
      // node is its receiver: another link follows.
      return isReplaceCall(grandparent) && grandparent.callee === parent;
    };

    /**
     * The literal search pattern of a `.replace()` first argument: the source
     * of a regex literal, or the text of a string literal. Anything computed
     * (a variable, a `new RegExp`, a concatenation) yields undefined — the rule
     * cannot say which character it targets, so it must not guess.
     */
    const staticPattern = (node: TSESTree.Node | undefined): string | undefined => {
      if (node?.type !== 'Literal') return undefined;
      const withRegex = node as TSESTree.Literal & { regex?: { pattern: string } };
      if (withRegex.regex) return withRegex.regex.pattern;
      return typeof node.value === 'string' ? node.value : undefined;
    };

    /** The literal replacement text of a `.replace()` second argument. */
    const staticReplacement = (node: TSESTree.Node | undefined): string | undefined => {
      if (node?.type === 'Literal') {
        return typeof node.value === 'string' ? node.value : undefined;
      }
      if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
        return node.quasis.map((quasi) => quasi.value.cooked).join('');
      }
      return undefined;
    };

    /** Walk a terminal `.replace()` back down its receiver chain. */
    const replaceChain = (
      terminal: TSESTree.CallExpression,
    ): { pattern?: string; replacement?: string }[] => {
      const pairs: { pattern?: string; replacement?: string }[] = [];
      let current: TSESTree.Node | undefined = terminal;
      while (isReplaceCall(current)) {
        pairs.push({
          pattern: staticPattern(current.arguments[0]),
          replacement: staticReplacement(current.arguments[1]),
        });
        current = (current.callee as TSESTree.MemberExpression).object;
      }
      return pairs;
    };

    /** `&amp;` `&lt;` `&#039;` `&#x27;` — a replacement that produces markup-safe text. */
    const ENTITY = /&(?:amp|lt|gt|quot|apos|#x[0-9a-f]+|#\d+);/i;

    /**
     * Check whether a `.replace()` chain is an INCOMPLETE HTML escaper.
     *
     * Two conditions, both about meaning rather than shape:
     *
     * 1. The chain must actually escape a tag character — a pair whose pattern
     *    IS `<` or `>` and whose replacement is an HTML entity. Stripping or
     *    rewriting markup is not escaping: `template.replace(/>\s+/g, '>')`
     *    (whitespace trimming), `otherContent.replace(/<!--[\s\S]*?-->/g, '')`
     *    (comment removal) and `html.replace(/<\/head>/, '<script …></head>')`
     *    (tag injection) all matched the old `/replace\(\s*\/[<>]/` text probe
     *    and none of them is trying to escape anything. That probe accounted
     *    for the other 6 wild-corpus findings.
     * 2. Given that it IS escaping, the chain is incomplete unless it also
     *    produces an ampersand entity and a quote entity somewhere.
     */
    const isIncompleteReplaceSanitization = (callExpression: TSESTree.CallExpression): boolean => {
      const pairs = replaceChain(callExpression);

      const escapesTagChar = pairs.some(
        (pair) =>
          (pair.pattern === '<' || pair.pattern === '>') &&
          pair.replacement !== undefined &&
          ENTITY.test(pair.replacement),
      );
      if (!escapesTagChar) return false;

      const replacements = pairs.map((pair) => pair.replacement ?? '').join('');
      const hasQuoteEscaping = /&quot;|&#x27;|&#0?39;|&apos;/i.test(replacements);
      const hasAmpersandEscaping = /&amp;/.test(replacements);

      return !(hasQuoteEscaping && hasAmpersandEscaping);
    };

    /**
     * Check if output context suggests needed encoding
     */
    const needsContextEncoding = (outputNode: TSESTree.Node): string | null => {
      let current: TSESTree.Node | undefined = outputNode;

      // Look for context clues in surrounding code
      while (current) {
        const text = sourceCode.getText(current).toLowerCase();

        if (text.includes('innerhtml') || text.includes('outerhtml')) {
          return 'html';
        }
        if (text.includes('href') || text.includes('src') || text.includes('url')) {
          return 'url';
        }
        if (text.includes('sql') || text.includes('query') || text.includes('execute')) {
          return 'sql';
        }
        if (text.includes('exec') || text.includes('spawn') || text.includes('command')) {
          return 'command';
        }

        current = current.parent as TSESTree.Node;
      }

      return null;
    };

    return {
      // Check call expressions for sanitization issues
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for replace() sanitization
        if (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'replace') {
          // One decision per chain — see isMidChain.
          if (isMidChain(node)) {
            return;
          }

          if (isIncompleteReplaceSanitization(node)) {
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'incompleteHtmlEscaping',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }

        // A "custom sanitizer" check used to live here. It reported any call
        // to a function whose *name* contained sanitize/escape/clean when an
        // argument's printed text contained req./body/query/params/input/data:
        //
        //   logger.info('login attempt: ' + sanitizeForLog(req.body.username));
        //
        // That is the ILB-CWE-Corpus fixture for CWE-117, and it is the
        // *correct* code — `sanitizeForLog` strips \r\n\t before logging. The
        // check fired on writing a sanitizer and using it on user input, which
        // is the behaviour the rule is supposed to encourage, and it could not
        // be resolved by any edit short of renaming the function.
        //
        // It also asserted an impact it never established. "Custom sanitizer
        // may be incomplete or bypassable" is a claim about an implementation
        // the rule never looked at — the callee is usually imported, and the
        // check inspected only the call site. Name-and-substring matching on
        // printed source made it worse: `data` matches `metadata`, `userData`,
        // `dataset`, and the argument text was scanned inside comments and
        // string literals too.
        //
        // 8 of this rule's 42 findings on the wild corpus came from here, and
        // every one was a call to a working sanitizer. Removed rather than
        // narrowed: there is no version of "your sanitizer might be bad" that
        // is actionable without reading the sanitizer.
      },

      // Check assignments that might need sanitization
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const left = node.left;
        const right = node.right;

        // Check for assignments to potentially dangerous properties
        if (left.type === 'MemberExpression' &&
            left.property.type === 'Identifier') {
          const propertyName = left.property.name.toLowerCase();

          if (['innerhtml', 'outerhtml', 'innertext', 'textcontent'].includes(propertyName)) {
            const encodingContext = needsContextEncoding(node);

            if (encodingContext === 'html' && propertyName === 'innerhtml') {
              // Check if right side is properly sanitized
              const rightText = sourceCode.getText(right);

              if (!isSafeSanitizer(rightText)) {
                // Check if right side contains user input
                const hasUserInput = rightText.includes('req.') ||
                                   rightText.includes('body') ||
                                   rightText.includes('query') ||
                                   rightText.includes('input');

                if (hasUserInput) {
                  if (safetyChecker.isSafe(node, context)) {
                    return;
                  }

                  context.report({
                    node: right,
                    messageId: 'insufficientXssProtection',
                    data: {
                      filePath: filename,
                      line: String(node.loc?.start.line ?? 0),
                    },
                  });
                }
              }
            }
          }
        }
      },

      // Check string literals that might contain dangerous characters
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string') {
          return;
        }

        // SAFE: literal assigned directly to innerHTML/outerHTML with no
        // concatenation or interpolation AND containing no dangerous
        // markup. Static developer-authored HTML normally has no taint
        // source (`el.innerHTML = '<span class="x"></span>'` is the
        // standard way to set static markup; flagging it would force
        // every static UI template into the noise floor) — BUT a literal
        // like `<script>alert(1)</script>` is unsafe even when
        // developer-authored, because the markup itself is the vector.
        // Only take the safe path when the literal is free of script
        // tags, inline event handlers, and `javascript:` URIs.
        const directParent = node.parent as TSESTree.Node | undefined;
        if (
          directParent?.type === 'AssignmentExpression' &&
          (directParent as TSESTree.AssignmentExpression).right === node &&
          (directParent as TSESTree.AssignmentExpression).left.type === 'MemberExpression'
        ) {
          const left = (directParent as TSESTree.AssignmentExpression).left as TSESTree.MemberExpression;
          if (
            left.property.type === 'Identifier' &&
            ['innerHTML', 'outerHTML'].includes(left.property.name)
          ) {
            const literalValue = node.value;
            const hasDangerousMarkup = /<script[\s>]|<\/script>|\son\w+\s*=|javascript:/i.test(literalValue);
            if (!hasDangerousMarkup) {
              return;
            }
          }
        }

        const text = node.value;

        // Check if this string is used in a dangerous context
        let current: TSESTree.Node | undefined = node;
        let isInDangerousContext = false;

        // Every path that sets `isInDangerousContext = true` is followed by `break`,
        // so the negation in the condition is dead (CodeQL: `js/useless-conditional`).
        while (current) {
          if (current.type === 'AssignmentExpression') {
            const left = current.left;
            if (left.type === 'MemberExpression' &&
                left.property.type === 'Identifier' &&
                ['innerHTML', 'outerHTML'].includes(left.property.name)) {
              isInDangerousContext = true;
              break;
            }
          } else if (current.type === 'CallExpression') {
            const callee = current.callee;
            if (callee.type === 'MemberExpression' &&
                callee.property.type === 'Identifier' &&
                ['write', 'send', 'json'].includes(callee.property.name)) {
              // Could be response output
              isInDangerousContext = true;
              break;
            }
          }
          current = current.parent as TSESTree.Node;
        }

        if (isInDangerousContext) {
          // A bare literal is developer-authored and carries no taint: nothing
          // an attacker controls reaches it, so `<` in it is markup the author
          // typed, not injection. Same reasoning the innerHTML branch above
          // already applies — extended here because the response-output path
          // (`res.send`/`write`/`json`) was reporting static HTML.
          //
          // Express's own examples/auth/index.js:89 is the case that surfaced
          // it (#398): `res.send('… <a href="/logout">logout</a>')` reported
          // CWE-116 with a message about `replace()`, where the statement has
          // no `replace()` and no interpolation at all.
          //
          // Dangerous markup still reports even when hardcoded, because there
          // the literal *is* the vector regardless of who wrote it.
          //
          // Allowlist, not blacklist. Excluding TemplateLiteral/BinaryExpression
          // silenced `res.send(req.query.name || '<p>fallback</p>')` and the
          // ternary form, where tainted input still reaches the sink — a false
          // negative is a worse outcome than the false positive being fixed.
          // The literal only earns the exemption when it IS the argument, so
          // any wrapper (`||`, `?:`, a call, a member access) falls through to
          // the normal checks below.
          // Concatenation of literals is still developer-authored. Requiring
          // the literal to be the *direct* argument left 34 findings across
          // express/examples alone, all of this shape:
          //
          //   res.send('<form method="post"><p>Check to <label>'
          //     + '<input type="checkbox" name="remember"/> remember me</label> '
          //     + '<input type="submit" value="Submit"/>.</p></form>');
          //
          // Zero variables, three string literals, reported three times.
          //
          // The walk only climbs `+` — a `||`, a ternary, a call or a member
          // access stops it, so the #441 false negatives stay closed: in
          // `res.send(req.query.name || '<p>fallback</p>')` the literal never
          // reaches an argument position on its own, and in
          // `res.send('<div>' + req.query.name + '</div>')` the concatenation
          // is reached but contains a non-literal leaf.
          const enclosingArgument = (
            literal: TSESTree.Node,
          ): TSESTree.Node | undefined => {
            let current = literal;
            let parent = current.parent as TSESTree.Node | undefined;
            // Climb the text-composing nodes only: `+`, and the
            // `[...] .join(sep)` triple (ArrayExpression → the `.join` member
            // → its call). Anything else — `||`, `?:`, a member access, a
            // call on a value — stops the climb, which is what keeps the
            // #441 false negatives closed.
            for (;;) {
              if (parent?.type === 'BinaryExpression' && parent.operator === '+') {
                current = parent;
              } else if (parent?.type === 'ArrayExpression') {
                current = parent;
              } else if (
                // `res.send({ error: "Sorry, can't find that" })` — an object
                // argument is serialised as JSON and served as
                // application/json, so an apostrophe in it is not markup. The
                // literal was reported because `'` is in `dangerousChars`.
                parent?.type === 'Property' ||
                (parent?.type === 'ObjectExpression' && current.type === 'Property')
              ) {
                current = parent;
              } else if (
                parent?.type === 'MemberExpression' &&
                parent.object === current &&
                parent.property.type === 'Identifier' &&
                parent.property.name === 'join'
              ) {
                current = parent;
              } else if (parent?.type === 'CallExpression' && parent.callee === current) {
                current = parent;
              } else {
                break;
              }
              parent = current.parent as TSESTree.Node | undefined;
            }
            if (
              parent?.type === 'CallExpression' &&
              (parent as TSESTree.CallExpression).arguments.includes(
                current as TSESTree.CallExpressionArgument,
              )
            ) {
              return current;
            }
            return undefined;
          };

          /** `escapeHtml` / `DOMPurify.sanitize` / `encodeURIComponent`… */
          const sanitizerNames = new Set([
            ...safeSanitizers,
            ...trustedSanitizers,
            'escapeHtml',
            'escapeHTML',
            'htmlEscape',
          ]);
          const calleeName = (callee: TSESTree.Node): string | undefined => {
            if (callee.type === 'Identifier') return callee.name;
            if (
              callee.type === 'MemberExpression' &&
              callee.object.type === 'Identifier' &&
              callee.property.type === 'Identifier'
            ) {
              return `${callee.object.name}.${callee.property.name}`;
            }
            return undefined;
          };

          /**
           * Every leaf is either text the developer typed or a value that has
           * been run through a sanitizer — nothing an attacker controls
           * reaches the sink unescaped.
           */
          const isSafeText = (expr: TSESTree.Node): boolean => {
            if (expr.type === 'Literal') return typeof expr.value === 'string';
            if (expr.type === 'TemplateLiteral') return expr.expressions.length === 0;
            if (expr.type === 'BinaryExpression' && expr.operator === '+') {
              return isSafeText(expr.left) && isSafeText(expr.right);
            }
            if (expr.type === 'ObjectExpression') {
              return expr.properties.every(
                (property) =>
                  property.type === 'Property' && isSafeText(property.value),
              );
            }
            // `.length` is a number in every JavaScript engine, and a number
            // cannot carry markup. `res.send('<p>Users online: ' + ids.length +
            // '</p>')` (express `examples/online/index.js:53`) was reported as
            // an unescaped interpolation; there is nothing to escape.
            //
            // Non-computed only: `obj['length']` is the same property, but
            // `obj[length]` reads a variable, and this guard must not be a way
            // to smuggle an attacker-controlled key past the check.
            if (
              expr.type === 'MemberExpression' &&
              !expr.computed &&
              expr.property.type === 'Identifier' &&
              expr.property.name === 'length'
            ) {
              return true;
            }
            if (expr.type === 'CallExpression') {
              const callee = expr.callee;
              // ['<h1>', '<li>…'].join('\n') — express/examples/resource
              // builds eight lines of static markup this way, and every one
              // of them was reported.
              if (
                callee.type === 'MemberExpression' &&
                callee.property.type === 'Identifier' &&
                callee.property.name === 'join' &&
                callee.object.type === 'ArrayExpression'
              ) {
                return callee.object.elements.every(
                  (element) => element !== null && isSafeText(element),
                );
              }
              // `res.send('user ' + escapeHtml(req.params.uid) + "'s pets")`
              // — this rule exists to demand escaping, and was reporting the
              // code that escapes. Only *named* sanitizers count; an
              // arbitrary call still taints the concatenation.
              const name = calleeName(callee);
              return name !== undefined && sanitizerNames.has(name);
            }
            return false;
          };

          const argument = enclosingArgument(node as TSESTree.Node);
          const isBareLiteral = argument !== undefined && isSafeText(argument);
          const hasDangerousMarkup =
            /<script[\s>]|<\/script>|\son\w+\s*=|javascript:/i.test(text);
          if (isBareLiteral && !hasDangerousMarkup) {
            return;
          }

          // Check if string contains dangerous characters without proper escaping
          const hasDangerousChars = dangerousChars.some(char => text.includes(char));
          const hasEscaping = text.includes('&lt;') || text.includes('&gt;') ||
                            text.includes('&quot;') || text.includes('&#x27;') ||
                            text.includes('&amp;');

          if (hasDangerousChars && !hasEscaping) {
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'unsafeReplaceSanitization',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      }
    };
  },
});
