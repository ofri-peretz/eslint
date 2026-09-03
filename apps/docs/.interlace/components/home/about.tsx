/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
export function About() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          About
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Building products that matter
        </h2>
        <div className="mt-6 grid gap-6 text-muted-foreground sm:grid-cols-2">
          <p>
            Engineering Leader with a decade of experience shipping production
            JavaScript at scale. Currently focused on{" "}
            <span className="text-foreground">AI-native developer tools</span>{" "}
            — building static analysis that empowers both humans and AI coding
            assistants to catch security issues before they ship.
          </p>
          <p>
            Architect of the{" "}
            <a
              href="https://eslint.interlace.tools"
              className="text-foreground underline-offset-4 hover:underline"
            >
              Interlace ESLint Ecosystem
            </a>{" "}
            — 18 specialized plugins, 332+ rules, covering OWASP Top 10, LLM
            Security, and database hardening. Built for the agentic era.
          </p>
        </div>
      </div>
    </section>
  );
}
