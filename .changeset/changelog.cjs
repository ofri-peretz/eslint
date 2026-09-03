/**
 * changelog.cjs — custom changesets changelog formatter for this monorepo.
 *
 * Replaces `@changesets/changelog-github`. Same data (PR / commit / author
 * backlinks resolved from the GitHub API), three differences that matter:
 *
 *   1. **Categorised.** Every line is prefixed with a kind badge derived from
 *      the changeset's conventional-commit prefix (`feat:` / `fix:` / `perf:`
 *      …) or, failing that, from the semver bump. `## 4.4.1 → ### Patch
 *      Changes` tells you the *blast radius*; the badge tells you what the
 *      change actually was. Both matter, and changesets hard-codes the former
 *      (`startCase(type) + " Changes"` in apply-release-plan), so the badge is
 *      how kind gets expressed.
 *
 *   2. **Metadata trails the prose.** changelog-github leads with
 *      `[#225](…) [`sha`](…) Thanks [@user](…)! - ` — 120 characters of
 *      plumbing before the reader reaches a single word about the change.
 *      Here the summary comes first and the links close the line.
 *
 *   3. **Attribution is signal, not noise.** "Thanks @<repo-owner>!" on every
 *      line of a solo-maintained repo is decoration. External contributors
 *      still get named; the owner is elided. The owner is derived from the
 *      `repo` option, so there is nothing to keep in sync.
 *
 * Degrades gracefully with no `GITHUB_TOKEN`: emits the same categorised line
 * without backlinks instead of throwing, so `changeset version` can be
 * previewed locally. (changelog-github hard-fails in that case.)
 *
 * Config (`.changeset/config.json`):
 *
 *   "changelog": ["./changelog.cjs", { "repo": "owner/name" }]
 *
 * Contract is locked by `scripts/__tests__/changelog-format.test.ts`.
 */

'use strict';

/**
 * Conventional-commit type → display badge.
 *
 * Order matters only for readability here; lookup is exact-match on the
 * parsed type. `security` is not a conventional-commit standard type, but
 * this is a security-plugin ecosystem — a security fix reads differently
 * from a normal fix and deserves its own badge.
 */
const KIND_BADGES = {
  feat: '✨ Feature',
  fix: '🐛 Fix',
  perf: '⚡ Performance',
  security: '🔒 Security',
  docs: '📚 Docs',
  refactor: '🧹 Refactor',
  build: '🏗 Build',
  ci: '🔧 CI',
  test: '🧪 Tests',
  chore: '🧹 Chore',
  style: '🎨 Style',
  revert: '⏪ Revert',
};

const BREAKING_BADGE = '💥 Breaking';

/** Fallback badge when the summary carries no conventional-commit prefix. */
const BUMP_BADGES = {
  major: BREAKING_BADGE,
  minor: '✨ Feature',
  patch: '🐛 Fix',
};

/**
 * Parse a changeset summary into `{ badge, title, body }`.
 *
 * The title is the summary's first paragraph (collapsed to one line); the
 * body is everything after the first blank line. Accepts either shape:
 *
 *   feat(node-security): add `no-dynamic-algorithm-selection` (CWE-327)
 *   Widen the `mongodb` peer ranges to include the tested version
 *
 * A `!` before the colon (`feat(x)!:`) or a `BREAKING CHANGE:` token anywhere
 * in the body forces the breaking badge regardless of the parsed type — that
 * is the conventional-commit spec's own escalation rule, and it is the one
 * signal a reader must never miss.
 *
 * The scope is dropped from the title: inside `packages/foo/CHANGELOG.md`,
 * `feat(foo):` is restating the filename. The rollup notes
 * (`scripts/release-notes.ts`) re-attach package identity where it is
 * genuinely ambiguous.
 */
