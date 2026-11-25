#!/usr/bin/env tsx
/**
 * review-hit-rate.ts: how often the Claude PR reviewer says something the author acts on.
 *
 * A finding is ACTED ON when a later commit on the same PR touches the file the comment is on.
 * That is a proxy: a touch can be unrelated, and a finding can be answered with a reply instead of
 * a change. It is still the one signal a program can read without judging the text. Whether a
 * finding repeats what a gate already reports is a reader's call; `--dump` writes the comments as
 * JSONL for that labelling. Baseline and comparison live in docs/REVIEW_HIT_RATE.md.
 *
 *   npx tsx scripts/review-hit-rate.ts --last 10            # the 10 most recent merged PRs
 *   npx tsx scripts/review-hit-rate.ts --prs 1790,1791 --dump out.jsonl
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REVIEWER = 'claude[bot]';

export interface ReviewComment {
  pr: number;
  path: string;
  createdAt: string;
  body: string;
}
export interface PrCommit {
  date: string;
  files: string[];
}

/**
 * The reviewer posts most findings in its one summary comment, each citing `path:line` in
 * backticks. One distinct path:line is one finding.
 */
export function findingsInSummary(
  pr: number,
  body: string,
  createdAt: string,
): ReviewComment[] {
  const seen = new Set<string>();
  const out: ReviewComment[] = [];
  for (const m of body.matchAll(/`([\w@./-]+\.[a-z]{1,5}):(\d+)(?:-\d+)?`/gu)) {
    const key = `${m[1]}:${m[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // Keep the text around the citation so a reader can label the finding from the dump.
    const at = m.index ?? 0;
    out.push({
      pr,
      path: m[1]!,
      createdAt,
      body: body.slice(Math.max(0, at - 300), at + 400),
    });
  }
  return out;
}

/** A comment is acted on when a commit dated after it touches its file. */
export function isActedOn(c: ReviewComment, commits: PrCommit[]): boolean {
  // The summary sometimes cites a bare file name; match it as a path suffix.
  const same = (f: string) => f === c.path || f.endsWith(`/${c.path}`);
  return commits.some((k) => k.date > c.createdAt && k.files.some(same));
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
    {
      encoding: 'utf8',
    },
  ).trim();
}

function lastMergedPrs(n: number): number[] {
  // Bot PRs (release, data sync) are never reviewed; skip them so `--last 10` means 10 reviews.
  const out = execFileSync(
    'gh',
    [
      'pr',
      'list',
      '--state',
      'merged',
      '-L',
      String(n * 3),
      '--json',
      'number,author',
      '-q',
      '.[] | select(.author.is_bot | not) | .number',
    ],
    { encoding: 'utf8' },
  );
  return out.trim().split('\n').filter(Boolean).map(Number).slice(0, n);
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
    const comments = (
      gh(`repos/${r}/pulls/${pr}/comments`) as {
        user: { login: string };
        path: string;
        created_at: string;
        body: string;
      }[]
    )
      .filter((c) => c.user.login === REVIEWER)
      .map((c) => ({
        pr,
        path: c.path,
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
        comments.push(...findingsInSummary(pr, s.body, s.updated_at));
      }
    }
    if (comments.length === 0) continue;
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
    for (const c of comments) all.push({ ...c, acted: isActedOn(c, commits) });
  }

  const acted = all.filter((c) => c.acted).length;
  const pct = all.length ? Math.round((100 * acted) / all.length) : 0;
  console.log(
    `PRs ${prs.length} (${prs[prs.length - 1]}..${prs[0]}), reviewer findings ${all.length}, ` +
      `acted on ${acted} (${pct}%)`,
  );
  const dump = at('--dump');
  if (dump)
    writeFileSync(dump, all.map((c) => JSON.stringify(c)).join('\n') + '\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
