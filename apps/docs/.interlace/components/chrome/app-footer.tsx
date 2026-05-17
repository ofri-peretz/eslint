/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import Link from "next/link";

const SOCIAL_LINKS = [
  { href: "https://github.com/ofri-peretz", label: "GitHub" },
  { href: "https://dev.to/ofri-peretz", label: "Dev.to" },
  { href: "https://www.linkedin.com/in/ofri-peretz/", label: "LinkedIn" },
  { href: "https://x.com/ofriperetzdev", label: "X" },
];

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Build Securely.</p>
          <p>
            Engineering Leader & Open Source Creator. Architect of the
            Interlace ESLint Ecosystem.
          </p>
        </div>
        <ul className="flex flex-wrap gap-4 text-sm">
          {SOCIAL_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-6 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Ofri Peretz. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
