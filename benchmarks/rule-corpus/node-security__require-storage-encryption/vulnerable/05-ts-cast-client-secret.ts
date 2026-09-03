/**
 * VULNERABLE - TypeScript. The OIDC config types clientSecret as
 * `string | undefined`, so the cast is required to compile, and it erases the
 * evidence for anything reading the argument's shape rather than its binding.
 */
import { writeFileSync } from 'node:fs';

interface OidcConfig {
  clientId: string;
  clientSecret?: string;
}

export function materialiseOidcSecret(dest: string, config: OidcConfig): void {
  writeFileSync(dest, config.clientSecret as string);
}
