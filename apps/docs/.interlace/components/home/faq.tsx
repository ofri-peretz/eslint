/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
interface FaqItem {
  q: string;
  a: string;
}

const FAQ: FaqItem[] = [
  {
    q: "What is the Interlace ESLint Ecosystem?",
    a: "A collection of 18+ production-ready ESLint plugins designed for the AI/Agentic era. LLM-optimized error messages empower both human developers and AI coding assistants to catch and fix security vulnerabilities automatically.",
  },
  {
    q: "Why AI-native ESLint plugins?",
    a: "Traditional ESLint error messages are designed for humans reading them in an IDE. As AI coding assistants become more prevalent, error messages also need to be machine-parseable with clear remediation guidance. Our plugins bridge that gap.",
  },
  {
    q: "Which security standards do the plugins cover?",
    a: "Comprehensive coverage for OWASP Top 10 2021, OWASP Mobile 2024, and framework-specific patterns for Express, NestJS, Lambda, Postgres, MongoDB, and more. Each plugin includes detailed docs with Known False Negatives disclosed.",
  },
  {
    q: "What technologies do you work with?",
    a: "Languages: TypeScript, JavaScript, Node.js. Frameworks: React, Express, NestJS. Backend: Kafka, Redis, Serverless. Cloud: AWS, Docker, Kubernetes. DevEx: ESLint, Nx Monorepos, CLIs.",
  },
];

export function Faq() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          FAQ
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Common questions
        </h2>
        <dl className="mt-8 space-y-6">
          {FAQ.map((item) => (
            <div
              key={item.q}
              className="border-b border-border pb-6 last:border-b-0"
            >
              <dt className="text-lg font-medium">{item.q}</dt>
              <dd className="mt-2 text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
