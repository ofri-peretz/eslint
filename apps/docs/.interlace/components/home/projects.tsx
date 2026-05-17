/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";

interface Project {
  name: string;
  description: string;
  url: string;
  stars: number;
  language?: string;
}

interface ProjectsProps {
  /** GitHub repos returned by /api/homepage-stats `starsBreakdown` */
  repos?: Array<{ name: string; stars: number; url: string }>;
}

const FALLBACK_DESCRIPTIONS: Record<string, string> = {
  eslint:
    "The Interlace ESLint Ecosystem — 332+ security rules, 18 specialized plugins, AI-native error messages.",
  "ofriperetz-dev":
    "Personal portfolio + blog + impact dashboard. Where the writing lives.",
};

function decorate(repos: ProjectsProps["repos"]): Project[] {
  return (repos ?? [])
    .map((r) => ({
      name: r.name,
      description:
        FALLBACK_DESCRIPTIONS[r.name] ??
        "Open-source project — see the repository for details.",
      url: r.url,
      stars: r.stars,
    }))
    .sort((a, b) => b.stars - a.stars);
}

export function Projects({ repos }: ProjectsProps) {
  const projects = decorate(repos);
  if (projects.length === 0) return null;

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Open Source
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">Projects</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          OSS work I maintain. Stars and metadata pulled live from GitHub.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.name}>
              <Link
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col justify-between rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium group-hover:underline">
                      {p.name}
                    </h3>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {p.description}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Star className="h-3.5 w-3.5" />
                  <span className="tabular-nums">
                    {p.stars.toLocaleString()}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
