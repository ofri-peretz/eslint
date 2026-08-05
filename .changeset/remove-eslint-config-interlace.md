---
---

Remove the unpublished `eslint-config-interlace` workspace package and relocate
its lock tests to `scripts/__tests__/`. No published package changes behaviour:
the removed package was `private: true`, and the only other package touched
(`eslint-plugin-lambda-security`) had a source comment updated.
