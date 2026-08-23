/**
 * release-verdict.ts — the upgrade verdict, defined once.
 *
 * Two surfaces show it: the per-package GitHub Release
 * (`extract-changelog.ts`) and the cross-package rollup
 * (`release-notes.ts`). A reader routinely sees both — the rollup links to the
 * package release — and if the two are worded differently they have to work
 * out whether the difference is meaningful. It never is, but deciding that
 * costs more attention than the sentence saves.
 *
 * They were duplicated string literals and had already drifted (one gained a
 * ✅, the other did not) within a day of being written, which is the argument
 * for this file rather than a convention. `release-verdict.test.ts` asserts
 * both scripts import from here instead of re-spelling the text.
 */

/** No breaking change reaches anyone who installs a published package. */
export const SAFE_TO_UPGRADE =
  '✅ **Safe to upgrade.** No breaking changes: existing configs keep working as-is.';

/**
 * Breaking changes are present.
 *
 * `where` names what the reader should go read — the two surfaces have
 * different things to point at, and that is the only part allowed to differ.
 */
export function breakingVerdict(count: number, where: string): string {
  const plural = count === 1 ? '' : 's';
  return (
    `⚠️ **This release contains ${count} breaking change${plural}.** ` +
    `${where} before upgrading — it changes behaviour existing configs depend on.`
  );
}

/** Where the rollup sends a reader: its own grouped section. */
export const ROLLUP_POINTER = 'Read the 💥 section below';

/** Where a package release sends a reader: the migration notes above it. */
export const PACKAGE_POINTER = 'Read the migration notes above';

/**
 * Nothing in this release reaches npm.
 *
 * A release of only private workspaces — an app deploy, an internal package —
 * still produces notes, and those notes still open with a verdict. "Safe to
 * upgrade" is true there but vacuous: there is nothing to upgrade. Saying so
 * up front spares the reader working it out from four sections of entries all
 * marked internal, which is what the alternative asks of them.
 */
export const INTERNAL_ONLY =
  'ℹ️ **Nothing published to npm in this release.** ' +
  'Only internal packages and apps changed — no installed dependency is affected.';
