# 🔐 NPM Authentication Quick Reference

Every package in this repo, scoped or unscoped, publishes through **npm Trusted Publishing (OIDC)**. There is no npm
token in CI and no token to rotate: the `NPM_TOKEN` first-release fallback and the weekly token health check were
removed in #1213.

## Current Status

`release.yml`'s publish job requests an OIDC token and npm exchanges it for a short-lived publish token:

```yaml
permissions:
  id-token: write # ← For OIDC
```

## Adding a new package

Trusted Publishing can only be configured on a package that already exists on npm, so:

1. Claim the name by hand with an empty `0.0.0-stage` publish.
2. On npmjs.com → Package → Settings → Trusted Publisher, add GitHub Actions: repository `ofri-peretz/eslint`,
   workflow `release.yml`.
3. Let `release.yml` publish the first real version.

Details: [TRUSTED_PUBLISHING_SETUP.md](./TRUSTED_PUBLISHING_SETUP.md#new-package-names).

## Troubleshooting

### `E404 PUT` or "403 Forbidden" on one package

→ That package has no Trusted Publisher (or a wrong one). Configure it on npmjs.com and re-run the release.

### `E404` on a package that is not on npm at all

→ The name was never claimed. Do steps 1 and 2 above.

### "Signature verification failed"

→ Re-verify the GitHub repo URL and workflow file name in the package's Trusted Publisher settings.
