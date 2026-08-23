/**
 * Lock for the AI-channel visibility middleware.
 *
 * Two properties matter and both are easy to break silently:
 *   1. the matcher stays scoped to the two AI surfaces — a site-wide matcher
 *      would put a function invocation in front of every static docs page;
 *   2. the routes it observes stay static — instrumenting them directly would
 *      have counted one build-time fetch, and forcing them dynamic would
 *      regenerate 2.8 MB of llms-full.txt per request.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyAgent } from '@/middleware';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p: string) => readFileSync(join(ROOT, 'src', p), 'utf-8');

describe('AI docs capture: middleware contract', () => {
  it('is scoped to exactly the two AI surfaces', () => {
    const mw = read('middleware.ts');
    expect(mw).toMatch(/matcher:\s*\['\/llms\.txt',\s*'\/llms-full\.txt'\]/);
  });

  it('never creates person profiles for machines', () => {
    expect(read('middleware.ts')).toMatch(/\$process_person_profile:\s*false/);
  });

  it('no-ops without a PostHog key', () => {
    expect(read('middleware.ts')).toMatch(/if \(!key\) return NextResponse\.next\(\)/);
  });

  it('leaves both llms routes statically rendered', () => {
    // `revalidate = false` is what keeps llms-full.txt (2.8 MB, assembled from
    // every docs page) off the per-request path.
    for (const route of ['app/llms.txt/route.ts', 'app/llms-full.txt/route.ts']) {
      expect(read(route)).toMatch(/export const revalidate = false/);
      expect(read(route)).not.toMatch(/force-dynamic/);
    }
  });
});

describe('AI docs capture: agent classification', () => {
  it.each([
    ['Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)', 'OpenAI'],
    ['Claude-User/1.0', 'Anthropic'],
    ['PerplexityBot/1.0', 'Perplexity'],
    ['Mozilla/5.0 (compatible; Google-Extended)', 'Google AI'],
    ['curl/8.4.0', 'Script'],
  ])('labels %s as %s', (ua, expected) => {
    expect(classifyAgent(ua)).toBe(expected);
  });

  it('keeps unknown agents visible instead of bucketing them away', () => {
    // A new entrant must be discoverable in the data, not folded into "other".
    expect(classifyAgent('SomeNewAIBot/2.0')).toBe('SomeNewAIBot/2.0');
  });

  it('handles a missing user agent', () => {
    expect(classifyAgent(null)).toBe('(none)');
  });

  it('truncates hostile user agents', () => {
    expect(classifyAgent('x'.repeat(5000))).toHaveLength(300);
  });
});
