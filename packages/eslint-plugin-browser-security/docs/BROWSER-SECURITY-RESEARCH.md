# Browser Security Vulnerability Research

> **Purpose**: Comprehensive research on browser-specific security vulnerabilities to inform ESLint rule development for `eslint-plugin-browser-security` (formerly `eslint-plugin-frontend-security`).

---

## Executive Summary

This research covers browser-specific vulnerabilities across storage APIs, cross-origin communication, file handling, workers, cookies, and newer browser APIs. The focus is on patterns detectable via static analysis.

| Category                     | Severity | Detection Viability | Priority | Rules Suggested |
| ---------------------------- | -------- | ------------------- | -------- | --------------- |
| **DOM XSS (innerHTML/eval)** | Critical | ✅ Excellent        | P0       | 2 (✓ done)      |
| **Web Storage APIs**         | High     | ✅ Excellent        | P0       | 5               |
| **postMessage/IFrame**       | Critical | ✅ Good             | P0       | 3               |
| **Cookie Security**          | High     | ✅ Excellent        | P0       | 3               |
| **File API/Blob URLs**       | High     | ✅ Good             | P1       | 3               |
| **Service/Web Workers**      | High     | ⚠️ Moderate         | P1       | 3               |
| **WebSocket Security**       | High     | ✅ Good             | P1       | 3               |
| **Browser APIs (Geo, RTC)**  | Moderate | ⚠️ Limited          | P2       | 4               |
| **CSP & Headers**            | High     | ✅ Good             | P1       | 2               |

**Total Suggested Rules: 28** (7 already implemented)

---

## 1. Web Storage Vulnerabilities (localStorage/sessionStorage/IndexedDB)

### 1.1 Vulnerability Landscape (2024)

Storage APIs are inherently vulnerable to XSS attacks. Any script on the same domain can access stored data.

| Storage Type        | XSS Vulnerability | Persistence  | Encryption | Capacity |
| ------------------- | ----------------- | ------------ | ---------- | -------- |
| **localStorage**    | ❌ Critical       | Permanent    | None       | 5-10MB   |
| **sessionStorage**  | ❌ Critical       | Session      | None       | 5-10MB   |
| **IndexedDB**       | ❌ Critical       | Permanent    | None       | 50MB+    |
| **HttpOnly Cookie** | ✅ Protected      | Configurable | Optional   | 4KB      |

### 1.2 Common Attack Patterns

```javascript
// ❌ CRITICAL: Storing JWT in localStorage (XSS can steal it)
localStorage.setItem('token', jwtToken);
localStorage.setItem('accessToken', response.data.token);

// ❌ CRITICAL: Storing API keys
localStorage.setItem('apiKey', 'sk-live-xxxx');
sessionStorage.setItem('api_secret', secretKey);

// ❌ CRITICAL: Storing PII
localStorage.setItem(
  'user',
  JSON.stringify({ ssn: '123-45-6789', cc: '4111...' }),
);

// ❌ HIGH: IndexedDB with sensitive data
const request = indexedDB.open('users');
request.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('credentials', 'readwrite');
  tx.objectStore('credentials').add({ password: 'secret123' }); // XSS accessible
};

// ✅ SECURE: Use HttpOnly cookies for auth tokens
// Token is set by server with: Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict
```

### 1.3 2024 CVEs

| CVE                | Severity | Description                                    |
| ------------------ | -------- | ---------------------------------------------- |
| **CVE-2024-xxxxx** | High     | Race condition in Firefox IndexedDB            |
| Multiple           | Various  | XSS vulnerabilities exposing localStorage data |

### 1.4 Recommended ESLint Rules

| Rule                          | CWE     | CVSS | Priority | Status      |
| ----------------------------- | ------- | ---- | -------- | ----------- |
| `no-sensitive-localstorage`   | CWE-922 | 7.5  | P0       | ✅ **Done** |
| `no-sensitive-sessionstorage` | CWE-922 | 7.5  | P0       | 🔲 New      |
| `no-sensitive-indexeddb`      | CWE-922 | 7.5  | P1       | 🔲 New      |
| `no-jwt-in-storage`           | CWE-922 | 8.1  | P0       | 🔲 New      |
| `no-credentials-in-storage`   | CWE-256 | 8.5  | P0       | 🔲 New      |

