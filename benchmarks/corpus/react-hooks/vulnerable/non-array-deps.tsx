// react/exhaustive-deps — non-array deps argument
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — useMemo deps is a variable reference, not an array literal
import { useMemo } from 'react';

export function Computed({ items, deps }: { items: number[]; deps: unknown[] }) {
  const total = useMemo(() => items.reduce((a, b) => a + b, 0), deps);
  return <output>{total}</output>;
}
