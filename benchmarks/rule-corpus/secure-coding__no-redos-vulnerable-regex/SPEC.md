# `secure-coding/no-redos-vulnerable-regex` — the contract

CWE-1333 / CWE-400, *Inefficient Regular Expression Complexity*.

**Every claim below was executed** — timed on V8, or decided by `recheck`'s
automaton analysis. None of it is read off the shape of a pattern.

---

## 0. What the weakness actually is, measured

### Catastrophic backtracking is a property of the automaton, not the spelling

```
/^(a+)+$/         'a'×28 + '!'          1342.5 ms      exponential
/^\d+\.?\d*$/     '1'×20000 + '!'        162.2 ms      polynomial
/^[a-z]+$/        'a'×20000 + '!'          0.0 ms      linear
```

Two of those look similar and behave nothing alike. **A rule that decides from
the printed pattern is guessing**, which is why this one runs a structural
pre-filter and then defers to an oracle.

### Flags are part of the automaton

```
/^(?:a|A)+$/      recheck: safe
/^(?:a|A)+$/i     recheck: VULNERABLE
```

Case folding makes `a` and `A` the same character, turning disjoint alternation
into ambiguous alternation. **A verdict computed without the flags is a verdict
about a different regex.**

### Searching for an attack string cannot prove safety

A generator that pumps inputs can only ever fail to find a witness. Asked about
the 106 literal patterns this rule reports on real code:

| | timing search | `recheck` (automaton) |
| :--- | ---: | ---: |
| vulnerable | 28 | **102** |
| safe | — *(no such verdict)* | **4** |
| undecided | 78 | **0** |

The search has no `safe` verdict at all, so every negative is silently an
"I don't know". This is why the oracle grades and the heuristic only filters.

### Escaping is a real, verifiable guard

```
esc('(a+)+$')  →  \(a\+\)\+\$        does NOT match 'aaaa'
```

---

## 1. Sink — the dangerous operation

A regular expression that is **evaluated**: a literal, or a pattern reaching the
`RegExp` intrinsic. All four spellings are the same intrinsic, confirmed by
identity rather than assumed:

```
const R = RegExp; new R('a') instanceof RegExp     true
globalThis.RegExp === RegExp                       true
RegExp('a') instanceof RegExp                      true
new RegExp(/a/) instanceof RegExp                  true
```

## 2. Source — what makes it dangerous

Unlike most rules in this ecosystem, **the danger is in the pattern, not in an
untrusted input reaching it.** A catastrophic regex is a latent defect wherever
it sits.

That is the rule's weakest point and it is stated here rather than discovered
later: it does **not** establish that attacker-controlled input is ever matched
against the pattern. A catastrophic regex applied only to internal constants is
reported identically to one on a request path. See the `reachability` axis in
`SEAL.json`.

## 3. Path — how far the rule follows

To the pattern's text: a literal, a `const` binding one hop away, `String.raw`,
a template literal with no interpolation, and concatenation of static parts.
A pattern assembled from interpolated runtime values has **no fixed automaton**,
so no oracle can decide it — [L1](../../../ANALYSIS-LIMITS.md).

## 4. Guard — what makes it safe

- the oracle proves the automaton linear
- bounded repetition that closes the ambiguity (`{1,3}` inside `{3}`)
- alternation whose branches are disjoint — **and whose flags do not fold them
  together**
- quantifiers separated by a mandatory literal
- the pattern is escaped before construction

## 5. Context

Test files and fixtures. A pattern inside a `//` comment or a string is not a
pattern.

---

## The five decisions

| # | Decision | This rule |
| :--- | :--- | :--- |
| 1 | Sink identified by | scope resolution to the intrinsic — never `callee.name === 'RegExp'`, which was wrong in both directions |
| 2 | Source | n/a — the pattern is the defect |
| 3 | Path depth | one binding hop to the pattern text; runtime-assembled is undecidable |
| 4 | Guard | the oracle's proof, or a structurally closed ambiguity |
| 5 | **When unprovable** | **report.** A pattern nobody can clear is a latent defect, and the tier is opt-in, so the cost of being wrong is bounded |

---

## The prediction

**These must report:**

1. `/^(a+)+$/` and every measured-exponential shape
2. `/^\d+\.?\d*$/` — polynomial is still superlinear
3. The same automaton through **all four** intrinsic spellings
4. `/^(?:a|A)+$/i` — vulnerable only because of the flag
5. A catastrophic pattern reached through one `const` hop, `String.raw`, or static concatenation

**These must stay quiet:**

1. `/^[a-z]+$/` and anything the oracle proves linear
2. `/^(?:a|A)+$/` **without** the `i` flag — the control for #4 above
3. `/^(?:a{1,3}){1,3}$/` — bounded repetition
4. A pattern escaped before construction
5. `function render(RegExp) { RegExp(p) }` — a parameter, not the intrinsic
6. `const RegExp = (p) => p` — a local shadow

**Known gaps, stated up front:** patterns assembled at runtime are undecidable
([L1](../../../ANALYSIS-LIMITS.md)); reachability is not established at all; and
the oracle is an optional peer, so a consumer without it gets the heuristic's
answer, which is strictly noisier.

---

*Frozen 2026-08-19. Written after the rule, not before — the honest caveat on
this one. Every claim in it is nonetheless executed rather than asserted.*