**Detection Patterns:**

- Monitor `localStorage.setItem()`, `sessionStorage.setItem()`, `indexedDB.open()`
- Flag keys matching: `token`, `jwt`, `access_token`, `refresh_token`, `password`, `secret`, `api_key`, `apiKey`, `credential`, `ssn`, `credit_card`

---

## 2. postMessage & IFrame Vulnerabilities

### 2.1 Vulnerability Landscape (2024)

postMessage is a critical attack vector when origin validation is missing.

| Vulnerability Type        | CVSS | Impact                                 |
| ------------------------- | ---- | -------------------------------------- |
| **Missing Origin Check**  | 9.3  | Zero-click XSS, data theft             |
| **Wildcard targetOrigin** | 7.5  | Sensitive data leak to any domain      |
| **DOM XSS via message**   | 8.8  | Code execution from untrusted messages |
| **Sandbox Bypass**        | 7.4  | CVE-2024-5691 - Firefox iframe bypass  |

### 2.2 2024 CVEs

| CVE                | Severity | Description                                |
| ------------------ | -------- | ------------------------------------------ |
| **CVE-2024-49038** | 9.3      | Microsoft Copilot Studio - postMessage XSS |
| **CVE-2024-5691**  | Moderate | Firefox sandbox iframe bypass              |
| **CVE-2024-29203** | High     | TinyMCE iframe XSS                         |

### 2.3 Attack Patterns

```javascript
// ❌ CRITICAL: No origin validation
window.addEventListener('message', (event) => {
  // Anyone can send messages!
  processData(event.data);
});

// ❌ CRITICAL: Wild card targetOrigin
iframe.contentWindow.postMessage(sensitiveData, '*'); // Leaks to any domain

// ❌ CRITICAL: DOM XSS via message
window.addEventListener('message', (event) => {
  document.body.innerHTML = event.data.content; // XSS!
});

// ✅ SECURE: Origin validation
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted-domain.com') return;
  processData(event.data);
});

// ✅ SECURE: Specific targetOrigin
iframe.contentWindow.postMessage(data, 'https://specific-domain.com');
```

### 2.4 Recommended ESLint Rules

| Rule                               | CWE     | CVSS | Priority | Status      |
| ---------------------------------- | ------- | ---- | -------- | ----------- |
| `require-postmessage-origin-check` | CWE-346 | 9.3  | P0       | ✅ **Done** |
| `no-postmessage-wildcard-origin`   | CWE-346 | 7.5  | P0       | ✅ **Done** |
| `no-postmessage-innerhtml`         | CWE-79  | 8.8  | P0       | 🔲 New      |

**Detection Patterns:**

- `postMessage(data, '*')` - flag wildcard targetOrigin
- `addEventListener('message', ...)` without `event.origin` check
- Message handlers using `innerHTML`, `eval()`, `document.write()`

---

## 3. Cookie Security (document.cookie)

### 3.1 Vulnerability Landscape (2024)

Client-side cookie manipulation is vulnerable to XSS and can bypass server-side HttpOnly protections.

| Vulnerability            | Risk     | Impact                      |
| ------------------------ | -------- | --------------------------- |
| **Sensitive data in JS** | Critical | XSS can read/modify cookies |
| **Missing Secure flag**  | High     | MITM interception           |
| **Missing SameSite**     | High     | CSRF attacks                |
| **Broad domain scope**   | Moderate | Subdomain cookie theft      |

### 3.2 2024 CVEs

| CVE                | Severity | Description                              |
| ------------------ | -------- | ---------------------------------------- |
| **CVE-2024-47764** | Moderate | Cookie special character injection → XSS |

### 3.3 Attack Patterns

```javascript
// ❌ CRITICAL: Setting auth tokens via JS (XSS can steal/modify)
document.cookie = 'sessionId=' + token;
document.cookie = 'authToken=' + jwt;

// ❌ HIGH: Missing security attributes
document.cookie = 'session=' + id; // No Secure, SameSite

// ❌ HIGH: Reading cookies with sensitive data
const cookies = document.cookie; // All non-HttpOnly cookies exposed
const token = getCookie('authToken'); // If readable, it's XSS-vulnerable

// ✅ SECURE: Auth tokens should be HttpOnly (set by server only)
// Server: Set-Cookie: session=xxx; HttpOnly; Secure; SameSite=Strict

// ✅ ACCEPTABLE: Non-sensitive preferences via JS
document.cookie = 'theme=dark; Secure; SameSite=Strict';
```

