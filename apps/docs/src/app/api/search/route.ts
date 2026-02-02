import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { getSearchTags } from '@/lib/search-utils';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';

// Extended page data type that includes MDX-processed structuredData
interface PageDataWithStructure {
  title?: string;
  description?: string;
  structuredData?: StructuredData;
}

/**
 * Search API with Orama
 * 
 * Uses Fumadocs built-in search with pillar-based tagging.
 * Tags are derived from URL structure using search-utils.
 */
export const { GET } = createFromSource(source, {
  // https://docs.orama.com/docs/orama-js/supported-languages
  language: 'english',
  
  // Custom index builder to add pillar tags
  buildIndex: (page) => {
    // Get pillar tag from URL
    const tags = getSearchTags(page.url);
    
    // Cast to access structuredData which exists at runtime
    const data = page.data as unknown as PageDataWithStructure;
    
    return {
      id: page.url,
      // Provide fallback for title (required by AdvancedIndex)
      title: data.title ?? 'Untitled',
      description: data.description ?? '',
      url: page.url,
      // structuredData is required by AdvancedIndex
      structuredData: data.structuredData ?? { headings: [], contents: [] },
      // Add pillar tags for filtering
      tag: tags.length > 0 ? tags : undefined,
    };
  },
});
