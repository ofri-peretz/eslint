/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Disallow the same guidance line in two always-loaded files of one repo
 * @description CLAUDE.md, AGENTS.md and GEMINI.md in one directory chain are
 * loaded together. A rule written in two of them is paid for twice on every
 * session — and when one copy is edited, the two disagree.
 *
 * Compares this file's prose lines (normalised: list marker, emphasis and
 * whitespace removed, case folded, at least `minLength` characters) with the
 * always-loaded files in the same directory and every ancestor up to the
 * lint working directory. The copy in the file whose path sorts later is the
 * one reported, so each duplicate is reported once.
 */

import * as path from 'node:path';

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

import {
  guidanceKind,
  proseLines,
  readIfExists,
  repoRelative,
} from '../../lib/guidance-files';
import { lineLoc } from '../../lib/report-loc';

type MessageIds = 'duplicated';

const MEMORY_NAMES = ['AGENTS.md', 'CLAUDE.md', 'CLAUDE.local.md', 'GEMINI.md'];

const DOCS =
  'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/no-duplicated-guidance.md';

export function normalizeGuidance(text: string): string {
  return text
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export const noDuplicatedGuidance = createRule<
  [{ minLength?: number }],
  MessageIds
>({
  name: 'no-duplicated-guidance',
  meta: {
    interop: { runtimes: ['eslint'] },
    type: 'suggestion',
    docs: {
      url: DOCS,
      description:
        'Disallow the same guidance line in two always-loaded agent files (CLAUDE.md, AGENTS.md, GEMINI.md) of one repo',
    },
    messages: {
      duplicated: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Duplicated Guidance',
        description:
          'This line also appears in {{other}}:{{otherLine}}, which is loaded in the same sessions',
        severity: 'LOW',
        fix: 'Keep the line in one file and delete it here. If this file must stand alone, import the other (`@AGENTS.md`) instead of copying from it.',
        documentationLink: DOCS,
      }),
    },
    schema: [
      {
        type: 'object',
        properties: { minLength: { type: 'integer', minimum: 1 } },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ minLength: 40 }],
  createOnce(context, options) {
    return {
      before() {
        return guidanceKind(context.filename) === 'memory';
      },
      root(): void {
        const minLength = options()[0].minLength as number;
        const self = path.resolve(context.filename);
        const selfKey = repoRelative(context.cwd, self);
        const seen = new Map<string, { file: string; line: number }>();
        for (const other of companions(self, context.cwd)) {
          const otherKey = repoRelative(context.cwd, other);
          // Report only the copy whose path sorts later.
          if (otherKey > selfKey) continue;
          const text = readIfExists(other);
          if (text === null) continue;
          for (const { line, text: lineText } of proseLines(text.split('\n'))) {
            const key = normalizeGuidance(lineText);
            if (key.length < minLength || seen.has(key)) continue;
            seen.set(key, { file: otherKey, line });
          }
        }
        const lines = context.sourceCode.text.split('\n');
        for (const { line, text } of proseLines(lines)) {
          const match = seen.get(normalizeGuidance(text));
          if (!match) continue;
          context.report({
            loc: lineLoc(line, text),
            messageId: 'duplicated',
            data: { other: match.file, otherLine: String(match.line) },
          });
        }
      },
    };
  },
});

/** Always-loaded files in `file`'s directory and each ancestor up to `cwd`. */
function companions(file: string, cwd: string): string[] {
  const found: string[] = [];
  const root = path.resolve(cwd);
  let dir = path.dirname(file);
  for (;;) {
    for (const name of MEMORY_NAMES) {
      const candidate = path.join(dir, name);
      if (candidate !== file) found.push(candidate);
    }
    if (dir === root || !dir.startsWith(root + path.sep)) break;
    dir = path.dirname(dir);
  }
  return found;
}
