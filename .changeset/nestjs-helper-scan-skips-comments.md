---
'eslint-plugin-nestjs-security': patch
---

fix: no-missing-validation-pipe ignores commented-out helper calls

The helper scan read `// setupApp(app);` in `main.ts` as a call, and a `useGlobalPipes` that was only in a comment of the helper as a registration, so a project with no global pipe was treated as having one. Comments are now blanked before both reads; strings that contain `//` are left alone. The text of strings and template literals is dropped the same way (`log('setupApp(app)')` is not a call), while a call inside a `${…}` interpolation still counts.
