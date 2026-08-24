#!/usr/bin/env tsx
/**
 * Builds a queryable index of the cloned open-source corpus so benchmark
 * suites can select repos by criteria instead of hardcoding paths.
 *
 * Read-only with respect to the corpus: never writes inside CORPUS_ROOT.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { homedir } from 'node:os';

export const CORPUS_ROOT =
  process.env.CORPUS_ROOT ?? join(homedir(), 'repos/ofriperetz.dev/oos');

/** Extensions counted toward LOC. Others are tallied by git as files only. */
const CODE_EXTENSIONS = [
  'ts',
  'tsx',
  'mts',
  'cts',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'vue',
  'svelte',
  'astro',
  'json',
  'jsonc',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'php',
  'cs',
  'sh',
  'bash',
  'zsh',
  'sql',
  'graphql',
  'gql',
  'css',
  'scss',
  'less',
  'html',
  'md',
  'mdx',
  'yml',
  'yaml',
] as const;

export interface LanguageStat {
  files: number;
  loc: number;
}

/** npm package name -> the ecosystem it signals. */
const FRAMEWORK_MARKERS: Record<string, string> = {
  '@nestjs/core': 'nest',
  '@nestjs/common': 'nest',
  '@nestjs/jwt': 'nest',
  express: 'express',
  react: 'react',
  'react-dom': 'react',
  next: 'next',
  'aws-lambda': 'lambda',
  '@types/aws-lambda': 'lambda',
  serverless: 'lambda',
  '@aws-sdk/client-lambda': 'lambda',
  mongodb: 'mongodb',
  mongoose: 'mongodb',
  ai: 'vercel-ai',
  '@ai-sdk/openai': 'vercel-ai',
  '@ai-sdk/anthropic': 'vercel-ai',
  '@ai-sdk/react': 'vercel-ai',
  pg: 'postgresql',
  postgres: 'postgresql',
  jsonwebtoken: 'jwt',
  jose: 'jwt',
  'passport-jwt': 'jwt',
  'drizzle-orm': 'drizzle',
  knex: 'knex',
  mysql: 'mysql',
  mysql2: 'mysql',
  prisma: 'prisma',
  '@prisma/client': 'prisma',
  sequelize: 'sequelize',
  sqlite3: 'sqlite',
  'better-sqlite3': 'sqlite',
  typeorm: 'typeorm',
  openai: 'openai',
  '@google/generative-ai': 'gemini',
  '@google/genai': 'gemini',
  '@anthropic-ai/sdk': 'anthropic',
  '@modelcontextprotocol/sdk': 'mcp-sdk',
};

/** Ecosystem -> the plugins that specifically target it. */
const FRAMEWORK_PLUGINS: Record<string, string[]> = {
  nest: ['eslint-plugin-nestjs-security'],
  express: ['eslint-plugin-express-security'],
  react: [
    'eslint-plugin-react-a11y',
    'eslint-plugin-react-features',
    'eslint-plugin-browser-security',
  ],
  next: [
    'eslint-plugin-react-a11y',
    'eslint-plugin-react-features',
    'eslint-plugin-browser-security',
  ],
  lambda: ['eslint-plugin-lambda-security'],
  mongodb: ['eslint-plugin-mongodb-security'],
  'vercel-ai': ['eslint-plugin-vercel-ai-security'],
  postgresql: ['eslint-plugin-postgresql-security'],
  jwt: ['eslint-plugin-jwt-security'],
  drizzle: ['eslint-plugin-drizzle-security'],
  knex: ['eslint-plugin-knex-security'],
  mysql: ['eslint-plugin-mysql-security'],
  prisma: ['eslint-plugin-prisma-security'],
  sequelize: ['eslint-plugin-sequelize-security'],
  sqlite: ['eslint-plugin-sqlite-security'],
  typeorm: ['eslint-plugin-typeorm-security'],
  openai: ['eslint-plugin-openai-security'],
  gemini: ['eslint-plugin-gemini-security'],
  anthropic: ['eslint-plugin-anthropic-security'],
  'mcp-sdk': ['eslint-plugin-mcp-sdk-security'],
};

/** Applies to any repo containing JS/TS, regardless of framework. */
const UNIVERSAL_PLUGINS = [
  'eslint-plugin-secure-coding',
  'eslint-plugin-node-security',
  'eslint-plugin-maintainability',
  'eslint-plugin-reliability',
  'eslint-plugin-modernization',
  'eslint-plugin-conventions',
  'eslint-plugin-modularity',
  'eslint-plugin-operability',
  'eslint-plugin-import-next',
];

const JS_TS_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
];

