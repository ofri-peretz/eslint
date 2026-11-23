/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Move long numbered procedures out of always-loaded guidance into a skill
 * @description A procedure is needed when its task runs; CLAUDE.md and
 * AGENTS.md are read on every session. A numbered list longer than
 * `maxSteps` in an always-loaded file is a skill paying rent in the wrong
 * place.
 */

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

import { guidanceKind, proseLines } from '../../lib/guidance-files';
import { lineLoc } from '../../lib/report-loc';

type MessageIds = 'procedureInMemory';

const STEP = /^(\s{0,3})\d{1,3}[.)]\s+\S/;

const DOCS =
  'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/procedure-in-memory.md';

export const procedureInMemory = createRule<
  [{ maxSteps?: number }],
  MessageIds
>({
  name: 'procedure-in-memory',
  meta: {
    interop: { runtimes: ['eslint'] },
    type: 'suggestion',
    docs: {
      url: DOCS,
      description:
        'Disallow long numbered procedures in always-loaded agent guidance; move them to a skill',
    },
    messages: {
      procedureInMemory: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Procedure in Always-Loaded Guidance',
        description:
          'A {{steps}}-step numbered procedure sits in a file read on every session (limit {{maxSteps}})',
        severity: 'LOW',
        fix: 'Move the procedure into a skill (.claude/skills/<name>/SKILL.md) whose description names when it applies, and leave at most a one-line pointer here.',
        documentationLink: DOCS,
      }),
    },
    schema: [
      {
        type: 'object',
        properties: { maxSteps: { type: 'integer', minimum: 1 } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ maxSteps: 5 }],
  createOnce(context, options) {
    return {
      before() {
        return guidanceKind(context.filename) === 'memory';
      },
      root(): void {
        const maxSteps = options()[0].maxSteps as number;
        const lines = context.sourceCode.text.split('\n');
        // A list is a run of top-level numbered items; blank lines and
        // indented continuation lines do not end it, any other line does.
        let first: { line: number; text: string } | null = null;
        let steps = 0;
        const flush = (): void => {
          if (first && steps > maxSteps) {
            context.report({
              loc: lineLoc(first.line, first.text),
              messageId: 'procedureInMemory',
              data: { steps: String(steps), maxSteps: String(maxSteps) },
            });
          }
          first = null;
          steps = 0;
        };
        for (const prose of proseLines(lines)) {
          if (STEP.test(prose.text)) {
            first ??= prose;
            steps++;
          } else if (!(
            prose.text.trim() === '' || /^\s{2,}\S/.test(prose.text)
          )) {
            flush();
          }
        }
        flush();
      },
    };
  },
});
