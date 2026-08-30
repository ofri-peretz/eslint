---
---

fix(scripts): the name-inference gate could not see prefix or suffix tests

`SUBSTRING_METHODS` was `includes|indexOf|search|match`. A prefix or suffix test
is a name deciding a type just as much as `includes` is, and the list simply
never named them.

That is not theoretical. #737 changed `className.includes(pattern)` to
`className.endsWith(pattern)` — a genuine fix, since `Requestor` no longer
matched `Request` — and in doing so moved the code out of this gate's range. The
inference did not go away; the gate stopped seeing it. A gate a fix can walk out
of is worse than no gate, because the green tick reads as a verdict.

Widening the list surfaces 11 sites, all registered with their direction and a
reason. Seven are legitimate and say so: `startsWith("aria-")` is the ARIA
specification rather than a guess, `startsWith("on")` identifies a JSX event
prop, `jsx-handler-names` is a naming rule whose subject _is_ the name, and two
sites the gate misreads — a module specifier (`@scope`, `npm:`) and a dotfile
check on a directory entry, neither of which is an identifier at all.

Four are real debt: `endsWith("Error")` deciding a class is an error type in two
copies of `no-missing-error-context`, `ddd-value-object-immutability` deciding
value-object-ness from a suffix list, and `no-hardcoded-credentials` suppressing
on keys ending in `name`/`label`/`placeholder` — a credential assigned to a key
ending in "name" is still a credential.

The registry is bidirectional, so narrowing the list again turns all 11 into
stale entries and fails. The widening cannot be quietly reverted.
