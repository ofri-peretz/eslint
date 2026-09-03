'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PLAYGROUND_SNIPPETS,
  getSnippetBySlug,
  getPluginPrefix,
  pluginsInSnippet,
  buildConfigSnippet,
  type PlaygroundSnippet,
  type PlaygroundFinding,
} from './snippets';
import { useLiveLinting } from '@/lib/playground/useLiveLinting';

/**
 * Parse the `?plugins=` query param. Empty / missing = all plugins enabled.
 * Format: comma-separated prefix slugs, e.g. `?plugins=jwt,pg`.
 */
function parsePluginsParam(raw: string | null | undefined): Set<string> | null {
  if (!raw) return null;
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

/**
 * Single source of truth for `/play` interactive state.
 *
 * Co-locates the URL-state contract (`?example=` and `?plugins=`), the
 * editor buffer, the plugin-filter set, the copy-config affordance, and
 * the derived data (snippet, effective enabled set, visible findings).
 * Components in the playground tree consume this through props rather
 * than each one parsing URL state independently.
 *
 * Returns a stable shape; mutations are exposed as `useCallback`s so
 * subcomponents can be memoized safely.
 */
export function usePlaygroundState(initialSlug: string) {
  const router = useRouter();
  const params = useSearchParams();

  const [currentSlug, setCurrentSlug] = useState<string>(initialSlug);
  const snippet = useMemo<PlaygroundSnippet>(() => getSnippetBySlug(currentSlug), [currentSlug]);

  const [editorValue, setEditorValue] = useState<string>(snippet.code);

  // Plugin-toggle state. `null` means "no override — every plugin enabled."
  const snippetPlugins = useMemo(() => pluginsInSnippet(snippet), [snippet]);
  const [enabledPlugins, setEnabledPlugins] = useState<Set<string> | null>(
    () => parsePluginsParam(params?.get('plugins')),
  );

  // Reset editor + plugin selection whenever the picked snippet changes.
  useEffect(() => {
    setEditorValue(snippet.code);
  }, [snippet.code]);

  const isEdited = editorValue !== snippet.code;

  const effectiveEnabled = useMemo(
    () => enabledPlugins ?? new Set(snippetPlugins),
    [enabledPlugins, snippetPlugins],
  );

  // Phase 2: live linting. Runs whenever the editor value or plugin set changes.
  const { liveFindings, lintStatus, lintError } = useLiveLinting(editorValue, effectiveEnabled);

  // Use live findings when available; fall back to static canonical findings
  // (shown while the first lint is in-flight, or if the API fails).
  // Filter by the effective enabled-plugin set either way.
  const visibleFindings = useMemo<readonly PlaygroundFinding[]>(() => {
    const source = liveFindings ?? snippet.findings;
    return source.filter((f) => effectiveEnabled.has(getPluginPrefix(f.ruleId)));
  }, [liveFindings, snippet.findings, effectiveEnabled]);

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

  // Copy-config affordance. `copied` is a transient UI flag; the timeout
  // is held in a ref so we can clear it on unmount and on re-clicks
  // (previous implementation leaked the timer across rapid re-clicks).
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const configSnippet = useMemo(
    () => buildConfigSnippet(snippetPlugins.filter((p) => effectiveEnabled.has(p))),
    [snippetPlugins, effectiveEnabled],
  );

  const copyConfig = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(configSnippet);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed (permissions, insecure origin). Leave
      // `copied` false so the button doesn't lie about success.
    }
  }, [configSnippet]);

  return {
    // Identity
    snippets: PLAYGROUND_SNIPPETS,
    snippet,
    snippetPlugins,
    // Editor
    editorValue,
    setEditorValue,
    isEdited,
    resetSnippet,
    // Filter
    effectiveEnabled,
    visibleFindings,
    togglePlugin,
    // Navigation
    selectSnippet,
    // Copy-config
    configSnippet,
    copyConfig,
    copied,
    // Phase 2: live linting status
    lintStatus,
    lintError,
  } as const;
}

export type PlaygroundState = ReturnType<typeof usePlaygroundState>;
