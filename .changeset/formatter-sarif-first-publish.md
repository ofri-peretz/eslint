---
'@interlace/eslint-formatter-sarif': minor
---

feat(formatter-sarif): publish the SARIF formatter to npm

`npm install --save-dev @interlace/eslint-formatter-sarif` has returned 404 since #105 marked the package private: its `main` pointed at a `dist/` that no build produced. It now builds through the shared `dist/` contract and ships as its first public release, so `eslint -f @interlace/eslint-formatter-sarif` works outside this repo.
