/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: dynamic-import-chunkname
 * Enforce a leading comment with the webpackChunkName for dynamic imports
 *
 * @see https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/dynamic-import-chunkname.md
 */
import type { TSESTree, TSESLint } from '@interlace/eslint-devkit';
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  staticString,
} from '@interlace/eslint-devkit';

type MessageIds =
  | 'missingChunkName'
  | 'invalidChunkName'
  | 'invalidMagicComment'
  | 'suggestChunkName';

export interface Options {
  /** Import functions to check (defaults to just dynamic import) */
  importFunctions?: string[];
  /** Allowed prefixes for chunk names */
  allowEmpty?: boolean;
  /** Pattern to validate chunk name (regex string) */
  webpackChunknameFormat?: string;
}

type RuleOptions = [Options?];

/**
 * webpack's chunk name characters, plus its `[request]` and `[index]`
 * placeholders (`webpackChunkName: "[request]"` names each chunk after the
 * module it loads).
 */
const DEFAULT_FORMAT = '([0-9a-zA-Z-_/.]|\\[(request|index)\\])+';

/**
 * webpack's test for a magic comment: a `webpackXxx:` key anywhere in it.
 *
 * @vocabulary webpack — lib/javascript/JavascriptParser.js `webpackCommentRegExp`
 */
const MAGIC_COMMENT = /(?:^|\W)webpack[A-Z][A-Za-z]+:/;

type MagicValue =
  | { kind: 'string'; value: string }
  | { kind: 'number' | 'boolean' | 'null' | 'regexp' }
  | { kind: 'array'; items: MagicValue[] };

/**
 * webpack reads a magic comment as the body of an object literal
 * (`({ <comment> })`). One it cannot read is dropped with a warning, and
 * every option in it with it, the chunk name included. This reads the
 * literal values webpack's options take - strings, numbers, booleans,
 * `null`, regular expressions and arrays of those - and returns the
 * entries, or `null` when the text is not such a body.
 */
