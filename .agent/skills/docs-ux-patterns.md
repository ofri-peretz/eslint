---
description: High-engagement UX patterns for security documentation
---

# Docs UX Patterns

Quick-reference for creating high-engagement, low-cognitive-load security documentation.

---

## 🚨 The "Fix It Now" Pattern

Every rule page should enable a fix in under 30 seconds:

```
┌─────────────────────────────────────────┐
│ 🔴 CRITICAL | CWE-89: SQL Injection     │  ← 2 seconds: See severity
├─────────────────────────────────────────┤
│ Quick Summary Table                     │  ← 5 seconds: Understand scope
├─────────────────────────────────────────┤
│ ⚡ Quick Fix                            │
│ ┌─────────────────────────────────────┐ │
│ │ - const q = `SELECT ${id}`          │ │  ← 10 seconds: Copy fix
│ │ + const q = { text: '...', values } │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 📋 ESLint Config (copy-paste ready)     │  ← 15 seconds: Enable rule
├─────────────────────────────────────────┤
│ 📖 Deep Dive (optional reading)         │  ← Only if curious
└─────────────────────────────────────────┘
```

---

## 📊 Quick Summary Table Template

Use at the top of every rule page:

```markdown
| Quick Summary |                           |
| ------------- | ------------------------- |
| **Severity**  | 🔴 CRITICAL               |
| **CWE**       | [CWE-89](link)            |
| **OWASP**     | A03:2021 - Injection      |
| **Fix**       | Use parameterized queries |
| **Fixable**   | ❌ Manual review required |
| **Since**     | v1.0.0                    |
```

---

## 🎭 Severity Badge System

Always triple-encode severity:

| Level    | Badge | Color  | Meaning                           |
| -------- | :---: | ------ | --------------------------------- |
| CRITICAL |  🔴   | Red    | Exploitable, fix immediately      |
| HIGH     |  🟠   | Orange | Serious vulnerability             |
| MEDIUM   |  🟡   | Amber  | Defense-in-depth concern          |
| LOW      |  🟢   | Green  | Best practice recommendation      |
| INFO     |  🔵   | Blue   | Informational, no direct security |

---

## 🍬 Security Metaphors Library

Use these to make security concepts stick:

| Vulnerability     | Metaphor                                                             |
| ----------------- | -------------------------------------------------------------------- |
| SQL Injection     | "Leaving your front door unlocked with a sign pointing to valuables" |
| XSS               | "Letting strangers write on your walls"                              |
| SSRF              | "Your server calling any phone number someone hands it"              |
| Path Traversal    | "Letting visitors wander through your entire house"                  |
| Hardcoded Secrets | "Writing your PIN on your ATM card"                                  |
| Missing Auth      | "A bouncer who lets everyone in without checking IDs"                |
| Insecure Cookies  | "Sending postcards instead of sealed letters"                        |
| Weak Crypto       | "Using a combination lock with only 3 digits"                        |

---

## 📈 Code Comparison Pattern

Always show Before/After with:

1. **Position** (left = bad, right = good)
2. **Color** (red = bad, green = good)
3. **Label** ("Before" / "After" or ❌ / ✅)

```
┌─────────────────────┬─────────────────────┐
│ ❌ Vulnerable       │ ✅ Secure           │
├─────────────────────┼─────────────────────┤
│ const q = `...${x}` │ const q = { ... }   │
└─────────────────────┴─────────────────────┘
```

---

## 🧭 "Related Rules" Section

Push relevant content at the end of every rule:

```markdown
## 🔗 Related Rules

| Rule                   | Plugin      | Relationship              |
| ---------------------- | ----------- | ------------------------- |
| `no-string-concat`     | pg          | Also catches SQL patterns |
| `no-raw-queries`       | mongodb     | NoSQL equivalent          |
| `detect-sql-injection` | secure-code | Generic detection         |

## 📦 See Also

- [PostgreSQL Security Overview](/docs/pg)
- [OWASP Injection Prevention](https://owasp.org/...)
```

---

## ✂️ Brevity Rules

| Rule                 | Limit             |
| -------------------- | ----------------- |
| Paragraphs           | Max 3 sentences   |
| Bullet points        | Max 10 words each |
| Headers              | Max 6 words       |
| "The Gist" summaries | Max 15 words      |
| Table cells          | Max 20 characters |

---

## 🔤 Word Substitutions

| ❌ Don't Say     | ✅ Say Instead |
| ---------------- | -------------- |
| Utilize          | Use            |
| Remediate        | Fix            |
| Implement        | Add / Set up   |
| Facilitate       | Help           |
| In order to      | To             |
| It is important  | (just say it)  |
| Please note that | Note:          |
| At this point in | Now            |

---

## 📱 Responsive Priorities

On mobile, ensure these are visible without scrolling:

1. ✅ Severity badge
2. ✅ "The Gist" one-liner
3. ✅ Quick Fix code block
4. ⚠️ Quick Summary table (can scroll horizontally)
5. ❌ Deep dive content (scroll is expected)
