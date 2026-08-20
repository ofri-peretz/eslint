/**
 * VULNERABLE (adversarial) - a type-only import of a squatted package. The
 * import is erased at compile time, but the package still has to be INSTALLED
 * for `tsc` to resolve it, and installation is when a malicious postinstall
 * hook runs. Type-only is not safe-only.
 */
import type { AxiosInstance } from 'axois';
import type { Configuration } from 'wepback';

export interface BuildContext {
  http: AxiosInstance;
  bundler: Configuration;
}

export function describe(ctx: BuildContext): string {
  return `${ctx.bundler.mode ?? 'development'} build`;
}