function readMagicComment(text: string): Map<string, MagicValue> | null {
  const entries = new Map<string, MagicValue>();
  let i = 0;
  const space = () => {
    while (i < text.length && /\s/.test(text[i])) i++;
  };
  const match = (re: RegExp): string | null => {
    re.lastIndex = i;
    const m = re.exec(text);
    if (!m) return null;
    i = re.lastIndex;
    return m[0];
  };
  const STRING = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/y;
  const value = (): MagicValue | null => {
    space();
    const string = match(STRING);
    if (string !== null) return { kind: 'string', value: string.slice(1, -1) };
    // A template literal with no substitution is a string to webpack too.
    const template = match(/`(?:[^`\\$]|\\.|\$(?!\{))*`/y);
    if (template !== null)
      return { kind: 'string', value: template.slice(1, -1) };
    if (match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?![\w$])/iy) !== null)
      return { kind: 'number' };
    const word = match(/(?:true|false|null|undefined)(?![\w$])/y);
    if (word !== null)
      return { kind: word === 'true' || word === 'false' ? 'boolean' : 'null' };
    if (
      match(/\/(?![*/])(?:[^/\\\n[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[a-z]*/y) !==
      null
    )
      return { kind: 'regexp' };
    if (text[i] !== '[') return null;
    i++;
    const items: MagicValue[] = [];
    for (;;) {
      space();
      if (text[i] === ']') break;
      const item = value();
      if (item === null) return null;
      items.push(item);
      space();
      if (text[i] === ',') i++;
      else if (text[i] !== ']') return null;
    }
    i++;
    return { kind: 'array', items };
  };
  for (;;) {
    space();
    if (i === text.length) return entries;
    const key = match(/[A-Za-z_$][\w$]*/y) ?? match(STRING);
    if (key === null) return null;
    space();
    if (text[i] !== ':') return null;
    i++;
    const v = value();
    if (v === null) return null;
    entries.set(key.replace(/^["']|["']$/g, ''), v);
    space();
    if (i === text.length) return entries;
    if (text[i] !== ',') return null;
    i++;
  }
}

/**
 * What webpack accepts for each option it documents; it ignores, with a
 * warning, a value of another type. An option not listed here is not judged.
 *
 * @vocabulary webpack — https://webpack.js.org/api/module-methods/#magic-comments
 */
const MAGIC_OPTIONS: Record<string, (v: MagicValue) => boolean> = {
  webpackChunkName: (v) => v.kind === 'string',
  webpackPrefetch: (v) => v.kind === 'boolean' || v.kind === 'number',
  webpackPreload: (v) => v.kind === 'boolean' || v.kind === 'number',
  webpackIgnore: (v) => v.kind === 'boolean',
  webpackInclude: (v) => v.kind === 'regexp',
  webpackExclude: (v) => v.kind === 'regexp',
  webpackMode: (v) =>
    v.kind === 'string' &&
    ['lazy', 'lazy-once', 'eager', 'weak'].includes(v.value),
  webpackExports: (v) =>
    v.kind === 'string' ||
    (v.kind === 'array' && v.items.every((item) => item.kind === 'string')),
};

export const dynamicImportChunkname = createRule<RuleOptions, MessageIds>({
  name: 'dynamic-import-chunkname',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-import-next/docs/rules/dynamic-import-chunkname.md',
      description:
        'Enforce a leading comment with the webpackChunkName for dynamic imports',
      cwe: 'CWE-1078',
      cvss: 2.5,
    },
    hasSuggestions: true,
    messages: {
      missingChunkName: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Missing Chunk Name',
        cwe: 'CWE-1078',
        // CWE-1078's generic score is 5.3 (MEDIUM). A chunk-naming slip is
        // hygiene, not a vulnerability, so the score stated here is the one
        // in meta.docs and agrees with the LOW label.
        cvss: 2.5,
        description: 'Dynamic import is missing webpackChunkName comment',
        severity: 'LOW',
        fix: 'Add /* webpackChunkName: "chunk-name" */ before the import path',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/dynamic-import-chunkname.md',
      }),
      invalidChunkName: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Invalid Chunk Name',
        cwe: 'CWE-1078',
        cvss: 2.5,
        description: 'webpackChunkName "{{chunkName}}" does not match pattern',
        severity: 'LOW',
        fix: 'Update chunk name to match the required pattern',
        documentationLink:
          'https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/dynamic-import-chunkname.md',
      }),
      invalidMagicComment: formatLLMMessage({
        icon: MessageIcons.ARCHITECTURE,
        issueName: 'Unreadable Magic Comment',
        cwe: 'CWE-1078',
        cvss: 2.5,
        description:
          'webpack cannot read this magic comment, so it drops it and the chunk name with it',
        severity: 'LOW',
        fix: 'Write the comment as an object body webpack can read: /* webpackChunkName: "name", webpackMode: "lazy" */',
        documentationLink:
          'https://webpack.js.org/api/module-methods/#magic-comments',
      }),
      suggestChunkName: 'Add webpackChunkName comment',
    },
    schema: [
      {
        type: 'object',
        properties: {
          importFunctions: {
            type: 'array',
            items: { type: 'string' },
          },
          allowEmpty: { type: 'boolean', default: false },
          webpackChunknameFormat: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      importFunctions: [],
      allowEmpty: false,
      webpackChunknameFormat: DEFAULT_FORMAT,
    },
  ],

  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    let allowEmpty: boolean;
    let importFunctions: string[];
    let webpackChunknameFormat: string;
    let chunkNamePattern: RegExp;
    let sourceCode: Readonly<TSESLint.SourceCode>;

    function checkChunkName(
      node: TSESTree.ImportExpression | TSESTree.CallExpression,
      source: TSESTree.Node,
    ) {
      // The magic comments sit inside the call, before the module argument.
      const comments = sourceCode.getCommentsBefore(source);

      let foundChunkName: string | null = null;
      let hasWebpackComment = false;
      let eager = false;

      for (const comment of comments) {
        if (!MAGIC_COMMENT.test(comment.value)) continue;
        // A comment webpack cannot read names no chunk; neither does a
        // known option whose value webpack ignores.
        const entries = readMagicComment(comment.value);
        const invalid =
          entries === null ||
          [...entries].some(
            ([key, value]) =>
              Object.hasOwn(MAGIC_OPTIONS, key) && !MAGIC_OPTIONS[key](value),
          );
        if (invalid) {
          context.report({ node, messageId: 'invalidMagicComment' });
          return;
        }
        // Both were checked to be strings above.
        const mode = entries.get('webpackMode') as
          { value: string } | undefined;
        if (mode?.value === 'eager') eager = true;
        const name = entries.get('webpackChunkName') as
          { value: string } | undefined;
        if (name && !hasWebpackComment) {
          hasWebpackComment = true;
          foundChunkName = name.value;
        }
      }

      // `webpackMode: "eager"` keeps the module in the parent chunk: there
      // is no chunk to name.
      if (eager) return;

      if (!hasWebpackComment) {
        if (!allowEmpty) {
          context.report({
            node,
            messageId: 'missingChunkName',
            suggest: [
              {
                messageId: 'suggestChunkName',
                fix(fixer: TSESLint.RuleFixer) {
                  // Generate a chunk name from the import path
                  const staticText = staticString(source);
                  if (staticText !== null) {
                    const chunkName =
                      staticText
                        .split('/')
                        .pop()
                        ?.replace(/[^a-zA-Z0-9-_]/g, '-') || 'chunk';
                    return fixer.insertTextBefore(
                      source,
                      `/* webpackChunkName: "${chunkName}" */ `,
                    );
                  }
                  return null;
                },
              },
            ],
          });
        }
      } else if (!chunkNamePattern.test(foundChunkName as string)) {
        context.report({
          node,
          messageId: 'invalidChunkName',
          data: { chunkName: foundChunkName },
        });
      }
    }

    return {
      before() {
        const options = context.options[0] || {};
        ({
          allowEmpty = false,
          importFunctions = [],
          webpackChunknameFormat = DEFAULT_FORMAT,
        } = options);
        chunkNamePattern = new RegExp(`^${webpackChunknameFormat}$`);
        sourceCode = context.sourceCode;
      },
      ImportExpression(node: TSESTree.ImportExpression) {
        checkChunkName(node, node.source);
      },
      // `importFunctions`: calls the user declares to be dynamic imports.
      CallExpression(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'Identifier' &&
          importFunctions.includes(node.callee.name) &&
          node.arguments.length > 0
        ) {
          checkChunkName(node, node.arguments[0]);
        }
      },
    };
  },
});
