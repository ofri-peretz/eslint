---
'eslint-plugin-browser-security': patch
---

`no-innerhtml` no longer treats every `.write()` call as a DOM XSS sink.

```js
process.stdout.write(`Preview URL: ${previewUrl}`);   // was reported as XSS
socket.write(payload);                                 // likewise
res.write(chunk);                                      // likewise
```

`write` and `writeln` are DOM sinks only on a **document**. The method name
alone is one of the most overloaded in JavaScript — `process.stdout`, `stderr`,
sockets, HTTP responses, streams and buffers all have it — and matching on the
name turned every CLI progress message into a cross-site-scripting finding.

The rule's own comment said it was covering `document.write(...)`; the
implementation never checked the receiver.

Measured on the 8-repo corpus: **73 findings → 11**, and all 11 survivors are
genuine DOM sinks (`el.innerHTML = …`, `outerHTML`, `insertAdjacentHTML`). 23
of the removed findings were `Shopify/cli` writing to stdout.

`document.write`, `window.document.write`, `iframe.contentDocument.write`,
`el.ownerDocument.write` and the conventional `doc.write` all still report.
`insertAdjacentHTML` keeps no receiver gate — nothing outside the DOM is
called that.