### 3.4 Recommended ESLint Rules

| Rule                          | CWE      | CVSS | Priority | Status      |
| ----------------------------- | -------- | ---- | -------- | ----------- |
| `no-sensitive-cookie-js`      | CWE-1004 | 8.1  | P0       | ✅ **Done** |
| `require-cookie-secure-attrs` | CWE-614  | 6.5  | P1       | 🔲 New      |
| `no-cookie-auth-tokens`       | CWE-922  | 8.5  | P0       | 🔲 New      |

**Detection Patterns:**

- `document.cookie = ` assignments with sensitive names (session, token, jwt, auth)
- Cookie assignments missing `Secure` or `SameSite`
- Reading `document.cookie` to extract auth tokens

---

## 4. File API & Blob URL Vulnerabilities

### 4.1 Vulnerability Landscape (2024)

Blob URLs are increasingly used in phishing attacks to bypass email security.

| Vulnerability            | Risk     | Impact                                 |
| ------------------------ | -------- | -------------------------------------- |
| **Blob URL Phishing**    | Critical | Bypasses email security gateways       |
| **Unsanitized FileRead** | High     | XSS via malicious file content         |
| **Blob URL Persistence** | Moderate | Memory leaks, lingering attack surface |
| **CSP Bypass via blob:** | High     | XSS execution in blob context          |

### 4.2 Attack Patterns

```javascript
// ❌ HIGH: Rendering untrusted file content as HTML
const reader = new FileReader();
reader.onload = (e) => {
  document.body.innerHTML = e.target.result; // XSS from uploaded file!
};
reader.readAsText(userFile);

// ❌ HIGH: Creating blob URLs without revocation
const url = URL.createObjectURL(blob); // Never revoked = memory leak + attack surface
window.open(url); // Opens potentially malicious content

// ❌ HIGH: Rendering user HTML via blob
const html = '<script>steal(document.cookie)</script>';
const blob = new Blob([html], { type: 'text/html' });
iframe.src = URL.createObjectURL(blob); // XSS!

// ✅ SECURE: Revoke blob URLs after use
const url = URL.createObjectURL(blob);
img.src = url;
img.onload = () => URL.revokeObjectURL(url);

// ✅ SECURE: Sanitize before rendering
reader.onload = (e) => {
  const sanitized = DOMPurify.sanitize(e.target.result);
  container.innerHTML = sanitized;
};
```

### 4.3 Recommended ESLint Rules

| Rule                          | CWE     | CVSS | Priority | Status |
| ----------------------------- | ------- | ---- | -------- | ------ |
| `require-blob-url-revocation` | CWE-401 | 5.3  | P1       | 🔲 New |
| `no-filereader-innerhtml`     | CWE-79  | 8.1  | P0       | 🔲 New |
| `no-blob-html-execution`      | CWE-79  | 8.1  | P1       | 🔲 New |

**Detection Patterns:**

- `URL.createObjectURL()` without corresponding `revokeObjectURL()`
- `FileReader.onload` handlers using `innerHTML`
- `new Blob([...], { type: 'text/html' })` assigned to iframe.src

---

## 5. Service Worker & Web Worker Vulnerabilities

### 5.1 Vulnerability Landscape (2024)

Workers provide persistence and can be leveraged for ongoing attacks.

| Vulnerability                   | Risk     | Impact                               |
| ------------------------------- | -------- | ------------------------------------ |
| **Persistent Malicious SW**     | Critical | Survives page reload, ongoing attack |
| **Cache Poisoning**             | High     | Malicious content served to users    |
| **Unsanitized Worker Messages** | High     | XSS via worker postMessage           |
| **Use-After-Free**              | Critical | CVE-2025-10200 - Code execution      |

### 5.2 2024-2025 CVEs

| CVE                | Severity | Description                           |
| ------------------ | -------- | ------------------------------------- |
| **CVE-2025-10200** | Critical | Chromium ServiceWorker use-after-free |

### 5.3 Attack Patterns

