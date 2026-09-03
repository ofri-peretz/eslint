# Known False Negatives and False Positives

This document catalogs known limitations in accessibility rules to help users understand edge cases.

## Core A11y Rules

### `alt-text`

**Known False Negatives (Not Detected)**

- Images in custom components that aren't recognized as image elements
- Alt text passed via spread props: `<img {...imgProps} />`
- Dynamically constructed alt text (can't validate content quality)
- Background images that convey information

**Known False Positives (Incorrectly Flagged)**

- None known - `alt=""` correctly marks decorative images

---

### `anchor-is-valid`

**Known False Negatives (Not Detected)**

- Dynamic href values that resolve to "#" or "javascript:" at runtime
- Custom link components that don't include href

**Known False Positives (Incorrectly Flagged)**

- SPA router links that use onClick for navigation (intentional pattern)
- Links styled as buttons for UX reasons

---

### `click-events-have-key-events`

**Known False Negatives (Not Detected)**

- Click handlers added via refs
- Event delegation patterns
- Third-party click handling libraries

**Known False Positives (Incorrectly Flagged)**

- Elements where keyboard interaction is handled by parent
- Decorative elements with no functional purpose

---

### `mouse-events-have-key-events`

**Known False Negatives (Not Detected)**

- Mouse events added dynamically via useEffect
- Event handlers from third-party libraries

**Known False Positives (Incorrectly Flagged)**

- Hover-only enhancements that don't affect core functionality

---

### `no-static-element-interactions`

**Known False Negatives (Not Detected)**

- Interactions added via refs or effects
- Third-party library event handlers

**Known False Positives (Incorrectly Flagged)**

- Wrapper elements for layout purposes with delegated events
- Elements styled with `cursor: pointer` for visual feedback only

---

### `interactive-supports-focus`

**Known False Negatives (Not Detected)**

- Focus management via refs
- Third-party focus libraries (e.g., react-focus-lock)

**Known False Positives (Incorrectly Flagged)**

- Elements where parent manages focus
- Custom dropdown/menu implementations

---

## ARIA Rules

### `aria-props`

**Known False Negatives (Not Detected)**

- ARIA props from spread operators
- Dynamically generated ARIA prop names

**Known False Positives (Incorrectly Flagged)**

- None known - validates against ARIA specification

---

### `aria-role`

**Known False Negatives (Not Detected)**

- Roles from spread props
- Conditional roles based on state

**Known False Positives (Incorrectly Flagged)**

- None known - validates against ARIA specification

---

### `role-has-required-aria-props`

**Known False Negatives (Not Detected)**

- Required props provided via spread
- Props provided by parent context

**Known False Positives (Incorrectly Flagged)**

- None known

---

### `role-supports-aria-props`

**Known False Negatives (Not Detected)**

- Role-prop compatibility issues with spread props
- Dynamically changing roles

**Known False Positives (Incorrectly Flagged)**

- None known

---

### `no-redundant-roles`

**Known False Negatives (Not Detected)**

- Roles made redundant by inherited semantics
- Complex nested role hierarchies

**Known False Positives (Incorrectly Flagged)**

- Explicit roles for assistive technology compatibility
- Roles for specific AT/browser combinations

---

## Form Rules

### `label-has-associated-control`

**Known False Negatives (Not Detected)**

- Labels associated via aria-labelledby on the input
- Custom form controls not recognized
- Third-party form libraries

**Known False Positives (Incorrectly Flagged)**

- Custom label-input associations via context

---

### `control-has-associated-label`

**Known False Negatives (Not Detected)**

- Labels provided via aria-label in a different location
- Dynamic form generation

**Known False Positives (Incorrectly Flagged)**

- Controls with visually hidden but accessible labels

---

## Media Rules

### `media-has-caption`

**Known False Negatives (Not Detected)**

- Captions loaded dynamically
- Third-party video players with caption support
- Audio descriptions via separate mechanism

**Known False Positives (Incorrectly Flagged)**

- Decorative/ambient media
- Media with audio-only content where transcripts suffice

---

### `iframe-has-title`

**Known False Negatives (Not Detected)**

- Titles added via JavaScript after mount
- Third-party iframe wrappers

**Known False Positives (Incorrectly Flagged)**

- None known

---

## Mitigation Strategies

### For False Negatives

1. **Runtime Testing**: Use axe-core, Lighthouse, or similar tools
2. **Manual Testing**: Test with actual screen readers
3. **User Testing**: Include users with disabilities in testing

### For False Positives

1. **Inline Disables**: `// eslint-disable-next-line` with clear explanation
2. **Rule Configuration**: Many rules have options to customize behavior
3. **File Overrides**: Use ESLint config overrides for specific patterns

---

## Contributing

Found a new FN/FP? Please:

1. Open an issue at https://github.com/ofri-peretz/eslint
2. Provide a minimal reproduction
3. Describe expected vs actual behavior
