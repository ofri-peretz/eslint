/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import { Gift } from "lucide-react";

type BrandTone = "snappy";

interface Role {
  position: string;
  date: string;
  company: { name: string; url?: string; brand?: BrandTone };
  highlights: string[];
}

const ROLES: Role[] = [
  {
    position: "U.S. Site Engineering Manager",
    date: "2024 — Present",
    company: { name: "Snappy (Austin, TX)", url: "https://snappy.com", brand: "snappy" },
    highlights: [
      "Built first U.S. engineering team",
      "Leading largest distributed team (US/EU)",
    ],
  },
  {
    position: "Open Source Creator",
    date: "2025 — Present",
    company: { name: "ofriperetz.dev", url: "https://ofriperetz.dev" },
    highlights: [
      "16+ npm packages, 200+ security rules",
      "Deep dives on JS/TS, testing & platform engineering",
    ],
  },
  {
    position: "DevEx Team Lead + API Lead",
    date: "2022 — 2024",
    company: { name: "Snappy (Tel Aviv)", url: "https://snappy.com", brand: "snappy" },
    highlights: [
      "First monetized API platform",
      "25+ shared packages, mono-repo",
    ],
  },
  {
    position: "Full Stack Engineer",
    date: "2021 — 2022",
    company: { name: "Snappy", url: "https://snappy.com", brand: "snappy" },
    highlights: ["Scaled APIs 100x", "1,000+ tests, TypeScript migration"],
  },
  {
    position: "Previous Roles",
    date: "2015 — 2021",
    company: { name: "Various" },
    highlights: ["6 years of platform engineering across startups and scale-ups"],
  },
];

// Token-driven brand colour map. The Snappy indigo bumps to
// `--color-brand-snappy-strong` to clear the WCAG AA 4.5:1 floor against
// the light-mode card background (`oklch(1 0 0)` ≈ `#ffffff`). The legacy
// `#6366F1` resolved at 4.09:1 — just below threshold; axe flagged it.
const BRAND_TONE_CLASSNAMES: Record<BrandTone, string> = {
  snappy: "text-brand-snappy",
};

export function WorkExperience() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Career
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Work experience
        </h2>
        <ol className="mt-8 space-y-6">
          {ROLES.map((role) => (
            <li key={`${role.position}-${role.date}`} className="group">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <time className="whitespace-nowrap text-muted-foreground">
                  {role.date}
                </time>
                <span className="hidden text-muted-foreground sm:inline">·</span>
                <span className="text-foreground">{role.position}</span>
                <span className="text-muted-foreground">at</span>
                {role.company.url ? (
                  <a
                    href={role.company.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={[
                      "inline-flex items-center gap-1.5 font-medium hover:underline",
                      role.company.brand && BRAND_TONE_CLASSNAMES[role.company.brand],
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <Gift className="h-3.5 w-3.5" />
                    {role.company.name}
                  </a>
                ) : (
                  <span className="font-medium">{role.company.name}</span>
                )}
              </div>
              {role.highlights.length > 0 && (
                <ul className="ml-0 mt-2 flex flex-wrap gap-x-3 gap-y-1 sm:ml-4">
                  {role.highlights.map((h) => (
                    <li key={h} className="text-xs text-muted-foreground">
                      · {h}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
