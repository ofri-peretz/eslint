/**
 * Counts fetches of the AI-facing docs surfaces.
 *
 * Why middleware rather than the route handlers: `llms.txt` and
 * `llms-full.txt` are `revalidate = false`, so their GET runs once at build
 * time and never per request — instrumenting them there would have counted
 * exactly one fetch, at build. Forcing them dynamic is worse: `llms-full.txt`
 * is 2.8 MB assembled from every docs page, so making it per-request turns a
 * crawler into a load generator. Middleware sees the request without changing
 * how either file is served.
 *
 * Why count them at all: 86% of our traffic is direct and organic search is
 * 4.4%, so "an assistant recommended it" is a real acquisition path. PostHog
 * classified 33 pageviews from Claude Desktop and 3 from NotebookLM in 60 days,
 * but posthog-js only sees clients that run JavaScript — and the agents that
 * read llms.txt mostly don't. This is the blind spot, and it is the one channel
 * where being cited is the whole game.
 *
 * The matcher is deliberately two paths. This must never become a site-wide
 * middleware: that would put a function invocation in front of every statically
 * served docs page.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAX_UA_LENGTH = 300;

/**
 * Coarse label for who fetched. The goal is "which systems read our docs", not
 * fingerprinting. Unrecognised agents keep their truncated UA so new entrants
 * stay discoverable instead of collapsing into "other".
 */
export function classifyAgent(userAgent: string | null): string {
  if (!userAgent) return '(none)';
  const ua = userAgent.toLowerCase();
  const known: Array<[RegExp, string]> = [
    [/gptbot|chatgpt|oai-searchbot/, 'OpenAI'],
    [/claude|anthropic/, 'Anthropic'],
    [/perplexity/, 'Perplexity'],
    [/google-extended|googleother|gemini/, 'Google AI'],
    [/bingbot|copilot/, 'Microsoft'],
    [/meta-external|facebookbot/, 'Meta'],
    [/bytespider|amazonbot|applebot|ccbot|cohere|mistral/, 'Other AI crawler'],
    [/googlebot/, 'Googlebot'],
    [/curl|wget|python-requests|node-fetch|axios|go-http/, 'Script'],
  ];
  for (const [pattern, label] of known) if (pattern.test(ua)) return label;
  return userAgent.slice(0, MAX_UA_LENGTH);
}

export function middleware(request: NextRequest) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return NextResponse.next();

  const surface = request.nextUrl.pathname.replace(/^\//, '');
  const body = {
    api_key: key,
    event: 'ai_docs:fetch',
    // Machines, not people: one id per surface and no person profile. A person
    // record for "GPTBot" would be noise in every person-level metric.
    distinct_id: `ai-docs-${surface}`,
    properties: {
      surface,
      agent: classifyAgent(request.headers.get('user-agent')),
      referer: request.headers.get('referer') ?? '(none)',
      app: 'eslint_docs',
      $process_person_profile: false,
    },
    timestamp: new Date().toISOString(),
  };

  // Fire-and-forget: the fetch is deliberately not awaited, so the document is
  // never delayed by analytics, and a rejected promise is swallowed rather than
  // surfacing as an unhandled rejection.
  void fetch('https://us.i.posthog.com/i/v0/e/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(3000),
    body: JSON.stringify(body),
  }).catch(() => {
    // Never allowed to affect the response.
  });

  return NextResponse.next();
}

/** Two paths only — see the note above about not becoming site-wide. */
export const config = {
  matcher: ['/llms.txt', '/llms-full.txt'],
};
