# Form Philosophy

A focused sub-philosophy of [UX_PHILOSOPHY.md](./UX_PHILOSOPHY.md), expanding
principles #1 (Adoption is friction subtraction) and #6 (Ease of use is
performance) into the data-entry surface. Forms are where adoption is won or
lost: the install snippet is one form, the contact form is the SLA, and every
configuration screen in a SaaS surface is a form whether we call it that or
not. This document binds form decisions across `@interlace/ui` and any consumer
docs site.

This is a sibling of [LAYOUT_PHILOSOPHY.md](./LAYOUT_PHILOSOPHY.md): layout is
the page; forms are the page's most important interaction.

---

## The core rule

> **Validate at the right moment, never the wrong one. Every field shows three
> states cleanly — idle, focused, invalid — and the error message names the
> fix, not the failure. Submit is disabled only when submission is impossible,
> never just to "discourage" the user. CLS from validation is zero.**

Three tests, in order:

1. **Did the validation fire at a moment the user expected?** Blur for syntax
   errors, submit for semantic errors. Live validation while typing is the
   regression.
2. **Does the error message tell the user what to do?** "Email is invalid" is a
   diagnosis; "use the format name@domain.com" is a fix. Ship the fix.
3. **Does the form preserve all state on validation failure?** Re-render must
   not blank a checkbox, scroll past a focused field, or reset uploaded files.
   CLS=0 applies inside the form, not just to the page.

---

## The 10 principles

Ordered by leverage.

### 1. Controlled + uncontrolled is non-negotiable

Every interactive field exposes `value` + `onValueChange` (controlled) AND
`defaultValue` (uncontrolled). MUI rule, restated in `interlace-component`
skill R14. Locking to one shape blocks half the use cases.

**Mechanics:** every input primitive in `@interlace/ui/primitives/` exposes
both; `useFormState` / `react-hook-form` / consumer-owned state all work
without forking the primitive.

### 2. Validate on blur, not on keystroke

Live validation during typing is the most common form-UX regression.
Validation that says "email invalid" before the user finished typing teaches
distrust. Blur is the floor; submit is the ceiling.

**Mechanics:**
- Format errors (regex, length) → blur.
- Existence errors (server check, uniqueness) → submit.
- Async checks (debounced) → blur with a 400ms debounce minimum.
- Live validation is permitted **only** for password strength meters and
  similar progress indicators where the user expects feedback as they type.

### 3. Error message names the fix

The most expensive UX cost in forms is users who hit an error and don't know
what to do. The fix is in the message.

| ❌ Diagnosis            | ✅ Fix                                              |
| ----------------------- | --------------------------------------------------- |
| "Email is invalid"      | "Use the format name@domain.com"                    |
| "Password too weak"     | "Use 12+ characters with a number or symbol"        |
| "Date is invalid"       | "Use a future date in MM/DD/YYYY"                   |
| "Username taken"        | "That username is taken — try one of: x, y, z"      |

### 4. Submit reflects possibility, not encouragement

`disabled` on submit means: *the form cannot be submitted in its current
state*. Not: *we'd like you to do more first*. Examples of the wrong reasoning:

- ❌ "Disable submit until the user fills every field" → submit + show
  per-field errors is friendlier.
- ❌ "Disable submit during a 5s 'thinking' delay" → show a loading state on
  the button after click.
- ✅ Submit disabled when the form has unresolved sync validation errors.
- ✅ Submit disabled during in-flight submission to prevent double-submit.

### 5. State preserves across re-render

A validation failure must not destroy in-progress state. The user filled the
form once — making them fill it twice is hostile.

**Mechanics:**
- Uploaded files persist (via URL / Object URL / signed reference).
- Checkbox / radio state preserves.
- Field with focus on submit retains focus after re-render.
- Scroll position retains; scroll-to-error is opt-in, not default.

### 6. Async submission is observable

Every submit transitions through: `idle → pending → success | error`. The
button reflects the state; the form doesn't lock invisibly.

**Mechanics:**
- Loading: button shows spinner + label change ("Saving…").
- Success: button shows checkmark for ~1s, then resets OR navigates.
- Error: button returns to idle, error surfaces in the same place each time
  (top of form for unknown errors, per-field for known errors).

### 7. Required is communicated, not assumed

Required fields are marked at first paint. Optional fields are marked
explicitly when there are more required than optional. Pick one convention per
form and stick to it.

**Mechanics:**
- `<label>` with `*` for required (when most fields are optional).
- `<label> (optional)` for optional (when most fields are required).
- `aria-required="true"` on every required input (CSS-only `*` is invisible to
  screen readers).

### 8. CLS=0 inside the form

Validation messages reserve space the moment the field renders, even if the
message is empty. Adding error text must not push subsequent fields down.

**Mechanics:**
- `min-h-5` (or token equivalent) reserved under every field for the message slot.
- Error states change *color* and *content*, never *layout*.
- Tooltip / popover error variants render in a portal — they never displace.

### 9. Accessibility is wired through

Every input has a label (visible or `aria-label`). Every error has
`aria-live="polite"` so screen readers announce it. Focus moves to the first
error field on submit when validation fails.

**Mechanics:**
- `<label htmlFor>` + `<input id>` pair on every field.
- `aria-invalid="true"` + `aria-describedby="<error-id>"` on invalid inputs.
- Submit-error focus management: `firstErrorRef.current?.focus()` after error
  state settles.

### 10. Build with the ecosystem

`react-hook-form` for state. `zod` for schema. `@base-ui-components/react/form`
for headless field primitives. We don't ship `<FormController>` — we ship
input primitives that compose cleanly into those libraries.

**Forbidden:**
- Custom form-state libraries inside `@interlace/ui`.
- Hand-rolled validation engines.
- "Form builders" that auto-generate JSX from schema (`react-jsonschema-form`
  style) — the consumer composes their own JSX.

---

## How this gets used

When designing or reviewing a form, ask:

1. Does every field expose both controlled and uncontrolled APIs?
2. Does validation fire on blur for format, submit for semantic?
3. Does each error message name the fix?
4. Is submit disabled only when submission is impossible?
5. Does the form preserve all state across validation re-render?
6. Is submission observable (idle → pending → success/error)?
7. Are required fields marked accessibly?
8. Is the message slot height-reserved (CLS=0)?
9. Is the label/error/aria-* wiring complete?
10. Does the form compose with react-hook-form + zod, not replace them?

If any answer is no, the form is not yet shippable.

---

## Living document

When a form pattern arises this doc didn't anticipate, edit it first, then
ship. Drift between principle and practice is the failure mode.
