/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require MIME type validation for uploads (CWE-434).
 *
 * ## What this rule used to do, and why it had to change
 *
 * Two detectors shipped, and in a BROWSER plugin neither of them worked:
 *
 * 1. `multer().single('file')` — server-side Express middleware, and matched
 *    only in the fully-inlined spelling. The idiomatic two-step
 *    `const upload = multer({ dest }); upload.single('file')` was QUIET, because
 *    the check required `callee.object` to be a `CallExpression`. That is how
 *    almost all real multer code is written. It also accepted a `limits`
 *    option as MIME validation — `limits: { fileSize }` caps how big a file may
 *    be and says nothing at all about its type — and a test asserted that
 *    silence as correct.
 *
 * 2. `upload(x)` — any call to a function *spelled* `upload` with a single
 *    identifier argument, reported at CWE-434 / CVSS 8.8. `await upload(file)`
 *    and `await upload(formData)` in any client codebase were findings. This is
 *    the repo's forbidden defect class (a rule deciding by a name) and it is
 *    removed rather than narrowed; a test asserted `upload(file)` as a true
 *    positive.
 *
 * Net effect: in the browser plugin this rule had ZERO coverage of any
 * client-side upload shape, and its only firing path was a name match.
 *
 * ## What it does now
 *
 * Three detectors, each resting on evidence rather than a spelling:
 *
 * - **`prefixMimeCheck`** — a MIME type tested with `startsWith` / `includes` /
 *   `indexOf` instead of compared for equality. This is the `image/svg+xml`
 *   bypass: an SVG passes `type.startsWith('image/')` and then executes script
 *   when it is served back. Evidence: the receiver is a `.type` read and the
 *   compared literal begins with a segment from the closed IANA top-level type
 *   registry. `node.type.startsWith('TS')` and Redux's
 *   `action.type.startsWith('user/')` do not match, because `TS` and `user` are
 *   not IANA top-level types.
 *
 * - **`missingMimeValidation`** — a function that demonstrably reads selected
 *   files (`.files[...]`, the `FileList` property of `HTMLInputElement` and
 *   `DataTransfer`) and demonstrably uploads them (`FormData#append`,
 *   `fetch(_, { body })`, `XMLHttpRequest#send`) while containing no MIME
 *   evidence whatsoever. The absence test is deliberately generous — any `.type`
 *   read, or any MIME-shaped literal anywhere in the function, suppresses it —
 *   because the cost of a false positive here is a maintainer who stops
 *   trusting the plugin.
 *
 * - **`violationDetected`** — multer without a `fileFilter`, now resolved
 *   through the binding, and no longer satisfied by `limits`.
 *
 * @see https://cwe.mitre.org/data/definitions/434.html
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  isModuleBinding,
  MessageIcons,
  namesOneOf,
  propertyName,
} from '@interlace/eslint-devkit';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';

import { resolveInitializer } from '../../utils/resolve-binding';

type MessageIds =
  'violationDetected' | 'prefixMimeCheck' | 'missingMimeValidation';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface -- Rule has no configurable options
export interface Options {}

type RuleOptions = [Options?];

/**
 * The IANA top-level media types. A closed registry, matched by exact
 * membership on the segment before the `/` — never a substring test.
 *
 * @see https://www.iana.org/assignments/media-types/media-types.xhtml
 *
 * @protocol-constant This is the IANA media-types registry, not a vocabulary.
 * RFC 6838 §4.2.7 fixes the set of top-level types, and a new one exists only
 * by IANA registration — it is not a judgement any consumer's domain can
 * reasonably disagree with. Editing it breaks the rule in both directions, and
 * the removing direction is the dangerous one: `image` is the top-level type
 * the `image/svg+xml` bypass lives under, so deleting that single entry
 * silences the detector on precisely the shape it was written to catch. Adding
 * an entry is incoherent rather than merely risky — an unregistered top-level
 * type is not a media type, so `value.type.startsWith('internal/')` is not a
 * MIME check and reporting it would be a false positive. This set is also the
 * sole evidence that a `.type` read belongs to the File API rather than to an
 * AST node or a Redux action, so a consumer who could edit it could re-open
 * both of those false positives at will.
 */
const IANA_TOP_LEVEL_TYPES: ReadonlySet<string> = new Set([
  'application',
  'audio',
  'example',
  'font',
  'haptics',
  'image',
  'message',
  'model',
  'multipart',
  'text',
  'video',
]);

