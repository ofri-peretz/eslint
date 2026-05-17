# Security-by-Design Philosophy (UI Surface)

A focused sub-philosophy of [UX_PHILOSOPHY.md](./UX_PHILOSOPHY.md) and
[INTEROP_PHILOSOPHY.md](./INTEROP_PHILOSOPHY.md), expanding the security
surface that lives in the UI layer. This is not a substitute for our ESLint
security plugins — those cover server-side, library-call, and data-handling
hygiene. This document binds the **front-end** security contract: XSS,
clickjacking, PII handling, CSP, third-party scripts, and the human-facing
exfiltration surface.

The OWASP Top 10 (2021, refreshed 2025) frames most of the threat model
([owasp.org/Top10](https://owasp.org/Top10/)). This doc operationalizes the
UI-surface subset.

---

## The core rule

> **Treat every input as untrusted, every secret as a liability, every third
> party as a threat surface. No `dangerouslySetInnerHTML` without sanitization.
> No secrets in client bundles. CSP is `default-src 'self'` with explicit
> allow-lists. PII is masked in dev tools, redacted in logs, never in URLs.**

Three tests, in order:

1. **XSS test.** Search the codebase for `dangerouslySetInnerHTML`. Every
   instance must sanitize via DOMPurify (or equivalent) at the call site.
2. **Secret leak test.** Search the production bundle for `process.env.*`
   references. Any non-`NEXT_PUBLIC_` (or framework equivalent) reference is
   a secret leak. Sentry DSN, Stripe publishable key, etc. are public by
   spec; everything else is a leak.
3. **CSP test.** Load the production site with `Content-Security-Policy:
   default-src 'self'`. Does anything break? Each break is a third-party
   surface we need to vet and explicitly allow-list.

---

## The 12 principles

Ordered by leverage.

### 1. No `dangerouslySetInnerHTML` without sanitization

Every use sanitizes via DOMPurify (or a peer) at the call site. **No
exceptions.** Even for "trusted" markdown — markdown rendered via remark/MDX
can still emit raw HTML if not configured to strip.

**Mechanics:**

- Wrap every call: `dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}`.
- Lint rule: existing `eslint-plugin-react-features/react/no-danger` flags
  the call so reviewers see it.
- Markdown / MDX pipelines configure `rehype-sanitize` or equivalent.

### 2. No secrets in client bundles

Anything the browser receives is public. Treat the production JS bundle as
publishable.

| Variable                                | OK in client? | Why                                         |
| --------------------------------------- | ------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN`                | ✅             | DSN is intentionally public                  |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`    | ✅             | Publishable key is public by spec            |
| `STRIPE_SECRET_KEY` / `OPENAI_API_KEY` | ❌             | Server-only; reaches the bundle = breach    |
| `DATABASE_URL` / `JWT_SIGNING_SECRET`  | ❌             | Server-only                                  |

**Mechanics:**

- Framework convention: `NEXT_PUBLIC_*` (Next.js), `VITE_*` (Vite),
  `PUBLIC_*` (Astro) is the only prefix that ships to the bundle.
- CI: a "scan production bundle for non-public env var names" step is the
  belt-and-suspenders gate.

### 3. CSP is `default-src 'self'`, allow-listed

Content-Security-Policy is the most effective XSS defense. Default to
`default-src 'self'`, then allow-list:

- `script-src 'self' <vetted CDNs>` — analytics, Stripe, Sentry, etc.
- `style-src 'self' 'unsafe-inline'` — Tailwind requires inline styles in
  dev only; production should be `'self'`.
- `img-src 'self' data: <allowed image hosts>`.
- `connect-src 'self' <API endpoints>`.
- `frame-ancestors 'none'` — clickjacking defense.

Report-only mode first (`Content-Security-Policy-Report-Only`), then
enforce.

### 4. Third-party scripts are vetted and pinned

Every `<script src=…>` for a third party (analytics, support widgets, chat,
embeds) is:

- Loaded with `subresource-integrity` (`<script integrity="sha384-…">`) when
  possible.
- Loaded async / defer.
- Loaded via `<script type="text/partytown">` or similar isolation for
  high-risk widgets.
- Documented in `docs/third-party-scripts.md` with a security review date.

Adding a new third-party script is a tracked decision, not a drive-by.

### 5. PII is masked / redacted, never in URLs

- **Never in URLs.** Emails, names, addresses, IDs that identify a person —
  not in the path or query string. URLs are logged everywhere
  (CDN, analytics, proxy, browser history); URL = breach surface.
- **Masked in dev tools.** Email shows as `o***@snappy.com` in any UI
  preview / Storybook story / log. Real address only visible after explicit
  user action.
- **Redacted in logs.** Sentry / Datadog / app logs use scrubbing rules
  (`@sentry/integrations` `RewriteFrames`, `beforeSend` redaction).

### 6. Forms protect against bot abuse without CAPTCHA

Cross-link to [A11Y_PHILOSOPHY.md](./A11Y_PHILOSOPHY.md) §10 and
[AUTH_PHILOSOPHY.md](./AUTH_PHILOSOPHY.md) §6. Bot defenses:

- Server-side rate limiting (token bucket per IP / per account).
- Honeypot fields (hidden form fields that bots fill, humans don't).
- Time-based heuristics (form submitted < 1s after render → suspicious).
- Cloudflare Turnstile / hCaptcha (invisible mode) as the last resort.

User-visible CAPTCHA is a friction tax with a known accessibility cost;
prefer server-side detection.

### 7. Trust boundary: client → server is the trust boundary

The client is untrusted. Every server endpoint validates inputs, even if
the client already did. The Zod schema that powers the form **and** the
server route handler share the schema definition (via a shared package or
codegen), but the server runs it independently.

**Mechanics:**

- `import { schema } from '@your/schemas'; const parsed = schema.parse(body);`
  on every server handler.
- Client-side validation is for UX (immediate feedback), not security.

### 8. CSRF defenses on state-mutating requests

State-changing requests (POST / PATCH / DELETE) protect against CSRF:

- `SameSite=Lax` cookies (default in modern browsers).
- `Origin` / `Referer` header check on the server.
- CSRF token (`X-CSRF-Token` header + matching cookie) for high-risk routes.
- Modern best practice: most session frameworks handle this; verify yours
  does.

### 9. File uploads are size-limited, type-validated, scanned

User uploads (avatars, attachments, CSVs):

- Server-side size limit per file + per request (e.g. 5 MB).
- Content-type validation via magic-bytes detection, not just the `Content-Type`
  header (which the client controls).
- Filename sanitization (no `../`, no UTF-8 spoofing).
- Stored outside the public web root; served via signed URLs.
- Virus scanning (ClamAV / S3 antivirus / Cloudflare R2) on user-shared
  files.

### 10. Subresource Integrity + dependency hygiene

- Lock dependency versions (`package-lock.json` / `pnpm-lock.yaml`
  committed).
- Dependabot / Renovate enabled with security alerts.
- `npm audit` clean on the merge gate (or documented exceptions per CVE).
- `eslint-plugin-node-security` (we ship it) catches runtime supply-chain
  risks.

### 11. Headers are deploy-contract, not optional

Every production deploy ships:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — strip
  whatever the app doesn't use.
- `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`)

Vercel / Netlify / Cloudflare Pages each have a header-config file; commit
it.

### 12. Build with the ecosystem

Cross-link to our own security ESLint plugins (`eslint-plugin-node-security`,
`-jwt`, `-secure-coding`, `-express-security`, `-lambda-security`,
`-vercel-ai-security`). They cover the dependency-call, JWT, and
framework-specific surfaces. This doc covers the UI surface those plugins
don't lint.

For sanitization: DOMPurify. For CSP: framework adapters (Next, Astro).
For PII redaction: Sentry's `RewriteFrames` + `beforeSend`. For uploads:
your S3 / R2 SDK with antivirus integration.

---

## How this gets used

When designing or reviewing a UI surface, ask:

1. Are all `dangerouslySetInnerHTML` calls sanitized at the call site?
2. Are all client-side env vars `NEXT_PUBLIC_*` / `VITE_*` / `PUBLIC_*` only?
3. Is CSP `default-src 'self'` enforced with vetted allow-list?
4. Are third-party scripts vetted, integrity-hashed, and documented?
5. Is PII masked in UI, redacted in logs, absent from URLs?
6. Are forms protected by rate limits + honeypots + server-side validation?
7. Is the client → server boundary the trust boundary (schema parse on
   server)?
8. Are state-mutating requests CSRF-protected?
9. Are file uploads size-limited, type-validated, virus-scanned?
10. Are dependencies locked + scanned for CVEs?
11. Are security headers part of the deploy contract?
12. Does the implementation reach for vetted libraries, not roll its own?

If any answer is no, the surface is not yet shippable to production.

---

## Living document

When a security pattern arises this doc didn't anticipate, edit it first,
then ship. Security regresses silently — and the cost of regression is
asymmetric.