function parseSummary(summary, bumpType) {
  const trimmed = String(summary || '').trim();

  // Title is the first *paragraph*, not the first line. Contributors here
  // wrap changeset prose at ~80 columns, so a one-sentence title routinely
  // spans two lines — splitting on the first newline (what
  // `@changesets/changelog-github` does) truncates it mid-clause and buries
  // the tail in the indented body. Splitting on the first blank line instead
  // keeps the sentence whole; the wrap itself is not meaningful, so the
  // paragraph collapses to a single line.
  const breakAt = trimmed.search(/\n[ \t]*\n/);
  const firstPara = breakAt === -1 ? trimmed : trimmed.slice(0, breakAt);
  const firstLine = firstPara
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ');
  const body = breakAt === -1 ? '' : trimmed.slice(breakAt).trim();

  const declaresBreaking = /^BREAKING[ -]CHANGE:/m.test(trimmed);

  // `type(optional-scope)!: subject`
  const match = /^([a-z]+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/.exec(firstLine);

  if (!match) {
    return {
      badge: declaresBreaking ? BREAKING_BADGE : BUMP_BADGES[bumpType],
      title: firstLine,
      body,
    };
  }

  const [, type, , bang, subject] = match;
  const known = Object.prototype.hasOwnProperty.call(KIND_BADGES, type);

  // An unrecognised `word:` prefix is prose, not a commit type — "Note: the
  // ranges are additive" must not be parsed as a `note` change kind. Keep the
  // line verbatim and fall back to the bump badge.
  if (!known) {
    return {
      badge: declaresBreaking ? BREAKING_BADGE : BUMP_BADGES[bumpType],
      title: firstLine,
      body,
    };
  }

  const breaking = Boolean(bang) || declaresBreaking || bumpType === 'major';

  return {
    badge: breaking ? BREAKING_BADGE : KIND_BADGES[type],
    title: subject,
    body,
  };
}

/** Indent a multi-line changeset body to sit under its bullet. */
function indentBody(body) {
  if (!body) return '';
  return (
    '\n\n' +
    body
      .split('\n')
      .map((line) => (line.trim() === '' ? '' : `  ${line}`))
      .join('\n')
  );
}

/**
 * Resolve PR / commit / author for a changeset via the GitHub API.
 *
 * Returns `null` rather than throwing when the lookup is impossible (no
 * token, no commit recorded, network failure). Every caller treats a null
 * as "emit the line without backlinks" — release notes losing their links
 * is a far better outcome than `changeset version` aborting mid-run and
 * leaving a half-applied release plan on disk.
 */
async function resolveLinks(changeset, options) {
  if (!changeset.commit) return null;
  if (!options || !options.repo) return null;
  if (!process.env.GITHUB_TOKEN) return null;

  try {
    // Resolved lazily: unreachable in the no-token path, and a hard `require`
    // at module load would make the graceful degradation above depend on the
    // package being installed.
    const { getInfo } = require('@changesets/get-github-info');
    const { links } = await getInfo({
      repo: options.repo,
      commit: changeset.commit,
    });
    return links;
  } catch (error) {
    console.warn(
      `[changelog] GitHub lookup failed for ${changeset.commit}: ${error.message}. ` +
        `Emitting release line without backlinks.`,
    );
    return null;
  }
}

/** `owner/name` → `owner`, used to suppress self-attribution. */
function repoOwner(options) {
  return options && typeof options.repo === 'string'
    ? options.repo.split('/')[0]
    : '';
}

/**
 * Build the ` ([#12](…), [`abc1234`](…), @contributor)` trailer.
 *
 * Empty string when nothing resolved — the line then reads as plain prose,
 * which is correct for a locally-previewed version bump.
 */
function trailer(links, options) {
  if (!links) return '';

  const parts = [];
  if (links.pull) parts.push(links.pull);
  else if (links.commit) parts.push(links.commit);

  // `links.user` is a markdown link like `[@someone](https://github.com/someone)`.
  // Only credit contributors who are not the repo owner.
  if (links.user) {
    const handle = /\[@([^\]]+)\]/.exec(links.user);
    if (handle && handle[1] !== repoOwner(options))
      parts.push(`thanks ${links.user}!`);
  }

  return parts.length > 0 ? ` (${parts.join(', ')})` : '';
}

/**
 * One bullet per changeset, inside changesets' own
 * `### Major|Minor|Patch Changes` section.
 */
async function getReleaseLine(changeset, type, options) {
  const { badge, title, body } = parseSummary(changeset.summary, type);
  const links = await resolveLinks(changeset, options);

  return `- **${badge}** — ${title}${trailer(links, options)}${indentBody(body)}`;
}

/**
 * One bullet summarising internal workspace-dependency bumps.
 *
 * changelog-github lists every dependency on its own line, which for this
 * repo means ~20 near-identical `@interlace/eslint-devkit@x.y.z` lines in
 * every plugin's changelog on every devkit release. Collapsed to one line;
 * the detail lives in the dependency's own changelog, one click away.
 */
async function getDependencyReleaseLine(changesets, dependenciesUpdated) {
  if (dependenciesUpdated.length === 0) return '';

  const list = dependenciesUpdated
    .map((d) => `\`${d.name}@${d.newVersion}\``)
    .join(', ');

  return `- **🔗 Dependencies** — updated workspace dependencies: ${list}`;
}

module.exports = {
  getReleaseLine,
  getDependencyReleaseLine,
  // Exported for the format lock test; not part of the changesets contract.
  __internal: { parseSummary, trailer, KIND_BADGES, BREAKING_BADGE },
};