/**
 * String tests that answer "does this CONTAIN" rather than "is this".
 *
 * @protocol-constant This is the `String.prototype` surface, closed by the
 * ECMAScript specification — these are every method the language offers for a
 * substring or pattern test, not a list of words anyone chose. The whole
 * finding is "a media type was tested by containment instead of equality", so
 * the set IS the definition of the defect. A consumer able to shorten it would
 * remove `startsWith` first, since that is the spelling their code uses, and
 * that single deletion turns off the `image/svg+xml` bypass detector while
 * leaving the rule apparently enabled. Lengthening it is equally wrong: any
 * method not on this list is not a containment test, so admitting one would
 * report equality checks as if they were prefix checks.
 */
const SUBSTRING_TESTS: ReadonlySet<string> = new Set([
  'startsWith',
  'endsWith',
  'includes',
  'indexOf',
  'lastIndexOf',
  'search',
  'match',
]);

/**
 * Multer's per-field middleware factories.
 *
 * @protocol-constant This is multer's own call signature — the five factories
 * its README documents — not a vocabulary of English words. The receiver is
 * separately resolved back through the binding to a real `multer()` call
 * before any name here is consulted, so the set narrows a proven multer object
 * rather than deciding what one is. That narrowing is what closed the original
 * false positive, where any `x.single(...)` in any codebase was reported as an
 * unrestricted upload; a consumer able to add entries could re-assert exactly
 * that bug, and one able to remove `single` or `array` would silence the two
 * spellings that carry essentially all real multer usage.
 */
const MULTER_FIELD_METHODS: ReadonlySet<string> = new Set([
  'single',
  'array',
  'fields',
  'any',
  'none',
]);

/** Is this literal a media type or a media-type prefix? */
function isMediaTypeLiteral(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.Literal) return false;
  if (typeof node.value !== 'string') return false;
  const slash = node.value.indexOf('/');
  if (slash <= 0) return false;
  return IANA_TOP_LEVEL_TYPES.has(node.value.slice(0, slash));
}

/** Is this expression a `.type` read — the File API's MIME property? */
function isTypeRead(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    // `file['type']` reads the same MIME type `file.type` reads.
    propertyName(node) === 'type'
  );
}

/** Is this expression a `.files` read — the `FileList` property? */
function isFilesRead(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    // `input['files']` is the same FileList.
    propertyName(node) === 'files'
  );
}

/** Depth-first walk over every child node, skipping the `parent` back-edge. */
function walk(node: TSESTree.Node, visit: (node: TSESTree.Node) => void): void {
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const value = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const child of value) if (isNode(child)) walk(child, visit);
    } else if (isNode(value)) {
      walk(value, visit);
    }
  }
}

function isNode(value: unknown): value is TSESTree.Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/**
 * The nearest enclosing function, or the Program at module level.
 *
 * Taken from the scope manager rather than walked by hand: `variableScope` is
 * by definition the nearest function or global scope, so there is no
 * "ran out of parents" fallback to write — and no unreachable branch left
 * behind pretending to be tested.
 */
function enclosingFunction(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): TSESTree.Node {
  return sourceCode.getScope(node).variableScope.block;
}

/**
 * Is this call an upload of a request body?
 *
 * `formData.append(name, value)`, `fetch(url, { body })`, `xhr.send(value)`.
 * Matched on the member/callee shape, never on what anything is called.
 */
function isUploadSink(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (
    callee.type === AST_NODE_TYPES.Identifier &&
    callee.name === 'fetch' &&
    node.arguments[1]?.type === AST_NODE_TYPES.ObjectExpression
  ) {
    return node.arguments[1].properties.some(
      (property) =>
        property.type === AST_NODE_TYPES.Property &&
        !property.computed &&
        property.key.type === AST_NODE_TYPES.Identifier &&
        property.key.name === 'body',
    );
  }
  if (callee.type === AST_NODE_TYPES.MemberExpression) {
    // `form['append'](k, file)` uploads the same unchecked file.
    const method = propertyName(callee);
    if (method === 'send') return node.arguments.length > 0;
    if (method === 'append') return node.arguments.length >= 2;
  }
  return false;
}

/**
 * The `multer(...)` call an expression resolves to, directly or through a
 * binding.
 *
 * `multer` must be the module's own export — resolved through the import or
 * `require`, not through a variable's spelling.
 */
function multerCall(
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  sourceCode: TSESLint.SourceCode,
): TSESTree.CallExpression | undefined {
  if (node.type === AST_NODE_TYPES.CallExpression) {
    return isModuleBinding(node.callee, scope, 'multer') ? node : undefined;
  }
  if (node.type === AST_NODE_TYPES.Identifier) {
    const init = resolveInitializer(node, sourceCode);
    return init === undefined ? undefined : multerCall(init, scope, sourceCode);
  }
  return undefined;
}

