/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
interface SkillGroup {
  category: string;
  items: string[];
}

const SKILLS: SkillGroup[] = [
  {
    category: "Languages",
    items: ["TypeScript", "JavaScript", "Node.js"],
  },
  {
    category: "Frameworks",
    items: ["React", "Express", "NestJS", "Next.js", "Nuxt"],
  },
  {
    category: "Backend",
    items: ["Kafka", "Redis", "PostgreSQL", "MongoDB", "Serverless"],
  },
  {
    category: "Cloud / DevOps",
    items: ["AWS", "Docker", "Kubernetes", "Vercel"],
  },
  {
    category: "DevEx",
    items: ["ESLint", "Nx Monorepos", "CLIs", "Static Analysis"],
  },
  {
    category: "AI-Native",
    items: ["LLM-friendly errors", "MCP servers", "Agentic tooling"],
  },
];

export function Skills() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Stack
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          What I work with
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((group) => (
            <div key={group.category}>
              <h3 className="mb-3 text-sm font-medium text-foreground">
                {group.category}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {group.items.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-md border border-border bg-muted/30 px-2.5 py-1 text-sm text-muted-foreground"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
