'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AlertTriangle, Check, Copy, ExternalLink, Play, RotateCcw, Sparkles } from 'lucide-react';
import {
  PLAYGROUND_SNIPPETS,
  getSnippetBySlug,
  getPluginPrefix,
  pluginsInSnippet,
  buildConfigSnippet,
  type PlaygroundSnippet,
} from './snippets';

// Monaco bundle is ~600KB compressed — too big for first paint. Load it
// only on the client (SSR shows the placeholder).
const PlaygroundEditor = dynamic(
  () => import('./PlaygroundEditor').then((m) => m.PlaygroundEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[360px] items-center justify-center rounded-md border border-fd-border bg-fd-card p-6 text-sm text-fd-muted-foreground">
        Loading editor…
      </div>
    ),
  },
);

/**
 * PlaygroundDemo — Phase 1b (Monaco editor + honest edited-state).
 *
 * Renders the playground chrome for the 6 canonical flagship-rule
 * snippets. Left pane = editable Monaco editor. Right pane = either the
 * verified static findings (when the code matches the canonical snippet)
 * or an "edited, not yet linted" placeholder (when the user has changed
 * the code). The example selection is URL-synced via `?example=<slug>`.
 *
 * Phase 2 will replace the "edited, not yet linted" placeholder with
 * live findings from `eslint-linter-browserify`. See PLAYGROUND_SPEC.md.
 */
/**
 * Parse the `?plugins=` query param. Empty / missing = all plugins enabled.
 * Format: comma-separated prefix slugs, e.g. `?plugins=jwt,pg`.
 */
