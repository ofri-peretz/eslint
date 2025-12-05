# 📚 Rules Reference (37 Rules)

💼 Set in `recommended` | ⚠️ Warns in `recommended` | 🔧 Auto-fixable | 💡 Editor suggestions

## Anchor Rules (3 rules)

| Name                                                      | Description                           | 💼  | ⚠️  | 🔧  | 💡  | WCAG  |
| --------------------------------------------------------- | ------------------------------------- | --- | --- | --- | --- | ----- |
| [anchor-ambiguous-text](./rules/anchor-ambiguous-text.md) | Prevent ambiguous link text           |     | ⚠️  |     | 💡  | 2.4.4 |
| [anchor-has-content](./rules/anchor-has-content.md)       | Require content in anchor elements    | 💼  |     |     | 💡  | 2.4.4 |
| [anchor-is-valid](./rules/anchor-is-valid.md)             | Require valid href on anchor elements |     | ⚠️  |     | 💡  | 2.4.4 |

## ARIA Rules (4 rules)

| Name                                                                                | Description                                 | 💼  | ⚠️  | 🔧  | 💡  | WCAG  |
| ----------------------------------------------------------------------------------- | ------------------------------------------- | --- | --- | --- | --- | ----- |
| [aria-activedescendant-has-tabindex](./rules/aria-activedescendant-has-tabindex.md) | Require tabindex with aria-activedescendant |     | ⚠️  |     | 💡  | 4.1.2 |
| [aria-props](./rules/aria-props.md)                                                 | Validate ARIA property names                | 💼  |     |     | 💡  | 4.1.1 |
| [aria-role](./rules/aria-role.md)                                                   | Require valid ARIA role values              | 💼  |     |     | 💡  | 4.1.1 |
| [aria-unsupported-elements](./rules/aria-unsupported-elements.md)                   | Prevent ARIA on unsupported elements        | 💼  |     |     | 💡  | 4.1.1 |

## Form & Input Rules (3 rules)

| Name                                                                    | Description                                | 💼  | ⚠️  | 🔧  | 💡  | WCAG  |
| ----------------------------------------------------------------------- | ------------------------------------------ | --- | --- | --- | --- | ----- |
| [autocomplete-valid](./rules/autocomplete-valid.md)                     | Require valid autocomplete attribute       |     | ⚠️  |     | 💡  | 1.3.5 |
| [control-has-associated-label](./rules/control-has-associated-label.md) | Require labels on form controls            |     | ⚠️  |     | 💡  | 1.3.1 |
| [label-has-associated-control](./rules/label-has-associated-control.md) | Require labels to have associated controls |     | ⚠️  |     | 💡  | 1.3.1 |

## Event Rules (2 rules)

| Name                                                                    | Description                               | 💼  | ⚠️  | 🔧  | 💡  | WCAG  |
| ----------------------------------------------------------------------- | ----------------------------------------- | --- | --- | --- | --- | ----- |
| [click-events-have-key-events](./rules/click-events-have-key-events.md) | Require keyboard events with click events | 💼  |     |     | 💡  | 2.1.1 |
| [mouse-events-have-key-events](./rules/mouse-events-have-key-events.md) | Require keyboard events with mouse events |     | ⚠️  |     | 💡  | 2.1.1 |

## Content Rules (5 rules)

| Name                                                  | Description                              | 💼  | ⚠️  | 🔧  | 💡  | WCAG  |
| ----------------------------------------------------- | ---------------------------------------- | --- | --- | --- | --- | ----- |
| [heading-has-content](./rules/heading-has-content.md) | Require heading elements to have content | 💼  |     |     | 💡  | 1.3.1 |
| [html-has-lang](./rules/html-has-lang.md)             | Require lang attribute on html element   | 💼  |     |     | 💡  | 3.1.1 |
| [iframe-has-title](./rules/iframe-has-title.md)       | Require title on iframe elements         | 💼  |     |     | 💡  | 4.1.2 |
| [lang](./rules/lang.md)                               | Require valid lang attribute value       | 💼  |     |     | 💡  | 3.1.1 |
| [media-has-caption](./rules/media-has-caption.md)     | Require captions on media elements       |     | ⚠️  |     | 💡  | 1.2.2 |

## Image Rules (2 rules)

| Name                                              | Description                         | 💼  | ⚠️  | 🔧  | 💡  | WCAG  |
| ------------------------------------------------- | ----------------------------------- | --- | --- | --- | --- | ----- |
| [img-redundant-alt](./rules/img-redundant-alt.md) | Prevent redundant words in alt text |     | ⚠️  |     | 💡  | 1.1.1 |
| [img-requires-alt](./rules/img-requires-alt.md)   | Require alt attribute on images     | 💼  |     |     | 💡  | 1.1.1 |

## Interactive Element Rules (6 rules)

| Name                                                                                                      | Description                                        | 💼  | ⚠️  | 🔧  | 💡  | WCAG  |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --- | --- | --- | --- | ----- |
| [interactive-supports-focus](./rules/interactive-supports-focus.md)                                       | Require focus support on interactive elements      | 💼  |     |     | 💡  | 2.1.1 |
| [no-interactive-element-to-noninteractive-role](./rules/no-interactive-element-to-noninteractive-role.md) | Prevent demoting interactive elements              |     | ⚠️  |     | 💡  | 4.1.2 |
| [no-noninteractive-element-interactions](./rules/no-noninteractive-element-interactions.md)               | Prevent event handlers on non-interactive elements |     | ⚠️  |     | 💡  | 2.1.1 |
| [no-noninteractive-element-to-interactive-role](./rules/no-noninteractive-element-to-interactive-role.md) | Prevent promoting non-interactive elements         |     | ⚠️  |     | 💡  | 4.1.2 |
| [no-noninteractive-tabindex](./rules/no-noninteractive-tabindex.md)                                       | Prevent tabindex on non-interactive elements       |     | ⚠️  |     | 💡  | 2.4.3 |
| [no-static-element-interactions](./rules/no-static-element-interactions.md)                               | Prevent event handlers on static elements          |     | ⚠️  |     | 💡  | 2.1.1 |

