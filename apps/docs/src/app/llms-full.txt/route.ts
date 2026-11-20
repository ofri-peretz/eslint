import { getLLMText, source } from '@/lib/source';

export const revalidate = false;

export async function GET() {
  // The exhaustive page list that /llms.txt used to be, then every page's text.
  const index: string[] = ['# Documentation index', ''];
  for (const page of source.getPages()) {
    index.push(`- [${page.data.title}](${page.url}): ${page.data.description}`);
  }

  const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response([index.join('\n'), ...scanned].join('\n\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
