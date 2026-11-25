/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Ask of every never/always line in agent guidance: which tool enforces it?
 * @description "For every rule, ask: can a tool check this?" A line like
 * "IMPORTANT: never `--no-verify`" names something a hook or a lint rule could
 * hold. Written only in prose, it holds nothing the day the model forgets it —
 * and in a repo with no git hooks it guards nothing at all.
 *
 * Reports an imperative line (`never`, `always`, `must`, `do not`, `don't`,
 * `IMPORTANT`) that names something checkable — an inline-code span, a CLI
 * flag or a file path:
 *
 * - with no link to the rule, hook, lock test or gate that enforces it
 *   (`unenforced`): build the lever, then link it or drop the line;
 * - with such a link (`removable`): the tool already enforces it, so the
 *   always-loaded line is a duplicate the model pays for on every session.
 *
 * Code decides the facts (imperative, checkable target, link present); whether
 * a line is worth its bytes stays a person's call.
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

import {
  guidanceKind,
  isGenerated,
  proseLines,
} from '../../lib/guidance-files';
import { lineLoc } from '../../lib/report-loc';

type MessageIds = 'unenforced' | 'removable';

/**
 * An imperative in command position: after a clause break (`.`, `;`, `:`,
 * `—`, `(`), or — capitalised — at the start of a line or list item; or a
 * modal with a named actor (`you must`, `agents must not`). A `never` in the
 * middle of a description ("the label never receives it"), or a lowercase
 * `always` that only starts a line because the paragraph wrapped, is not a
 * rule.
 */
const EMPHASIS = String.raw`(?:\*\*|__|_|\*)?`;
const IMPERATIVE = new RegExp(
  [
    String.raw`[.;:!?(—–]\s*${EMPHASIS}(?:IMPORTANT|NEVER|ALWAYS|MUST|[Nn]ever|[Aa]lways|[Dd]o not|[Dd]on't|[Mm]ust not)\b`,
    String.raw`^\s*(?:(?:[-*+]|\d+[.)])\s+)?${EMPHASIS}(?:IMPORTANT|NEVER|ALWAYS|MUST|Never|Always|Do not|Don't|Must not)\b`,
    String.raw`\b(?:[Yy]ou|[Aa]gents?|Claude|[Ww]e)\s+(?:must|should never|must not|may not)\b`,
  ].join('|'),
);
const CHECKABLE =
  /`[^`]+`|(?:^|\s)--[a-z][\w-]+|\b[\w.-]+\.(?:json|jsonc|ya?ml|[cm]?[jt]sx?|toml|sh|lock)\b/;
const LINK = /\[[^\]]*\]\(([^)\s]+)[^)]*\)/g;
const LEVER =
  /(?:eslint|oxlint|lint|lefthook|husky|hooks?\b|hooks\/|pre-commit|pre-push|\.test\.|\.spec\.|lock|gate|\.github\/workflows|rules\/|settings\.json|commitlint)/i;

const DOCS =
  'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/enforced-rule-in-prose.md';

export const enforcedRuleInProse = createRule<[], MessageIds>({
  name: 'enforced-rule-in-prose',
  meta: {
    interop: { runtimes: ['eslint'] },
    type: 'suggestion',
    docs: {
      url: DOCS,
      description:
        'Report never/always lines in agent guidance that a tool could enforce, unlinked to the tool that does',
    },
    messages: {
      unenforced: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Rule Held Only by Prose',
        description:
          'An imperative guidance line names something a tool could check, and links no rule, hook, lock test or gate that enforces it',
        severity: 'MEDIUM',
        fix: 'Enforce it with a tool — a lint rule, a lefthook or Claude Code hook, a lock test or a CI gate — then link that lever from this line or delete the line. If no tool can check it, reword it without the checkable target.',
        documentationLink: DOCS,
      }),
      removable: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Rule Already Enforced by a Tool',
        description:
          'This imperative line links the tool that enforces it, so the tool holds the rule and the always-loaded line repeats it',
        severity: 'LOW',
        fix: 'Delete the line; the linked lever reports the violation with its own fix. Keep it only if the line says something the tool output does not.',
        documentationLink: DOCS,
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      before() {
        return guidanceKind(context.filename) !== null;
      },
      root(): void {
        const lines = context.sourceCode.text.split('\n');
        // A generated file is fixed in its generator, not here.
        if (isGenerated(lines)) return;
        for (const { line, text } of proseLines(lines)) {
          if (!IMPERATIVE.test(text)) continue;
          const withoutLinks = text.replace(LINK, ' ');
          if (!CHECKABLE.test(withoutLinks)) continue;
          const targets = [...text.matchAll(LINK)].map((m) => m[1]);
          context.report({
            loc: lineLoc(line, text),
            messageId: targets.some((t) => LEVER.test(t))
              ? 'removable'
              : 'unenforced',
          });
        }
      },
    };
  },
});
