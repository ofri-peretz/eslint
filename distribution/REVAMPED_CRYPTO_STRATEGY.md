# 🔐 Revamped Crypto Series: Node Security Edition

> **Strategy Shift:** Moving from the deprecated `eslint-plugin-crypto` and generalized `secure-coding` rules to the active, high-performance `eslint-plugin-node-security`.
> **Target Audience:** Node.js Backend Engineers
> **Focus:** Native Node.js `crypto` module best practices.

## 📚 The New "Node.js Crypto" Series

This series replaces the previous "Cryptography" section. It focuses entirely on `eslint-plugin-node-security` and the `crypto` module.

| # | Title | Target Rule | Angle |
|---|---|---|---|
| 1 | **"Stop Using MD5 in Node.js (And How to Find It)"** | `node-security/no-weak-hash-algorithm` `node-security/no-sha1-hash` | The classic "MD5 is broken" hook. Show how `crypto.createHash('md5')` is a red flag and how the linter catches it instantly. |
| 2 | **"Timing Attacks in Node.js: Why `===` Matches Secrets"** | `node-security/no-timing-unsafe-compare` | Explaining side-channel attacks. Comparing `a === b` vs `crypto.timingSafeEqual()`. High impact for auth tokens. |
| 3 | **"The Encryption Mistake 90% of Devs Make: Static IVs"** | `node-security/no-static-iv` | Explain why reusing an Initialization Vector (IV) breaks encryption. Show `crypto.randomBytes(16)` as the fix. |
| 4 | **"Why ECB Mode Reveals Your Data Patterns"** | `node-security/no-ecb-mode` | A visual explanation of why `aes-256-ecb` is dangerous (the Penguin image concept). Push for GCM/CBC. |
| 5 | **"Hashing Passwords? `crypto.createHash` is Wrong."** | `node-security/no-insecure-key-derivation` | Differentiating "fast hashes" (SHA256) from "slow hashes" (scrypt/pbkdf2). Explain why naive hashing is insecure for passwords. |
| 6 | **"DES, RC4, and Blowfish: The Ghost of Crypto Past"** | `node-security/no-weak-cipher-algorithm` | A cleanup article. Finding really old, deprecated legacy crypto methods that might be lurking in old codebases. |

## 🚀 Migration Plan

### 1. Update Existing Drafts
Refactor the existing `distribution/articles/crypto/*.md` files to:
- Use `eslint-plugin-node-security` in the code examples.
- Reference the `node-security` rule names.
- Update the CTA to point to `eslint-plugin-node-security`.

### 2. Implementation Steps
1.  **Rename & Refactor `01-stop-using-md5.md`**: Update rule ref from `no-weak-hash-algorithm` (generic) to `node-security/no-weak-hash-algorithm`.
2.  **Rename & Refactor `03-timing-attacks.md`**: Update usage to `node-security/no-timing-unsafe-compare`.
3.  **Create New Drafts**: Generate skeletons for `no-static-iv.md`, `no-ecb-mode.md`, etc. based on the plugin's documentation.

## 🖼️ Visual Strategy (OG Image)

Use the newly generated `eslint_interlace_tools_og_image.png` for these articles to maintain brand consistency.
