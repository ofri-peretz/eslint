---
'eslint-plugin-browser-security': patch
---

`no-http-urls` and `no-unencrypted-transmission`: the entries of a URI-scheme prefix table are not reported. An array literal of at least two string elements, every one of which names no host (empty, `tel:`, `https://`, `http://www.`, `ftp://ftp.`, `ftp://anonymous:anonymous@`), is an encoding dictionary such as the NFC URI-record prefix table, never a destination. One element with a host, a non-literal element, a single-element array, and URLs outside an array still report.
