// eslint-plugin-security is the ONE npm dependency (not ours; pinned 4.2.1 via benchmarks/package-lock).
import security from 'eslint-plugin-security';
import { base } from './shared.mjs';

// A: the preset as shipped.
export const A = [...base, security.configs.recommended];

// A-all: every rule at error, as the existing arena config does. A second row, not a replacement for A.
export const A_all = [
  ...base,
  {
    plugins: { security },
    rules: Object.fromEntries(
      Object.keys(security.rules).map((r) => [`security/${r}`, 'error']),
    ),
  },
];
