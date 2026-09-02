---
'eslint-plugin-secure-coding': patch
---

fix: `userService['elevate'](user, level)` is the same privilege operation

`no-privilege-escalation` resolved the operation name off `property.name`, so a
subscripted elevate/promote/grant call was not recognised as one.
