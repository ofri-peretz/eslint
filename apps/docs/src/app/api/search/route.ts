import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { getSearchTags } from '@/lib/search-utils';

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
    
    return {
      id: page.url,
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      // Use structured data from the page
      structuredData: page.data.structuredData,
      // Add pillar tags for filtering
      tag: tags.length > 0 ? tags : undefined,
    };
  },
});
