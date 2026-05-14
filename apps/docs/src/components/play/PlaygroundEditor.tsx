'use client';

import Editor, { type OnMount } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';

/**
 * PlaygroundEditor — Monaco wrapper for the playground left pane.
 *
 * Phase 1b: replaces the read-only `<DynamicCodeBlock>` with an editable
 * Monaco editor. Live linting is not wired yet (Phase 2 work) — when the
 * user edits, the parent component switches the right pane into an
 * "edited, not yet linted" state.
 *
 * The component is dynamic-imported from `PlaygroundDemo` (Monaco's
 * bundle is too big for SSR / first paint per PLAYGROUND_SPEC.md
 * § Performance budget).
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
}

export function PlaygroundEditor({
  value,
  onChange,
  language = 'typescript',
}: PlaygroundEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid SSR/CSR theme flash — only pick a Monaco theme once the next-themes
  // resolved value is available on the client.
  useEffect(() => setMounted(true), []);

  const handleMount = useCallback<OnMount>((editor) => {
    // Editor mounted; nothing custom to do for Phase 1b. Phase 2 will
    // register a linting model + decorations from here.
    editor.focus();
  }, []);

  const monacoTheme = mounted && resolvedTheme === 'dark' ? 'vs-dark' : 'vs';

  return (
    <div className="min-h-[360px] overflow-hidden rounded-md border border-fd-border bg-fd-card">
      <Editor
        value={value}
        defaultLanguage={language}
        theme={monacoTheme}
        onChange={(next) => onChange(next ?? '')}
        onMount={handleMount}
        height={EDITOR_HEIGHT_PX}
        options={{
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
    </div>
  );
}