const LOCKFILES: Record<string, string> = {
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'bun.lockb': 'bun',
  'package-lock.json': 'npm',
};

export interface RepoEntry {
  name: string;
  path: string;
  remote: string | null;
  defaultBranch: string | null;
  lastCommit: string | null;
  totalFiles: number;
  totalLoc: number;
  languages: Record<string, LanguageStat>;
  packageManager: string | null;
  hasTypeScript: boolean;
  isMonorepo: boolean;
  /** Ecosystems detected from dependencies, unioned across all workspaces. */
  frameworks: string[];
  /** Plugins worth running against this repo. Universal + framework-specific. */
  applicablePlugins: string[];
  /** "owner/repo" when the remote is GitHub, else null. */
  githubSlug: string | null;
  /** null when never fetched, the remote is not GitHub, or the API call failed. */
  stars: number | null;
  archived: boolean | null;
  /** Non-fatal problems hit while indexing this repo. */
  warnings: string[];
}

function git(repo: string, args: string[]): string | null {
  try {
    return execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 256 * 1024 * 1024,
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Tracked-file count. Using git rather than a filesystem walk skips
 * node_modules/dist/build for free and is dramatically faster over 35 GB.
 */
function countTrackedFiles(repo: string): number {
  const out = git(repo, ['ls-files', '-z']);
  if (out === null) return 0;
  return out.split('\0').filter(Boolean).length;
}

/**
 * LOC per extension, via one batched `wc -l` per repo.
 *
 * Reading all 462k corpus files individually from Node was ~100x slower than
 * letting the OS do it; the whole corpus costs ~5min this way.
 *
 * Deliberately sequential: `xargs -P 8` exhausted the process table on a
 * 14-core machine ("fork: Resource temporarily unavailable") and wedged
 * unrelated shells. Parallelism bought nothing -- wc here is I/O bound.
 *
 * Filenames containing newlines would be miscounted; the corpus has none.
 */
function countByExtension(
  repo: string,
  warnings: string[],
): Record<string, LanguageStat> {
  const exts = CODE_EXTENSIONS.join('|');
  const pipeline =
    `git ls-files -z | tr '\\0' '\\n' | grep -iE '\\.(${exts})$' ` +
    `| tr '\\n' '\\0' | xargs -0 -n 4000 wc -l 2>/dev/null`;

  // spawnSync, not execFileSync: xargs exits 123 when any single `wc` fails
  // (e.g. a tracked file that no longer exists on disk). That is a partial
  // result, not a failure -- throwing it away zeroed out whole repos.
  const res = spawnSync('bash', ['-c', pipeline], {
    cwd: repo,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
  });
  const out = res.stdout ?? '';
  if (res.status !== 0)
    warnings.push(`wc exited ${res.status}; counts may be partial`);

  // A repo whose git index is empty yields zero lines here and reports as
  // `totalFiles: 0, totalLoc: 0` with nothing to say it went wrong. That is
  // the shape CLAUDE.md warns about -- a clean result and a broken scan look
  // identical. `oos/tinymce` is the corpus case: 15 MB on disk, a Gruntfile,
  // an eslint.config.ts and a modules/ tree, and `git ls-files` returns
  // nothing. Refuse to report a silent zero.
  if (out.trim() === '' && res.status === 0) {
    const tracked = spawnSync('bash', ['-c', 'git ls-files | head -1'], {
      cwd: repo,
      encoding: 'utf8',
    });
    if ((tracked.stdout ?? '').trim() === '') {
      warnings.push(
        'git index is empty -- nothing tracked, so file and LOC counts are 0 ' +
          'regardless of what is on disk; re-clone or `git reset` this repo',
      );
    }
  }

  const languages: Record<string, LanguageStat> = {};
  for (const line of out.split('\n')) {
    const m = /^\s*(\d+)\s+(.+)$/.exec(line);
    if (!m) continue;
    const file = m[2].trim();
    if (file === 'total') continue; // one per xargs batch
    const ext = extname(file).toLowerCase();
    if (!ext) continue;
    const stat = (languages[ext] ??= { files: 0, loc: 0 });
    stat.files++;
    stat.loc += Number(m[1]);
  }
  return languages;
}

/**
 * Union dependencies across every package.json git tracks, not just the root:
 * in a monorepo the root manifest often declares nothing but tooling.
 * Capped so a repo like DefinitelyTyped cannot dominate the run.
 */
function detectPackageFacts(repo: string, warnings: string[]) {
  const listed = git(repo, ['ls-files', '-z', '*package.json', 'package.json']);
  const manifests = (listed ?? '').split('\0').filter(Boolean);
  const CAP = 200;
  if (manifests.length > CAP) {
    warnings.push(
      `${manifests.length} package.json files; scanned first ${CAP}`,
    );
  }

  const frameworks = new Set<string>();
  let isMonorepo = false;

  for (const rel of manifests.slice(0, CAP)) {
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(readFileSync(join(repo, rel), 'utf8'));
    } catch {
      continue; // a malformed manifest is not a reason to fail the repo
    }
    if (rel === 'package.json' && pkg.workspaces) isMonorepo = true;
    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
    ]) {
      const deps = pkg[field];
      if (!deps || typeof deps !== 'object') continue;
      for (const dep of Object.keys(deps)) {
        const fw = FRAMEWORK_MARKERS[dep];
        if (fw) frameworks.add(fw);
      }
    }
  }

  const packageManager =
    Object.entries(LOCKFILES).find(([f]) => existsSync(join(repo, f)))?.[1] ??
    null;

  if (existsSync(join(repo, 'pnpm-workspace.yaml'))) isMonorepo = true;

  return {
    packageManager,
    hasTypeScript: existsSync(join(repo, 'tsconfig.json')),
    isMonorepo,
    frameworks: [...frameworks].sort(),
  };
}

