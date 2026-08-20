/**
 * SAFE - ADVERSARIAL. Same class as canonical: `rel="alternate"` is metadata
 * for crawlers, not a load.
 */
export function Feed() {
  return <link rel="alternate" type="application/rss+xml" href="http://acme-corp.io/feed.xml" />;
}
