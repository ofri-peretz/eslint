#!/usr/bin/env tsx
/**
 * review-hit-rate.ts: how often the Claude PR reviewer says something the author acts on.
 *
 * A finding is one distinct `path:line` the reviewer cites on a PR, inline or in its summary; a
 * re-review that cites the same place again is the same finding. It is ACTED ON when a later
 * commit on the same PR touches the cited file. That is a proxy: a touch can be unrelated, and a
 * finding can be answered with a reply instead of a change. A bare file name that matches several
 * files in the PR is never counted as acted on. Whether a finding repeats what a gate already
 * reports is a reader's call: `--dump` writes JSONL, and the reader adds a `label` to each line.
 * Baseline and comparison: docs/review-hit-rate/README.md.
 *
 *   npx tsx scripts/review-hit-rate.ts --last 10       # the 10 most recently merged non-bot PRs
 *   npx tsx scripts/review-hit-rate.ts --prs 1790,1791 --dump out.jsonl
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REVIEWER = 'claude[bot]';

export interface ReviewComment {
  pr: number;
  path: string;
  line: number | null;
  createdAt: string;
  body: string;
}
export interface PrCommit {
  date: string;
  files: string[];
}

/**
 * The reviewer posts most findings in its one summary comment, each citing `path:line` in
 * backticks. A file name without an extension (Dockerfile, CODEOWNERS) or with route brackets
 * (app/[slug]/page.tsx) counts; a name without a line (a files-read list) does not.
 */
export function findingsInSummary(
  pr: number,
  body: string,
  createdAt: string,
): ReviewComment[] {
  const out: ReviewComment[] = [];
  for (const m of body.matchAll(/`([\w@./()[\]+-]+):(\d+)(?:-\d+)?`/gu)) {
    // Keep the text around the citation so a reader can label the finding from the dump.
    const at = m.index ?? 0;
    out.push({
      pr,
      path: m[1]!,
      line: Number(m[2]),
      createdAt,
      body: body.slice(Math.max(0, at - 300), at + 400),
    });
  }
  return dedupe(out);
}

/** One record per PR + path + line: the earliest, when the reviewer first said it. */
export function dedupe(list: ReviewComment[]): ReviewComment[] {
  const first = new Map<string, ReviewComment>();
  for (const c of [...list].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  )) {
    const key = `${c.pr}|${c.path}|${c.line}`;
    if (!first.has(key)) first.set(key, c);
  }
  return [...first.values()];
}

/**
 * The PR file a citation means. A qualified path is taken as written when the PR has it; a bare
 * name, or a path the PR only has deeper down, must match exactly one PR file. Ambiguous is null.
 */
export function resolvePath(path: string, prFiles: string[]): string | null {
  if (path.includes('/') && prFiles.includes(path)) return path;
  const matches = [
    ...new Set(prFiles.filter((f) => f === path || f.endsWith(`/${path}`))),
  ];
  return matches.length === 1 ? matches[0]! : null;
}

export interface ClosedPr {
  number: number;
  mergedAt: string | null;
  updatedAt: string;
  bot: boolean;
}

/**
 * The n latest-merged non-bot PRs from closed PRs listed newest-UPDATED first, or null while a
 * later page could still hold one. Merging updates a PR, so updatedAt >= mergedAt: once the list
 * reaches PRs last updated before the n-th merge time, none further down can beat it.
 */
export function latestMerged(prs: ClosedPr[], n: number): number[] | null {
  const merged = newestMerged(prs);
  if (merged.length < n) return null;
  const cutoff = merged[n - 1]!.mergedAt!;
  const oldest = prs.reduce(
    (min, p) => (p.updatedAt < min ? p.updatedAt : min),
    prs[0]!.updatedAt,
  );
  return oldest < cutoff ? merged.slice(0, n).map((p) => p.number) : null;
}

const newestMerged = (prs: ClosedPr[]) =>
  prs
    .filter((p) => p.mergedAt !== null && !p.bot)
    .sort((a, b) => b.mergedAt!.localeCompare(a.mergedAt!));

/**
 * One list from two reads of the same pages, the later read winning. A PR updated while the first
 * scan ran moves up onto a page already read and is skipped; the re-read of the pages updated
 * since the scan began holds it.
 */
export function mergeScans(first: ClosedPr[], again: ClosedPr[]): ClosedPr[] {
  const byNumber = new Map(first.map((p) => [p.number, p]));
  for (const p of again) byNumber.set(p.number, p);
  return [...byNumber.values()];
}

/** A finding is acted on when a commit dated after it touches the file it cites. */
export function isActedOn(
  c: ReviewComment,
  commits: PrCommit[],
  prFiles: string[],
): boolean {
  const file = resolvePath(c.path, prFiles);
  if (file === null) return false;
  return commits.some((k) => k.date > c.createdAt && k.files.includes(file));
}

