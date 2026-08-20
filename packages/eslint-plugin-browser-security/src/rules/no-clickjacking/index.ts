/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-clickjacking
 * Detects clickjacking vulnerabilities (CWE-1021)
 *
 * Clickjacking tricks users into clicking on invisible or disguised elements
 * by overlaying them with transparent frames. This rule detects missing
 * protections against clickjacking attacks.
 *
 * False Positive Reduction:
 * This rule uses security utilities to reduce false positives by detecting:
 * - Safe iframe usage patterns
 * - Trusted frame sources
 * - JSDoc annotations (@trusted-frame, @safe-iframe)
 * - Frame-busting protections
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import {
  createSafetyChecker,
  type SecurityRuleOptions,
} from '@interlace/eslint-devkit';
import { resolveInitializer } from '../../utils/resolve-binding';

type MessageIds =
  | 'missingFrameBusting'
  | 'unsafeIframeUsage'
  | 'transparentFrameOverlay'
  | 'frameManipulation';

export interface Options extends SecurityRuleOptions {
  /** Trusted iframe sources */
  trustedSources?: string[];

  /** Require frame-busting code */
  requireFrameBusting?: boolean;

  /** Detect transparent overlays */
  detectTransparentOverlays?: boolean;
}

type RuleOptions = [Options?];

/**
 * Frame identifiers whose comparison forms the frame-busting test.
 *
 * `top`, `self`, `parent`, `window.top`, `window.self` — compared against each
 * other, this is the canonical "am I framed?" check.
 *
 * @protocol-constant The complete set of HTML's WindowProxy-valued globals. A
 * consumer who could shorten it would blind the rule to the frame-busting test
 * spelled with the entry they removed, while it still claimed to check for one;
 * widening it would read an ordinary object comparison as frame busting.
 */
const FRAME_REFS = new Set(['top', 'self', 'parent', 'window']);

/** Does this expression read one of the frame references? */
function isFrameRef(node: TSESTree.Node): boolean {
  if (node.type === 'Identifier') return FRAME_REFS.has(node.name);
  // Only one level of qualification: a frame-busting test compares `top` /
  // `self` / `window.top`, never `window.top.location`. Recursing further
  // would be unreachable code dressed up as generality.
  if (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    node.object.name === 'window'
  ) {
    return (
      node.property.type === 'Identifier' && FRAME_REFS.has(node.property.name)
    );
  }
  return false;
}

/** Is this `if` test the canonical "am I framed?" comparison? */
function isFrameBustingTest(test: TSESTree.Node): boolean {
  return (
    test.type === 'BinaryExpression' &&
    ['!=', '!==', '==', '==='].includes(test.operator) &&
    isFrameRef(test.left) &&
    isFrameRef(test.right)
  );
}

/**
 * Does this expression read `.location` off a frame reference?
 *
 * `if (top.location != self.location)` and `if (window.top.location !== …)`
 * are frame-busting tests that compare LOCATIONS rather than windows, so the
 * window comparison above does not see them.
 */
function readsFrameLocation(node: TSESTree.Node, depth = 0): boolean {
  if (depth > 8) return false;
  if (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'location' &&
    isFrameRef(node.object)
  ) {
    return true;
  }
  if (node.type === 'BinaryExpression' || node.type === 'LogicalExpression') {
    return (
      readsFrameLocation(node.left as TSESTree.Node, depth + 1) ||
      readsFrameLocation(node.right, depth + 1)
    );
  }
  if (node.type === 'UnaryExpression') {
    return readsFrameLocation(node.argument, depth + 1);
  }
  return false;
}

/**
 * Every `property: value` pair in a chunk of CSS-bearing text.
 *
 * Substring matching over printed source is what put two findings on
 * Shopify/cli's GraphiQL templates: `styles.includes('opacity: 0')` also
 * matches `opacity: 0.5`, `includes('top: 0')` also matches `top: 0.5rem`,
 * and neither is transparent. Splitting into declarations first means a value
 * is compared whole.
 *
 * The boundary is "any character a CSS property name cannot contain", so this
 * finds declarations inside a stylesheet (`{ opacity: 0; }`), inside an inline
 * attribute (`style="opacity: 0"`) and inside a bare fragment alike.
 */
