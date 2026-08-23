---
'eslint-plugin-import-next': patch
---

`export`: a namespace member is not a module export.

`export type T` inside `export namespace A` exports `A.T`, not `T`. The rule
keyed its duplicate-detection maps on the bare name, so Stripe's `.d.ts` files
reported this as a duplicate:

```ts
export namespace PaymentIntent {
  export type SetupFutureUsage = 'off_session' | 'on_session';
}
export namespace PaymentIntentConfirmParams {
  export type SetupFutureUsage = 'off_session' | 'on_session';
}
```

Two distinct types that share a member name — which is what a namespace is for.
All 3 findings this rule produced on the pinned corpus were that shape, and the
corpus now reads 0.

The key is **prefixed** with the enclosing namespace path rather than the
declaration being skipped, so a genuine duplicate inside one namespace still
reports. All three forms of a module id are handled: `namespace A`,
`namespace A.B`, and `declare module 'x'`.
