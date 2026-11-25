/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Every subagent declares its model and its tool allowlist
 * @description A subagent with no `model:` inherits the parent's — usually
 * the most expensive one, for a task picked precisely because it was narrow.
 * One with no `tools:` inherits every tool, including the ones that write.
 * Both are one frontmatter line each. A subagent whose tools are not known in
 * advance (connected MCP tools) may instead deny the built-ins that write:
 * `disallowedTools` naming Edit, Write and Bash.
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

import { frontmatter, guidanceKind } from '../../lib/guidance-files';
import { lineLoc } from '../../lib/report-loc';

type MessageIds = 'missingKey';

/** The built-in tools that change files or run commands. */
const WRITE_TOOLS = ['Edit', 'Write', 'Bash'] as const;

/** True when a `disallowedTools` value denies every built-in tool that writes. */
function deniesWrites(value: string | undefined): boolean {
  if (!value) return false;
  const denied = new Set(value.split(/[\s,[\]"']+/).filter(Boolean));
  return WRITE_TOOLS.every((tool) => denied.has(tool));
}

const DOCS =
  'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/subagent-declares-model.md';

export const subagentDeclaresModel = createRule<[], MessageIds>({
  name: 'subagent-declares-model',
  meta: {
    interop: { runtimes: ['eslint'] },
    type: 'suggestion',
    docs: {
      url: DOCS,
      description:
        'Require every .claude/agents/*.md subagent to declare a model and a tool allowlist in its frontmatter',
    },
    messages: {
      missingKey: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Subagent Without {{key}}',
        description:
          'This subagent has no `{{key}}:` in its frontmatter, so it inherits {{inherits}}',
        severity: 'MEDIUM',
        fix: '{{fix}}',
        documentationLink: DOCS,
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context) {
    return {
      before() {
        return guidanceKind(context.filename) === 'agent';
      },
      root(): void {
        const lines = context.sourceCode.text.split('\n');
        const keys = frontmatter(lines)?.keys ?? new Map<string, string>();
        const loc = lineLoc(1, lines[0]);
        if (!keys.get('model')) {
          context.report({
            loc,
            messageId: 'missingKey',
            data: {
              key: 'model',
              inherits: "the parent session's model",
              fix: 'Add `model: haiku` (or sonnet / opus) to the frontmatter: the cheapest model that does the narrow task well.',
            },
          });
        }
        if (!keys.get('tools') && !deniesWrites(keys.get('disallowedTools'))) {
          context.report({
            loc,
            messageId: 'missingKey',
            data: {
              key: 'tools',
              inherits: 'every tool, including the ones that write',
              fix: 'Add `tools: Read, Grep, Glob` (the tools the task needs, and no more) to the frontmatter, or, when its tools are not known in advance (MCP), `disallowedTools: Edit, Write, Bash`.',
            },
          });
        }
      },
    };
  },
});
