import type { ArticleCardProps } from '@interlace/ui/blocks/article-card';

export const articleFixtures: ArticleCardProps[] = [
  {
    title: 'Detecting prototype pollution in user input with ESLint',
    description:
      'A practical walkthrough of writing AST-aware rules that flag the most common prototype-pollution sinks in modern Node.js code.',
    href: 'https://dev.to/example/prototype-pollution',
    imageUrl:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200',
    tags: ['security', 'eslint', 'nodejs', 'static-analysis'],
    author: {
      name: 'Ofri Peretz',
      imageUrl: 'https://avatars.githubusercontent.com/u/8528983?v=4',
    },
    publishedAt: '2026-04-22',
    meta: { reactions: 124, comments: 18, readingTimeMinutes: 9 },
    sourceLabel: 'Dev.to',
  },
  {
    title: 'A type-aware ESLint rule that beats Sonar at SQL injection',
    description:
      'Building a rule that follows tainted data through TypeScript types — and the trade-offs vs. the type-unaware path.',
    href: 'https://dev.to/example/type-aware-sql',
    tags: ['typescript', 'security', 'sql', 'eslint'],
    author: { name: 'Ofri Peretz' },
    publishedAt: '2026-03-14',
    meta: { reactions: 87, comments: 11, readingTimeMinutes: 14 },
    sourceLabel: 'Dev.to',
  },
  {
    title: 'Why we ship a 440-rule ESLint ecosystem instead of one mega-plugin',
    description:
      'A deep cut on plugin granularity, install ergonomics, and why letting users opt into security verticals beats a monolith.',
    href: 'https://dev.to/example/plugin-granularity',
    imageUrl:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
    tags: ['eslint', 'architecture', 'open-source'],
    author: { name: 'Ofri Peretz' },
    publishedAt: '2026-02-01',
    meta: { reactions: 203, comments: 41, readingTimeMinutes: 7 },
    sourceLabel: 'Dev.to',
  },
];