```javascript
// ⚠️ CAUTION: Registering service workers from untrusted sources
navigator.serviceWorker.register('/sw.js'); // Ensure sw.js is trusted

// ❌ HIGH: Cache poisoning vulnerable
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request); // No integrity check
    }),
  );
});

// ❌ HIGH: Worker message without validation
worker.onmessage = (event) => {
  document.body.innerHTML = event.data; // XSS from worker!
};

// ✅ SECURE: Validate worker messages
worker.onmessage = (event) => {
  if (typeof event.data !== 'string') return;
  container.textContent = event.data; // Safe - textContent
};
```

### 5.4 Recommended ESLint Rules

| Rule                                | CWE     | CVSS | Priority | Status |
| ----------------------------------- | ------- | ---- | -------- | ------ |
| `no-dynamic-service-worker-url`     | CWE-829 | 7.5  | P1       | 🔲 New |
| `require-worker-message-validation` | CWE-79  | 7.5  | P1       | 🔲 New |
| `no-worker-message-innerhtml`       | CWE-79  | 8.1  | P1       | 🔲 New |

**Detection Patterns:**

- `navigator.serviceWorker.register()` with dynamic/untrusted URLs
- Worker `onmessage` handlers using `innerHTML`
- Missing origin/type validation in worker messages

---

## 6. WebSocket Vulnerabilities

### 6.1 Vulnerability Landscape (2024)

WebSockets bypass same-origin policy and require manual security implementations.

