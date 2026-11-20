import { buildLlmsIndex } from '@/lib/llms-index';

export const revalidate = false;

// One screen: a map, not a page list. The page list is the head of /llms-full.txt.
export async function GET() {
  return new Response(buildLlmsIndex(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
