---
'@interlace/eslint-formatter': patch
---

fix: ship the `./schema.json` the manifest promises

`exports` declared `"./schema.json"` and `files` listed it, but the file did not exist and the build's asset list had never heard of it — so a consumer importing that subpath would have got "Cannot find module". The schema is now written and shipped, and the build derives its copy list from `files` instead of a hardcoded array, so declaring a file is enough.

Also adds the missing `funding` field.
