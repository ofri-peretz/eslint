# Documentation Site - Remaining Work

> Last updated: January 5, 2026

## ✅ Completed

### Core Setup

- [x] Fumadocs site with Next.js 16 + Turbopack
- [x] 11 plugin documentation pages synced
- [x] 272 individual rule documentation pages
- [x] ESLint branding (logo, favicon, Space Grotesk font)
- [x] WCAG AAA accessible color palette
- [x] Mobile-first responsive design

### Interactive Features

- [x] BenchmarkCharts component with animated counters
- [x] Radar chart with plugin selector toggles
- [x] Bar chart for rule count comparison
- [x] Performance comparison bars
- [x] Feature matrix table
- [x] Killer features spotlight section
- [x] Community pain points with GitHub links

### Pages

- [x] Home page (`/`) - Plugin ecosystem overview
- [x] Getting Started (`/docs`) - Introduction + comparison section
- [x] Examples (`/docs/examples`) - LLM-optimized message demos
- [x] Benchmarks (`/docs/benchmarks`) - Interactive charts
- [x] Presets (`/docs/presets`) - Configuration presets
- [x] All 11 plugin pages with badges and rules

### AI/SEO

- [x] AI configuration files (`llms.txt`, `ai.txt`, `/.well-known/security.txt`)
- [x] Sitemap generation
- [x] Robots.txt
- [x] OpenGraph image generation

---

## 🔄 In Progress / Next Steps

### High Priority

#### 1. Deploy to Vercel

- [ ] Connect GitHub repo to Vercel
- [ ] Set up custom domain (e.g., `eslint.interlace.dev` or `docs.ofriperetz.dev`)
- [ ] Configure environment variables if needed

#### 2. Plugin Toggle State Persistence

- [ ] Save selected plugins to localStorage
- [ ] Restore on page load
- [ ] Share toggle state via URL params

#### 3. More Benchmark Data

- [ ] Add eslint-plugin-n data to radar chart
- [ ] Add eslint-plugin-import data
- [ ] Add more performance comparisons (TypeScript parsing, etc.)

### Medium Priority

#### 4. Search Enhancement

- [ ] Implement Algolia DocSearch or Fumadocs search
- [ ] Add keyboard shortcuts (Cmd+K)

#### 5. Code Block Improvements

- [ ] Add syntax highlighting themes
- [ ] Add line numbers option
- [ ] Add diff highlighting for before/after

#### 6. Additional Content Pages

- [ ] Migration Guide (from eslint-plugin-security → Interlace)
- [ ] Contributing Guide
- [ ] Changelog page
- [ ] FAQ page

#### 7. Integration Examples

- [ ] ESLint flat config examples
- [ ] IDE setup guides (VS Code, WebStorm)
- [ ] CI/CD integration examples

### Low Priority

#### 8. Visual Polish

- [ ] Fix Tailwind v4 lint warnings (`bg-gradient-to-br` → `bg-linear-to-br`)
- [ ] Add loading states/skeletons
- [ ] Add page transition animations

#### 9. Analytics

- [ ] Add Plausible/Umami analytics
- [ ] Track benchmark interactions
- [ ] Add UTM parameter handling

#### 10. Community Features

- [ ] Discord/GitHub Discussions link
- [ ] Feedback widget
- [ ] Newsletter signup

---

## 📝 Known Issues

1. **Sidebar group styling** - Navigation groups could use better visual separation
2. **Code block copy button** - Styling could be more polished
3. **Callout icons** - Alignment could be improved in some cases
4. **Home page margins** - Could be tighter for better density

---

## 🚀 Deployment Checklist

```bash
# Run locally (from monorepo root)
nx dev docs

# Build for production
nx build docs

# Deploy via Vercel CLI
nx build docs && cd apps/docs && npx vercel --prod

# Or connect via Vercel Dashboard
# - Import project from GitHub
# - Set root directory: apps/docs
# - Framework: Next.js
# - Build command: pnpm nx build docs
# - Output: apps/docs/.next
```

---

## 📊 Metrics to Track

| Metric                   | Target | Current   |
| ------------------------ | ------ | --------- |
| Lighthouse Performance   | 90+    | TBD       |
| Lighthouse Accessibility | 100    | TBD       |
| First Contentful Paint   | <1.5s  | TBD       |
| Time to Interactive      | <3s    | TBD       |
| Rule Coverage            | 100%   | 272/272 ✓ |

---

## 💡 Ideas for Future

- Interactive ESLint playground
- Rule comparison tool (our rule vs competitor)
- Video tutorials embedded
- AI-powered rule recommendation engine
- Integration with GitHub Security tab
