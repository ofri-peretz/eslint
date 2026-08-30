---
'eslint-plugin-modularity': minor
---

fix: `ddd-anemic-domain-model` matches DTO names by suffix, not substring

`DTO`, `Dto`, `Data`, `Request`, `Response` and `Payload` describe a naming
convention that is positional — `OrderDto`, `CreateUserRequest`,
`LoginPayload`. Matching them with `.includes()` turned each into a substring.

Because this is a **suppression**, every collision costs a real finding rather
than adding noise. The same anemic class reports as `Person` and goes silent as
`Requestor`, purely because `Requestor` contains `Request`. A requestor is an
actor, not a data carrier, and its anemia is exactly what this rule exists to
find.

Genuine DTOs are unaffected: `OrderDto`, `CreateUserRequest`, `UserResponse`,
`LoginPayload` and `UserData` all stay exempt.
