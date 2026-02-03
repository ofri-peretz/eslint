import fs from 'node:fs';
import path from 'node:path';

const FEEDBACK_DIR = "/Users/ofri/repos/ofriperetz.dev/eslint/distribution/remote-articles-feedback-2026-02-03";
const FOOTER_PATH = "/Users/ofri/repos/ofriperetz.dev/eslint/distribution/remote-articles-feedback-2026-02-03/standardized-footer.md";

const footerContent = fs.readFileSync(FOOTER_PATH, 'utf-8').trim();

// series mapping for consolidation and authority
const SERIES_MAPPING = {
  "Getting Started": "Hardening the Node.js Ecosystem",
  "Vercel AI Security": "Vercel AI SDK: Hardening AI Agents",
  "PostgreSQL Security": "PostgreSQL: Advanced Security & Performance",
  "ESLint Benchmarks": "ESLint Performance Engineering",
  "Security Strategy": "The Security Architect's Playbook"
};

async function refineArticles() {
  const folders = fs.readdirSync(FEEDBACK_DIR).filter(f => {
    const fullPath = path.join(FEEDBACK_DIR, f);
    return fs.lstatSync(fullPath).isDirectory();
  });

  for (const slug of folders) {
    const articlePath = path.join(FEEDBACK_DIR, slug, 'article.md');
    const metaPath = path.join(FEEDBACK_DIR, slug, 'full-advanced-metadata.json');

    if (!fs.existsSync(articlePath) || !fs.existsSync(metaPath)) continue;

    let content = fs.readFileSync(articlePath, 'utf-8');
    const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

    console.log(`Refining: ${slug}`);

    // --- 1. Update Frontmatter (Canonical URL) ---
    const canonicalPattern = /^canonical_url:.*$/m;
    const newCanonical = `canonical_url: https://ofriperetz.dev/blog/${slug}`;
    if (canonicalPattern.test(content)) {
      content = content.replace(canonicalPattern, newCanonical);
    } else {
      const lines = content.split('\n');
      let dashCount = 0;
      let injected = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          dashCount++;
          if (dashCount === 2) {
            lines.splice(i, 0, newCanonical);
            content = lines.join('\n');
            injected = true;
            break;
          }
        }
      }
      if (!injected) {
         content = content.replace(/---$/, `${newCanonical}\n---`);
      }
    }

    // --- 2. Rename Titles & Consolidate Series ---
    const seriesMatch = content.match(/^series:\s*(.*)$/m);
    let series = seriesMatch ? seriesMatch[1].trim() : (metadata.series || "Uncategorized");
    
    // Outcome-focused titles for "Hardening" persona
    if (series === "Getting Started" || series === "Uncategorized") {
      const titleMatch = content.match(/^title:\s*['"]?(.*?)['"]?\s*$/m);
      if (titleMatch && (titleMatch[1].startsWith("Getting Started with") || titleMatch[1].startsWith("Hardening your"))) {
        const pluginName = titleMatch[1].replace("Getting Started with ", "").replace("Hardening your ", "").replace(" App in 5 Minutes", "");
        const cleanPluginName = pluginName.replace('eslint-plugin-', '').trim();
        const newTitle = `Hardening your ${cleanPluginName} App in 5 Minutes`;
        content = content.replace(titleMatch[0], `title: "${newTitle}"`);
      }
    }

    // Apply Series Mapping (Consolidation)
    const mappedSeries = SERIES_MAPPING[series];
    if (mappedSeries) {
      if (seriesMatch) {
        content = content.replace(seriesMatch[0], `series: ${mappedSeries}`);
      } else {
        // Inject series if missing
        content = content.replace(/^title:.*$/m, (match) => `${match}\nseries: ${mappedSeries}`);
      }
    }

    // --- 3. Update Global Rule Counts & Stats ---
    content = content.replace(/\d+\s+rules/gi, "332+ rules");
    content = content.replace(/\d+\s+ESLint\s+Rules/gi, "332+ ESLint Rules");
    content = content.replace(/\d+\s+specialized\s+security\s+plugins/gi, "18 specialized security plugins");
    content = content.replace(/\d+\s+plugins/gi, "18 plugins");
    content = content.replace(/\d+\s+specialized\s+ESLint\s+plugins/gi, "18 specialized ESLint plugins");
    content = content.replace(/\*\*Total\*\*\s*\|\s*\*\*\d+\*\*/gi, "**Total** | **332+**");
    content = content.replace(/\|\s+\*\*Total\*\*\s+\|\s+\*\*\d+\*\*/gi, "| **Total** | **332+**");

    // --- 4. Update Copyright ---
    content = content.replace(/Copyright\s+\(c\)\s+(2024|2025|2026)/gi, "Copyright (c) 2026");

    // --- 5. Generalize Coverage ---
    content = content.replace(/coverage\s*[:=]\s*\d+%/gi, "coverage: >90% (verified by Codecov)");
    content = content.replace(/with\s*\d+%\s+coverage/gi, "with high coverage (verified by Codecov)");

    // --- 6. Clean & Replace Footer (IDEMPOTENT) ---
    const newFooterMarker = "### 🌐 The Interlace ESLint Ecosystem";
    if (content.includes(newFooterMarker)) {
        const searchIndex = content.indexOf(newFooterMarker);
        const preMarker = content.substring(0, searchIndex);
        const lastSeparatorIndex = preMarker.lastIndexOf('\n---');
        if (lastSeparatorIndex !== -1) {
            content = preMarker.substring(0, lastSeparatorIndex).trim();
        } else {
            content = preMarker.trim();
        }
    } else {
        const parts = content.split('\n---\n');
        for (let i = parts.length - 1; i >= 1; i--) {
            const part = parts[i].toLowerCase();
            if (part.includes('github') || part.includes('linkedin') || part.includes('copyright')) {
                content = parts.slice(0, i).join('\n---\n').trim();
                break;
            }
        }
    }

    content = content.trim() + `\n\n---\n\n${footerContent}\n`;

    fs.writeFileSync(articlePath, content);
  }

  console.log("✅ Series consolidation and refinement complete.");
}

refineArticles().catch(console.error);
