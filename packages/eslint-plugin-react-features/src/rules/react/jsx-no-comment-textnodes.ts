/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: jsx-no-comment-textnodes
 * A comment written between tags renders as text; it belongs in braces.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'putCommentInBraces';

/** A line that starts with `//` or `/*`: it will be rendered as text. */
const COMMENT_LIKE = /^\s*\/(\/|\*)/m;

export const jsxNoCommentTextnodes = createRule<[], MessageIds>({
  name: 'jsx-no-comment-textnodes',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/jsx-no-comment-textnodes.md',
      description: 'Disallow comments from being inserted as text nodes',
    },
    schema: [],
    messages: {
      putCommentInBraces: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Comment Rendered as Text',
        description:
          'Comments inside children section of tag should be placed inside braces',
        severity: 'MEDIUM',
        fix: 'Wrap the comment in braces: {/* comment */}',
        documentationLink:
          'https://react.dev/learn/writing-markup-with-jsx#jsx-curly-braces',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, []>) {
    function check(node: TSESTree.JSXText | TSESTree.Literal): void {
      // The raw source: some parsers give a wrong `raw` on text nodes.
      if (!COMMENT_LIKE.test(context.sourceCode.getText(node))) return;
      const parent = node.parent;
      // Children of an element or fragment, not an attribute value or a braced expression
      if (
        parent.type !== 'JSXAttribute' &&
        parent.type !== 'JSXExpressionContainer' &&
        parent.type.includes('JSX')
      ) {
        context.report({ node, messageId: 'putCommentInBraces' });
      }
    }

    return { Literal: check, JSXText: check };
  },
});
