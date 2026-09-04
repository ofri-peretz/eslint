/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Repair a borrowed worktree's node_modules by relinking, not installing.
 *
 * See docs/WORKTREE_NODE_MODULES.md. When a borrowed worktree loses symlinks —
 * an install wrote real empty directories over them, or the host's
 * node_modules was recreated — the fix is to restore the links, NOT to run
 * `npm install`, which is what caused the damage in the first place.
 *
 * Written after exactly that: on 2026-09-04 an install in a borrowed worktree
 * left 470 scoped packages (`@types/*`, `@eslint-community/*`, …) as empty real
 * directories, and the symptom was unrelated test files failing to load with
 * "Cannot find package".
 *
 * Safety: creates only what is MISSING, and removes only directories that are
 * both real and empty. Anything with content is left alone and reported.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const host = process.argv[2];

if (!host) {
  console.error(
    'usage: relink-borrowed-node-modules.mts <host-worktree>\n' +
      '  the host is printed by scripts/guard-borrowed-node-modules.mts',
  );
  process.exit(2);
}

const SRC = path.join(path.resolve(host), 'node_modules');
const DST = path.join(ROOT, 'node_modules');

if (!fs.existsSync(SRC)) {
  console.error(`no node_modules in host: ${SRC}`);
  process.exit(2);
}
if (fs.lstatSync(DST).isSymbolicLink()) {
  console.log('node_modules is a whole-tree symlink — nothing to relink.');
  process.exit(0);
}

/** Scoped packages nest one level, so `@scope/pkg` is the unit, not `@scope`. */
function* packages(): Generator<string> {
  for (const entry of fs.readdirSync(SRC)) {
    const p = path.join(SRC, entry);
    if (
      entry.startsWith('@') &&
      fs.lstatSync(p).isDirectory() &&
      !fs.lstatSync(p).isSymbolicLink()
    ) {
      for (const sub of fs.readdirSync(p)) yield path.join(entry, sub);
    } else {
      yield entry;
    }
  }
}

let linked = 0;
let kept = 0;
const occupied: string[] = [];

for (const rel of packages()) {
  const src = path.join(SRC, rel);
  const dst = path.join(DST, rel);

  if (fs.existsSync(dst) || fs.lstatSync(dst, { throwIfNoEntry: false })) {
    const st = fs.lstatSync(dst, { throwIfNoEntry: false });
    if (st?.isSymbolicLink()) {
      kept++;
      continue;
    }
    if (st?.isDirectory() && fs.readdirSync(dst).length === 0) {
      fs.rmdirSync(dst); // empty real dir: the shape a failed install leaves
    } else if (st) {
      occupied.push(rel); // has content — never clobber it
      continue;
    }
  }

  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.symlinkSync(src, dst);
  linked++;
}

console.log(`  relinked: ${linked}`);
console.log(`  already linked: ${kept}`);
if (occupied.length > 0) {
  console.log(`  left alone (real content, not empty): ${occupied.length}`);
  for (const o of occupied.slice(0, 10)) console.log(`    ${o}`);
}
