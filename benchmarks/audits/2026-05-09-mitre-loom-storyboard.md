# MITRE CWE Compatibility — Demo Recording Storyboard (RR-2)

> **Purpose.** Shot-by-shot script to record the [MITRE compatibility criterion RR-2](https://cwe.mitre.org/compatible/requirements.html) "CWE Mapping Demo" video. Total recording time: **3–5 minutes**. Tools: any screen recorder (Loom, QuickTime, OBS).
>
> **Recording prerequisite.** From `/Users/ofri/repos/ofriperetz.dev/eslint`, run `npm run docs:cwe-coverage` once before recording so `benchmark-results/cwe-coverage.{json,md}` exists.
>
> **Output destination.** Upload the recording to Loom, paste the URL into [`benchmarks/audits/2026-05-09-mitre-cwe-compatibility-readiness.md`](./2026-05-09-mitre-cwe-compatibility-readiness.md) under criterion RR-2, and reference it from the [public CWE Compatibility doc](../../apps/docs/content/docs/cwe-compatibility.mdx) and the MITRE submission form.

---

## Scene-by-scene

### Scene 1 — Hook (0:00 – 0:20) · *VS Code, single file*

**Setup.** Open `packages/eslint-plugin-secure-coding/src/rules/no-hardcoded-credentials/index.ts` in VS Code, side-by-side with a vulnerable fixture from `benchmarks/corpus/CWE-798/vulnerable/`.

**Camera.** Full editor.

**Action.**
1. Click into the vulnerable line `const password = 'admin123';`.
2. Hover the squiggle. The hover popup shows `[CWE-798] Hardcoded credential detected`.
3. Cut to the rule source — `meta.cwe: 'CWE-798'`.

**Narration.**
> "Every Interlace security rule maps to a MITRE CWE identifier. The rule's metadata carries the CWE ID, the diagnostic message surfaces it, and the editor hover shows it. That's the searchable + output contract — criteria MR-1 and MR-2 — visible on every finding."

---

### Scene 2 — SARIF output (0:20 – 1:10) · *Terminal + SARIF viewer*

**Setup.** Clean terminal in the repo root.

**Camera.** Terminal full-screen, then split with a SARIF viewer (e.g. the Microsoft SARIF Viewer VS Code extension).

**Action.**
1. Run:
   ```bash
   npx eslint --format @interlace/eslint-formatter-sarif benchmarks/corpus/CWE-798/ > out.sarif
   ```
2. Show `cat out.sarif | jq '.runs[0].results[0]'` — point out:
   - `ruleId`
   - `properties.cwe: "CWE-798"`
   - `properties.tags: ["eslint", "external/cwe/cwe-798"]`
3. Open `out.sarif` in the SARIF Viewer. Filter by `external/cwe/cwe-798`.

**Narration.**
> "The same finding emitted in SARIF — the OASIS standard every enterprise SAST pipeline speaks. The CWE ID is on the result's properties bag, plus a GitHub-Advanced-Security-compatible tag. This is what makes Interlace CWE-searchable downstream — in GHAS, in Defender, in GitLab, in Sonar."

---

### Scene 3 — Coverage report (1:10 – 2:10) · *Terminal + browser*

**Setup.** Repo root.

**Action.**
1. Run:
   ```bash
   npm run docs:cwe-coverage
   ```
2. Open `benchmark-results/cwe-coverage.md`. Scroll the coverage table. Highlight the **CWE Top-25 covered** row in the summary.
3. Open `benchmark-results/cwe-coverage-gaps.md`. Show the **justification for non-coverage** section (criterion RR-4).
4. Run `cat benchmark-results/cwe-coverage.json | jq '.byCwe["CWE-89"]'` — show the rules + top25 flag + OWASP-Top-10 flag.

**Narration.**
> "The coverage report is auto-generated from rule metadata — never hand-edited. It's the single source of truth for which CWEs Interlace covers, which Top-25 entries it doesn't, and why. CI fails any pull request that introduces a security rule without a CWE annotation or an explicit justification. That's criterion MR-3 — mapping accuracy — enforced mechanically."

---

### Scene 4 — End-to-end on a real repo (2:10 – 3:30) · *VS Code + GHAS*

**Setup.** A throwaway sample repo on GitHub with GitHub Advanced Security enabled, where Interlace runs in CI.

**Action.**
1. Push a commit introducing a hardcoded credential.
2. Wait for CI. Show the GitHub Code Scanning Alerts page.
3. Click the alert — show the CWE-798 tag, the rule message, the link to `https://cwe.mitre.org/data/definitions/798.html`.
4. Click "Filter by tag" → `external/cwe/cwe-798`. Show all credential-class findings across the repo.

**Narration.**
> "End-to-end. From a developer typing a literal credential, to ESLint flagging it locally with the CWE ID, to SARIF flowing into GitHub Code Scanning, to a security reviewer pivoting on CWE-798 across the entire codebase. That's the full chain of CWE compatibility — searchable, output, accurate, documented."

---

### Scene 5 — Close (3:30 – 4:00) · *Docs page*

**Setup.** Browser, [`/docs/cwe-compatibility`](../../apps/docs/content/docs/cwe-compatibility.mdx) on the Interlace docs site.

**Action.** Scroll the page. Highlight the four-criterion contract table.

**Narration.**
> "Full documentation at the project's docs site. Submission for the MITRE CWE-Compatible Products listing follows. Thanks for watching."

---

## Recording checklist

Before clicking record:

- [ ] `git status` is clean (avoid editor diff noise on rule source)
- [ ] `npm run docs:cwe-coverage` has been run, output files present
- [ ] Sample SARIF file exists or can be regenerated cleanly
- [ ] VS Code theme is the project default (don't show personal extensions)
- [ ] Terminal prompt is short (`PS1='$ '` or similar) — long prompts crowd the frame
- [ ] If using GHAS scene, the sample repo is public-readable and the credential is fake

After recording:

- [ ] Trim the 3-second tail / front
- [ ] Add captions (Loom auto-generates; review for `CWE-NNN` accuracy)
- [ ] Set the Loom to **public** (MITRE reviewers will need open access)
- [ ] Update [`2026-05-09-mitre-cwe-compatibility-readiness.md`](./2026-05-09-mitre-cwe-compatibility-readiness.md) — flip RR-2 from ❌ to ✅ with the URL
- [ ] Update [`apps/docs/content/docs/cwe-compatibility.mdx`](../../apps/docs/content/docs/cwe-compatibility.mdx) — add an `<iframe>` of the Loom under "## Demo"
