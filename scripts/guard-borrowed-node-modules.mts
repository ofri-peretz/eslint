/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Refuse `npm install` in a worktree whose node_modules is borrowed.
 *
 * This repo is developed across ~75 git worktrees, and most of them do not own
 * their dependencies. They reach a HOST worktree instead, in one of two shapes:
 *
 *   node_modules -> /Users/.../eslint-litmus/node_modules      (whole tree)
 *   node_modules/<pkg> -> /Users/.../eslint-ci2/node_modules/<pkg>   (per package)
 *
 * npm does not know that. It follows the links and writes THROUGH them into the
 * host — so an install here silently rewrites dependencies for every worktree
 * sharing that host.
 *
 * That happened on 2026-09-04. One `npm install` in a borrowed worktree emptied
 * `@vitest/utils` in the host, which broke vitest in every worktree pointing at
 * it. Repairing it modified the host's package-lock.json and pruned packages,
 * and restoring THAT deleted node_modules and left 470 scoped symlinks dangling.
 * One command, three rounds of damage, none of it visible until tests failed
 * somewhere else.
 *
 * The discriminator is where the symlinks point, not that they exist. A host has
 * ~31 symlinks too — `node_modules/eslint-plugin-x -> ../packages/...` — and
 * those are normal npm workspace links. Measured:
 *
 *   eslint-ci2   31 inside,    0 outside   <- host, install is fine
 *   eslint-mq    31 inside, 1241 outside   <- borrowed, install is destructive
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const NM = path.join(ROOT, 'node_modules');

/** Where an install would actually land, and how we know. */
function borrowedFrom(): { host: string; how: string } | null {
  if (!fs.existsSync(NM)) return null; // fresh clone / CI — nothing to borrow yet

  if (fs.lstatSync(NM).isSymbolicLink()) {
    return {
      host: fs.realpathSync(NM),
      how: 'node_modules is itself a symlink',
    };
  }

  const real = fs.realpathSync(ROOT) + path.sep;
  const outside: string[] = [];
  for (const entry of fs.readdirSync(NM)) {
    const p = path.join(NM, entry);
    let target: string;
    try {
      if (!fs.lstatSync(p).isSymbolicLink()) continue;
      target = fs.realpathSync(p);
    } catch {
      continue; // dangling link — not evidence of borrowing
    }
    if (!target.startsWith(real)) outside.push(target);
  }

  // A handful could be deliberate. A thousand is a mirror of another tree.
  if (outside.length < 50) return null;
  const host = outside[0].split(`${path.sep}node_modules${path.sep}`)[0];
  return {
    host,
    how: `${outside.length} packages are symlinks into another worktree`,
  };
}

const borrowed = borrowedFrom();
if (borrowed) {
  console.error(`
  ┌─ refusing to install here ─────────────────────────────────────────────
  │
  │  This worktree does not own its dependencies.
  │    ${borrowed.how}
  │    host: ${borrowed.host}
  │
  │  npm follows those links and writes THROUGH them, so installing here
  │  rewrites dependencies for EVERY worktree sharing that host — and the
  │  damage only shows up later, as failures somewhere else.
  │
  │  Install in the host instead:
  │      cd ${borrowed.host} && npm ci
  │
  │  If you genuinely mean to install here, this worktree needs its own tree:
  │      rm -rf node_modules && npm ci        (slow, and unshares it)
  │
  │  To override for one command:  ALLOW_BORROWED_INSTALL=1 npm install
  └────────────────────────────────────────────────────────────────────────
`);
  if (process.env.ALLOW_BORROWED_INSTALL !== '1') process.exit(1);
  console.error('  ALLOW_BORROWED_INSTALL=1 set — proceeding anyway.\n');
}
