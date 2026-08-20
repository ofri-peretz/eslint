# Rule corpus — `secure-coding/no-ldap-injection` (CWE-90)

**The question this corpus exists to answer:** does this rule fire on the way real
code speaks LDAP — and only on that?

Every fixture is written from `ldapjs` and `ldapts` idiom rather than from the rule's
tests, because CWE-90 is a *library* vulnerability: the shape of the sink is decided by
the client, not by us. In particular, **`ldapjs` has no positional-filter overload for
`search`** — the filter lives on an options object, exactly as its README writes it —
so a rule that only inspects argument 1 as a string cannot see the commonest real
spelling of the bug.

The corpus is deliberately two-sided. The `safe/` files are the calls a directory
integration makes *constantly*: a service-account `bind`, an `add` with an attribute
map, a frozen filter lookup table, ldapts' structured `EqualityFilter` objects, and the
collection methods (`Set#add`, `Map#delete`) that share a name with an LDAP sink in a
file that legitimately imports ldapjs.

## Waves

| Wave | Fixtures | TP | FP | FN | Precision | Recall | F1 |
|---|---|---:|---:|---:|---:|---:|---:|
| 1 — idiom | 8 vuln / 7 safe | 3 | 3 | 5 | 50.0% | 37.5% | **42.9%** |
| 2 — adversarial | 14 vuln / 9 safe | 3 | 3 | 11 | 50.0% | 21.4% | **30.0%** |
| 3 — after the fixes | 14 vuln / 9 safe | 14 | 0 | 0 | 100% | 100% | **100%** |

The adversarial wave adds the false-negative direction nobody runs: the same injection
with every identifier renamed to an innocuous word, a local function wearing a trusted
name, a `String()` wrapper, a ternary, a computed property key, and optional chaining
on the sink.

## What the corpus proved

Four defects, all of them a predicate standing in for evidence it did not have:

1. **The canonical idiom was invisible.** `client.search(base, { filter }, cb)` — the
   only spelling ldapjs supports — was never examined. Only a positional template
   literal or a variable whose *name* contained `filter`/`ldap`/`query`/`search`/`dn`
   was.
2. **`bind`'s password and `add`'s entry were treated as filters.** Argument 1 was
   assumed to be a filter for every method on the sink list, so
   `client.bind(dn, password, cb)` — the service-account bind out of the ldapjs
   README — was a CWE-90 finding, as was `client.add(dn, userEntry, cb)` because the
   variable name began with "user".
3. **DN injection was undetectable by construction.** The DN branch required the
   printed text to contain `(` and `)`. A distinguished name has neither. `del` was
   also missing from the sink list — ldapjs spells delete `del`.
4. **Taint was a list of variable-name substrings** (`user`, `input`, `id`, `dn`,
   `name`, `term`, …) plus `sourceCode.getText(node).includes('req.')`. Renaming a
   variable turned a real finding off; a frozen lookup table whose *initializer text*
   contained `req.` turned a false one on.

A fifth was found by the coverage tests written for the fix: `isRequestValue` had no
cycle guard, so `var a = b; var b = a;` recursed until the stack overflowed — a crash
that takes the whole ESLint run down, not just the rule.

## What replaced them

An argument-position model of the LDAP client API (exact membership against a closed
set of method names), the options object's `filter` property resolved through its
binding, `isStaticExpression` for "can an attacker influence this", scope resolution
for the request root, and a filter-grammar probe (`(attribute=`) on the value's own
static text for "is this a filter at all" — which is what finally tells an LDAP filter
from a zip glob.

Locked in `packages/eslint-plugin-secure-coding/src/rules/no-ldap-injection/no-ldap-injection.test.ts`
under "corpus locks"; 26 of that file's cases fail on the pre-fix rule.
