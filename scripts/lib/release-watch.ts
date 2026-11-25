/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The cursor arithmetic of scripts/nestjs-release-watch.mts, kept apart from
 * the `gh` calls so it can be tested without the network.
 */

export interface Release {
  tag: string;
  /** ISO 8601, as GitHub reports it: sorts as a string. */
  publishedAt: string;
  url: string;
  body: string;
}

/**
 * The releases published after `cursor`, oldest first.
 *
 * A repository with no cursor is new to the watch. Its whole history is not
 * news, so only its latest release is returned — enough to start from.
 */
export function unseen(
  releases: readonly Release[],
  cursor: string | undefined,
): Release[] {
  const oldestFirst = [...releases].sort((a, b) =>
    a.publishedAt.localeCompare(b.publishedAt),
  );
  return cursor === undefined
    ? oldestFirst.slice(-1)
    : oldestFirst.filter((release) => release.publishedAt > cursor);
}

/** The cursor after these releases are handled: never moves backwards. */
export function advance(
  cursor: string | undefined,
  handled: readonly Release[],
): string | undefined {
  return [cursor, ...handled.map((r) => r.publishedAt)]
    .filter((at) => at !== undefined)
    .sort()
    .at(-1);
}
