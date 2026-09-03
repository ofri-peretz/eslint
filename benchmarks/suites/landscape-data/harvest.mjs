#!/usr/bin/env node
/**
 * ILB-Landscape harvest — maintenance-velocity + registry facts for the
 * security-tool landscape table (leadership plan H#32 / H#33).
 *
 * Gathers, for every tool in the pinned competitor registry plus the 10
 * Interlace security plugins, from PUBLIC sources only ($0, no metered APIs):
 *
 *   - npm release dates + count over the trailing 12 months (registry `time` map)
 *   - GitHub release count over the trailing 12 months (REST /releases)
 *   - GitHub stars, pushed_at, license SPDX id, open-issue count
 *   - median issue first-response hours over the trailing 24 months (GraphQL), with n
 *
 * PRE-REGISTERED METRIC DEFINITIONS (frozen before the first run; changing any
 * of these bumps benchVersion):
 *
 *   npmReleasesLast12mo   Count of version entries in the npm registry `time`
 *                         map with publish date >= (runDate - 365d). Excludes
 *                         the synthetic `created`/`modified` keys. Deprecated
 *                         versions are NOT excluded (the registry does not
 *                         date deprecations; counting publishes is the neutral
 *                         definition applied identically to every tool).
 *   githubReleasesLast12mo Count of GitHub Releases with `published_at` >=
 *                         (runDate - 365d), drafts excluded, prereleases
 *                         INCLUDED (same rule for everyone), first 300.
 *   firstResponse         Over issues (not PRs) OPENED in the trailing 24
 *                         months, most recent 1000 max (truncation recorded):
 *                         hours from issue createdAt to the first comment
 *                         whose authorAssociation is MEMBER/OWNER/COLLABORATOR,
 *                         whose author login does not end in `[bot]` or `-bot`,
 *                         and whose author is not the issue author. Issues with
 *                         no qualifying comment are excluded from the median
 *                         but counted in `n` and reflected in `responseRate`.
 *                         Median + p90 reported; n always reported.
 *   Monorepos             (ours, SonarJS, Semgrep, CodeQL, DevSkim) are
 *                         measured at REPO level — issue/star/release metrics
 *                         describe the whole repo, footnoted via `repoLevel`.
 *   CodeQL                stars/issues from github/codeql; release cadence
 *                         from github/codeql-cli-binaries (the CLI users
 *                         install). Both slugs recorded on the row.
 *
 * Zero special-casing: the Interlace rows run through the exact same code
 * paths and filters as every competitor row.
 *
 * Usage:  node benchmarks/suites/landscape-data/harvest.mjs [--force]
 * Output: benchmarks/results/landscape-data/<YYYY-MM-DD>.json (append-only;
 *         refuses to overwrite an existing snapshot unless --force).
 *
 * Requirements: authenticated `gh` CLI (5,000 req/hr); network for
 * registry.npmjs.org. Deterministic given a point in time: no sampling,
 * no LLMs, stable sort order, fixed windows relative to the run date.
 */

import { execFileSync } from "node:child_process";
import { getToolchain } from "../../lib/toolchain.ts";
import { capturePreregistration } from "../../lib/preregister.ts";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../..");
const OUT_DIR = join(REPO_ROOT, "benchmarks/results/landscape-data");

const NOW = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;
const CUTOFF_12MO = new Date(NOW.getTime() - 365 * DAY_MS);
const CUTOFF_24MO = new Date(NOW.getTime() - 730 * DAY_MS);
const ISSUE_CAP = 1000; // most-recent issues considered for first-response
const SLEEP_MS = 500; // throttle between repos (rate-limit hygiene)

const MAINTAINER_ASSOC = new Set(["MEMBER", "OWNER", "COLLABORATOR"]);
const isBotLogin = (login) =>
  /\[bot\]$/i.test(login) || /-bot$/i.test(login) || /^(dependabot|renovate|github-actions|stale)/i.test(login);

