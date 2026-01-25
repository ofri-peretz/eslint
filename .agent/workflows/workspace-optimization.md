---
description: Optimize workspace file watching, indexing, and resource usage for Antigravity IDE
---

# Workspace Optimization Workflow

Quick access workflow for diagnosing and optimizing IDE performance, file watching, and AI indexing.

## When to Use

- High CPU/memory usage from Antigravity
- Slow file search or navigation
- Language Server crashes or hangs
- After adding large dependencies or build artifacts

---

## Quick Diagnostics

// turbo

### 1. Check Current Resource Usage

```bash
ps -eo pid,pcpu,pmem,rss,comm | grep -i "Antigravity" | grep -v grep | awk '{sum_cpu+=$2; sum_mem+=$3; sum_rss+=$4} END {printf "CPU: %.1f%% | MEM: %.1f%% | RSS: %.0f MB\n", sum_cpu, sum_mem, sum_rss/1024}'
```

// turbo

### 2. Count Total vs Indexed Files

```bash
# Total files in workspace
find . -type f 2>/dev/null | wc -l

# Files after exclusions (should be < 10,000 for good performance)
find . -type f \
  ! -path '*/node_modules/*' ! -path '*/.next/*' ! -path '*/dist/*' \
  ! -path '*/.nx/*' ! -path '*/.git/*' ! -path '*/coverage/*' \
  ! -path '*/build/*' ! -path '*/.cache/*' ! -path '*/.vercel/*' \
  ! -path '*/.source/*' ! -path '*/standalone/*' ! -path '*/tmp/*' \
  2>/dev/null | wc -l
```

// turbo

### 3. Find Large Unexcluded Directories

```bash
find . -maxdepth 4 -type d \
  ! -path './node_modules/*' ! -path './.git/*' \
  -exec sh -c 'echo "$(find "$1" -type f 2>/dev/null | wc -l) $1"' _ {} \; 2>/dev/null \
  | sort -rn | head -15
```

---

## Configuration Files

| File                    | Purpose                                       | Location     |
| ----------------------- | --------------------------------------------- | ------------ |
| `.aiexclude`            | Antigravity AI indexing exclusions            | Project root |
| `.gemini/settings.json` | Gemini codebase indexing patterns             | `.gemini/`   |
| `.vscode/settings.json` | VSCode file watcher & search exclusions       | `.vscode/`   |
| `.gitignore`            | Git tracking (also affects some IDE features) | Project root |

---

## Key Exclusion Patterns

These patterns should be in ALL configuration files for consistency:

```
# Package Managers
**/node_modules/**
**/.pnpm-store/**

# Build Outputs
**/dist/**
**/build/**
**/out/**
**/.next/**
**/standalone/**
**/_next/**

# Framework Caches
**/.nx/**
**/.cache/**
**/.parcel-cache/**
**/.contentlayer/**
**/.source/**
**/.turbo/**
**/.vercel/**

# Test Artifacts
**/coverage/**
**/test-results/**
**/.nyc_output/**

# Generated Files
**/*.tsbuildinfo
**/*.map
**/graph.json

# Temporary
**/tmp/**
```

---

## Recovery Commands

### Force Reload Window

```
Cmd+Shift+P → "Developer: Reload Window"
```

### Full Restart

```bash
# Quit Antigravity completely
osascript -e 'quit app "Antigravity"'

# Wait and reopen
sleep 2 && open -a Antigravity
```

### Clear Antigravity Cache (Nuclear Option)

```bash
# WARNING: This resets all workspace state
rm -rf ~/Library/Application\ Support/Antigravity/CachedData
rm -rf ~/Library/Application\ Support/Antigravity/Cache
```

---

## Performance Thresholds

| Metric        | Healthy  | Warning | Critical |
| ------------- | -------- | ------- | -------- |
| Indexed Files | < 10,000 | 10k-50k | > 50,000 |
| CPU (idle)    | < 5%     | 5-15%   | > 15%    |
| Memory        | < 4 GB   | 4-8 GB  | > 8 GB   |

---

## Official Documentation Links

### Antigravity / Gemini Code Assist

- [Gemini Code Assist Overview](https://cloud.google.com/gemini/docs/codeassist/overview)
- [Codebase Indexing Configuration](https://cloud.google.com/gemini/docs/codeassist/customize-codebase-indexes)
- [.aiexclude File Reference](https://cloud.google.com/gemini/docs/codeassist/customize-codebase-indexes#aiexclude)
- [Gemini Settings Schema](https://cloud.google.com/gemini/docs/codeassist/customize-codebase-indexes#settings-json)

### VSCode File Watching

- [VSCode File Watcher Settings](https://code.visualstudio.com/docs/setup/linux#_visual-studio-code-is-unable-to-watch-for-file-changes-in-this-large-workspace-error-enospc)
- [files.watcherExclude Reference](https://code.visualstudio.com/docs/getstarted/settings#_default-settings)
- [Search Exclude Patterns](https://code.visualstudio.com/docs/editor/codebasics#_search-across-files)

### macOS FSEvents

- [Apple FSEvents Reference](https://developer.apple.com/documentation/coreservices/file_system_events)
- [FSEvents Limits (max watchers)](https://blog.jetbrains.com/idea/2010/04/native-file-system-watcher-for-mac-os-x/)

### NX Monorepo

- [NX Cache Configuration](https://nx.dev/concepts/how-caching-works)
- [NX Workspace Data](https://nx.dev/concepts/mental-model)

---

## Changelog

| Date       | Change                                                          |
| ---------- | --------------------------------------------------------------- |
| 2026-01-25 | Initial workflow created. Reduced indexed files from 31K → 2.6K |
