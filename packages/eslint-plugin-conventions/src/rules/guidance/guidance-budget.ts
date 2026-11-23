/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Keep always-loaded agent guidance and skills inside a size budget
 * @description Every byte of CLAUDE.md, AGENTS.md and GEMINI.md is read into
 * every session, before the task. A hand migration that moves rules into
 * hooks and lint rules regrows unless something holds the size; this rule is
 * that something.
 *
 * Budgets: an always-loaded file has `memoryBytes` and `memoryLines`; a skill
 * has `skillLines` for its body and `descriptionChars` for its frontmatter
 * description. A per-repo ratchet file can hold a larger budget for one file
 * (its size the day the rule was turned on) — and may only be lowered: when
 * the file shrinks below its ratchet entry, the rule asks for the entry to
 * follow it down.
 */

import * as path from 'node:path';

import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

import {
  frontmatter,
  guidanceKind,
  readIfExists,
  repoRelative,
} from '../../lib/guidance-files';
import { lineLoc } from '../../lib/report-loc';

type MessageIds = 'overBudget' | 'looseRatchet';

export interface GuidanceBudgetOptions {
  memoryBytes?: number;
  memoryLines?: number;
  skillLines?: number;
  descriptionChars?: number;
  /** Path, from the lint working directory, of the per-file ratchet JSON. */
  ratchetFile?: string;
}

type Measure = 'bytes' | 'lines' | 'descriptionChars';

/** `{ "CLAUDE.md": { "bytes": 6200, "lines": 140 } }` */
type Ratchet = Record<string, Partial<Record<Measure, number>>>;

const DOCS =
  'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-conventions/docs/rules/guidance-budget.md';

export const guidanceBudget = createRule<[GuidanceBudgetOptions], MessageIds>({
  name: 'guidance-budget',
  meta: {
    interop: { runtimes: ['eslint'] },
    type: 'suggestion',
    docs: {
      url: DOCS,
      description:
        'Keep always-loaded agent guidance (CLAUDE.md, AGENTS.md) and skills inside a ratcheted size budget',
    },
    messages: {
      overBudget: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Guidance Over Budget',
        description:
          'This {{kind}} file is {{actual}} {{measure}}, over its budget of {{budget}}',
        severity: 'MEDIUM',
        fix: 'Move what a tool can enforce into a lint rule, hook or lock test and delete the line; move procedures into a skill; link to docs instead of restating them. Raise a budget only by decision.',
        documentationLink: DOCS,
      }),
      looseRatchet: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Guidance Ratchet Can Tighten',
        description:
          'This file is {{actual}} {{measure}} and its ratchet entry still allows {{budget}}',
        severity: 'LOW',
        fix: 'Lower the entry for {{file}} in {{ratchetFile}} to {{actual}} so the space cannot be refilled.',
        documentationLink: DOCS,
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          memoryBytes: { type: 'integer', minimum: 1 },
          memoryLines: { type: 'integer', minimum: 1 },
          skillLines: { type: 'integer', minimum: 1 },
          descriptionChars: { type: 'integer', minimum: 1 },
          ratchetFile: { type: 'string' },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      memoryBytes: 4096,
      memoryLines: 200,
      skillLines: 500,
      descriptionChars: 1024,
      ratchetFile: '.guidance-budget.json',
    },
  ],
  createOnce(context, options) {
    return {
      before() {
        return guidanceKind(context.filename) !== null;
      },
      root(): void {
        const kind = guidanceKind(context.filename);
        const [opts] = options();
        const ratchetFile = opts.ratchetFile as string;
        const ratchet = readRatchet(path.resolve(context.cwd, ratchetFile));
        const file = repoRelative(context.cwd, context.filename);
        const entry = ratchet[file] ?? {};
        const text = context.sourceCode.text;
        const lines = text.split('\n');

        const measured: [Measure, number, number, number][] = [];
        if (kind === 'memory') {
          measured.push([
            'bytes',
            Buffer.byteLength(text, 'utf8'),
            opts.memoryBytes as number,
            1,
          ]);
          measured.push(['lines', lines.length, opts.memoryLines as number, 1]);
        } else {
          const front = frontmatter(lines);
          const bodyLines = lines.length - (front?.endLine ?? 0);
          measured.push(['lines', bodyLines, opts.skillLines as number, 1]);
          const description = front?.keys.get('description');
          if (description !== undefined) {
            measured.push([
              'descriptionChars',
              description.length,
              opts.descriptionChars as number,
              lineOf(lines, 'description:'),
            ]);
          }
        }

        for (const [measure, actual, fallback, line] of measured) {
          const ratcheted = entry[measure];
          const budget = ratcheted ?? fallback;
          const data = {
            kind: kind as string,
            measure,
            actual: String(actual),
            budget: String(budget),
            file,
            ratchetFile,
          };
          const loc = lineLoc(line, lines[line - 1]);
          if (actual > budget) {
            context.report({ loc, messageId: 'overBudget', data });
          } else if (
            ratcheted !== undefined &&
            ratcheted > fallback &&
            actual < ratcheted
          ) {
            context.report({ loc, messageId: 'looseRatchet', data });
          }
        }
      },
    };
  },
});

function lineOf(lines: readonly string[], prefix: string): number {
  return lines.findIndex((l) => l.startsWith(prefix)) + 1;
}

const MEASURES: ReadonlySet<string> = new Set([
  'bytes',
  'lines',
  'descriptionChars',
]);

function readRatchet(file: string): Ratchet {
  const text = readIfExists(file);
  if (text === null) return {};
  const fail = (why: string): never => {
    // A bare error from inside a rule names neither the file nor the fix.
    throw new Error(
      `guidance-budget: ${file} ${why}. fix: repair it, or delete it to fall back to the default budgets.`,
    );
  };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    fail(`is not valid JSON (${(error as Error).message})`);
  }
  if (!isObject(parsed)) fail('is not a JSON object of file entries');
  for (const [entryFile, entry] of Object.entries(parsed as object)) {
    if (!isObject(entry)) fail(`has a non-object entry for ${entryFile}`);
    for (const [measure, value] of Object.entries(entry as object)) {
      // A string or negative budget would compare false both ways and
      // silently switch the check off.
      if (!MEASURES.has(measure) || !Number.isInteger(value) || value < 0) {
        fail(
          `has ${entryFile}.${measure} = ${JSON.stringify(value)}; each entry holds bytes, lines or descriptionChars as a whole number`,
        );
      }
    }
  }
  return parsed as Ratchet;
}

function isObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