/** Plugin package names that actually exist on disk, for validating the map. */
export function realPluginNames(repoRoot: string): Set<string> {
  const dir = join(repoRoot, 'packages');
  const names = new Set<string>();
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    try {
      const pkg = JSON.parse(
        readFileSync(join(dir, d.name, 'package.json'), 'utf8'),
      );
      if (typeof pkg.name === 'string') names.add(pkg.name);
    } catch {
      /* not a package */
    }
  }
  return names;
}

export function applicablePluginsFor(
  frameworks: string[],
  languages: Record<string, LanguageStat>,
): string[] {
  const hasJsTs = JS_TS_EXTENSIONS.some((e) => (languages[e]?.files ?? 0) > 0);
  if (!hasJsTs) return [];
  const plugins = new Set(UNIVERSAL_PLUGINS);
  for (const fw of frameworks) {
    for (const p of FRAMEWORK_PLUGINS[fw] ?? []) plugins.add(p);
  }
  return [...plugins].sort();
}

export function indexRepo(root: string, name: string): RepoEntry {
  const path = join(root, name);
  const warnings: string[] = [];

  const isRepo = git(path, ['rev-parse', '--git-dir']) !== null;
  if (!isRepo) warnings.push('not a git repository');

  const remote = git(path, ['remote', 'get-url', 'origin']);
  if (isRepo && !remote) warnings.push('no origin remote');

  const headRef = git(path, [
    'symbolic-ref',
    '--short',
    'refs/remotes/origin/HEAD',
  ]);
  const defaultBranch =
    headRef?.replace(/^origin\//, '') ??
    git(path, ['rev-parse', '--abbrev-ref', 'HEAD']);

  const lastCommit = git(path, ['log', '-1', '--format=%cI']);

  const totalFiles = isRepo ? countTrackedFiles(path) : 0;
  const languages = isRepo ? countByExtension(path, warnings) : {};
  const totalLoc = Object.values(languages).reduce((n, l) => n + l.loc, 0);

  const pkgFacts = isRepo
    ? detectPackageFacts(path, warnings)
    : {
        packageManager: null,
        hasTypeScript: false,
        isMonorepo: false,
        frameworks: [],
      };

  const applicablePlugins = applicablePluginsFor(
    pkgFacts.frameworks,
    languages,
  );
  const githubSlug = parseGitHubSlug(remote);

  return {
    name,
    path,
    remote,
    defaultBranch,
    lastCommit,
    totalFiles,
    totalLoc,
    languages,
    ...pkgFacts,
    applicablePlugins,
    githubSlug,
    stars: null,
    archived: null,
    warnings,
  };
}

/** Accepts git@github.com:o/r.git, https://github.com/o/r.git, ssh://... */
export function parseGitHubSlug(remote: string | null): string | null {
  if (!remote) return null;
  const m = /github\.com[:/]+([^/]+)\/(.+?)(?:\.git)?\/?$/.exec(remote.trim());
  return m ? `${m[1]}/${m[2]}` : null;
}

export interface GitHubFacts {
  stars: number | null;
  archived: boolean | null;
  fetchedAt: string;
}

/**
 * Enrich entries with GitHub stars/archived state.
 *
 * Separate from indexRepo so local indexing stays network-free and testable.
 * Cached by slug: a re-run costs zero API calls. Individual failures (404 on a
 * renamed repo, a rate-limited window) degrade that one entry to null rather
 * than failing the run -- 161 repos is too many to lose to one bad remote.
 */
export function enrichWithGitHub(
  entries: RepoEntry[],
  cachePath: string,
  opts: {
    onProgress?: (done: number, total: number, slug: string) => void;
  } = {},
): { fetched: number; cached: number; failed: number } {
  // Read and let it throw rather than asking whether the file exists first.
  // The `existsSync` was a check-then-use on a path this function then writes
  // (CodeQL `js/file-system-race`), and it bought nothing: the `catch` already
  // has to handle unreadable and unparseable, and a missing file is just one
  // more way to be unreadable. One syscall, one branch, no window.
  let cache: Record<string, GitHubFacts> = {};
  try {
    cache = JSON.parse(readFileSync(cachePath, 'utf8'));
  } catch {
    cache = {};
  }

  let fetched = 0,
    cached = 0,
    failed = 0,
    rateLimited = false;
  const targets = entries.filter((e) => e.githubSlug);

  targets.forEach((entry, i) => {
    const slug = entry.githubSlug!;
    opts.onProgress?.(i + 1, targets.length, slug);

    if (cache[slug]) {
      entry.stars = cache[slug].stars;
      entry.archived = cache[slug].archived;
      cached++;
      return;
    }
    if (rateLimited) {
      failed++;
      return;
    }

    const res = spawnSync(
      'gh',
      [
        'api',
        `repos/${slug}`,
        '--jq',
        '{stars: .stargazers_count, archived: .archived}',
      ],
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
    );

    if (res.status !== 0) {
      const err = res.stderr ?? '';
      if (/rate limit|secondary rate/i.test(err)) {
        rateLimited = true;
        entry.warnings.push('github: rate limited; stars not fetched');
      } else {
        entry.warnings.push(`github: lookup failed for ${slug}`);
      }
      failed++;
      return;
    }

    try {
      const parsed = JSON.parse(res.stdout);
      const facts: GitHubFacts = {
        stars: typeof parsed.stars === 'number' ? parsed.stars : null,
        archived: typeof parsed.archived === 'boolean' ? parsed.archived : null,
        fetchedAt: new Date().toISOString(),
      };
      cache[slug] = facts;
      entry.stars = facts.stars;
      entry.archived = facts.archived;
      fetched++;
    } catch {
      entry.warnings.push(`github: unparseable response for ${slug}`);
      failed++;
    }
  });

  writeFileSync(cachePath, JSON.stringify(cache, null, 2) + '\n');
  return { fetched, cached, failed };
}

export function listRepos(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name)
    .sort();
}

