#!/usr/bin/env tsx

/**
 * posthog-annotate.ts — record a release / deploy as a PostHog annotation.
 *
 * ## Why
 *
 * Every analytics question about a release is really a before/after question:
 * did the docs redesign move the Discover→Configure conversion? did the new
 * plugin page change bounce rate? Answering it means knowing *when* the
 * release landed, and that knowledge currently lives only in GitHub Actions
 * logs — the wrong system, and one nobody has open while reading a funnel.
 *
 * A PostHog annotation puts a dated marker on every chart in the project, so
 * the deploy shows up as a vertical line exactly where the trend bends. It is
 * the cheapest possible way to make releases legible in the place where their
 * effect is measured.
 *
 * ## Failure policy
 *
 * Never non-zero. This runs *after* a deploy or publish has already
 * succeeded; a missing annotation is a lost data point, while a failure here
 * would mark a shipped release as failed and send someone chasing a
 * non-problem. Everything is reported as a warning and the process exits 0.
 * `--strict` flips that for local debugging.
 *
 * ## Usage
 *
 *   tsx scripts/posthog-annotate.ts --content="docs@1.2.0 deployed" \
 *     [--date=2026-08-23T10:00:00Z] [--scope=project] [--dry-run] [--strict]
 *
 * Environment:
 *   POSTHOG_PERSONAL_API_KEY  required — personal API key with `annotation:write`
 *   POSTHOG_PROJECT_ID        required — numeric project id
 *   POSTHOG_HOST              optional — defaults to https://us.posthog.com
 *
 * Absent credentials are a skip, not an error: forks and local runs have no
 * PostHog access and must still be able to run the deploy workflow.
 */

import process from 'node:process';

const DEFAULT_HOST = 'https://us.posthog.com';

function arg(flag: string): string | undefined {
  const found = process.argv.slice(2).find((a) => a.startsWith(`${flag}=`));
  return found ? found.slice(flag.length + 1) : undefined;
}

const STRICT = process.argv.includes('--strict');
const DRY_RUN = process.argv.includes('--dry-run');

/** Report and exit. Exit code is 0 unless `--strict`. */
function bail(message: string): never {
  if (STRICT) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.warn(`::warning::posthog-annotate: ${message}`);
  process.exit(0);
}

async function main() {
  const content = arg('--content');
  if (!content) bail('missing --content');

  // PostHog rejects annotations over 400 chars; truncate rather than lose the
  // marker entirely, since the date is the part that carries the value.
  const text = content.length > 400 ? `${content.slice(0, 397)}...` : content;

  const dateMarker = arg('--date') ?? new Date().toISOString();
  const scope = arg('--scope') ?? 'project';

  const host = (process.env.POSTHOG_HOST || DEFAULT_HOST).replace(/\/+$/, '');
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (DRY_RUN) {
    console.log(
      `[dry-run] POST ${host}/api/projects/${projectId ?? '<id>'}/annotations/`,
    );
    console.log(
      `[dry-run] ${JSON.stringify({ content: text, date_marker: dateMarker, scope })}`,
    );
    return;
  }

  if (!projectId || !apiKey) {
    bail(
      'POSTHOG_PROJECT_ID / POSTHOG_PERSONAL_API_KEY not set — skipping annotation.',
    );
  }

  let response: Response;
  try {
    response = await fetch(`${host}/api/projects/${projectId}/annotations/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: text, date_marker: dateMarker, scope }),
      // A deploy job should not hang on a flaky analytics endpoint.
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    bail(`request failed: ${(error as Error).message}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    bail(
      `PostHog returned ${response.status} ${response.statusText}. ${body.slice(0, 300)}`,
    );
  }

  console.log(`📌 PostHog annotation created: ${text}`);
}

void main();
