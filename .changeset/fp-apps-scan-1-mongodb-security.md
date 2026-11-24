---
'eslint-plugin-mongodb-security': patch
---

`no-bypass-middleware` now reports only where Mongoose is in play: a Mongoose
package or plugin import, a `mongoose` binding, `new Schema(...)`,
`Types.ObjectId` or `.lean()`. Found linting open-source Node apps: code that
drives the native `mongodb` driver (`db.collection('x').updateOne(...)`) has no
`pre('updateOne')` hook to bypass, and one app produced 301 reports. A native
`.collection('x')` handle is also skipped in a file that uses both.
