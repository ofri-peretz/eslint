---
'eslint-plugin-secure-coding': major
'eslint-plugin-node-security': major
'eslint-plugin-browser-security': major
---

Rules now say only what they proved

This release is a quality pass, not a feature release. Every change below was
driven by measuring the rules against **20 real repositories, 21,394 files,
3.10M lines** — not against our own fixtures, which is where the defects had
been hiding.

## Half of `detect-object-injection`'s output could not be the weakness it named

The rule reports CWE-1321, prototype pollution. **49% of its findings were
reads**, and a read cannot pollute a prototype:

```js
const o = {}, k = '__proto__';
const v = o[k];          // Object.prototype unchanged
```

That is executed, not argued — there is no key, no object and no runtime where
evaluating `obj[k]` as an expression writes anything. Reads are no longer
reported, **except** where the value is invoked: `const h = handlers[k]; h()`
is a read, and `{"action":"constructor"}` hands you the Object constructor.

**14,910 findings → 5,751**, with recall proven intact — 100% F1 and 100%
Youden's J against the rule's corpus, unchanged before and after.

A read of an attacker-chosen key can still disclose something it should not.
That is CWE-200, a different weakness, and reporting it under a CWE-1321 message
told you the wrong thing.

## `detect-non-literal-regexp` stopped claiming a vulnerability it cannot decide

Every one of its findings reported `issueName: 'ReDoS vulnerability'`. The rule
establishes that a pattern is not a literal. Catastrophic backtracking is a
property of an automaton and needs one to decide — `no-redos-vulnerable-regex`
decides it with `recheck`, an independent oracle, at 98.1% precision.
`new RegExp(escapeRegExp(name))` is not a literal and cannot backtrack;
`/(x+x+)+y/` is a literal and does.

**Breaking:** the messageId is now `runtimeDecidedPattern`. If you key on
messageIds in a formatter, SARIF pipeline or CI check, update it. The message
states what was established and names the two rules that decide what it cannot.

Also removed: a table that matched `**`, `++` and `??` **as text in your source**
and escalated findings to CRITICAL on that basis. It never changed the verdict,
only the severity, on a textual guess at the one thing this rule proves nothing
about.

## Recall: three spellings reached `RegExp` past both regex rules

Found by attacking the rules deliberately rather than by waiting for a bug
report. All three were silent in `detect-non-literal-regexp` **and**
`no-redos-vulnerable-regex`:

```js
const { RegExp: R } = globalThis; new R(p)   // destructured intrinsic
class My extends RegExp {}; new My(p)        // subclassed
Reflect.construct(RegExp, [p])               // constructed reflectively
```

**Cost: zero.** Both rules report exactly what they reported before across all
3.10M lines. Coverage against evasion, bought at no additional noise.

The same pass narrowed a clone exemption that was too generous:
`new RegExp(re.source, re.flags)` is exempt only when the file can see that
`re` is a regex. Any object can carry `.source` and `.flags`, and
`JSON.parse(body)` is one.

## `allowInTests` no longer depends on where your repo is checked out

Ninety-eight rules each carried their own copy of
`/\.(test|spec)\.(ts|tsx|js|jsx)$/`. They now share one predicate, so the answer
cannot drift between rules or change with the path a file happens to sit at.

`no-privilege-escalation` and `no-missing-authentication` gain a
`testFilePattern` option for projects whose test layout differs. Unset — the
default — the shared predicate decides.

## How the claims above are checked

Precision and recall numbers come from head-to-head runs against the
corresponding upstream rules on a shared corpus, and every behaviour change is
measured on the 20 repositories before and after. Where a claim could not be
settled by analysis it was settled by execution: the prototype-pollution probe
runs on Node 24, and the regex-clone claim is confirmed by `recheck` returning
the same verdict for a pattern and its copy.

Two things are recorded rather than fixed, because we would rather name a limit
than paper over it: recognising an escaped interpolation
(`new RegExp(escapeRegExp(x))`) requires knowing what a function returns, which
is interprocedural analysis these rules do not do; and
`detect-non-literal-fs-filename` has an unresolved question about whether a
hardcoded path to a sensitive location is a finding at all.
