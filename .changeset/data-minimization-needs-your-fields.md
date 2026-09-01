---
'eslint-plugin-operability': major
---

**💥 Breaking** — `require-data-minimization` no longer guesses what your PII is

The rule shipped with `['email', 'name', 'phone', 'address']` compiled in and
treated that list as the definition of personal data. It is not. `name` is the
single commonest property name in JavaScript; `address` is a wallet, a memory
location, or a server as often as it is a person. The rule reported on all of
them, and it stayed silent on `taxId`, `nationalInsuranceNumber`, `iban` and
every other field that actually carries regulatory weight — because nobody had
thought to add them to a list the consumer could not see or change.

**The rule now reports nothing until you tell it which fields are personal.**
An unconfigured `require-data-minimization` is inert, on purpose: a guess about
somebody else's data model is worse than no answer, because it looks like one.

### Upgrade

Set `piiFields` to your own field names. Nothing else changes.

```json
{
  "rules": {
    "operability/require-data-minimization": [
      "error",
      {
        "piiFields": ["email", "phoneNumber", "taxId", "dateOfBirth"],
        "maxProperties": 10
      }
    ]
  }
}
```

To keep the previous behaviour exactly, state the old list:

```json
"operability/require-data-minimization": [
  "error",
  { "piiFields": ["email", "name", "phone", "address"] }
]
```

`maxProperties` is unchanged and still defaults to `10`.

### Why a major and not an option with a default

A default that cannot be right is not a convenience, it is a claim the rule is
not entitled to make. Leaving the old list as the default would mean every
consumer who never opens the docs keeps shipping a compliance signal derived
from four English words we picked. The bump is the mechanism that makes you
look.
