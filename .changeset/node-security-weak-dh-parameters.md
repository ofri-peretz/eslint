---
'eslint-plugin-node-security': minor
---

feat: detect Diffie-Hellman and ECDH parameters below a safe strength

New rule `no-weak-dh-parameters` (CWE-326), error in `recommended`.

The plugin declares `crypto` as part of its target surface and had no rule that
named a single Diffie-Hellman API. `createDiffieHellman`,
`createDiffieHellmanGroup`, `getDiffieHellman`, `diffieHellman` and
`createECDH` appeared nowhere in its sources while the published API-surface
coverage figure said 70% — a figure that turned out to be a hand-typed constant
rather than a measurement.

A _named_ Diffie-Hellman group is a fixed prime, so the expensive part of
breaking it is paid once and then every session using that group falls cheaply.
That is Logjam (CVE-2015-4000): `modp1` is 768-bit and `modp2` is 1024-bit.

Reports three literal-argument shapes:

- `getDiffieHellman(name)` / `createDiffieHellmanGroup(name)` — MODP group
  below `minPrimeBits` (default 2048)
- `createDiffieHellman(bits)` — numeric prime length below the floor
- `createECDH(curve)` — a curve with a field size under 224 bits

Deliberately silent on an unrecognised group name (a future RFC group must not
become a finding by being unknown), on the `createDiffieHellman(prime, encoding)`
overload (that prime is chosen elsewhere and reading it is not something a
structural rule can do), and on a computed name.

Configurable via `minPrimeBits`, `additionalWeakCurves` and `allowInTests`.
