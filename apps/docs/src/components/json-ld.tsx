import { serializeJsonLd } from '@/lib/seo';

/**
 * schema.org structured data, rendered in the server HTML so crawlers that do
 * not run JavaScript still read it. Builders live in `@/lib/seo`.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Serialised with `<` escaped — see serializeJsonLd.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
