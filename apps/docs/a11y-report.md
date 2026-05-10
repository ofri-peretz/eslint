# A11y violations — strict scan

## Routes
- home [light]: 4 violations
- articles [light]: 4 violations
- docs-getting-started [light]: 4 violations
- rule-page [light]: 4 violations
- home [dark]: 4 violations
- articles [dark]: 4 violations
- docs-getting-started [dark]: 4 violations
- rule-page [dark]: 4 violations

## Unique violations — 4 total (32 occurrences)

### [serious] `document-title` — 8 route(s), 8 occurrence(s)
- **Documents must have <title> element to aid in navigation**
- Routes: home [light], articles [light], docs-getting-started [light], rule-page [light], home [dark], articles [dark], docs-getting-started [dark], rule-page [dark]
- Tags: cat.text-alternatives, wcag2a, wcag242, TTv5, TT12.a, EN-301-549, EN-9.2.4.2, ACT, RGAAv4, RGAA-8.5.1
- Help: https://dequeuniversity.com/rules/axe/4.11/document-title?application=playwright
- Sample targets:
  - `html`

### [serious] `html-has-lang` — 8 route(s), 8 occurrence(s)
- **<html> element must have a lang attribute**
- Routes: home [light], articles [light], docs-getting-started [light], rule-page [light], home [dark], articles [dark], docs-getting-started [dark], rule-page [dark]
- Tags: cat.language, wcag2a, wcag311, TTv5, TT11.a, EN-301-549, EN-9.3.1.1, ACT, RGAAv4, RGAA-8.3.1
- Help: https://dequeuniversity.com/rules/axe/4.11/html-has-lang?application=playwright
- Sample targets:
  - `html`

### [moderate] `landmark-one-main` — 8 route(s), 8 occurrence(s)
- **Document should have one main landmark**
- Routes: home [light], articles [light], docs-getting-started [light], rule-page [light], home [dark], articles [dark], docs-getting-started [dark], rule-page [dark]
- Tags: cat.semantics, best-practice
- Help: https://dequeuniversity.com/rules/axe/4.11/landmark-one-main?application=playwright
- Sample targets:
  - `html`

### [moderate] `page-has-heading-one` — 8 route(s), 8 occurrence(s)
- **Page should contain a level-one heading**
- Routes: home [light], articles [light], docs-getting-started [light], rule-page [light], home [dark], articles [dark], docs-getting-started [dark], rule-page [dark]
- Tags: cat.semantics, best-practice
- Help: https://dequeuniversity.com/rules/axe/4.11/page-has-heading-one?application=playwright
- Sample targets:
  - `html`
