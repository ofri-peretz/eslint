# Worktrees and `node_modules`

This repo is developed across ~75 git worktrees. Most of them **do not own their
dependencies** — they borrow another worktree's `node_modules`. That is
deliberate: a full install is minutes and gigabytes, and a worktree that exists
to review one PR does not need its own copy.

It also has a sharp edge that is invisible until something else breaks.

## The three shapes

| shape                  | what it looks like                                                | owns deps? |
| :--------------------- | :---------------------------------------------------------------- | :--------- |
| **host**               | real `node_modules`, ~31 symlinks pointing INSIDE at `packages/*` | yes        |
| **whole-tree borrow**  | `node_modules` is itself a symlink to a host                      | no         |
| **per-package borrow** | real `node_modules` dir, but ~1,200 entries symlink OUT to a host | no         |

The third is the one that catches people. It looks like a normal install —
`ls node_modules` shows everything you expect — and nothing about it announces
that the contents live somewhere else.

## Why `npm install` in a borrowed worktree is destructive

npm does not know the links are borrowed. It follows them and writes **through**
them into the host, so an install in one worktree silently rewrites dependencies
for every worktree sharing that host.

Observed on 2026-09-04, from a single `npm install`:

1. It wrote through the links and left `@vitest/utils` an empty directory in the
   host — breaking vitest in **every** worktree pointing at that host, not just
   the one where the command ran.
2. Repairing it with `npm install` in the host modified the host's
   `package-lock.json` and pruned packages another worktree needed.
3. Restoring the lockfile with `npm ci` deleted and recreated `node_modules`,
   which dangled `.vite-temp` and left 470 scoped symlinks missing.

One command, three rounds of damage, none of it visible at the point of failure.
The symptom appeared as unrelated test files failing to load.

## The rule

**Install in the host. Never in a borrower.**

```bash
# find out which you are in
node --experimental-strip-types scripts/guard-borrowed-node-modules.mts

# install where the dependencies actually live
cd <host printed above> && npm ci
```

`npm ci` rather than `npm install` in a host: it installs exactly what the
lockfile says instead of re-resolving, so it cannot quietly change versions for
every worktree downstream.

## The guard

`scripts/guard-borrowed-node-modules.mts` runs as `preinstall` and refuses when
this worktree's dependencies are borrowed, naming the host to use instead.

It keys on **where symlinks point**, not that symlinks exist — a host has ~31 of
them too, pointing inward at `packages/*`, which is ordinary npm workspace
behaviour. Measured:

```
eslint-ci2   31 inside,    0 outside   <- host, install is fine
eslint-mq    31 inside, 1241 outside   <- borrowed, install is destructive
```

It stays silent when `node_modules` does not exist, so a fresh clone and CI are
unaffected.

Override for a single command when you genuinely mean it:

```bash
ALLOW_BORROWED_INSTALL=1 npm install
```

## Repairing a borrowed worktree

If a borrowed worktree has lost symlinks — packages that exist in the host but
resolve nowhere here — relink rather than install:

```bash
node --experimental-strip-types scripts/relink-borrowed-node-modules.mts <host>
```

That recreates only what is missing and never touches an entry with content.
