---
'eslint-plugin-lambda-security': major
---

Every rule now abstains in files that are not Lambda code

The plugin had no notion of whether a file was Lambda code.
`no-error-swallowing` fired on any `try/catch` anywhere while its own
description claimed to detect "empty catch blocks in Lambda handlers", and four
rules contained no Lambda reference at all, not even in prose.

Measured over **107,382 files across 108 repositories**: 9,473 findings, of
which **9,244 (98%) were in files with no AWS anything in them**. A plain
`JSON.parse` helper was being told it had an AWS Lambda defect.

Every rule now requires local evidence that the file is Lambda code. The
evidence is a **union**, because an import gate alone is the wrong gate here:
measured over the 12-repo Lambda corpus, 413 files export a handler and **184
of them (45%) import nothing AWS** — `aws-lambda` is a types package and a
plain JS handler imports nothing. So the gate accepts a handler export, or the
`(event, context)` calling convention, or an AWS import / require / dynamic
import. All three are read from the file itself.

After the change the same corpus yields 723 findings instead of 9,473.

This is a **major** bump: any rule may now stay silent where it previously
reported. Verified cost: exactly **4** in-SDK findings across the corpus, all in
one `@aws-lambda-powertools/batch` library file that carries no in-file Lambda
evidence — it imports only relative paths and takes
`(event, recordHandler, processor, options)`. Library code reached only through
a wrapper is the deliberate miss.
