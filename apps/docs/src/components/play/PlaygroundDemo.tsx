'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { AlertTriangle, ExternalLink, Sparkles } from 'lucide-react';
import {
  PLAYGROUND_SNIPPETS,
  getSnippetBySlug,
  type PlaygroundSnippet,
} from './snippets';

/**
 * PlaygroundDemo — Phase 1a (static demo).
 *
 * Renders the playground chrome (left pane = read-only highlighted code,
 * right pane = hardcoded findings list) for the 6 canonical flagship-rule
 * snippets. The example selection is URL-synced via `?example=<slug>` so
 * links are shareable.
 *
 * Phase 1b will swap `<DynamicCodeBlock>` for a Monaco editor (live edits).
 * Phase 2 will swap the hardcoded findings list for live in-browser ESLint
 * output via `eslint-linter-browserify`. See PLAYGROUND_SPEC.md.
 */
export function PlaygroundDemo({ initialSlug }: { initialSlug: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [currentSlug, setCurrentSlug] = useState<string>(initialSlug);
  const snippet = useMemo<PlaygroundSnippet>(() => getSnippetBySlug(currentSlug), [currentSlug]);

  const selectSnippet = useCallback(
    (slug: string) => {
      setCurrentSlug(slug);
      const next = new URLSearchParams(params?.toString() ?? '');
      next.set('example', slug);
      router.replace(`/play?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Example picker — desktop: button strip, mobile: native select */}
      <div className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
          Pick an example
        </p>

        {/* Desktop: button strip */}
        <ul
          role="tablist"
          aria-label="Flagship rule examples"
          className="hidden flex-wrap gap-2 md:flex"
        >
          {PLAYGROUND_SNIPPETS.map((s) => {
            const selected = s.slug === currentSlug;
            return (
              <li key={s.slug}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => selectSnippet(s.slug)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    selected
                      ? 'border-fd-primary bg-fd-primary text-fd-primary-foreground'
                      : 'border-fd-border bg-fd-card text-fd-foreground hover:bg-fd-accent'
                  }`}
                >
                  <span className="font-mono text-xs">{s.title}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Mobile: native select */}
        <label className="flex flex-col gap-1 md:hidden">
          <span className="sr-only">Pick an example</span>
          <select
            value={currentSlug}
            onChange={(e) => selectSnippet(e.target.value)}
            className="rounded-md border border-fd-border bg-fd-card px-3 py-2 text-sm text-fd-foreground"
          >
            {PLAYGROUND_SNIPPETS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Headline */}
      <div className="flex flex-col gap-2 border-l-2 border-fd-primary/60 pl-4">
        <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
          {snippet.tag}
        </p>
        <h2 className="font-mono text-lg text-fd-foreground">{snippet.title}</h2>
        <p className="text-sm text-fd-muted-foreground">{snippet.description}</p>
      </div>

      {/* Two-pane: code + findings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left pane — code */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
              Code
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-fd-muted-foreground">
              Read-only · live editor in Phase 1b
            </p>
          </div>
          <DynamicCodeBlock lang="tsx" code={snippet.code} />
        </div>

        {/* Right pane — findings */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
            Findings · {snippet.findings.length}
          </p>
          {snippet.findings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-fd-border bg-fd-card/50 p-6 text-center text-sm text-fd-muted-foreground">
              <Sparkles aria-hidden className="size-5 opacity-50" />
              No findings yet — paste code or pick an example.
            </div>
          ) : (
            <ol className="flex flex-col gap-2" aria-label="ESLint findings for this snippet">
              {snippet.findings.map((f, i) => (
                <li
                  key={`${f.ruleId}-${f.line}-${f.column}-${i}`}
                  className="flex flex-col gap-2 rounded-md border border-fd-border bg-fd-card p-3"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                        f.severity === 'error'
                          ? 'bg-fd-destructive/15 text-fd-destructive'
                          : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                      }`}
                    >
                      <AlertTriangle aria-hidden className="size-3" />
                      {f.severity}
                    </span>
                    <Link
                      href={f.ruleDocsPath}
                      className="font-mono text-sm text-fd-foreground hover:text-fd-primary hover:underline"
                    >
                      {f.ruleId}
                    </Link>
                    <span className="ml-auto font-mono text-xs text-fd-muted-foreground">
                      {f.line}:{f.column}
                    </span>
                  </div>
                  <p className="text-sm text-fd-foreground">{f.message}</p>
                  <Link
                    href={f.ruleDocsPath}
                    className="inline-flex items-center gap-1 self-start font-mono text-xs text-fd-muted-foreground hover:text-fd-primary hover:underline"
                  >
                    Read the rule
                    <ExternalLink aria-hidden className="size-3" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Footer caveat — Phase 1a honesty */}
      <p className="rounded-md border border-fd-border bg-fd-card/50 p-3 text-xs text-fd-muted-foreground">
        <strong className="text-fd-foreground">Phase 1a:</strong> the findings
        list above is the verified output of running the rule on this exact
        snippet — captured by hand for the static demo. Phase 1b adds an
        editable Monaco editor; Phase 2 swaps in a live in-browser ESLint via{' '}
        <code className="font-mono">eslint-linter-browserify</code> so changes
        you make re-lint live. Tracking in{' '}
        <Link href="https://github.com/ofri-peretz/eslint/blob/main/PLAYGROUND_SPEC.md" className="underline">
          PLAYGROUND_SPEC.md
        </Link>
        .
      </p>
    </div>
  );
}
