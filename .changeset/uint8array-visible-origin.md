---
'eslint-plugin-node-security': patch
---

A visible origin beats a wire-shaped name.

`no-unsafe-buffer-alloc` reported a PNG writer three times — `new Uint8Array(4 +
data.length)` and `new Uint8Array(bytes.length + chunk.length)` — as CWE-789, "the
allocation size is read off the wire, so the peer picks it". The file never touches
a socket. Found on IGNF/cartes.gouv.fr-entree-carto, a French government mapping
site that runs this plugin.

Two changes, both applying reasoning the rule already had:

`data` leaves `WIRE_NAMES`, for the reason `bytes` did. Every name on that list
must denote a BUFFER; `data` is the most generic parameter name in JavaScript and
denotes one only sometimes. Renaming the parameter silenced the finding, which is
the definition of a name-inference false positive.

And where an identifier resolves to a **local variable**, the rule now follows the
initializer instead of trusting the spelling. A name is evidence only where the
origin is invisible — a parameter, or a binding this file never declares. This is
the same move the `Buffer` case already made, generalised: `const chunk =
buildPngChunk('pHYs', phys)` is answered by looking at what `chunk` is, not at what
it is called.

Recursing rather than bailing keeps the true case: `const chunk = req.body.raw`
still reads wire, now for a reason rather than a spelling. Both CWE-770 corpus
fixtures still detect, and a `chunk` parameter or an undeclared `chunk` still
reports.