function parsePluginsParam(raw: string | null | undefined): Set<string> | null {
  if (!raw) return null;
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

export function PlaygroundDemo({ initialSlug }: { initialSlug: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [currentSlug, setCurrentSlug] = useState<string>(initialSlug);
  const snippet = useMemo<PlaygroundSnippet>(() => getSnippetBySlug(currentSlug), [currentSlug]);
  const [editorValue, setEditorValue] = useState<string>(snippet.code);

  // Plugin-toggle state. `null` means "no override — every plugin enabled."
  // Tracking as Set<string> rather than Map<prefix, bool> because the strip
  // only needs membership semantics; un-toggled = enabled.
  const snippetPlugins = useMemo(() => pluginsInSnippet(snippet), [snippet]);
  const [enabledPlugins, setEnabledPlugins] = useState<Set<string> | null>(
    () => parsePluginsParam(params?.get('plugins')),
  );

  // Reset editor + plugin selection whenever the picked snippet changes.
  useEffect(() => {
    setEditorValue(snippet.code);
  }, [snippet.code]);

  const isEdited = editorValue !== snippet.code;

  // Effective enabled set: null override → all of snippet's plugins.
  const effectiveEnabled = useMemo(
    () => enabledPlugins ?? new Set(snippetPlugins),
    [enabledPlugins, snippetPlugins],
  );

  const visibleFindings = useMemo(
    () => snippet.findings.filter((f) => effectiveEnabled.has(getPluginPrefix(f.ruleId))),
    [snippet.findings, effectiveEnabled],
  );

  const writeUrl = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(params?.toString() ?? '');
      mutate(next);
      router.replace(`/play?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const selectSnippet = useCallback(
    (slug: string) => {
      setCurrentSlug(slug);
      // When the snippet changes, clear the plugin filter — every snippet
      // has its own plugin set, and stale filters would be confusing.
      setEnabledPlugins(null);
      writeUrl((p) => {
        p.set('example', slug);
        p.delete('plugins');
      });
    },
    [writeUrl],
  );

  const togglePlugin = useCallback(
    (prefix: string) => {
      setEnabledPlugins((prev) => {
        const base = prev ?? new Set(snippetPlugins);
        const next = new Set(base);
        if (next.has(prefix)) {
          next.delete(prefix);
        } else {
          next.add(prefix);
        }
        // Sync URL.
        if (next.size === snippetPlugins.length) {
          writeUrl((p) => p.delete('plugins'));
          return null;
        }
        writeUrl((p) => p.set('plugins', [...next].join(',')));
        return next;
      });
    },
    [snippetPlugins, writeUrl],
  );

  const resetSnippet = useCallback(() => {
    setEditorValue(snippet.code);
  }, [snippet.code]);

  // Copy-config button state.
  const [copied, setCopied] = useState(false);
  const configSnippet = useMemo(
    () => buildConfigSnippet(snippetPlugins.filter((p) => effectiveEnabled.has(p))),
    [snippetPlugins, effectiveEnabled],
  );
  const copyConfig = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(configSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed (permissions, insecure origin, etc.) — leave
      // `copied` false so the button doesn't lie. A future iteration can
      // fall back to a textarea selection trick.
    }
  }, [configSnippet]);

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

      {/* Headline + phase status pill — OXC Playground aesthetic: minimal
          chrome, signal-only color, the editor and findings are the focus.
          The Phase-1c disclaimer is demoted from a paragraph footer to a
          small status pill here so the main two-pane layout below has
          maximum breathing room. */}
      <div className="flex flex-col gap-2 border-l-2 border-fd-primary/60 pl-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
            {snippet.tag}
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-fd-border bg-fd-card px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-fd-muted-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-yellow-500/70" />
            Phase 1c · live linting in Phase 2
          </span>
        </div>
        <h2 className="font-mono text-lg text-fd-foreground">{snippet.title}</h2>
        <p className="text-sm text-fd-muted-foreground">{snippet.description}</p>
      </div>

      {/* Plugin toggle strip — filters which plugin's findings are visible.
          Phase 1c (static): toggles only filter the right-pane display.
          Phase 2: toggles will gate which rules actually run under the
          in-browser linter. Pattern lifted from OXC Playground's settings
          panel + Babel REPL's plugin toggles. */}
      {snippetPlugins.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
              Plugins enabled · {effectiveEnabled.size}/{snippetPlugins.length}
            </p>
            <button
              type="button"
              onClick={copyConfig}
              aria-live="polite"
              className="inline-flex items-center gap-1.5 rounded-md border border-fd-border bg-fd-card px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-fd-foreground transition-colors hover:bg-fd-accent disabled:cursor-not-allowed disabled:opacity-50"
              disabled={effectiveEnabled.size === 0}
            >
              {copied ? (
                <>
                  <Check aria-hidden className="size-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy aria-hidden className="size-3.5" />
                  Copy eslint.config.js
                </>
              )}
            </button>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Plugin toggle strip">
            {snippetPlugins.map((prefix) => {
              const enabled = effectiveEnabled.has(prefix);
              return (
                <li key={prefix}>
                  <button
                    type="button"
                    onClick={() => togglePlugin(prefix)}
                    aria-pressed={enabled}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
                      enabled
                        ? 'border-fd-primary bg-fd-primary/10 text-fd-foreground'
                        : 'border-fd-border bg-fd-card/50 text-fd-muted-foreground line-through opacity-60'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`inline-block size-2 rounded-full ${
                        enabled ? 'bg-fd-primary' : 'bg-fd-muted-foreground/40'
                      }`}
                    />
                    {prefix}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Two-pane: code + findings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left pane — editor */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
              Code · editable
            </p>
            <div className="flex items-center gap-1.5">
              {isEdited && (
                <button
                  type="button"
                  onClick={resetSnippet}
                  className="inline-flex items-center gap-1 rounded-md border border-fd-border bg-fd-card px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fd-foreground transition-colors hover:bg-fd-accent"
                >
                  <RotateCcw aria-hidden className="size-3" />
                  Reset
                </button>
              )}
              {/* Disabled "Run" placeholder — signals the Phase 2 affordance.
                  OXC Playground's Run-on-edit is the model; ours is offline
                  until Phase 2 wires oxlint WASM. Disabled state is honest:
                  the button is in the layout where the live affordance will
                  be, not falsely interactive. */}
              <button
                type="button"
                disabled
                title="Live linting arrives in Phase 2 (oxlint WASM + our rules as JS plugins). For now the right pane shows the verified static findings."
                className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border border-fd-border bg-fd-card/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fd-muted-foreground opacity-60"
              >
                <Play aria-hidden className="size-3" />
                Run · Phase 2
              </button>
            </div>
          </div>
          <PlaygroundEditor value={editorValue} onChange={setEditorValue} />
        </div>

        {/* Right pane — findings */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
            Findings {isEdited ? '· paused' : `· ${visibleFindings.length}`}
            {!isEdited && visibleFindings.length !== snippet.findings.length && (
              <span className="ml-1 normal-case tracking-normal text-fd-muted-foreground/70">
                ({snippet.findings.length - visibleFindings.length} hidden by plugin filter)
              </span>
            )}
          </p>
          {isEdited ? (
            <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-fd-border bg-fd-card/50 p-4 text-sm text-fd-muted-foreground">
              <div className="flex items-center gap-2">
                <Sparkles aria-hidden className="size-4 opacity-60" />
                <span className="font-mono text-xs uppercase tracking-wider">
                  Code edited — live linting pending
                </span>
              </div>
              <p>
                The findings list shows the verified output for the canonical
                snippet only. Live in-browser ESLint arrives in Phase 2 —
                until then, click <em>Reset</em> to restore the snippet and
                see the canonical findings.
              </p>
            </div>
          ) : visibleFindings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-fd-border bg-fd-card/50 p-6 text-center text-sm text-fd-muted-foreground">
              <Sparkles aria-hidden className="size-5 opacity-50" />
              {snippet.findings.length === 0
                ? 'No findings yet — paste code or pick an example.'
                : 'All plugins disabled for this example — toggle one back on to see its findings.'}
            </div>
          ) : (
            <ol className="flex flex-col gap-2" aria-label="ESLint findings for this snippet">
              {visibleFindings.map((f, i) => (
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

      {/* Minimal footer — single line. The heavier Phase-1c explanation
          previously lived here; demoted to the status pill near the
          headline so the editor and findings dominate the viewport (OXC
          Playground aesthetic — editor + output as equal partners, no
          chrome competing for attention). */}
      <p className="text-xs text-fd-muted-foreground">
        Built for the{' '}
        <Link href="https://github.com/ofri-peretz/eslint/blob/main/PLAYGROUND_SPEC.md" className="font-mono text-fd-foreground underline-offset-2 hover:underline">
          PLAYGROUND_SPEC.md
        </Link>{' '}
        roadmap · inspired by{' '}
        <Link href="https://playground.oxc.rs/" className="font-mono text-fd-foreground underline-offset-2 hover:underline">
          OXC Playground
        </Link>
        .
      </p>
    </div>
  );
}
