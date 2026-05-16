// Daily ingest — fetches NPM download counts + GitHub stars for every plugin
// in the `plugins` table, upserts a row into `plugin_daily_metrics` for today,
// records an `ingest_runs` audit row, then calls `refresh_storefront_ratchet()`
// so the North Star ratchet advances.
//
// Runs from `.github/workflows/daily-impact-ingest.yml` at 05:00 UTC.

import { supabaseAdmin } from './_supabase-admin';

const GITHUB_REPO_OWNER = 'ofri-peretz';
const GITHUB_REPO_NAME  = 'eslint';
const GHA_RUN_URL = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : null;

interface Plugin {
  id: number;
  name: string;
  slug: string;
}

interface NpmDownloads {
  downloads: number;
}

async function fetchNpmDownloads(pkg: string, period: 'last-week' | 'last-month'): Promise<number | null> {
  const r = await fetch(`https://api.npmjs.org/downloads/point/${period}/${pkg}`);
  if (!r.ok) {
    if (r.status === 404) return null;
    throw new Error(`npm downloads ${pkg} ${period} → ${r.status}`);
  }
  const { downloads } = (await r.json()) as NpmDownloads;
  return downloads;
}

async function fetchGitHubRepoStars(owner: string, repo: string): Promise<number | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!r.ok) {
    console.error(`[github] ${owner}/${repo} → ${r.status} ${await r.text()}`);
    return null;
  }
  const { stargazers_count } = (await r.json()) as { stargazers_count: number };
  return stargazers_count;
}

async function main(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: runRow, error: runErr } = await supabaseAdmin
    .from('ingest_runs')
    .insert({ workflow: 'daily-impact-ingest', status: 'running', gha_run_url: GHA_RUN_URL })
    .select('id')
    .single();
  if (runErr || !runRow) throw new Error(`Could not create ingest_runs row: ${runErr?.message}`);
  const runId = runRow.id as string;

  let rowsWritten = 0;
  let errorMessage: string | null = null;

  try {
    const { data: plugins, error: pluginsErr } = await supabaseAdmin
      .from('plugins')
      .select('id,name,slug');
    if (pluginsErr) throw new Error(`Could not load plugins: ${pluginsErr.message}`);

    const repoStars = await fetchGitHubRepoStars(GITHUB_REPO_OWNER, GITHUB_REPO_NAME);
    console.log(`[github] ${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME} stars = ${repoStars}`);

    for (const p of plugins as Plugin[]) {
      const [d7, d30] = await Promise.all([
        fetchNpmDownloads(p.name, 'last-week'),
        fetchNpmDownloads(p.name, 'last-month'),
      ]);
      console.log(`[npm] ${p.name}  d7=${d7}  d30=${d30}`);

      const { error: upErr } = await supabaseAdmin
        .from('plugin_daily_metrics')
        .upsert(
          {
            plugin_id: p.id,
            observed_on: today,
            npm_downloads_d7: d7,
            npm_downloads_d30: d30,
            github_stars: repoStars,
            ingest_run_id: runId,
          },
          { onConflict: 'plugin_id,observed_on' }
        );
      if (upErr) throw new Error(`upsert ${p.name}: ${upErr.message}`);
      rowsWritten += 1;
    }

    if (repoStars !== null) {
      const { error: msErr } = await supabaseAdmin
        .from('metric_snapshots')
        .upsert(
          {
            source: 'github-repo',
            kind: 'stars',
            dimension: `${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`,
            observed_on: today,
            value: repoStars,
            ingest_run_id: runId,
          },
          { onConflict: 'source,kind,dimension,observed_on' }
        );
      if (msErr) throw new Error(`metric_snapshots stars: ${msErr.message}`);
      rowsWritten += 1;
    }

    const { error: rpcErr } = await supabaseAdmin.rpc('refresh_storefront_ratchet');
    if (rpcErr) throw new Error(`refresh_storefront_ratchet: ${rpcErr.message}`);
    console.log('[ratchet] refreshed');
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[ingest] error:', errorMessage);
  }

  await supabaseAdmin
    .from('ingest_runs')
    .update({
      finished_at: new Date().toISOString(),
      rows_written: rowsWritten,
      status: errorMessage ? 'error' : 'success',
      error_message: errorMessage,
    })
    .eq('id', runId);

  if (errorMessage) process.exit(1);
  console.log(`[ingest] ✓ ${rowsWritten} rows written`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
