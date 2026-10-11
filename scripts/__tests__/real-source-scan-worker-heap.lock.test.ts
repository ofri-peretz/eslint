/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `--repo-shard i/n` in `real-source-scan.mts` slices the repository list by
 * `index % 20`, an order that has nothing to do with repository size. Shards
 * 3, 7 and 18 each drew one of this corpus's largest monorepos —
 * elastic/kibana, fastify/fastify, n8n-io/n8n, directus/directus,
 * lobehub/lobe-chat, outline/outline — and ended up with roughly ten times the
 * files of a typical shard.
 *
 * Every forked lint worker inherited V8's default old-space ceiling
 * (observed at ~4GB in the failed run) regardless of which shard it drew, and
 * two of those three oversized shards aborted mid-scan with "JavaScript heap
 * out of memory" (#1196) — a clean V8 abort, confirmed by the Actions job
 * log, not an OS-level OOM-kill. This locks the fix in place: every forked
 * worker must get an explicit heap ceiling sized from the runner's own
 * memory and the worker count, not whatever V8 picks by default.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCRIPT = resolve(__dirname, '..', 'real-source-scan.mts');

/** Comments quote the fix itself — a lock satisfied by its own prose isn't a lock. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

const CODE = stripComments(readFileSync(SCRIPT, 'utf8'));

describe('forked lint workers get a heap ceiling sized for the corpus', () => {
  it('sizes the per-worker heap limit from the runner’s own memory', () => {
    expect(CODE).toMatch(/os\.totalmem\(\)\s*\/\s*\(1024\s*\*\s*1024\)/);
  });

  it('splits that memory across the worker count, not a hardcoded constant', () => {
    expect(CODE).toMatch(/\/\s*workers\b/);
  });

  it('passes --max-old-space-size to every forked worker', () => {
    const forkOptions = /execArgv:\s*\[([^\]]*)\]/.exec(CODE);
    expect(
      forkOptions,
      'fork() must pass an execArgv array (not a bare `process.execArgv`) ' +
        'so a heap-size flag can be added to it',
    ).not.toBeNull();

    expect(forkOptions![1]).toMatch(/--max-old-space-size=\$\{\w+\}/);
    // Still inherits whatever flags the coordinator process itself was
    // started with, rather than replacing them.
    expect(forkOptions![1]).toMatch(/\.\.\.process\.execArgv/);
  });
});