| Vulnerability               | Risk     | Impact                        |
| --------------------------- | -------- | ----------------------------- |
| **Cross-Site WS Hijacking** | Critical | Session hijacking, data theft |
| **Unencrypted WS (ws://)**  | High     | MITM, eavesdropping           |
| **XSS via WS messages**     | High     | Code execution from WS data   |
| **Missing Authentication**  | High     | Unauthorized access           |

### 6.2 2024 CVEs

| CVE                | Severity | Description                        |
| ------------------ | -------- | ---------------------------------- |
| **CVE-2024-37890** | High     | ws Node.js library DoS via headers |

### 6.3 Attack Patterns

```javascript
// ❌ CRITICAL: Unencrypted WebSocket
const ws = new WebSocket('ws://api.example.com/socket'); // Use wss://!

// ❌ HIGH: DOM XSS via WebSocket message
ws.onmessage = (event) => {
  document.getElementById('chat').innerHTML = event.data; // XSS!
};

// ❌ HIGH: No message validation
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  eval(data.code); // Remote code execution!
};

// ✅ SECURE: Encrypted WebSocket
const ws = new WebSocket('wss://api.example.com/socket');

// ✅ SECURE: Safe message handling
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  chatEl.textContent = DOMPurify.sanitize(data.message);
};
```

### 6.4 Recommended ESLint Rules

| Rule                     | CWE     | CVSS | Priority | Status      |
| ------------------------ | ------- | ---- | -------- | ----------- |
| `require-websocket-wss`  | CWE-319 | 7.5  | P0       | ✅ **Done** |
| `no-websocket-innerhtml` | CWE-79  | 8.1  | P0       | 🔲 New      |
| `no-websocket-eval`      | CWE-95  | 9.3  | P0       | 🔲 New      |

**Detection Patterns:**

- `new WebSocket('ws://...')` - flag unencrypted
- WebSocket `onmessage` handlers using `innerHTML`, `eval()`, `document.write()`

---

## 7. Browser API Vulnerabilities (Geolocation, WebRTC, Clipboard)

### 7.1 Vulnerability Landscape (2024)

Modern browser APIs can leak sensitive data or be abused.

| API             | Vulnerability                    | Risk     |
| --------------- | -------------------------------- | -------- |
| **WebRTC**      | IP address leaks (even with VPN) | High     |
| **Clipboard**   | Silent content injection         | High     |
| **Geolocation** | Overprivileged access            | Moderate |

### 7.2 2024 CVEs

| CVE               | Severity | Description                          |
| ----------------- | -------- | ------------------------------------ |
| **CVE-2024-6606** | High     | Firefox clipboard out-of-bounds read |
| **CVE-2024-8900** | Moderate | Firefox clipboard permission bypass  |
| **CVE-2024-6601** | Moderate | Firefox permission race condition    |

### 7.3 Attack Patterns

```javascript
// ⚠️ CAUTION: WebRTC can leak real IP
const pc = new RTCPeerConnection();
pc.createDataChannel(');
pc.createOffer().then((offer) => pc.setLocalDescription(offer));
pc.onicecandidate = (event) => {
  // event.candidate.candidate contains IP addresses!
};

// ❌ HIGH: Silent clipboard modification
navigator.clipboard.writeText('malicious-address'); // User unaware

// ⚠️ CAUTION: Requesting more permissions than needed
navigator.geolocation.getCurrentPosition(
  (pos) => {
    // Do we really need high accuracy?
  },
  null,
  { enableHighAccuracy: true }, // Only if truly needed
);
```

### 7.4 Recommended ESLint Rules

| Rule                                | CWE     | CVSS | Priority | Status |
| ----------------------------------- | ------- | ---- | -------- | ------ |
| `no-webrtc-ip-leak`                 | CWE-200 | 5.3  | P2       | 🔲 New |
| `require-clipboard-user-gesture`    | CWE-862 | 5.3  | P2       | 🔲 New |
| `no-excessive-geolocation-accuracy` | CWE-359 | 4.3  | P2       | 🔲 New |
| `no-silent-permission-requests`     | CWE-862 | 5.3  | P2       | 🔲 New |

---

## 8. CSP & Security Headers (Client-Side Meta Tags)

### 8.1 Vulnerability Landscape

Client-side CSP via `<meta>` tags can be misconfigured.

| Misconfiguration     | Risk     | Impact                        |
| -------------------- | -------- | ----------------------------- |
| **'unsafe-inline'**  | Critical | Allows XSS via inline scripts |
| **'unsafe-eval'**    | Critical | Allows eval-based attacks     |
| **Wildcard sources** | High     | Any domain can inject content |

### 8.2 Attack Patterns

```html
<!-- ❌ CRITICAL: Unsafe CSP -->
<meta
  http-equiv="Content-Security-Policy"
  content="script-src 'unsafe-inline' 'unsafe-eval' *"
/>

<!-- ❌ HIGH: Missing CSP entirely -->
<!-- No meta CSP = browser defaults -->

<!-- ✅ SECURE: Strict CSP with nonces -->
<meta
  http-equiv="Content-Security-Policy"
  content="script-src 'nonce-abc123'; object-src 'none'"
/>
```

### 8.3 Recommended ESLint Rules

| Rule                   | CWE    | CVSS | Priority | Status |
| ---------------------- | ------ | ---- | -------- | ------ |
| `no-unsafe-inline-csp` | CWE-79 | 8.1  | P1       | 🔲 New |
| `no-unsafe-eval-csp`   | CWE-95 | 8.1  | P1       | 🔲 New |

---

## 9. Existing Rules Assessment

| Rule                               | Priority | Status      | Coverage  |
| ---------------------------------- | -------- | ----------- | --------- |
| `no-eval`                          | P0       | ✅ **Done** | Excellent |
| `no-innerhtml`                     | P0       | ✅ **Done** | Excellent |
| `no-sensitive-localstorage`        | P0       | ✅ **Done** | Good      |
| `require-postmessage-origin-check` | P0       | ✅ **Done** | Good      |

---

## 10. Complete Rule Roadmap

### Phase 1: Critical P0 Rules (8 new rules)

| #   | Rule                             | Category    | CVSS | Est. Effort |
| --- | -------------------------------- | ----------- | ---- | ----------- | ----------- |
| 1   | `no-sensitive-sessionstorage`    | Storage     | 7.5  | Low         |
| 2   | `no-jwt-in-storage`              | Storage     | 8.1  | Low         |
| 3   | `no-credentials-in-storage`      | Storage     | 8.5  | Low         |
| 4   | `no-postmessage-wildcard-origin` | postMessage | 7.5  | Low         | ✅ **Done** |
| 5   | `no-postmessage-innerhtml`       | postMessage | 8.8  | Low         | 🔲 New      |
| 6   | `no-sensitive-cookie-js`         | Cookies     | 8.1  | Medium      | ✅ **Done** |
| 7   | `no-filereader-innerhtml`        | File API    | 8.1  | Low         | 🔲 New      |
| 8   | `require-websocket-wss`          | WebSocket   | 7.5  | Low         | ✅ **Done** |

### Phase 2: High Priority P1 Rules (10 new rules)

| #   | Rule                                | Category  | CVSS | Est. Effort |
| --- | ----------------------------------- | --------- | ---- | ----------- |
| 9   | `no-sensitive-indexeddb`            | Storage   | 7.5  | Medium      |
| 10  | `no-cookie-auth-tokens`             | Cookies   | 8.5  | Medium      |
| 11  | `require-cookie-secure-attrs`       | Cookies   | 6.5  | Medium      |
| 12  | `require-blob-url-revocation`       | File API  | 5.3  | Medium      |
| 13  | `no-blob-html-execution`            | File API  | 8.1  | Medium      |
| 14  | `no-dynamic-service-worker-url`     | Workers   | 7.5  | Medium      |
| 15  | `require-worker-message-validation` | Workers   | 7.5  | Medium      |
| 16  | `no-worker-message-innerhtml`       | Workers   | 8.1  | Low         |
| 17  | `no-websocket-innerhtml`            | WebSocket | 8.1  | Low         |
| 18  | `no-websocket-eval`                 | WebSocket | 9.3  | Low         |

### Phase 3: Important P1 Rules (4 rules)

| #   | Rule                   | Category | CVSS | Est. Effort |
| --- | ---------------------- | -------- | ---- | ----------- |
| 19  | `no-unsafe-inline-csp` | CSP      | 8.1  | Medium      |
| 20  | `no-unsafe-eval-csp`   | CSP      | 8.1  | Medium      |

### Phase 4: Moderate P2 Rules (4 rules)

| #   | Rule                                | Category    | CVSS | Est. Effort |
| --- | ----------------------------------- | ----------- | ---- | ----------- |
| 21  | `no-webrtc-ip-leak`                 | Browser API | 5.3  | High        |
| 22  | `require-clipboard-user-gesture`    | Browser API | 5.3  | Medium      |
| 23  | `no-excessive-geolocation-accuracy` | Browser API | 4.3  | Low         |
| 24  | `no-silent-permission-requests`     | Browser API | 5.3  | Medium      |

---

## 11. Naming Recommendation

**Recommendation: Rename to `eslint-plugin-browser-security`**

### Rationale:

1. **Accuracy**: All rules target browser-specific APIs, not frontend frameworks
2. **Scope Clarity**: "Browser" clearly indicates Web API focus (localStorage, postMessage, WebSocket, etc.)
3. **Differentiation**: Avoids confusion with React/Vue/Angular-specific rules
4. **SEO/Discoverability**: "Browser security" is a more commonly searched term
5. **Industry Alignment**: Matches terminology used in OWASP, CVE descriptions, and security research

### Migration Command:

```bash
npx nx generate @nx/workspace:move --project eslint-plugin-frontend-security --destination packages/eslint-plugin-browser-security
```

---

## 12. OWASP Mapping Matrix

| Rule                               | OWASP Top 10 2021 | CWE     | Category    |
| ---------------------------------- | ----------------- | ------- | ----------- |
| `no-eval`                          | A03: Injection    | CWE-95  | DOM XSS     |
| `no-innerhtml`                     | A03: Injection    | CWE-79  | DOM XSS     |
| `no-sensitive-localstorage`        | A02: Crypto Fail  | CWE-922 | Storage     |
| `require-postmessage-origin-check` | A01: Broken AC    | CWE-346 | postMessage |
| `require-websocket-wss`            | A02: Crypto Fail  | CWE-319 | WebSocket   |
| `no-jwt-in-storage`                | A02: Crypto Fail  | CWE-922 | Storage     |
| `no-unsafe-inline-csp`             | A03: Injection    | CWE-79  | CSP         |

---

## References

### OWASP Resources

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet - DOM XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [OWASP Testing Guide - Client-Side](https://owasp.org/www-project-web-security-testing-guide/)

### CVE Databases

- [NIST NVD](https://nvd.nist.gov/)
- [Mozilla Security Advisories](https://www.mozilla.org/en-US/security/advisories/)
- [Chromium Security](https://www.chromium.org/Home/chromium-security/)

### Research Papers

- postMessage Security: CVE-2024-49038 (Microsoft Copilot Studio)
- Service Worker Attacks: Academic research on persistent threats
- Blob URL Phishing: 2024/2025 Cofense research
