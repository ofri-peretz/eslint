/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import Link from "next/link";
import { BorderBeam } from "#interlace/components/ui/border-beam";

interface FeaturedProjectProps {
  stars?: number;
  downloads?: number;
}

export function FeaturedProject({ stars, downloads }: FeaturedProjectProps) {
  return (
    <section className="border-b border-border bg-muted/20">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Featured
        </p>
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-8 shadow-sm sm:p-10">
          <BorderBeam size={250} duration={12} delay={9} />
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Interlace ESLint Ecosystem
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            18 specialized plugins. 332+ security rules. 100% OWASP Top 10
            coverage. Built for the AI/Agentic era — LLM-friendly error
            messages mean Claude / Cursor / Copilot can fix vulnerabilities
            without context.
          </p>
          {(stars !== undefined || downloads !== undefined) && (
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {stars !== undefined && (
                <div className="flex items-baseline gap-2">
                  <dt className="text-muted-foreground">★ Stars</dt>
                  <dd className="font-semibold tabular-nums">
                    {stars.toLocaleString()}
                  </dd>
                </div>
              )}
              {downloads !== undefined && (
                <div className="flex items-baseline gap-2">
                  <dt className="text-muted-foreground">npm downloads</dt>
                  <dd className="font-semibold tabular-nums">
                    {downloads.toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="https://eslint.interlace.tools"
              className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
            >
              Explore docs
            </Link>
            <Link
              href="https://github.com/ofri-peretz/eslint"
              className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              ★ Star on GitHub
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