/** Deterministic JSON: keys sorted at every level, so re-runs diff cleanly. */
export function stableStringify(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v as Record<string, unknown>)
          .sort()
          .map((k) => [k, sort((v as Record<string, unknown>)[k])]),
      );
    }
    return v;
  };
  return JSON.stringify(sort(value), null, 2) + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const repoRoot = join(import.meta.dirname, '..');
  const outPath = join(repoRoot, 'benchmarks', 'corpus-index.json');
  const cachePath = join(repoRoot, 'benchmarks', '.corpus-gh-cache.json');
  const skipGitHub = process.argv.includes('--no-github');

  const names = listRepos(CORPUS_ROOT);
  process.stderr.write(`indexing ${names.length} repos from ${CORPUS_ROOT}\n`);

  const entries: RepoEntry[] = [];
  names.forEach((name, i) => {
    process.stderr.write(`[${i + 1}/${names.length}] ${name}\n`);
    entries.push(indexRepo(CORPUS_ROOT, name));
  });

  if (!skipGitHub) {
    const stats = enrichWithGitHub(entries, cachePath, {
      onProgress: (d, t, slug) =>
        process.stderr.write(`gh [${d}/${t}] ${slug}\n`),
    });
    process.stderr.write(`github: ${JSON.stringify(stats)}\n`);
  }

  // Validate every emitted plugin name against what is actually on disk.
  const real = realPluginNames(repoRoot);
  const bogus = [
    ...new Set(entries.flatMap((e) => e.applicablePlugins)),
  ].filter((n) => !real.has(n));
  if (bogus.length) {
    process.stderr.write(
      `ERROR: unknown plugin names emitted: ${bogus.join(', ')}\n`,
    );
    process.exit(1);
  }

  writeFileSync(
    outPath,
    stableStringify({
      corpusRoot: CORPUS_ROOT,
      repoCount: entries.length,
      repos: entries,
    }),
  );
  process.stderr.write(`wrote ${outPath}\n`);
}
