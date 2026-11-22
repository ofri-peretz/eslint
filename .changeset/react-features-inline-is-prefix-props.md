---
'eslint-plugin-react-features': patch
---

fix: `component-api/no-is-prefix-prop` reports an `isXxx: boolean` member of an inline props type again: the first parameter of a component (PascalCase, or one that returns JSX) and the type argument of `FC<...>` / `React.FC<...>`. #1556 stopped reporting data interfaces but also dropped these; the data-interface exemption stays.
