import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Use the standard createFromSource with English language
// Tag filtering is done at the UI level based on URL segments
export const { GET } = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
});
