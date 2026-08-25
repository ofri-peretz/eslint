---
'eslint-plugin-modularity': minor
---

fix: `ddd-value-object-immutability` matches the naming convention by suffix, and skips generated files

A census of all 11 findings this rule produced on the pinned 8-repository
corpus found **11 out of 11 unactionable**. Every one was in twilio's
auto-generated OpenAPI SDK — header: *"Do not edit the class manually"* — and
none was a value object.

Two independent causes, either of which alone still produced findings:

**Substring matching.** `className.includes(pattern)` over
`['Value', 'VO', 'ValueObject']` matched anything *containing* the marker:
`CountyCarrierValueCarriers`, `CreateConfigurationRequestChannelSettingsValueCaptureRules`.
A DDD value object convention names the type `MoneyValue` or `EmailVO` — the
marker **ends** the name — so the check is now `endsWith`. `VO` was the sharper
hazard, since it sits inside `ConVOy` and `PiVOt`.

**No generated-file opt-out.** The remedy this rule gives is "add `readonly`",
which the next generator run erases.

If you relied on substring matching, set `valueObjectPatterns` explicitly — the
option is unchanged, only the comparison is anchored.
