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
 *   npx tsx scripts/review-hit-rate.ts --reviewer 'coderabbitai[bot]' --repo ofri-peretz/interlace --last 10
 *   npx tsx scripts/review-hit-rate.ts --compare baseline.jsonl after.jsonl  # labelled dumps
 *   npx tsx scripts/review-hit-rate.ts --kappa docs/review-hit-rate/human-sample.jsonl
 *
 * Every rate carries a 95% Wilson interval: 8/20 is 40% (22-61%), and a comparison only calls a
 * change when the two intervals do not overlap.
 *
 * A reply inside a review thread is a follow-up to a finding, not a new one; only thread
 * openers count.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

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
  bot: boolean;
}

/**
 * The n latest-merged non-bot PRs. Given every PR, so no paging order can hide one; a PR
 * listed twice (a page shifted while it was read) counts once.
 */
export function latestMerged(prs: ClosedPr[], n: number): number[] {
  const byNumber = new Map(prs.map((p) => [p.number, p]));
  return [...byNumber.values()]
    .filter((p) => p.mergedAt !== null && !p.bot)
    .sort((x, y) => y.mergedAt!.localeCompare(x.mergedAt!))
    .slice(0, n)
    .map((p) => p.number);
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

/** 95% Wilson score interval for k successes out of n. */
export function wilson(k: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1];
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

const pct = (x: number) => `${Math.round(100 * x)}%`;

/** "8/20 = 40% (22–61%)". */
export function rate(k: number, n: number): string {
  const [lo, hi] = wilson(k, n);
  return `${k}/${n} = ${n ? pct(k / n) : 'n/a'} (${Math.round(100 * lo)}–${pct(hi)})`;
}

export type Verdict = 'improved' | 'worse' | 'no detectable change';

/** A change is called only when the two 95% intervals do not overlap. */
export function verdict(
  before: { k: number; n: number },
  after: { k: number; n: number },
): Verdict {
  const [bLo, bHi] = wilson(before.k, before.n);
  const [aLo, aHi] = wilson(after.k, after.n);
  if (aLo > bHi) return 'improved';
  if (aHi < bLo) return 'worse';
  return 'no detectable change';
}

/** Cohen's kappa between two raters' labels for the same items. */
export function kappa(a: string[], b: string[]): number {
  if (a.length !== b.length || a.length === 0) {
    throw new Error('kappa needs two equal, non-empty label lists');
  }
  const n = a.length;
  const observed = a.filter((x, i) => x === b[i]).length / n;
  const labels = [...new Set([...a, ...b])];
  const expected = labels.reduce(
    (sum, l) =>
      sum +
      (a.filter((x) => x === l).length / n) *
        (b.filter((x) => x === l).length / n),
    0,
  );
  return expected === 1 ? 1 : (observed - expected) / (1 - expected);
}

/** The reviewer model a claude-code-review.yml asks for (`--model x`), or null. */
export function modelFromWorkflow(text: string): string | null {
  return /--model\s+([\w.-]+)/.exec(text)?.[1] ?? null;
}

interface Labelled {
  label?: string;
  model?: string | null;
  promptSha?: string | null;
}

/** Signal share of two labelled dumps, refusing to mix reviewer models or prompts. */
export function compareDumps(before: Labelled[], after: Labelled[]): string {
  const keyOf = (rows: Labelled[]) => [
    ...new Set(
      rows.filter((r) => r.model).map((r) => `${r.model}@${r.promptSha}`),
    ),
  ];
  const unlabelled = [...before, ...after].filter((r) => !r.label).length;
  if (unlabelled) throw new Error(`${unlabelled} row(s) have no label`);
  const bk = keyOf(before).join(',');
  const ak = keyOf(after).join(',');
  if (keyOf(before).length > 1 || keyOf(after).length > 1) {
    throw new Error(
      `mixed reviewer model or prompt within a dump: ${bk} | ${ak}`,
    );
  }
  const judged = (rows: Labelled[]) => ({
    k: rows.filter((r) => r.label === 'judgment').length,
    n: rows.length,
  });
  const b = judged(before);
  const a = judged(after);
  return [
    `signal share before ${rate(b.k, b.n)}${bk ? ` [${bk}]` : ''}`,
    `signal share after  ${rate(a.k, a.n)}${ak ? ` [${ak}]` : ''}`,
    `verdict: ${verdict(b, a)}`,
  ].join('\n');
}

const readJsonl = (file: string) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, unknown>);

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

/**
 * Every PR in CREATION order. A PR never leaves `state=all` (closing, reopening and merging only
 * change its fields), and the order only changes when a PR is opened, which pushes rows down: a
 * duplicate, deduplicated, never a skipped row. `state=closed` lost a row when a PR was reopened
 * mid-read; sorting by update or merge time let rows jump pages.
 */
