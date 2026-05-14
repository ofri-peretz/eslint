'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Badge } from '@interlace/ui/badge';
import { TooltipProvider } from '@interlace/ui/tooltip';
import { usePlaygroundState } from './usePlaygroundState';
import { ExamplePicker } from './ExamplePicker';
import { PluginToggleStrip } from './PluginToggleStrip';
import { EditorToolbar } from './EditorToolbar';
import { FindingsList } from './FindingsList';

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
 * PlaygroundDemo — composition root for `/play` Phase 1c.
 *
 * State lives in `usePlaygroundState` (URL sync, editor buffer, plugin
 * filter, copy-config). The visible surface is composed from four
 * focused subcomponents:
 *
 *   ExamplePicker        — tab strip / mobile select for picking a snippet
 *   PluginToggleStrip    — chips + Copy-eslint.config.js button
 *   EditorToolbar        — Code label, Reset, disabled Run · Phase 2
 *   FindingsList         — right pane: edited / empty / findings states
 *
 * The headline block (snippet tag + Phase status badge + title +
 * description) and the footer credit (PLAYGROUND_SPEC + OXC Playground)
 * stay here because they're presentational and tied to layout slots
 * rather than reusable.
 *
 * Live linting lands in Phase 2 (oxlint WASM + our rules as JS plugins).
 */
export function PlaygroundDemo({ initialSlug }: { initialSlug: string }) {
  const state = usePlaygroundState(initialSlug);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <ExamplePicker
          snippets={state.snippets}
          currentSlug={state.snippet.slug}
          onSelect={state.selectSnippet}
        />

        {/* Headline + phase status badge — OXC Playground aesthetic. */}
        <div className="flex flex-col gap-2 border-l-2 border-fd-primary/60 pl-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
              {state.snippet.tag}
            </p>
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
              <span aria-hidden className="size-1.5 rounded-full bg-yellow-500/70" />
              Phase 1c · live linting in Phase 2
            </Badge>
          </div>
          <h2 className="font-mono text-lg text-fd-foreground">{state.snippet.title}</h2>
          <p className="text-sm text-fd-muted-foreground">{state.snippet.description}</p>
        </div>

        <PluginToggleStrip
          plugins={state.snippetPlugins}
          enabled={state.effectiveEnabled}
          onToggle={state.togglePlugin}
          onCopyConfig={state.copyConfig}
          copied={state.copied}
        />

        {/* Two-pane: code + findings */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-2">
            <EditorToolbar isEdited={state.isEdited} onReset={state.resetSnippet} />
            <PlaygroundEditor value={state.editorValue} onChange={state.setEditorValue} />
          </div>
          <FindingsList
            findings={state.visibleFindings}
            isEdited={state.isEdited}
            hiddenCount={state.snippet.findings.length - state.visibleFindings.length}
            totalCount={state.snippet.findings.length}
          />
        </div>

        {/* Minimal footer crediting the spec + primary inspiration. */}
        <p className="text-xs text-fd-muted-foreground">
          Built for the{' '}
          <Link
            href="https://github.com/ofri-peretz/eslint/blob/main/PLAYGROUND_SPEC.md"
            className="font-mono text-fd-foreground underline-offset-2 hover:underline"
          >
            PLAYGROUND_SPEC.md
          </Link>{' '}
          roadmap · inspired by{' '}
          <Link
            href="https://playground.oxc.rs/"
            className="font-mono text-fd-foreground underline-offset-2 hover:underline"
          >
            OXC Playground
          </Link>
          .
        </p>
      </div>
    </TooltipProvider>
  );
}
