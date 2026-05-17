/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import { Heart } from "lucide-react";

export function Philosophy() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-xl border border-border bg-gradient-to-br from-muted/40 to-accent/30 p-10 text-center">
          <Heart className="mx-auto mb-4 h-10 w-10 text-foreground/70" />
          <h2 className="text-2xl font-semibold tracking-tight">
            Open Source Philosophy
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Open source is the ultimate learning accelerator. By building in
            public, I stay state-of-the-art, give back to the community, and
            build trust through transparent, well-documented code.
          </p>
        </div>
      </div>
    </section>
  );
}
