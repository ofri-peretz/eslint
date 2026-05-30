/**
 * Toast static-path render lock.
 *
 * Regression: Base UI error #66 ("Toast parts must be used within <Toast.Root>")
 * was thrown by ToastTitle / ToastDescription / ToastClose whenever <Toast> was
 * rendered WITHOUT the `toast` prop (static/screenshot mode). Root cause: the
 * static path rendered a <div> instead of BaseToast.Root, but the sub-parts
 * still called BaseToast.Title/Description/Close which require Toast.Root context.
 *
 * Fix: ToastStaticCtx — the static path wraps children in a context provider
 * that signals sub-parts to render as plain HTML instead.
 *
 * This test must FAIL if you remove ToastStaticCtx from toast.tsx and PASS
 * with the fix in place.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastProvider,
} from '@interlace/ui/toast';

describe('Toast static render (no toast prop)', () => {
  it('renders without error without ToastProvider', () => {
    // The static path must NOT throw even without any Base UI context.
    expect(() =>
      render(
        <Toast tone="info">
          <ToastTitle>Title</ToastTitle>
          <ToastDescription>Description</ToastDescription>
          <ToastClose />
        </Toast>,
      ),
    ).not.toThrow();
  });

  it('renders without error inside ToastProvider', () => {
    // Static path inside a provider (the Default story shape) also must not throw.
    expect(() =>
      render(
        <ToastProvider>
          <Toast tone="success">
            <ToastTitle>Saved</ToastTitle>
            <ToastDescription>Your preferences were updated.</ToastDescription>
          </Toast>
        </ToastProvider>,
      ),
    ).not.toThrow();
  });

  it('all four tones render without error', () => {
    const tones = ['info', 'success', 'warning', 'danger'] as const;
    for (const tone of tones) {
      expect(() =>
        render(
          <Toast tone={tone}>
            <ToastTitle>{tone}</ToastTitle>
            <ToastDescription>Static {tone} toast</ToastDescription>
          </Toast>,
        ),
      ).not.toThrow();
    }
  });
});