export const requireMimeTypeValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-mime-type-validation',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/require-mime-type-validation.md',
      description: 'Require MIME type validation for file uploads',
      cwe: 'CWE-434',
      cvss: 8.8,
    },
    messages: {
      violationDetected: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing MIME Validation',
        cwe: 'CWE-434',
        description:
          'File upload without MIME type validation - unrestricted upload vulnerability',
        severity: 'HIGH',
        fix: 'Add a fileFilter option that compares file.mimetype against an exact allowlist. A limits option caps file SIZE and validates no type.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/434.html',
      }),
      prefixMimeCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'MIME Type Checked by Prefix',
        cwe: 'CWE-434',
        description:
          'A media type tested with {{method}} rather than compared for equality. "image/svg+xml" satisfies a prefix test for "image/" and then executes script when the file is served back.',
        severity: 'HIGH',
        fix: 'Compare the type for exact equality against an allowlist: ALLOWED.has(file.type).',
        documentationLink: 'https://cwe.mitre.org/data/definitions/434.html',
      }),
      missingMimeValidation: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'File Uploaded Without MIME Validation',
        cwe: 'CWE-434',
        description:
          'Selected files are uploaded without any media-type check in this handler - unrestricted upload vulnerability.',
        severity: 'HIGH',
        fix: 'Compare file.type for exact equality against an allowlist before uploading. The accept attribute is a UI hint and is not enforced.',
        documentationLink: 'https://cwe.mitre.org/data/definitions/434.html',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    /** Functions already reported, so one handler yields one finding. */
    const reportedScopes = new Set<TSESTree.Node>();

    /**
     * Does this function contain any evidence of a media-type check?
     *
     * Deliberately generous: a `.type` read anywhere, or any media-type literal
     * anywhere, is enough. Under-reporting here costs recall; over-reporting
     * costs a maintainer's trust in the whole plugin, which costs all of it.
     */
    function hasMimeEvidence(scope: TSESTree.Node): boolean {
      let found = false;
      walk(scope, (node) => {
        if (found) return;
        if (isTypeRead(node) || isMediaTypeLiteral(node)) found = true;
      });
      return found;
    }

    /** Does this function read a `FileList`? */
    function readsSelectedFiles(scope: TSESTree.Node): boolean {
      let found = false;
      walk(scope, (node) => {
        if (found) return;
        if (isFilesRead(node)) found = true;
      });
      return found;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // ---- Detector 1: a media type tested by substring rather than equality.
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          namesOneOf(propertyName(callee), SUBSTRING_TESTS) &&
          isTypeRead(callee.object) &&
          node.arguments.some(isMediaTypeLiteral)
        ) {
          context.report({
            node,
            messageId: 'prefixMimeCheck',
            // The guard above resolved this name and found it in the set, so
            // the `null` arm here is unreachable. It stays visible in the type
            // rather than cast away: an unresolved name and an absent one are
            // different answers, and only one of them is reachable from here.
            data: { method: propertyName(callee) },
          });
          return;
        }

        // ---- Detector 2: multer without a fileFilter.
        if (
          callee.type === AST_NODE_TYPES.MemberExpression &&
          namesOneOf(propertyName(callee), MULTER_FIELD_METHODS)
        ) {
          const factory = multerCall(
            callee.object,
            sourceCode.getScope(node),
            sourceCode,
          );
          if (factory !== undefined) {
            const config = factory.arguments[0];
            const hasFileFilter =
              config?.type === AST_NODE_TYPES.ObjectExpression &&
              config.properties.some(
                (property) =>
                  property.type === AST_NODE_TYPES.Property &&
                  !property.computed &&
                  property.key.type === AST_NODE_TYPES.Identifier &&
                  // `limits` caps file SIZE. It is not a type check, and
                  // accepting it as one was a false negative asserted by a test.
                  property.key.name === 'fileFilter',
              );
            if (!hasFileFilter) {
              context.report({ node, messageId: 'violationDetected' });
            }
            return;
          }
        }

        // ---- Detector 3: selected files uploaded with no media-type evidence.
        if (!isUploadSink(node)) return;
        const scope = enclosingFunction(node, sourceCode);
        if (reportedScopes.has(scope)) return;
        if (!readsSelectedFiles(scope)) return;
        if (hasMimeEvidence(scope)) return;
        reportedScopes.add(scope);
        context.report({ node, messageId: 'missingMimeValidation' });
      },
    };
  },
});
