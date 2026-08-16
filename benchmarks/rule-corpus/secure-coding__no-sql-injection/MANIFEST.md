# Rule corpus - `secure-coding/no-sql-injection` (CWE-89)

**The question this corpus exists to answer:** does this rule earn its place
when the ecosystem already ships nine driver-specific SQL plugins?

By design it is the COMPLEMENT of those plugins: it reports only in a file that
imports no known driver. So every vulnerable fixture here deliberately gets its
database handle from the application's own module (`../lib/db`) or from a
parameter - the shape where no SDK plugin can help, because the driver import
is in a different file.

If the rule has value, it is exactly here. If these fixtures were covered by
the driver plugins anyway, the rule is redundant and should be deleted.