export const PR_LIST =
  'pulls?state=all&sort=created&direction=desc&per_page=100';

/** Reads pages 1, 2, … until one comes back short. */
export function readAllPages<T>(
  fetchPage: (page: number) => T[],
  perPage = 100,
): T[] {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const batch = fetchPage(page);
    rows.push(...batch);
    if (batch.length < perPage) return rows;
  }
}

function lastMergedPrs(r: string, n: number): number[] {
  // Bot PRs (release, data sync) are never reviewed.
  const all = readAllPages(
    (page) =>
      JSON.parse(
        execFileSync('gh', ['api', `repos/${r}/${PR_LIST}&page=${page}`], {
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
        }),
      ) as {
        number: number;
        merged_at: string | null;
        user: { type: string };
      }[],
  );
  return latestMerged(
    all.map((p) => ({
      number: p.number,
      mergedAt: p.merged_at,
      bot: p.user.type === 'Bot',
    })),
    n,
  );
}

function main(): void {
  const args = process.argv.slice(2);
  const at = (f: string) => {
    const i = args.indexOf(f);
    return i < 0 ? undefined : args[i + 1];
  };
  if (args.includes('--compare')) {
    const i = args.indexOf('--compare');
    console.log(compareDumps(readJsonl(args[i + 1]!), readJsonl(args[i + 2]!)));
    return;
  }
  if (at('--kappa')) {
    const rows = readJsonl(at('--kappa')!) as {
      label: string;
      humanLabel: string | null;
    }[];
    const done = rows.filter((r) => r.humanLabel);
    if (done.length < rows.length) {
      console.log(
        `${rows.length - done.length} of ${rows.length} rows still need a humanLabel`,
      );
      process.exitCode = 1;
      return;
    }
    const disagree = done.filter((r) => r.label !== r.humanLabel).length;
    console.log(
      `kappa ${kappa(
        done.map((r) => r.label),
        done.map((r) => r.humanLabel!),
      ).toFixed(2)} ` +
        `over ${done.length} findings, ${disagree} disagreement(s)`,
    );
    return;
  }
  const r = at('--repo') ?? repo();
  const reviewer = at('--reviewer') ?? 'claude[bot]';
  const prs = at('--prs')
    ? at('--prs')!.split(',').map(Number)
    : lastMergedPrs(r, Number(at('--last') ?? 10));
  const all: (ReviewComment & {
    acted: boolean;
    model: string | null;
    promptSha: string | null;
  })[] = [];

  for (const pr of prs) {
    const found = (
      gh(`repos/${r}/pulls/${pr}/comments`) as {
        user: { login: string };
        path: string;
        line: number | null;
        original_line: number | null;
        in_reply_to_id?: number;
        created_at: string;
        body: string;
      }[]
    )
      .filter((c) => c.user.login === reviewer && !c.in_reply_to_id)
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
      if (s.user.login === reviewer) {
        found.push(...findingsInSummary(pr, s.body, s.updated_at));
      }
    }
    const comments = dedupe(found);
    if (comments.length === 0) continue;
    // What reviewed this PR: the reviewer config as of the PR's head, so a baseline and a
    // comparison taken under different prompts or models are never mixed.
    const head = (
      gh(`repos/${r}/pulls/${pr}`) as { head: { sha: string } }[]
    )[0]!.head.sha;
    const config =
      reviewer === 'claude[bot]'
        ? '.github/workflows/claude-code-review.yml'
        : '.coderabbit.yaml';
    const promptSha =
      (
        gh(`repos/${r}/commits?path=${config}&sha=${head}&per_page=1`) as {
          sha: string;
        }[]
      )[0]?.sha.slice(0, 9) ?? null;
    let model: string | null = reviewer;
    if (reviewer === 'claude[bot]' && promptSha) {
      const file = gh(`repos/${r}/contents/${config}?ref=${promptSha}`) as {
        content: string;
      }[];
      model = modelFromWorkflow(
        Buffer.from(file[0]!.content, 'base64').toString('utf8'),
      );
    }
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
      all.push({
        ...c,
        acted: isActedOn(c, commits, prFiles),
        model,
        promptSha,
      });
    }
  }

  const acted = all.filter((c) => c.acted).length;
  console.log(
    `PRs ${prs.length} (${Math.min(...prs)}..${Math.max(...prs)}), reviewer findings ${all.length}, ` +
      `acted on ${rate(acted, all.length)}`,
  );
  const dump = at('--dump');
  if (dump) {
    writeFileSync(dump, all.map((c) => JSON.stringify(c)).join('\n') + '\n');
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
