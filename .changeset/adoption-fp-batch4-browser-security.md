---
'eslint-plugin-browser-security': patch
---

fix: three adoption-scan false positives, read from the file

`no-innerhtml` no longer reports a write into an inert holder (a `<template>`, a `<style>`, or a `createHTMLDocument` / `DOMParser` document) whose every use only reads a string back out, a `const` that holds sanitiser output, or a local function that returns it or rewrites all five of `& < > " '`. A template whose content reaches the page, a detached `div`, a branch that skips the sanitiser and an escaper missing the quotes keep reporting (24 of 37 findings on Trilium, plus tldraw, element-web, hedgedoc).

`require-blob-url-revocation` now sees a revoke that goes through a `useState` setter, a collection that a loop or callback revokes, a function in the file that revokes its argument, an alias of a ref, or a `#private` field. A URL stored where nothing revokes it keeps reporting (tldraw, element-web, Trilium, start-ui-web).

`no-http-urls` no longer reports a string used only as the namespace argument of `getAttributeNS`, `createElementNS` and their siblings, so an unlisted authority such as `ns.google.com` is covered by position. A constant that is also fetched keeps reporting (element-web).
