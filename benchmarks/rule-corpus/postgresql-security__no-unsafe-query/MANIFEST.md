# Rule corpus - `postgresql-security/no-unsafe-query` (CWE-89)

The MIRROR of `secure-coding__no-sql-injection`: byte-for-byte the same eight
vulnerable shapes and six safe ones, with the local `../lib/db` import replaced
by a real `pg` import.

That swap is the whole point. `secure-coding/no-sql-injection` abstains in a
file that imports a driver, and this rule abstains in a file that does not, so
each corpus measures the half its rule OWNS. Scoring either plugin on the other
half measures the partition, not the rule.
