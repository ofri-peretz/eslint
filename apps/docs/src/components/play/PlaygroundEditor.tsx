'use client';

import Editor, { type OnMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';
import { CodeWindow, CodeWindowTitleBar } from '@interlace/ui/blocks/code-window';
import type { PlaygroundFinding } from './snippets';

/**
 * PlaygroundEditor — Monaco wrapper for the playground left pane.
 *
 * Wrapped in a `<CodeWindow>` chrome (macOS traffic-light dots + title
 * bar) so the surface reads as a real code-editor demo rather than a
 * generic textbox. The chrome is decorative: the dots are
 * `aria-hidden`, and the editor itself owns the accessible name via
 * Monaco's `ariaLabel` option.
 *
 * Lint findings arrive via the `findings` prop and are projected into
 * the editor as Monaco markers — squiggle on the offending range,
 * message + ruleId in the hover, mark in the overview ruler. The
 * findings panel alone was not enough: an editor demo where the code
 * shows no in-place diagnostics reads as "the linter found nothing".
 *
 * The component is dynamic-imported from `PlaygroundDemo` because
 * Monaco's bundle is too big for SSR / first paint per
 * PLAYGROUND_SPEC.md § Performance budget.
 */
/**
 * Editor height is fixed (not prop-driven) so the wrapper can express it
 * as a Tailwind arbitrary-value class (`min-h-[360px]`) — inline `style`
 * props are forbidden by `philosophy-enforcement.test.ts` and the
 * `feedback_no_inline_styles` memory. If a future use case needs a
 * different height, plumb it through a Tailwind class variant, not
 * `style={{...}}`.
 */
const EDITOR_HEIGHT_PX = 360;

export interface PlaygroundEditorProps {
  /** Current code shown in the editor. */
  value: string;
  /** Fires on every keystroke (debounced upstream if needed). */
  onChange: (next: string) => void;
  /** Editor language — defaults to TypeScript (matches our `.tsx` snippets). */
  language?: 'typescript' | 'javascript';
  /**
   * Optional filename shown in the window title bar. Defaults to a
   * generic `playground.tsx` (or `.js`) based on the language. Pass an
   * explicit value when you want the title to reflect a specific
   * snippet's filename.
   */
  filename?: string;
  /**
   * Current lint findings — rendered as Monaco markers (squiggles +
   * hover) so diagnostics are visible in the code itself, not only in
   * the findings panel.
   */
  findings?: readonly PlaygroundFinding[];
}

function defaultFilenameFor(language: 'typescript' | 'javascript') {
  return language === 'javascript' ? 'playground.js' : 'playground.tsx';
}

type MonacoEditor = Parameters<OnMount>[0];
type MonacoApi = Parameters<OnMount>[1];

export function PlaygroundEditor({
  value,
  onChange,
  language = 'typescript',
  filename,
  findings,
}: PlaygroundEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [instance, setInstance] = useState<{
    editor: MonacoEditor;
    monaco: MonacoApi;
  } | null>(null);

  // Avoid SSR/CSR theme flash — only pick a Monaco theme once the next-themes
  // resolved value is available on the client.
  useEffect(() => setMounted(true), []);

  const handleMount = useCallback<OnMount>((editor, monaco) => {
    // The playground has no node_modules, so TypeScript's semantic pass
    // can only ever produce unresolvable-import noise ("Cannot find
    // module 'jsonwebtoken'") that competes with the real diagnostics
    // from the lint API. Kill the semantic pass; keep syntax errors.
    for (const defaults of [
      monaco.languages.typescript.typescriptDefaults,
      monaco.languages.typescript.javascriptDefaults,
    ]) {
      defaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSuggestionDiagnostics: true,
      });
    }
    setInstance({ editor, monaco });
    editor.focus();
  }, []);

  // Project lint findings into the editor as markers. Re-runs on every
  // findings/value change so squiggles track the live lint results.
  useEffect(() => {
    if (!instance) return;
    const { editor, monaco } = instance;
    const model = editor.getModel();
    if (!model) return;
    const markers = (findings ?? [])
      // A finding can momentarily point past the buffer while an edit
      // and its (debounced) lint round-trip are out of sync — drop it
      // rather than let Monaco clamp it somewhere misleading.
      .filter((f) => f.line >= 1 && f.line <= model.getLineCount())
      .map((f) => ({
        severity:
          f.severity === 'error'
            ? monaco.MarkerSeverity.Error
            : monaco.MarkerSeverity.Warning,
        message: f.message,
        source: 'eslint',
        code: f.ruleId,
        startLineNumber: f.line,
        startColumn: Math.min(f.column, model.getLineMaxColumn(f.line)),
        endLineNumber: f.line,
        endColumn: model.getLineMaxColumn(f.line),
      }));
    monaco.editor.setModelMarkers(model, 'interlace-play', markers);
  }, [instance, findings, value]);

  const monacoTheme = mounted && resolvedTheme === 'dark' ? 'vs-dark' : 'vs';
  const title = filename ?? defaultFilenameFor(language);

  return (
    <CodeWindow className="min-h-[360px]">
      <CodeWindowTitleBar title={title} />
      <Editor
        value={value}
        defaultLanguage={language}
        theme={monacoTheme}
        onChange={(next) => onChange(next ?? '')}
        onMount={handleMount}
        height={EDITOR_HEIGHT_PX}
        options={{
          // The editor sits inside an overflow-hidden rounded card, which
          // clips Monaco's absolutely-positioned hover widgets — the error
          // tooltip rendered mostly outside the card and was swallowed.
          // fixedOverflowWidgets portals hovers out via position:fixed.
          fixedOverflowWidgets: true,
          fontSize: 14,
          lineNumbers: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderLineHighlight: 'line',
          wordWrap: 'on',
          tabSize: 2,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          accessibilitySupport: 'on',
          ariaLabel: 'Playground code editor',
        }}
        loading={
          <div className="flex h-full items-center justify-center p-6 text-sm text-fd-muted-foreground">
            Loading editor…
          </div>
        }
      />
    </CodeWindow>
  );
}
