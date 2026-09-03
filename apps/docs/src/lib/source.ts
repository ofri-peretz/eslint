import { docs } from 'fumadocs-mdx:collections/server';
import { type InferPageType, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin()],
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}

// Extended page data type for LLM text extraction
interface PageDataWithText {
  title?: string;
  getText?: (format: string) => Promise<string>;
}

export async function getLLMText(page: InferPageType<typeof source>) {
  const data = page.data as unknown as PageDataWithText;
  
  // getText may not be available depending on fumadocs configuration
  if (typeof data.getText === 'function') {
    const processed = await data.getText('processed');
    return `# ${data.title ?? 'Untitled'}\n\n${processed}`;
  }
  
  // Fallback if getText is not available
  return `# ${data.title ?? 'Untitled'}`;
}
