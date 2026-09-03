# Rule corpus — `browser-security/no-password-in-url` (CWE-521)

Written from CWE-521 / RFC 3986 semantics and real client idiom — an API
client's base URL, a config map, an `<img>` behind basic auth — **not** from
the rule's own test file.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

## What "vulnerable" means here

A password in the **userinfo** component of an `http(s)` URL:
`scheme://user:password@authority/path`. The authority ends at the first `/`,
`?`, `#` or whitespace, and that boundary is the whole rule — an `@` later in
the PATH is not userinfo, which is why `safe/03` exists. A username with no
password (`https://token@host`) is a different weakness and is out of scope.

## Partition

COMPLEMENTARY to the three navigation rules rather than partitioned. This rule
reports the secret inside the string; they report where the string sends you.
`location.assign('https://u:p@host')` drawing two reports is two findings with
two different fixes — asserted explicitly in
`url-navigation-partition.matrix.test.ts`.