## Focus & Navigation Rules (5 rules)

| Name                                                                              | Description                               | 💼  | ⚠️  | 🔧  | 💡  | WCAG  |
| --------------------------------------------------------------------------------- | ----------------------------------------- | --- | --- | --- | --- | ----- |
| [no-access-key](./rules/no-access-key.md)                                         | Prevent accessKey attribute usage         |     | ⚠️  |     | 💡  | 2.1.1 |
| [no-aria-hidden-on-focusable](./rules/no-aria-hidden-on-focusable.md)             | Prevent aria-hidden on focusable elements | 💼  |     |     | 💡  | 4.1.2 |
| [no-autofocus](./rules/no-autofocus.md)                                           | Prevent autofocus attribute usage         |     | ⚠️  |     | 💡  | 2.4.3 |
| [no-keyboard-inaccessible-elements](./rules/no-keyboard-inaccessible-elements.md) | Prevent keyboard inaccessible elements    | 💼  |     |     | 💡  | 2.1.1 |
| [tabindex-no-positive](./rules/tabindex-no-positive.md)                           | Prevent positive tabindex values          |     | ⚠️  |     | 💡  | 2.4.3 |

## Visual & Distraction Rules (3 rules)

| Name                                                          | Description                                   | 💼  | ⚠️  | 🔧  | 💡  | WCAG  |
| ------------------------------------------------------------- | --------------------------------------------- | --- | --- | --- | --- | ----- |
| [no-distracting-elements](./rules/no-distracting-elements.md) | Prevent distracting elements (blink, marquee) | 💼  |     |     | 💡  | 2.3.1 |
| [no-missing-aria-labels](./rules/no-missing-aria-labels.md)   | Require ARIA labels on interactive elements   |     | ⚠️  |     | 💡  | 4.1.2 |
| [no-redundant-roles](./rules/no-redundant-roles.md)           | Prevent redundant role attributes             |     | ⚠️  |     | 💡  | 4.1.1 |

## Role Rules (3 rules)

| Name                                                                    | Description                                | 💼  | ⚠️  | 🔧  | 💡  | WCAG  |
| ----------------------------------------------------------------------- | ------------------------------------------ | --- | --- | --- | --- | ----- |
| [role-has-required-aria-props](./rules/role-has-required-aria-props.md) | Require required ARIA properties for roles | 💼  |     |     | 💡  | 4.1.2 |
| [role-supports-aria-props](./rules/role-supports-aria-props.md)         | Validate ARIA properties for roles         | 💼  |     |     | 💡  | 4.1.2 |
| [prefer-tag-over-role](./rules/prefer-tag-over-role.md)                 | Prefer semantic HTML over role attribute   |     | ⚠️  |     | 💡  | 1.3.1 |

## Scope Rule (1 rule)

| Name                      | Description                         | 💼  | ⚠️  | 🔧  | 💡  | WCAG  |
| ------------------------- | ----------------------------------- | --- | --- | --- | --- | ----- |
| [scope](./rules/scope.md) | Require valid scope attribute usage | 💼  |     |     | 💡  | 1.3.1 |

---

## WCAG 2.1 Coverage

| WCAG Criterion               | Level | Rules                                                                                                                                                                                                                                           |
| ---------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1 Non-text Content       | A     | `img-requires-alt`, `img-redundant-alt`                                                                                                                                                                                                         |
| 1.2.2 Captions               | A     | `media-has-caption`                                                                                                                                                                                                                             |
| 1.3.1 Info and Relationships | A     | `heading-has-content`, `scope`, `role-has-required-aria-props`, `prefer-tag-over-role`, `control-has-associated-label`, `label-has-associated-control`                                                                                          |
| 1.3.5 Identify Input Purpose | AA    | `autocomplete-valid`                                                                                                                                                                                                                            |
| 2.1.1 Keyboard               | A     | `click-events-have-key-events`, `mouse-events-have-key-events`, `interactive-supports-focus`, `no-keyboard-inaccessible-elements`, `no-access-key`, `no-noninteractive-element-interactions`, `no-static-element-interactions`                  |
| 2.3.1 Three Flashes          | A     | `no-distracting-elements`                                                                                                                                                                                                                       |
| 2.4.3 Focus Order            | A     | `tabindex-no-positive`, `no-autofocus`, `no-noninteractive-tabindex`                                                                                                                                                                            |
| 2.4.4 Link Purpose           | A     | `anchor-has-content`, `anchor-ambiguous-text`, `anchor-is-valid`                                                                                                                                                                                |
| 3.1.1 Language of Page       | A     | `html-has-lang`, `lang`                                                                                                                                                                                                                         |
| 4.1.1 Parsing                | A     | `aria-props`, `aria-role`, `aria-unsupported-elements`, `no-redundant-roles`                                                                                                                                                                    |
| 4.1.2 Name, Role, Value      | A     | `role-supports-aria-props`, `iframe-has-title`, `aria-activedescendant-has-tabindex`, `no-aria-hidden-on-focusable`, `no-missing-aria-labels`, `no-interactive-element-to-noninteractive-role`, `no-noninteractive-element-to-interactive-role` |