/**
 * Pinned tool registry. Competitor ids/versions mirror
 * eslint-security-leadership/conditions/competitors.json (registryVersion 1.0.0,
 * retrieved 2026-07-31). Repo slugs pinned here for reproducibility.
 */
const TOOLS = [
  // ---- competitors ------------------------------------------------------
  { id: "eslint-plugin-security", group: "competitor", class: "eslint-plugin", npm: "eslint-plugin-security", repo: "eslint-community/eslint-plugin-security", repoLevel: false },
  { id: "security-node", group: "competitor", class: "eslint-plugin", npm: "eslint-plugin-security-node", repo: "gkouziik/eslint-plugin-security-node", repoLevel: false },
  { id: "ms-sdl", group: "competitor", class: "eslint-plugin", npm: "@microsoft/eslint-plugin-sdl", repo: "microsoft/eslint-plugin-sdl", repoLevel: false },
  { id: "no-unsanitized", group: "competitor", class: "eslint-plugin", npm: "eslint-plugin-no-unsanitized", repo: "mozilla/eslint-plugin-no-unsanitized", repoLevel: false },
  { id: "xss", group: "competitor", class: "eslint-plugin", npm: "eslint-plugin-xss", repo: "Rantanen/eslint-plugin-xss", repoLevel: false },
  { id: "sonarjs", group: "competitor", class: "eslint-plugin", npm: "eslint-plugin-sonarjs", repo: "SonarSource/SonarJS", repoLevel: true },
  { id: "semgrep-oss", group: "competitor", class: "standalone-sast", npm: null, repo: "semgrep/semgrep", repoLevel: true },
  { id: "codeql", group: "competitor", class: "standalone-sast", npm: null, repo: "github/codeql", releasesRepo: "github/codeql-cli-binaries", repoLevel: true },
  { id: "snyk-code-free", group: "competitor", class: "cloud-sast", npm: "snyk", repo: "snyk/cli", repoLevel: false },
  { id: "bearer", group: "competitor", class: "standalone-sast", npm: null, repo: "Bearer/bearer", repoLevel: false },
  { id: "njsscan", group: "competitor", class: "standalone-sast", npm: null, repo: "ajinabraham/njsscan", repoLevel: false },
  { id: "devskim", group: "competitor", class: "standalone-sast", npm: null, repo: "microsoft/DevSkim", repoLevel: true },
  // ---- Interlace security plugins (same code path, zero special-casing) --
  ...[
    "eslint-plugin-secure-coding",
    "eslint-plugin-browser-security",
    "eslint-plugin-node-security",
    "eslint-plugin-express-security",
    "eslint-plugin-lambda-security",
    "eslint-plugin-mongodb-security",
    "eslint-plugin-nestjs-security",
    "eslint-plugin-vercel-ai-security",
    "eslint-plugin-jwt-security",
    "eslint-plugin-postgresql-security",
  ].map((npm) => ({ id: npm, group: "interlace", class: "eslint-plugin", npm, repo: "ofri-peretz/eslint", repoLevel: true })),
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function gh(args, { allowFail = false } = {}) {
  try {
    return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    if (allowFail) return null;
    throw err;
  }
}

function ghJson(args, opts) {
  const out = gh(args, opts);
  return out === null ? null : JSON.parse(out);
}

async function fetchNpm(pkg) {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg).replace("%40", "@")}`, {
    headers: { accept: "application/json", "user-agent": "interlace-ilb-landscape-harvest" },
  });
  if (!res.ok) throw new Error(`npm registry ${pkg}: HTTP ${res.status}`);
  return res.json();
}

function npmVelocity(doc) {
  const time = doc.time ?? {};
  const versions = Object.entries(time)
    .filter(([k]) => k !== "created" && k !== "modified")
    .map(([version, date]) => ({ version, date }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const last12 = versions.filter((v) => new Date(v.date) >= CUTOFF_12MO);
  const latest = versions.at(-1) ?? null;
  return {
    npmPackage: doc.name,
    npmLicense: doc.license ?? null,
    npmLatestVersion: doc["dist-tags"]?.latest ?? null,
    npmLastPublish: latest?.date ?? null,
    npmReleasesLast12mo: last12.length,
    npmReleaseDatesLast12mo: last12.map((v) => `${v.version}@${v.date.slice(0, 10)}`),
    npmTotalVersions: versions.length,
  };
}

function repoFacts(slug) {
  const r = ghJson(["api", `repos/${slug}`], { allowFail: true });
  if (!r) return { repo: slug, error: "repo fetch failed" };
  return {
    repo: slug,
    stars: r.stargazers_count,
    pushedAt: r.pushed_at,
    createdAt: r.created_at,
    openIssuesCount: r.open_issues_count, // NOTE: GitHub includes open PRs in this count
    archived: r.archived,
    licenseSpdx: r.license?.spdx_id ?? null,
  };
}

function githubReleasesLast12mo(slug) {
  let count = 0;
  let first = null;
  let last = null;
  for (let page = 1; page <= 3; page++) {
    const rel = ghJson(["api", `repos/${slug}/releases?per_page=100&page=${page}`], { allowFail: true });
    if (!rel) return { githubReleasesLast12mo: null, note: "releases fetch failed" };
    for (const r of rel) {
      if (r.draft || !r.published_at) continue;
      if (new Date(r.published_at) >= CUTOFF_12MO) {
        count++;
        last = last ?? r.published_at; // list is newest-first
        first = r.published_at;
      }
    }
    if (rel.length < 100) break;
  }
  return { githubReleasesLast12mo: count, githubReleaseWindow: first ? { oldest: first, newest: last } : null };
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const p90 = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(0.9 * s.length) - 1)];
};
const round1 = (x) => (x === null ? null : Math.round(x * 10) / 10);

function firstResponse(slug) {
  const [owner, name] = slug.split("/");
  const query = `query($owner:String!,$name:String!,$cursor:String){
    repository(owner:$owner,name:$name){
      issues(states:[OPEN,CLOSED],first:100,after:$cursor,orderBy:{field:CREATED_AT,direction:DESC}){
        pageInfo{hasNextPage endCursor}
        nodes{number createdAt author{login}
          comments(first:10){nodes{createdAt authorAssociation author{login}}}}}}}`;
  let cursor = null;
  let scanned = 0;
  let truncated = false;
  const hours = [];
  let inWindow = 0;
  while (true) {
    const args = ["api", "graphql", "-f", `query=${query}`, "-f", `owner=${owner}`, "-f", `name=${name}`];
    if (cursor) args.push("-f", `cursor=${cursor}`);
    const data = ghJson(args, { allowFail: true });
    const conn = data?.data?.repository?.issues;
    if (!conn) return { medianFirstResponseHours: null, p90FirstResponseHours: null, n: 0, responseRate: null, note: "graphql fetch failed" };
    let pastWindow = false;
    for (const issue of conn.nodes) {
      scanned++;
      const created = new Date(issue.createdAt);
      if (created < CUTOFF_24MO) {
        pastWindow = true;
        continue;
      }
      inWindow++;
      const issueAuthor = issue.author?.login ?? "";
      const resp = issue.comments.nodes.find(
        (c) =>
          MAINTAINER_ASSOC.has(c.authorAssociation) &&
          c.author?.login &&
          c.author.login !== issueAuthor &&
          !isBotLogin(c.author.login),
      );
      if (resp) hours.push((new Date(resp.createdAt) - created) / 36e5);
    }
    if (pastWindow || !conn.pageInfo.hasNextPage) break;
    if (scanned >= ISSUE_CAP) {
      truncated = true;
      break;
    }
    cursor = conn.pageInfo.endCursor;
  }
  return {
    medianFirstResponseHours: round1(median(hours)),
    p90FirstResponseHours: round1(p90(hours)),
    n: inWindow,
    responded: hours.length,
    responseRate: inWindow ? Math.round((hours.length / inWindow) * 1000) / 1000 : null,
    truncatedAtCap: truncated,
  };
}

async function harvestTool(tool, repoCache) {
  process.stderr.write(`→ ${tool.id}\n`);
  const row = { id: tool.id, group: tool.group, class: tool.class, repoLevel: tool.repoLevel };

  if (tool.npm) {
    try {
      Object.assign(row, npmVelocity(await fetchNpm(tool.npm)));
    } catch (err) {
      row.npmError = String(err.message ?? err);
    }
  } else {
    row.npmPackage = null;
  }

  const slug = tool.repo;
  if (!repoCache.has(slug)) {
    const facts = repoFacts(slug);
    await sleep(SLEEP_MS);
    const releasesSlug = tool.releasesRepo ?? slug;
    const releases = githubReleasesLast12mo(releasesSlug);
    if (tool.releasesRepo) releases.releasesRepo = tool.releasesRepo;
    await sleep(SLEEP_MS);
    const fr = firstResponse(slug);
    repoCache.set(slug, { ...facts, ...releases, firstResponse: fr });
  }
  // No cached-path branch for tool.releasesRepo: the cache key is the issues repo,
  // and the only tool with a distinct releasesRepo (codeql) always takes the
  // uncached path above, so there is nothing left to do on a cache hit.
  row.github = repoCache.get(slug);
  return row;
}

// Toolchain detection is deliberately NOT reimplemented here. The first
// version of this file rolled its own and emitted `eslint: null,
// typescript: null, tsCompiler: "unknown"`, which validateToolchain() counts
// as three fatal issues — the run has to happen in a checkout with deps
// installed. Use the one shared implementation (roadmap item 1.14).

