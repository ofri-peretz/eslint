---
'eslint-plugin-node-security': patch
---

fix(node-security): no-timing-unsafe-compare checks a .tsx or .jsx file that renders no JSX

The browser-code skip treated every `.tsx` and `.jsx` file as a UI component, so a request handler in a `.tsx` file (a Remix loader, or the case registry's `case.tsx`) compared `req.headers.authorization === apiKey` with no report. Seven registry cases regressed (ILB-0008, 0043, 0099 to 0102, 0104). The extension now counts only when the file renders JSX; a component built with the automatic JSX runtime still needs no import to be skipped. On the 40-app scan, the 30 browser-code reports stay skipped.