const gh = (path: string): unknown =>
  JSON.parse(
    execFileSync('gh', ['api', '--paginate', '--slurp', path], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }),
  ).flat();

function repo(): string {
  return execFileSync(
    'gh',
    ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'],
    { encoding: 'utf8' },
  ).trim();
}

function closedPage(r: string, page: number): ClosedPr[] {
  const batch = JSON.parse(
    execFileSync(
      'gh',
      [
        'api',
        `repos/${r}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`,
      ],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    ),
  ) as {
    number: number;
    merged_at: string | null;
    updated_at: string;
    user: { type: string };
  }[];
  return batch.map((p) => ({
    number: p.number,
    mergedAt: p.merged_at,
    updatedAt: p.updated_at,
    bot: p.user.type === 'Bot',
  }));
}

function lastMergedPrs(r: string, n: number): number[] {
  // Bot PRs (release, data sync) are never reviewed; skip them so `--last 10` means 10 reviews.
  // A minute of slack for clock skew between this machine and GitHub.
  const scanStart = new Date(Date.now() - 60_000).toISOString();
  let seen: ClosedPr[] = [];
  let complete = false;
  for (let page = 1; ; page++) {
    const batch = closedPage(r, page);
    seen.push(...batch);
    if (latestMerged(seen, n)) break;
    // The last page: every closed PR is in hand, so the newest merges are certain.
    if (batch.length < 100) {
      complete = true;
      break;
    }
  }
  // Re-read the pages holding anything updated since the scan began.
  for (let page = 1; ; page++) {
    const batch = closedPage(r, page);
    seen = mergeScans(seen, batch);
    const last = batch[batch.length - 1];
    if (!last || last.updatedAt < scanStart || batch.length < 100) break;
  }
  const picked = complete ? null : latestMerged(seen, n);
  return (
    picked ??
    newestMerged(seen)
      .slice(0, n)
      .map((p) => p.number)
  );
}

function main(): void {
  const args = process.argv.slice(2);
  const at = (f: string) => {
    const i = args.indexOf(f);
    return i < 0 ? undefined : args[i + 1];
  };
  const r = repo();
  const prs = at('--prs')
    ? at('--prs')!.split(',').map(Number)
    : lastMergedPrs(r, Number(at('--last') ?? 10));
  const all: (ReviewComment & { acted: boolean })[] = [];

  for (const pr of prs) {
    const found = (
      gh(`repos/${r}/pulls/${pr}/comments`) as {
        user: { login: string };
        path: string;
        line: number | null;
        original_line: number | null;
        created_at: string;
        body: string;
      }[]
    )
      .filter((c) => c.user.login === REVIEWER)
      .map((c) => ({
        pr,
        path: c.path,
        line: c.line ?? c.original_line,
        createdAt: c.created_at,
        body: c.body,
      }));
    // The summary is edited in place while the run progresses; updated_at is when it was final.
    for (const s of gh(`repos/${r}/issues/${pr}/comments`) as {
      user: { login: string };
      updated_at: string;
      body: string;
    }[]) {
      if (s.user.login === REVIEWER) {
        found.push(...findingsInSummary(pr, s.body, s.updated_at));
      }
    }
    const comments = dedupe(found);
    if (comments.length === 0) continue;
    // Every file the PR's commits ever touched, not only its final diff: a file a later commit
    // reverted to base drops out of the diff but was still acted on.
    const diffFiles = (
      gh(`repos/${r}/pulls/${pr}/files`) as { filename: string }[]
    ).map((f) => f.filename);
    const commits = (
      gh(`repos/${r}/pulls/${pr}/commits`) as {
        sha: string;
        commit: { committer: { date: string } };
      }[]
    ).map((k) => ({
      date: k.commit.committer.date,
      files: (
        gh(`repos/${r}/commits/${k.sha}`) as {
          files: { filename: string }[];
        }[]
      ).flatMap((x) => x.files.map((f) => f.filename)),
    }));
    const prFiles = [
      ...new Set([...diffFiles, ...commits.flatMap((k) => k.files)]),
    ];
    for (const c of comments) {
      all.push({ ...c, acted: isActedOn(c, commits, prFiles) });
    }
  }

  const acted = all.filter((c) => c.acted).length;
  const pct = all.length ? Math.round((100 * acted) / all.length) : 0;
  console.log(
    `PRs ${prs.length} (${Math.min(...prs)}..${Math.max(...prs)}), reviewer findings ${all.length}, ` +
      `acted on ${acted} (${pct}%)`,
  );
  const dump = at('--dump');
  if (dump) {
    writeFileSync(dump, all.map((c) => JSON.stringify(c)).join('\n') + '\n');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
