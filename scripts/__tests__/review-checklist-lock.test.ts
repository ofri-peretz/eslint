/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @provenBy {"file":".coderabbit.yaml","find":"    - '!apps/docs/src/data/**'\n","replace":""}
 * @provenBy {"file":".github/workflows/claude-code-review.yml","find":"one of them would report","replace":"one of them flags"}
 */

/**
 * The Claude reviewer gets judgment work only.
 *
 * REVIEW.md promises that CI shows the reviewer just the checklist items whose
 * triggers fire on the diff, read from the base branch. Until this lock, no
 * step did that: the prompt was a generic list that asked the model to redo
 * work programs already gate (missing tests, README drift). These assertions
 * fail if the review stops going through the triggerlist action, or if the
 * "programs already judge this" boundary is dropped from the prompt.
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
  // burgee's triggerlist-review action runs `triggerlist brief` against the base branch and puts
  // the fired items, read from the base, into the prompt. Its own tests in burgee hold that; this
  // repo holds that the review goes through it and keeps the judgment-only preamble.
  it('reviews through the triggerlist-review action, not a bare claude-code-action', () => {
    expect(WORKFLOW).toMatch(
      /uses: ofri-peretz\/burgee\/\.github\/actions\/triggerlist-review@[0-9a-f]{40}/,
    );
    expect(WORKFLOW).not.toContain('uses: anthropics/claude-code-action');
    expect(WORKFLOW).toMatch(/triggerlist: npx --yes triggerlist@\d/);
  });

  it('fetches enough history for a base...HEAD diff', () => {
    expect(WORKFLOW).toMatch(/fetch-depth: 0/);
  });

  it('reserves path:line citations for findings, which the hit-rate script counts', () => {
    expect(WORKFLOW).toContain('ONLY for a finding, never to confirm');
  });

  it('tells the reviewer not to repeat what programs already gate', () => {
    const preamble = WORKFLOW.slice(WORKFLOW.indexOf('preamble: |'));
    expect(preamble).toContain('Report nothing');
    expect(preamble).toContain('one of them would report');
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

// CodeRabbit is rate-limited on most PRs here (21 of 23 measured), so its reviews go only where a
// reader matters. Each line below is a PR class or path that would spend a review on nothing.
describe('.coderabbit.yaml', () => {
  const text = readFileSync(join(ROOT, '.coderabbit.yaml'), 'utf8');

  it.each([
    "'!apps/docs/src/data/**'",
    "'!benchmarks/results/**'",
    "'!**/package-lock.json'",
    "'chore(release)'",
    "'[automated]'",
    'drafts: false',
  ])('skips %s', (line) => {
    expect(text).toContain(line);
  });

  // The split: Claude reviews eslint on every PR, CodeRabbit only when asked.
  it('reviews eslint only on demand', () => {
    expect(text).toMatch(/auto_review:\n\s+enabled: false/);
  });

  it('leaves to the gates what the gates already report', () => {
    expect(text).toContain('Report nothing one of them would report');
  });
});
