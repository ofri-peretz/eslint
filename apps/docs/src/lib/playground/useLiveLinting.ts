'use client';

/**
 * useLiveLinting — Phase 2 live linting hook.
 *
 * Calls POST /api/play/lint with the current editor value and the enabled
 * plugin set. Debounced at 300ms (spec calls for 200ms on keystroke; 300ms
 * is the pragmatic floor for an API round-trip).
 *
 * Returns:
 *   liveFindings  — latest lint results from the API (null before first call)
 *   lintStatus    — 'idle' | 'linting' | 'done' | 'error'
 *
 * The caller decides whether to use liveFindings or the static snippet.findings
 * as the source of truth for the right pane.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlaygroundFinding } from '@/components/play/snippets';

export type LintStatus = 'idle' | 'linting' | 'done' | 'error';

const DEBOUNCE_MS = 300;

interface LintApiResponse {
  findings: Array<{
    ruleId: string;
    severity: 'error' | 'warn';
    line: number;
    column: number;
    message: string;
  }>;
}

/**
 * Map a plugin prefix to its docs path prefix.
 * Used to build `ruleDocsPath` for live findings.
 */
const RULE_DOCS_PREFIX: Record<string, string> = {
  'jwt': '/docs/security/plugin-jwt/rules',
  'secure-coding': '/docs/security/plugin-secure-coding/rules',
  'pg': '/docs/security/plugin-pg/rules',
  'mongodb-security': '/docs/security/plugin-mongodb-security/rules',
  'browser-security': '/docs/security/plugin-browser-security/rules',
  'react-a11y': '/docs/quality/plugin-react-a11y/rules',
  'node-security': '/docs/security/plugin-node-security/rules',
  'react-features': '/docs/quality/plugin-react-features/rules',
  'import-next': '/docs/quality/plugin-import-next/rules',
  'vercel-ai-security': '/docs/security/plugin-vercel-ai-security/rules',
};

function findingToDocsPath(ruleId: string): string {
  const slashIdx = ruleId.indexOf('/');
  if (slashIdx < 0) return '/docs';
  const prefix = ruleId.slice(0, slashIdx);
  const rule = ruleId.slice(slashIdx + 1);
  const base = RULE_DOCS_PREFIX[prefix] ?? `/docs/quality/plugin-${prefix}/rules`;
  return `${base}/${rule}`;
}

export function useLiveLinting(
  code: string,
  enabledPlugins: ReadonlySet<string>,
): {
  liveFindings: readonly PlaygroundFinding[] | null;
  lintStatus: LintStatus;
  lintError: string | null;
} {
  const [liveFindings, setLiveFindings] = useState<readonly PlaygroundFinding[] | null>(null);
  const [lintStatus, setLintStatus] = useState<LintStatus>('idle');
  const [lintError, setLintError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const lint = useCallback(
    async (currentCode: string, plugins: string[]) => {
      // Cancel any in-flight request.
      if (abortRef.current) {
        abortRef.current.abort();
      }
      abortRef.current = new AbortController();

      setLintStatus('linting');
      setLintError(null);

      try {
        const res = await fetch('/api/play/lint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: currentCode, plugins }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error(`Lint API returned ${res.status}`);
        }

        const data: LintApiResponse = await res.json();

        const findings: PlaygroundFinding[] = data.findings.map((f) => ({
          ruleId: f.ruleId,
          severity: f.severity,
          line: f.line,
          column: f.column,
          message: f.message,
          ruleDocsPath: findingToDocsPath(f.ruleId),
        }));

        setLiveFindings(findings);
        setLintStatus('done');
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was superseded — don't update state.
          return;
        }
        setLintStatus('error');
        setLintError(err instanceof Error ? err.message : 'Unknown lint error');
      }
    },
    [],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      lint(code, [...enabledPlugins]);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code, enabledPlugins, lint]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { liveFindings, lintStatus, lintError };
}
