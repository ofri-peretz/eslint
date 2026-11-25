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
// `--last n` picks from this many most recently CREATED merged PRs, sorted by merge time. A PR
// created more than this many PRs before the newest one and merged among the last n is missed.
const CANDIDATES = 200;

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
 * backticks. A file name without an extension (Dockerfile, CODEOWNERS) counts; a name without a
 * line (a files-read list) does not.
 */
export function findingsInSummary(
  pr: number,
  body: string,
  createdAt: string,
): ReviewComment[] {
  const out: ReviewComment[] = [];
  for (const m of body.matchAll(/`([\w@./-]+):(\d+)(?:-\d+)?`/gu)) {
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

/** The PR file a citation means: itself, or the one PR file it is the tail of. Ambiguous is null. */
export function resolvePath(path: string, prFiles: string[]): string | null {
  if (prFiles.includes(path)) return path;
  const tails = prFiles.filter((f) => f.endsWith(`/${path}`));
  return tails.length === 1 ? tails[0]! : null;
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

function lastMergedPrs(n: number): number[] {
  // Bot PRs (release, data sync) are never reviewed; skip them so `--last 10` means 10 reviews.
  const list = JSON.parse(
    execFileSync(
      'gh',
      [
        'pr',
        'list',
        '--state',
        'merged',
        '-L',
        String(CANDIDATES),
        '--json',
        'number,author,mergedAt',
      ],
      { encoding: 'utf8' },
    ),
  ) as { number: number; author: { is_bot: boolean }; mergedAt: string }[];
  return list
    .filter((p) => !p.author.is_bot)
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))
    .slice(0, n)
    .map((p) => p.number);
}

function main(): void {
  const args = process.argv.slice(2);
  const at = (f: string) => {
    const i = args.indexOf(f);
    return i < 0 ? undefined : args[i + 1];
  };
  const prs = at('--prs')
    ? at('--prs')!.split(',').map(Number)
    : lastMergedPrs(Number(at('--last') ?? 10));
  const r = repo();
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
    const prFiles = (
      gh(`repos/${r}/pulls/${pr}/files`) as { filename: string }[]
    ).map((f) => f.filename);
    const commits = (
      gh(`repos/${r}/pulls/${pr}/commits`) as {
        sha: string;
        commit: { committer: { date: string } };
      }[]
    )
      .filter((k) =>
        comments.some((c) => k.commit.committer.date > c.createdAt),
      )
      .map((k) => ({
        date: k.commit.committer.date,
        files: (
          gh(`repos/${r}/commits/${k.sha}`) as {
            files: { filename: string }[];
          }[]
        ).flatMap((x) => x.files.map((f) => f.filename)),
      }));
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