async function main() {
  const force = process.argv.includes("--force");
  const dateStr = NOW.toISOString().slice(0, 10);
  const outPath = join(OUT_DIR, `${dateStr}.json`);
  if (existsSync(outPath) && !force) {
    console.error(`Refusing to overwrite ${outPath} (append-only). Use --force to redo today's snapshot.`);
    process.exit(1);
  }

  const rateBefore = ghJson(["api", "rate_limit"], { allowFail: true })?.resources;
  const repoCache = new Map();
  const rows = [];
  for (const tool of TOOLS) {
    rows.push(await harvestTool(tool, repoCache));
    await sleep(SLEEP_MS);
  }

  // `methodologyCommit` alone is a branch SHA that squash-merge drops; the
  // `methodologyHash` pair is the receipt a reader can actually resolve from a
  // clone. Both come from the one shared helper — never re-derived per suite.
  const prereg = capturePreregistration({ allowDirty: true, entrypoint: import.meta.url });

  const envelope = {
    bench: "ILB-Landscape",
    benchVersion: "1.0",
    timestamp: NOW.toISOString(),
    methodologyCommit: prereg.methodologyCommit,
    methodologyHash: prereg.methodologyHash,
    methodologyPaths: prereg.methodologyPaths,
    toolchain: getToolchain(),
    landscape: {
      registry: "eslint-security-leadership/conditions/competitors.json@1.0.0 (retrieved 2026-07-31)",
      windows: {
        releases: { months: 12, cutoff: CUTOFF_12MO.toISOString() },
        firstResponse: { months: 24, cutoff: CUTOFF_24MO.toISOString(), issueCap: ISSUE_CAP },
      },
      filters: {
        maintainerAssociations: [...MAINTAINER_ASSOC],
        botExclusion: "login ends in [bot]/-bot or starts with dependabot|renovate|github-actions|stale",
        selfResponseExcluded: true,
      },
      caveats: [
        "openIssuesCount from the GitHub repos API includes open pull requests.",
        "repoLevel:true rows measure the whole (mono)repo, not one package.",
        "codeql: issues/stars from github/codeql; release cadence from github/codeql-cli-binaries.",
        "GitHub contributors/issue APIs exclude anonymous authors.",
      ],
      tools: rows,
    },
    rateLimit: rateBefore ? { coreRemainingBefore: rateBefore.core?.remaining, graphqlRemainingBefore: rateBefore.graphql?.remaining } : null,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(envelope, null, 2)}\n`);
  console.log(`Wrote ${outPath} (${rows.length} tools)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
