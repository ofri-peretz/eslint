/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * reconcile-tags-core.ts — the decisions `scripts/reconcile-tags.ts` makes,
 * kept free of git and npm so they can be tested against synthetic sets.
 *
 * A version on npm with no git tag is "missing", and missing tags open the
 * release-hygiene issue. Two kinds of npm version are not expected to have a
 * tag, and counting them as missing kept #1321 open with nothing to fix:
 *
 *   placeholder   `0.0.0-<anything>`. `0.0.0-stage` is the empty package
 *                 published once to claim a name so Trusted Publishing can be
 *                 configured for it; changeset snapshots are
 *                 `0.0.0-canary-<timestamp>`. Neither is built from a release
 *                 commit, so there is no commit to tag.
 *
 *   acknowledged  versions listed in `.agent/release-untagged-versions.json`.
 *                 Each entry names the versions and why no commit can be
 *                 tagged for them. `--backfill-missing` would otherwise tag
 *                 the first commit whose package.json has that version, which
 *                 for a hand publish is a guess, not the source of the tarball.
 *
 * Both stay visible in the report. They are only kept out of `missing`.
 */

import { readFileSync } from 'node:fs';

/** `0.0.0-stage`, `0.0.0-canary-20261028`, … — never a release. */
export function isPlaceholderVersion(version: string): boolean {
  return /^0\.0\.0-/.test(version);
}

/** One cause, and every `package → versions` it explains. */
export interface UntaggedLedgerEntry {
  reason: string;
  versions: Record<string, string[]>;
}

export interface UntaggedLedger {
  note?: string;
  entries: UntaggedLedgerEntry[];
}

/** package name → versions acknowledged as published without a tag. */
export type AcknowledgedMap = Map<string, Set<string>>;

/**
 * Parse the ledger. A malformed one throws: a ledger read as "empty" would
 * reopen the issue for 31 known versions, and one read as "everything" would
 * hide real drift, so neither failure may pass silently.
 */
export function parseUntaggedLedger(raw: string): AcknowledgedMap {
  const parsed = JSON.parse(raw) as UntaggedLedger;
  if (!parsed || !Array.isArray(parsed.entries)) {
    throw new Error(
      'release-untagged ledger: expected an object with an `entries` array',
    );
  }
  const out: AcknowledgedMap = new Map();
  for (const entry of parsed.entries) {
    if (
      !entry ||
      typeof entry.reason !== 'string' ||
      entry.reason.trim() === ''
    ) {
      throw new Error(
        `release-untagged ledger: entry without a reason ${JSON.stringify(entry)}`,
      );
    }
    if (
      !entry.versions ||
      typeof entry.versions !== 'object' ||
      Array.isArray(entry.versions)
    ) {
      throw new Error(
        `release-untagged ledger: \`versions\` must map package → versions (${entry.reason})`,
      );
    }
    for (const [pkg, versions] of Object.entries(entry.versions)) {
      if (
        !Array.isArray(versions) ||
        versions.some((v) => typeof v !== 'string')
      ) {
        throw new Error(
          `release-untagged ledger: ${pkg} must list versions as strings`,
        );
      }
      const set = out.get(pkg) ?? new Set<string>();
      for (const v of versions) set.add(v);
      out.set(pkg, set);
    }
  }
  return out;
}

export function readUntaggedLedger(file: string): AcknowledgedMap {
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Map();
    throw error;
  }
  return parseUntaggedLedger(raw);
}

export interface VersionDrift {
  /** Tag exists, version is not on npm. Informational. */
  orphan: string[];
  /** Version is on npm with no tag and no recorded reason. Actionable. */
  missing: string[];
  /** `0.0.0-*` versions on npm. Never tagged by design. */
  placeholder: string[];
  /** On npm, untagged, and listed in the ledger. */
  acknowledged: string[];
}

export function classifyVersions(
  tags: ReadonlySet<string>,
  npmVersions: ReadonlySet<string>,
  acknowledged: ReadonlySet<string> = new Set(),
): VersionDrift {
  const drift: VersionDrift = {
    orphan: [],
    missing: [],
    placeholder: [],
    acknowledged: [],
  };
  for (const tag of tags) if (!npmVersions.has(tag)) drift.orphan.push(tag);
  for (const version of npmVersions) {
    if (tags.has(version)) continue;
    if (isPlaceholderVersion(version)) drift.placeholder.push(version);
    else if (acknowledged.has(version)) drift.acknowledged.push(version);
    else drift.missing.push(version);
  }
  return drift;
}
