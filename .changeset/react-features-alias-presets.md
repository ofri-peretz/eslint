---
'eslint-plugin-react-features': minor
---

feat: presets for using the package as an npm alias for eslint-plugin-react. `configs.flat.recommended`, `configs.flat.all`, `configs.flat['jsx-runtime']`, `configs.all` and `configs['jsx-runtime']` copy the shape and `react/<rule>` ids of eslint-plugin-react 7.37.5, and the default-exported plugin now carries `configs`. Existing `configs.recommended` is unchanged; rule behaviour is unchanged.
