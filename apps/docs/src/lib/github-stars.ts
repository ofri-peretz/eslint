/**
 * Server-side GitHub stargazer count for the homepage hero star CTA and the
 * docs GitHub card (`components/docs/github-card.tsx`), read at build time.
 *
 * Cached for an hour via Next.js `fetch` revalidation so a high-traffic
 * homepage makes at most one upstream call per hour (well under GitHub's
 * unauthenticated 60-req/hr/IP limit) and never blocks render: any failure
 * resolves to `null`, and the hero falls back to a plain "Star on GitHub"
 * CTA. Intentionally standalone — does NOT extend `stats-loader.ts`, whose
 * ecosystem-stats surface is owned by the /stats + /scorecard work.
 */
export const REPO = 'ofri-peretz/eslint';
export const REPO_URL = `https://github.com/${REPO}`;

export async function getGitHubStars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        // Optional: CI builds share an IP, and the unauthenticated limit is 60
        // an hour. Without a token the card simply renders without the count.
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === 'number'
      ? data.stargazers_count
      : null;
  } catch {
    return null;
  }
}
