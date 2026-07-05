/**
 * Coverage-gap tests for lock-file (Layer 2).
 * Targets: the `checked` once-per-run guard — a second Program visit in the
 * same rule instance must be a no-op. RuleTester never parses two Programs
 * with one rule instance, so this uses createWithMockContext from
 * @interlace/eslint-devkit.
 */
import { describe, it, expect } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { lockFile } from './index';

describe('lock-file coverage gaps (Layer 2)', () => {
  it('reports a missing lock file once and skips subsequent Program visits', () => {
    const { listeners, reports } = createWithMockContext(lockFile as never, {
      // A directory that cannot contain any lock file; dirname('/definitely-
      // missing-lockdir') walks straight to '/' and stops.
      filename: '/definitely-missing-lockdir-e2e/src/mock.ts',
    });
    const program = { type: 'Program', body: [], sourceType: 'module' };

    (listeners.Program as (n: unknown) => void)(program);
    expect(reports).toHaveLength(1);
    const report = reports[0] as {
      messageId: string;
      data: { packageManager: string; lockFile: string };
    };
    expect(report.messageId).toBe('violationDetected');
    expect(report.data.packageManager).toBe('any');
    expect(report.data.lockFile).toBe(
      'package-lock.json | yarn.lock | pnpm-lock.yaml'
    );

    // Second Program visit → `checked` guard short-circuits, no new report.
    (listeners.Program as (n: unknown) => void)(program);
    expect(reports).toHaveLength(1);
  });
});
