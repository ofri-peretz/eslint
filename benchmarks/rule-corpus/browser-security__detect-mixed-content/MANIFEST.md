# Rule corpus — `browser-security/detect-mixed-content` (CWE-311)

Written from what mixed content **is** — an `http://` subresource loaded into an
HTTPS document — and from real React / service-worker idiom, **not** from the
rule's own test file. A corpus derived from the tests can only re-derive what
the author already thought of.

The distinction this corpus exists to hold is the one the rule got wrong for
most of its life: **a subresource is loaded, a link is followed.** The browser
blocks the first and does nothing about the second. `<img src="http://…">` is
mixed content; `<a href="http://…">` is a cleartext URL, which is
`no-http-urls`' finding, not this one. A corpus that scored them the same would
have scored the old broken predicate at 100%.

`safe/` therefore contains shapes that are genuinely reportable BY A SIBLING.
They are not "safe code" — they are "not this rule's finding", which is the
only way to measure a partitioned family.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.
