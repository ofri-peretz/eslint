---
'eslint-plugin-modularity': minor
---

`ddd-anemic-domain-model` now only checks code in a **domain layer**.

An anemic domain model is a defect of a domain layer: an entity holding state
while its behaviour lives in a service. Outside one, a class with fields and no
methods is a transport object, an options bag or an error shape — which is what
a client library is supposed to ship.

New `domainPaths` option, default `['domain', 'domains', 'entities', 'entity',
'aggregate', 'aggregates', 'model', 'models']`, matched by path **segment**.
Set it to `[]` to check every class, which is the previous behaviour.

**526 → 0** on the pinned corpus. Not one finding was in a domain layer: on
okta-auth-js all 38 sat under `idx/`, `myaccount/`, `errors/`, `exports/`,
`base/`, `authn/`, `core/` and `http/`.
