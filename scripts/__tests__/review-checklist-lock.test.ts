/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The Claude reviewer gets judgment work only.
 *
 * REVIEW.md promises that CI shows the reviewer just the checklist items whose
 * triggers fire on the diff, read from the base branch. Until this lock, no
 * step did that: the prompt was a generic list that asked the model to redo
 * work programs already gate (missing tests, README drift). These assertions
 * fail if the triggered list stops reaching the prompt, if the checklist is
 * read from the PR instead of the base, or if the "programs already judge
 * this" boundary is dropped from the prompt.
 *
 * It also holds the secrets deny list in .claude/settings.json: "never read
 * .env" is a permission rule, not a sentence.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const WORKFLOW = readFileSync(
  join(ROOT, '.github/workflows/claude-code-review.yml'),
  'utf8',
);

describe('claude-code-review.yml hands the reviewer the triggered checklist', () => {
  const checklistAt = WORKFLOW.indexOf('id: checklist');
  const reviewAt = WORKFLOW.indexOf('uses: anthropics/claude-code-action');

  it('runs triggerlist match against the base branch before the review', () => {
    expect(checklistAt, 'no `id: checklist` step').toBeGreaterThan(-1);
    expect(checklistAt).toBeLessThan(reviewAt);
    expect(WORKFLOW).toMatch(/triggerlist@[\d.]+ match "origin\/\$BASE_REF"/);
  });

  it('reads the checklist from the base branch, not the PR', () => {
    expect(WORKFLOW).toMatch(
      /git checkout "origin\/\$BASE_REF" -- \.sdlc\/checklist\.yaml/,
    );
  });

  it('fetches enough history for a base...HEAD diff', () => {
    expect(WORKFLOW).toMatch(/fetch-depth: 0/);
  });

  it('puts the triggered items into the prompt', () => {
    const prompt = WORKFLOW.slice(WORKFLOW.indexOf('prompt: |'));
    expect(prompt).toContain('${{ steps.checklist.outputs.items }}');
  });

  it('reserves path:line citations for findings, which the hit-rate script counts', () => {
    expect(WORKFLOW).toContain('ONLY for a finding, never to confirm');
  });

  it('tells the reviewer not to repeat what programs already gate', () => {
    expect(WORKFLOW).toContain('Report nothing');
    expect(WORKFLOW).toContain('one of them would report');
  });
});

describe('.claude/settings.json', () => {
  const text = readFileSync(join(ROOT, '.claude/settings.json'), 'utf8');
  const settings = JSON.parse(text) as {
    permissions?: { allow?: string[]; deny?: string[] };
  };

  // JSON.parse keeps the LAST of two equal keys without a word. A merge of main into PR 1795
  // left two top-level "permissions" blocks: the second (allow only) silently dropped the
  // deny list, for Claude Code as much as for this test.
  it('has each top-level key once', () => {
    const topLevel = [...text.matchAll(/^ {2}"([^"]+)":/gm)].map((m) => m[1]);
    expect(topLevel.length).toBe(new Set(topLevel).size);
  });

  it.each(['Read(./.env)', 'Read(./.env.local)', 'Read(./**/.env)'])(
    'denies %s',
    (rule) => {
      expect(settings.permissions?.deny ?? []).toContain(rule);
    },
  );
});
