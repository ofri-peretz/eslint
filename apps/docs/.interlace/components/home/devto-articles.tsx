/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import Link from "next/link";
import { Container } from "#interlace/components/ui/container";
import { Section } from "#interlace/components/ui/section";
import { cn } from "#interlace/lib/utils";

export interface DevToArticleEntry {
  slug: string;
  readingTimeMinutes: number;
  frontmatter: {
    title: string;
    description: string;
    published_at?: string;
    reactions?: number;
    comments?: number;
  };
}

interface DevToArticlesProps extends React.HTMLAttributes<HTMLElement> {
  /** Articles to render — page passes via `getAllArticles().slice(0, 6)`. Required so the
   *  component stays presentational and Storybook-friendly (the `fs` import that
   *  `getAllArticles` uses doesn't bundle for browser-side stories). */
  articles: DevToArticleEntry[];
  /** Stable selector for E2E tests; consumer provides — no default. */
  "data-testid"?: string;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DevToArticles({
  articles,
  className,
  "data-testid": testId,
  ...rest
}: DevToArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <Section
      data-slot="landing-devto-articles"
      data-testid={testId}
      divider="bottom"
      spacing="tight"
      className={cn(className)}
      {...rest}
    >
      <Container size="content">
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Writing
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              Latest articles
            </h2>
          </div>
          <Link
            href="/articles"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all →
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {articles.map((article) => {
            const reactions =
              article.frontmatter.reactions !== undefined &&
              article.frontmatter.reactions > 0
                ? article.frontmatter.reactions
                : null;
            const comments =
              article.frontmatter.comments !== undefined &&
              article.frontmatter.comments > 0
                ? article.frontmatter.comments
                : null;
            return (
              <li key={article.slug}>
                <Link
                  href={`/articles/${article.slug}`}
                  className="group block h-full rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40"
                >
                  <h3 className="font-medium leading-snug group-hover:underline">
                    {article.frontmatter.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {article.frontmatter.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {article.frontmatter.published_at && (
                      <time dateTime={article.frontmatter.published_at}>
                        {formatDate(article.frontmatter.published_at)}
                      </time>
                    )}
                    <span>· {article.readingTimeMinutes} min</span>
                    {reactions !== null && <span>· ❤ {reactions}</span>}
                    {comments !== null && <span>· 💬 {comments}</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