const DECLARATION = /(?:^|[^a-z-])([a-z-]+)\s*:\s*([^;{}"'`\n]*)/g;

function cssDeclarations(text: string): Array<readonly [string, string]> {
  const declarations: Array<readonly [string, string]> = [];
  for (const match of text.toLowerCase().matchAll(DECLARATION)) {
    const value = match[2]
      .trim()
      .replace(/\s*!important$/, '')
      .replace(/,$/, '')
      .trim();
    declarations.push([match[1], value] as const);
  }
  return declarations;
}

function hasDeclaration(
  declarations: ReadonlyArray<readonly [string, string]>,
  property: string,
  matches: (value: string) => boolean,
): boolean {
  return declarations.some(([prop, value]) => prop === property && matches(value));
}

/**
 * CSS properties an overlay is described with. Closed set, exact membership.
 *
 * This exists to answer "is this text CSS at all". The gate used to be
 * `text.includes('style=') || text.includes('css')`, which is a test of the
 * AUTHOR'S PHRASING rather than of the content: a styled-components block or a
 * plain style string names neither word, so
 *
 * ```js
 * const style = 'position: absolute; top: 0; left: 0; z-index: -1';
 * ```
 *
 * was invisible, and so was every CSS-in-JS rule in the corpus. One recognised
 * declaration is enough to distinguish a stylesheet from a sentence that
 * happens to contain a colon — `style='opacity: 0'` is a whole overlay in a
 * single declaration, and requiring two silenced it.
 *
 * @protocol-constant CSS property names from the CSS specification, used only to
 * tell a style declaration from prose containing a colon. They are not a domain
 * vocabulary and no consumer's codebase adds to them; editing the set changes
 * what counts as CSS, which is not a decision a consumer should be making.
 */
const CSS_PROPERTIES: ReadonlySet<string> = new Set([
  'position',
  'top',
  'left',
  'right',
  'bottom',
  'width',
  'height',
  'opacity',
  'visibility',
  'display',
  'z-index',
  'background',
  'background-color',
  'pointer-events',
  'transform',
  'margin',
  'padding',
  'border',
  'overflow',
  'content',
  'transition',
  'animation',
]);

/**
 * Is this property being ANIMATED rather than pinned invisible?
 *
 * `opacity: 0; transition: opacity 0.3s` is a fade-IN: the element is
 * invisible for 300ms on its way to being visible, which is the commonest
 * loading affordance on the web. A clickjacking overlay is static — it has to
 * be, or the victim would see it appear. The transition declaration is the
 * evidence that separates the two, and it is read as a list of TOKENS rather
 * than searched as a string.
 */
function animatesProperty(
  declarations: ReadonlyArray<readonly [string, string]>,
  property: string,
): boolean {
  return declarations.some(([prop, value]) => {
    // `animation` runs keyframes, and the shorthand names the KEYFRAMES —
    // `animation: fade-in 1s` — never the properties they alter. Those live in
    // an `@keyframes` block this rule cannot see, so any animation at all is
    // evidence the element is in motion.
    if (prop === 'animation') return true;
    if (prop !== 'transition') return false;
    // `transition`, by contrast, lists the properties it applies to.
    const tokens = value.split(/[\s,]+/);
    return tokens.includes(property) || tokens.includes('all');
  });
}

/** Does this text read as CSS rather than as prose containing a colon? */
function looksLikeCss(
  declarations: ReadonlyArray<readonly [string, string]>,
): boolean {
  return declarations.some(([prop]) => CSS_PROPERTIES.has(prop));
}

/**
 * The string an iframe `src` expression is KNOWN to be, folded through scope.
 *
 * An embed URL is almost never written inline: it comes out of a constant or
 * out of an environment-indexed table. Folding is what makes the ORIGIN — the
 * only part of a `src` that decides who serves the frame — readable at all.
 */
function foldToString(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth: number,
): string | null {
  if (depth > 4) return null;
  if (node.type === 'Literal') {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (node.type === 'Identifier') {
    const init = resolveInitializer(node, sourceCode);
    return init === undefined ? null : foldToString(init, sourceCode, depth + 1);
  }
  if (node.type === 'MemberExpression' && node.computed) {
    const index = node.property;
    if (index.type !== 'Literal' || typeof index.value !== 'number') return null;
    const array = foldToArrayExpression(node.object, sourceCode, depth + 1);
    const element = array?.elements[index.value];
    return element == null ? null : foldToString(element, sourceCode, depth + 1);
  }
  return null;
}

function foldToArrayExpression(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  depth: number,
): TSESTree.ArrayExpression | null {
  if (depth > 4) return null;
  if (node.type === 'ArrayExpression') return node;
  if (node.type === 'Identifier') {
    const init = resolveInitializer(node, sourceCode);
    return init === undefined
      ? null
      : foldToArrayExpression(init, sourceCode, depth + 1);
  }
  // A nested table — `EMBEDS[0][1]`, one row per environment.
  if (node.type === 'MemberExpression' && node.computed) {
    const index = node.property;
    if (index.type !== 'Literal' || typeof index.value !== 'number') return null;
    const outer = foldToArrayExpression(node.object, sourceCode, depth + 1);
    const element = outer?.elements[index.value];
    return element == null
      ? null
      : foldToArrayExpression(element, sourceCode, depth + 1);
  }
  return null;
}

/** `https://host:port` of an absolute or protocol-relative URL, else null. */
function originOf(url: string): string | null {
  const match = /^([a-z][a-z0-9+.-]*:)?\/\/([^/?#]+)/i.exec(url);
  return match === null
    ? null
    : `${(match[1] ?? '').toLowerCase()}//${match[2].toLowerCase()}`;
}

/**
 * @protocol-constant ESTree node type names — the three function forms the AST
 * defines. This is the parser's own vocabulary, not the consumer's; a fourth
 * spelling would be a parser change, and removing one would make the walk skip a
 * function shape the language still has.
 */
const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

/**
 * Can this function only run while the guard's branch is executing?
 *
 * The guard suppresses a redirect because the frame check gates it. That
 * reasoning survives a function boundary only when the function cannot be
 * reached from outside the guard — otherwise the redirect runs with no frame
 * check ever having happened, and the rule must still report it.
 *
 * Contained: an inline callback or IIFE (`setTimeout(() => …)`), which has no
 * name to call it by. Contained: a declaration or `const` whose every
 * reference sits inside the guard. Everything else — stored on an object,
 * returned, referenced after the block — escapes.
 */
function runsOnlyInsideGuard(
  fn: TSESTree.Node,
  guard: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const parent = fn.parent as TSESTree.Node | undefined;

  // An inline callback or IIFE is invoked where it is written.
  if (
    parent?.type === 'CallExpression' &&
    (parent.arguments as TSESTree.Node[]).includes(fn)
  ) {
    return true;
  }
  if (parent?.type === 'CallExpression' && parent.callee === fn) return true;

  // A named binding is reachable wherever its name is in scope. Ask the scope
  // manager where it is actually referenced rather than guessing from shape.
  const declarator =
    fn.type === 'FunctionDeclaration'
      ? fn
      : parent?.type === 'VariableDeclarator'
        ? parent
        : undefined;
  if (declarator === undefined) return false;

  // Every binding the declaration introduces must stay inside the guard.
  return sourceCode
    .getDeclaredVariables(declarator)
    .every((variable) =>
      variable.references.every(
        (ref) =>
          ref.identifier.range[0] >= guard.range[0] &&
          ref.identifier.range[1] <= guard.range[1],
      ),
    );
}

/**
 * Is this node inside an `if` whose test compares two frame references?
 *
 * Read from the AST, not from printed source. The previous version of this
 * check matched `sourceCode.getText(test)` against strings like `'top != self'`,
 * which is whitespace-sensitive — `top !=  self` and `top!==self` are the same
 * program and did not match — and matches a comment or string that merely
 * contains the phrase. See scripts/audit-gettext-classification.ts.
 *
 * Crossing a function boundary is only safe when that function cannot escape
 * the guard — see runsOnlyInsideGuard. A redirect parked in a function that is
 * callable from outside runs with no frame check at all.
 */
function insideFrameBustingGuard(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const crossed: TSESTree.Node[] = [];
  let current: TSESTree.Node | undefined = node.parent as
    | TSESTree.Node
    | undefined;
  while (current) {
    if (FUNCTION_TYPES.has(current.type)) crossed.push(current);
    // Both forms of the test, not just one.
    //
    // `hasFrameBusting` accepted a LOCATION comparison — `window.top.location
    // !== window.self.location` — while this guard check accepted only the
    // window comparison. So the rule recognised that file as frame-busting and
    // then reported the redirect inside the guard as `frameManipulation`
    // anyway: the same program read two different ways by two checks that were
    // supposed to ask the same question.
    if (
      current.type === 'IfStatement' &&
      (isFrameBustingTest(current.test) || readsFrameLocation(current.test))
    ) {
      const guard = current;
      return crossed.every((fn) => runsOnlyInsideGuard(fn, guard, sourceCode));
    }
    current = current.parent as TSESTree.Node | undefined;
  }
  return false;
}

export const noClickjacking = createRule<RuleOptions, MessageIds>({
  name: 'no-clickjacking',
  meta: {
    type: 'problem',
    deprecated: true,
    replacedBy: ['@see eslint-plugin-express-security/require-helmet'],
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-clickjacking.md',
      description:
        'Detects clickjacking vulnerabilities and missing frame protections',
      cwe: 'CWE-1021',
    },
    messages: {
      missingFrameBusting: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing Frame Busting',
        cwe: 'CWE-1021',
        description: 'No frame-busting code to prevent clickjacking',
        severity: 'HIGH',
        fix: 'Add frame-busting JavaScript to prevent framing',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      }),
      unsafeIframeUsage: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe iframe Usage',
        cwe: 'CWE-1021',
        description: 'iframe may enable clickjacking attacks',
        severity: 'MEDIUM',
        fix: 'Add X-Frame-Options or CSP frame-ancestors protection',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      }),
      transparentFrameOverlay: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Transparent Frame Overlay',
        cwe: 'CWE-1021',
        description: 'Transparent elements may hide clickjacking attacks',
        severity: 'MEDIUM',
        fix: 'Use frame-busting or CSP protections',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      }),
      frameManipulation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Frame Manipulation',
        cwe: 'CWE-1021',
        description: 'Code attempts to manipulate parent frames',
        severity: 'LOW',
        fix: 'Implement proper frame communication or prevent framing',
        documentationLink:
          'https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          trustedSources: {
            type: 'array',
            items: { type: 'string' },
            default: ['self', 'same-origin'],
            description: 'Frame-ancestor sources treated as safe',
          },
          requireFrameBusting: {
            type: 'boolean',
            default: true,
            description: 'Require frame-busting code in addition to headers',
          },
          detectTransparentOverlays: {
            type: 'boolean',
            default: true,
            description:
              'Report transparent overlays positioned over clickable elements',
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
            description:
              'Additional JSDoc annotations to consider as safe markers',
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
      trustedSources: ['self', 'same-origin'],
      requireFrameBusting: true,
      detectTransparentOverlays: true,
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const {
      trustedSources = ['self', 'same-origin'],
      requireFrameBusting = true,
      detectTransparentOverlays = true,
      trustedAnnotations = [],
      strictMode = false,
    }: Options = options;

    const sourceCode = context.sourceCode;
    const filename = context.filename;

    // Create safety checker for false positive detection.
    //
    // `trustedSanitizers` is deliberately absent. It only marks a node safe
    // when that node IS a sanitisation call (or an identifier initialised from
    // one) — and every node this rule reports is a JSXElement, a
    // MemberExpression, a Literal or a TemplateLiteral. The option could never
    // change a verdict here, so it was removed from the schema rather than
    // left in place looking configurable.
    const safetyChecker = createSafetyChecker({
      trustedAnnotations,
      trustedOrmPatterns: [],
      strictMode,
    });

    // Track if frame-busting code is present
    let hasFrameBusting = false;

    /**
     * Does this file build the document that could be framed?
     *
     * The question `requireFrameBusting` needs, and the one the rule used to
     * answer with a FILENAME REGEX over `index|app|main|page|layout` plus a
     * substring scan over the printed text of the whole file, looking for
     * `<button`. Two consequences, both measured:
     *
     * - Identical bytes reported in `src/app/layout.tsx` and stayed silent in
     *   `src/components/Toolbar.tsx`. A rule whose verdict moves when you
     *   rename the file has not looked at the code.
     * - A file that already set `frame-ancestors 'none'` still reported,
     *   because nothing except JavaScript frame-busting could clear the check.
     *
     * A document shell — `<html>`, `<head>`, `<body>` — is real AST evidence
     * that this file decides what the browser renders as a top-level document.
     * `Toolbar.tsx` renders a fragment inside somebody else's document and has
     * no say in whether that document can be framed.
     */
    let buildsDocumentShell = false;

    /** Does the file establish frame protection by header or meta tag? */
    let hasDeclaredFrameProtection = false;

    /**
     * @protocol-constant The three HTML elements that make a document a
     * document. Fixed by the HTML specification — a page cannot declare a fourth
     * — and it is what distinguishes a full document shell (which can be framed,
     * so must bust out) from a component fragment (which cannot be framed alone).
     */
    const DOCUMENT_SHELL_TAGS: ReadonlySet<string> = new Set([
      'html',
      'head',
      'body',
    ]);

    /**
     * `frame-ancestors <something other than *>` or an X-Frame-Options value.
     *
     * Read off string values rather than identifiers — a CSP is data, and the
     * directive it contains is the evidence, not the name of the variable it
     * is stored in.
     */
    const declaresFrameProtection = (value: string): boolean => {
      const text = value.toLowerCase();
      const ancestors = /frame-ancestors\s+([^;]+)/.exec(text);
      if (ancestors && ancestors[1].trim() !== '*') return true;
      return /^\s*(deny|sameorigin)\s*$/.test(text) || text.includes('x-frame-options');
    };

    /**
     * Check if source is trusted — by ORIGIN, not by substring.
     *
     * `source.includes(trusted)` made the allowlist trivially bypassable:
     * with the default `['self', 'same-origin']`, `https://evil.example/self`
     * was trusted, and with `['https://trusted.com']` so was
     * `https://evil.example/?next=https://trusted.com`. An iframe's `src` is
     * a URL; the only part of it that decides who serves the frame is the
     * origin.
     */
    const isTrustedSource = (source: string): boolean =>
      trustedSources.some((trusted) => {
        if (trusted === source) return true;
        if (trusted === 'self' || trusted === 'same-origin') {
          // Relative URLs cannot leave the origin. `//evil.example` can — it
          // is protocol-relative and therefore absolute.
          return source.startsWith('/') && !source.startsWith('//');
        }
        const trustedOrigin = originOf(trusted);
        return trustedOrigin !== null && trustedOrigin === originOf(source);
      });

    /**
     * Check if this is frame-busting code — from the AST, not printed source.
     *
     * This used to lowercase the printed test and look for the substrings
     * `'top != self'`, `'top !== self'`, `'parent != self'`,
     * `'window.top !== window.self'`, `'top.location'` and `'self.location'`.
     * That is whitespace-sensitive — `top !=  self` and `top!==self` are the
     * same program and did not match — and it matched the same words appearing
     * in a string or a comment inside the test.
     */
    const isFrameBustingCode = (node: TSESTree.IfStatement): boolean =>
      isFrameBustingTest(node.test) || readsFrameLocation(node.test);

    /**
     * Check for transparent/invisible elements that could hide clickjacking
     *
     * `display: none` is deliberately NOT here. It is the OPPOSITE of the
     * thing this rule is about: a clickjacking overlay must be present in the
     * hit-test tree and merely invisible, so that it swallows the click meant
     * for what is underneath. A `display: none` element is removed from
     * layout and receives no clicks at all — it cannot overlay anything.
     * Having it in the set meant every hidden UI affordance read as an attack:
     * both corpus findings for this rule were Shopify/cli's GraphiQL
     * templates hiding a back button and an error bar —
     * packages/cli-kit/src/public/node/graphiql/templates/graphiql.tsx:71 and
     * .../unauthorized.tsx:112.
     */
    // oxlint-disable-next-line consistent-function-scoping
    const hasTransparentStyles = (styleText: string): boolean => {
      const declarations = cssDeclarations(styleText);
      if (!looksLikeCss(declarations)) return false;

      // Removed from layout entirely, so it receives no clicks and cannot
      // swallow one. See the note above: this is the OPPOSITE of an overlay.
      if (hasDeclaration(declarations, 'display', (v) => v === 'none')) {
        return false;
      }

      // INVISIBILITY is the signal, and it is the whole signal.
      //
      // `position: absolute; top: 0; left: 0` used to qualify on its own. That
      // is an ordinary full-bleed element — a hero, a scrim, a sticky header —
      // and describes far more benign layout than it does attacks. An overlay
      // is dangerous because it is present in the hit-test tree and INVISIBLE;
      // without invisibility there is nothing to report.
      return (
        // Fully transparent — `0`, `0.0`, `0%`. NOT `0.5`, which the old
        // substring test also matched, and NOT a fade-in on its way up.
        (hasDeclaration(declarations, 'opacity', (v) => /^0(?:\.0+)?%?$/.test(v)) &&
          !animatesProperty(declarations, 'opacity')) ||
        (hasDeclaration(declarations, 'visibility', (v) => v === 'hidden') &&
          !animatesProperty(declarations, 'visibility')) ||
        // Parked behind the page it covers.
        hasDeclaration(declarations, 'z-index', (v) => /^-\d+$/.test(v))
      );
    };

    return {
      // Check for frame-busting code
      IfStatement(node: TSESTree.IfStatement) {
        if (isFrameBustingCode(node)) {
          hasFrameBusting = true;
        }
      },

      // Check iframe elements (in JSX/TSX)
      JSXElement(node: TSESTree.JSXElement) {
        if (node.openingElement.name.type === 'JSXIdentifier') {
          const tag = node.openingElement.name.name;
          if (DOCUMENT_SHELL_TAGS.has(tag)) {
            buildsDocumentShell = true;
          }
        }

        if (
          node.openingElement.name.type === 'JSXIdentifier' &&
          node.openingElement.name.name === 'iframe'
        ) {
          // Check iframe attributes
          const attributes = node.openingElement.attributes;
          let hasSrc = false;
          let srcValue = '';

          for (const attr of attributes) {
            if (
              attr.type === 'JSXAttribute' &&
              attr.name.type === 'JSXIdentifier' &&
              attr.name.name === 'src' &&
              attr.value
            ) {
              hasSrc = true;
              if (
                attr.value.type === 'Literal' &&
                typeof attr.value.value === 'string'
              ) {
                srcValue = attr.value.value;
              } else if (
                // `<iframe src={EMBED_ORIGIN} />` — a configurable embed is
                // written this way, and reading only the inline literal meant
                // the rule saw the hard-coded ones and missed the ones a
                // deployment can point anywhere.
                attr.value.type === 'JSXExpressionContainer'
              ) {
                srcValue =
                  foldToString(attr.value.expression, sourceCode, 0) ?? '';
              }
            }
          }

          if (hasSrc && srcValue && !isTrustedSource(srcValue)) {
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node: node.openingElement,
              messageId: 'unsafeIframeUsage',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check for frame manipulation code
      MemberExpression(node: TSESTree.MemberExpression) {
        // Look for top.location or window.top manipulation.
        //
        // The receiver was required to be a bare Identifier, so
        // `window.top.location = url` — whose outer object is itself a
        // MemberExpression — matched nothing at either level: the outer node
        // was skipped for its shape, and the inner `window.top` found only a
        // MemberExpression above it, never the assignment. The `window.`
        // prefix is a spelling, not a protection.
        if (
          isFrameRef(node.object) &&
          !(node.object.type === 'Identifier' && node.object.name === 'self')
        ) {
          if (
            node.property.type === 'Identifier' &&
            (node.property.name === 'location' || node.property.name === 'top')
          ) {
            // Check if this is being assigned or compared
            let current: TSESTree.Node | undefined = node;
            let isFrameManipulation = false;

            // Walk up to see if this is an assignment or comparison. Every
            // path that sets `isFrameManipulation = true` is followed by
            // `break`, so the negation in the loop condition is redundant
            // (CodeQL: `js/useless-conditional`).
            while (current) {
              if (
                current.type === 'AssignmentExpression' &&
                current.left === node
              ) {
                isFrameManipulation = true;
                break;
              }
              if (
                current.type === 'BinaryExpression' &&
                (current.left === node || current.right === node)
              ) {
                // Comparison like top != self
                const operator = current.operator;
                if (
                  operator === '!=' ||
                  operator === '!==' ||
                  operator === '==' ||
                  operator === '==='
                ) {
                  // This might be frame-busting code
                  break;
                }
                isFrameManipulation = true;
                break;
              }
              current = current.parent as TSESTree.Node;
            }

            if (isFrameManipulation) {
              if (safetyChecker.isSafe(node, context)) {
                return;
              }

              // `top.location = self.location` inside `if (top != self)` is
              // frame-busting — the very remediation `requireFrameBusting`
              // asks for. Reporting it means the rule flags its own fix.
              if (insideFrameBustingGuard(node, sourceCode)) {
                return;
              }

              context.report({
                node,
                messageId: 'frameManipulation',
                data: {
                  filePath: filename,
                  line: String(node.loc?.start.line ?? 0),
                },
              });
            }
          }
        }
      },

      // Check for CSS that could hide clickjacking attacks
      Literal(node: TSESTree.Literal) {
        if (typeof node.value === 'string' && declaresFrameProtection(node.value)) {
          hasDeclaredFrameProtection = true;
        }
        if (typeof node.value === 'string' && detectTransparentOverlays) {
          // Whether this is CSS is decided by PARSING it — see looksLikeCss.
          const text = node.value.toLowerCase();

          if (hasTransparentStyles(text)) {
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'transparentFrameOverlay',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // Check template literals for CSS
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        // `raw`, not `cooked`: a tagged template with an invalid escape has no
        // cooked value at all, and a CSP directive carries no escapes anyway.
        if (node.quasis.some((q) => declaresFrameProtection(q.value.raw))) {
          hasDeclaredFrameProtection = true;
        }
        if (detectTransparentOverlays) {
          // The LITERAL chunks only. `sourceCode.getText(node)` would also
          // print the source of every `${…}` interpolation, so a variable
          // spelled `opacity_0` inside one read as a CSS declaration.
          const text = node.quasis
            .map((q) => q.value.raw)
            .join(' ')
            .toLowerCase();

          if (hasTransparentStyles(text)) {
            if (safetyChecker.isSafe(node, context)) {
              return;
            }

            context.report({
              node,
              messageId: 'transparentFrameOverlay',
              data: {
                filePath: filename,
                line: String(node.loc?.start.line ?? 0),
              },
            });
          }
        }
      },

      // At the end of the file, check if frame-busting is required but missing
      'Program:exit'() {
        // A file is only worth this question when it BUILDS THE DOCUMENT that
        // could be framed, and establishes no frame protection anywhere in it.
        if (
          requireFrameBusting &&
          buildsDocumentShell &&
          !hasFrameBusting &&
          !hasDeclaredFrameProtection
        ) {
          context.report({
            node: context.sourceCode.ast,
            messageId: 'missingFrameBusting',
            data: {
              filePath: filename,
              line: '1',
            },
          });
        }
      },
    };
  },
});
