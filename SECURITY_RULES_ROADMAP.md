# Security Rules Implementation Roadmap

## Overview
This document provides a comprehensive list of security rules to implement for competitive advantage in the ESLint security plugin space. Each rule includes:
- **Rule Name**: Descriptive name for the rule
- **CWE**: Common Weakness Enumeration number
- **OWASP**: OWASP Top 10 2021 category
- **CVSS**: Common Vulnerability Scoring System severity
- **Priority**: Implementation priority (Critical/High/Medium/Low)
- **Links**: Reference documentation and examples
- **Context**: Implementation guidance for agents

---

## 🔴 Critical Priority Rules

### 1. Prototype Pollution Detection
**Rule Name**: `no-prototype-pollution`  
**CWE**: CWE-1321  
**OWASP**: A08:2021 - Software and Data Integrity Failures  
**CVSS**: High (7.5-9.0)  
**Priority**: Critical  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/1321.html
- https://owasp.org/www-community/vulnerabilities/Prototype_Pollution
- https://rules.sonarsource.com/javascript/type/Vulnerability/RSPEC-6664
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#prototype-pollution

**Context**:
Detect dangerous patterns like:
- `Object.assign(target, userInput)` without validation
- `merge()` functions that don't check for `__proto__` or `constructor`
- `JSON.parse()` with untrusted input used in object construction
- Deep merge operations without prototype protection
- `Object.create(null)` should be used instead of `{}` for safe objects

**Implementation Notes**:
- Check for `__proto__`, `constructor`, `prototype` in object keys
- Detect unsafe merge/extend operations
- Flag `Object.assign()` with user-controlled input
- Recommend `Object.create(null)` for safe object creation

---

### 2. JWT Security Vulnerabilities
**Rule Name**: `no-insecure-jwt`  
**CWE**: CWE-347  
**OWASP**: A02:2021 - Cryptographic Failures  
**CVSS**: Critical (9.0+)  
**Priority**: Critical  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/347.html
- https://rules.sonarsource.com/javascript/type/Vulnerability/RSPEC-5659
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#insecure-jwt-verification-method
- https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/

**Context**:
Detect:
- JWT verification with `algorithms: []` or missing algorithm specification
- JWT with `alg: "none"` algorithm
- Missing signature verification (`verify: false`)
- Weak algorithms (HS256 with weak secrets, RS256 without proper key validation)
- JWT tokens decoded without verification

**Implementation Notes**:
- Check `jwt.verify()` calls for proper algorithm specification
- Detect `algorithms: []` or `algorithms: ['none']`
- Flag missing `verify` parameter or `verify: false`
- Check for hardcoded secrets in JWT operations

---

### 3. Timing Attack Vulnerabilities
**Rule Name**: `no-timing-attack`  
**CWE**: CWE-208  
**OWASP**: A07:2021 - Identification and Authentication Failures  
**CVSS**: Medium-High (5.0-7.5)  
**Priority**: Critical  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/208.html
- https://rules.sonarsource.com/javascript/type/Vulnerability/RSPEC-4976
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#observable-timing-discrepancy-timing-attack
- https://nodejs.org/api/crypto.html#cryptotimingSafeEqual

**Context**:
Detect:
- String comparison using `===` or `==` for secrets/passwords
- `crypto.timingSafeEqual()` not used for sensitive comparisons
- Array comparison for authentication tokens
- Timing-dependent authentication logic

**Implementation Notes**:
- Flag `password === storedPassword` patterns
- Detect `token === expectedToken` comparisons
- Recommend `crypto.timingSafeEqual()` for Node.js
- Check for timing-dependent authentication flows

---

### 4. GraphQL Injection & DoS
**Rule Name**: `no-graphql-injection`  
**CWE**: CWE-89, CWE-400  
**OWASP**: A03:2021 - Injection, A10:2021 - SSRF  
**CVSS**: High (7.0-9.0)  
**Priority**: Critical  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/89.html
- https://cwe.mitre.org/data/definitions/400.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#graphql-injection
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#denial-of-service-dos-through-nested-graphql-queries
- https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/07.6-Testing_for_GraphQL_Injection

**Context**:
Detect:
- GraphQL queries constructed from user input without validation
- Nested GraphQL queries that can cause DoS (query depth > 10)
- Missing query complexity analysis
- Direct string interpolation in GraphQL queries
- Missing query depth limiting

**Implementation Notes**:
- Detect `graphql()` calls with user-controlled input
- Flag missing `maxDepth` or `maxComplexity` limits
- Check for string concatenation in GraphQL query construction
- Recommend using parameterized queries or query validation libraries

---

### 5. XXE (XML External Entity) Injection
**Rule Name**: `no-xxe-injection`  
**CWE**: CWE-611  
**OWASP**: A05:2021 - Security Misconfiguration  
**CVSS**: High (7.5-9.0)  
**Priority**: Critical  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/611.html
- https://rules.sonarsource.com/javascript/type/Vulnerability/RSPEC-2755
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#xml-external-entity-xxe-injection
- https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing

**Context**:
Detect:
- XML parsing without disabling external entities
- `xml2js`, `xml2json` without `ignoreAttributes: false` and external entity protection
- Missing `rejectUnauthorized: true` in XML parsers
- XML parsing with `DOMParser` without proper configuration
- XML parsing libraries without XXE protection enabled

**Implementation Notes**:
- Check XML parser configuration for external entity settings
- Detect `xml2js` without `xinclude: false`
- Flag XML parsing with user-controlled input
- Recommend disabling DTD processing and external entities

---

### 6. XPath Injection
**Rule Name**: `no-xpath-injection`  
**CWE**: CWE-643  
**OWASP**: A03:2021 - Injection  
**CVSS**: High (7.0-8.5)  
**Priority**: Critical  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/643.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#xpath-injection
- https://owasp.org/www-community/attacks/XPATH_Injection

**Context**:
Detect:
- XPath queries constructed from user input
- String concatenation in XPath expressions
- Missing parameterization of XPath queries
- Direct user input in XPath evaluation

**Implementation Notes**:
- Detect `document.evaluate()` with user-controlled input
- Flag XPath string concatenation patterns
- Check for XPath libraries without parameterization
- Recommend using parameterized XPath queries

---

### 7. LDAP Injection
**Rule Name**: `no-ldap-injection`  
**CWE**: CWE-90  
**OWASP**: A03:2021 - Injection  
**CVSS**: High (7.0-8.5)  
**Priority**: Critical  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/90.html
- https://rules.sonarsource.com/javascript/type/Vulnerability/RSPEC-2078
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#ldap-injection
- https://owasp.org/www-community/attacks/LDAP_Injection

**Context**:
Detect:
- LDAP queries constructed from user input
- String concatenation in LDAP filter construction
- Missing LDAP input sanitization
- Direct user input in LDAP search operations

**Implementation Notes**:
- Detect `ldap.search()` with user-controlled filters
- Flag LDAP filter string concatenation
- Check for missing LDAP input escaping
- Recommend using parameterized LDAP queries or proper escaping

---

### 8. Deserialization of Untrusted Data
**Rule Name**: `no-unsafe-deserialization`  
**CWE**: CWE-502  
**OWASP**: A08:2021 - Software and Data Integrity Failures  
**CVSS**: Critical (9.0+)  
**Priority**: Critical  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/502.html
- https://rules.sonarsource.com/javascript/type/Vulnerability/RSPEC-5145
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#deserialization-of-untrusted-data
- https://owasp.org/www-community/vulnerabilities/Deserialization_of_untrusted_data

**Context**:
Detect:
- `JSON.parse()` with untrusted input (can lead to prototype pollution)
- `eval()` used for deserialization
- `Function()` constructor with serialized data
- Unsafe use of serialization libraries (`serialize`, `unserialize`)
- Missing validation before deserialization

**Implementation Notes**:
- Flag `JSON.parse()` with user-controlled input without validation
- Detect `eval()` patterns used for deserialization
- Check for unsafe serialization library usage
- Recommend using safe deserialization methods or validation

---

### 9. Zip Slip / Archive Extraction Vulnerabilities
**Rule Name**: `no-zip-slip`  
**CWE**: CWE-22  
**OWASP**: A01:2021 - Broken Access Control  
**CVSS**: High (7.5-9.0)  
**Priority**: Critical  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/22.html
- https://rules.sonarsource.com/javascript/type/Vulnerability/RSPEC-5042
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#arbitrary-file-write-via-archive-extraction-zip-slip
- https://snyk.io/research/zip-slip-vulnerability

**Context**:
Detect:
- Archive extraction without path validation
- Missing path normalization in zip/tar extraction
- File paths in archives that escape extraction directory (`../` patterns)
- Missing `path.resolve()` and `path.join()` validation

**Implementation Notes**:
- Detect archive extraction libraries (`yauzl`, `adm-zip`, `tar`)
- Flag missing path validation before file extraction
- Check for `../` patterns in extracted file paths
- Recommend validating paths stay within extraction directory

---

### 10. Buffer Over-read
**Rule Name**: `no-buffer-overread`  
**CWE**: CWE-126  
**OWASP**: A03:2021 - Injection  
**CVSS**: High (7.0-8.5)  
**Priority**: Critical  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/126.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#buffer-over-read
- https://nodejs.org/api/buffer.html#buffer-security

**Context**:
Detect:
- Buffer operations without bounds checking
- `Buffer.readUInt8()` without length validation
- Array access beyond buffer length
- Missing bounds checks in buffer operations

**Implementation Notes**:
- Detect buffer operations with user-controlled indices
- Flag missing length checks before buffer access
- Check for unsafe buffer slicing operations
- Recommend bounds validation before buffer access

---

## 🟠 High Priority Rules

### 11. Insufficient postMessage Validation
**Rule Name**: `no-insufficient-postmessage-validation`  
**CWE**: CWE-20  
**OWASP**: A03:2021 - Injection  
**CVSS**: Medium-High (6.0-7.5)  
**Priority**: High  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/20.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#insufficient-postmessage-validation
- https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage

**Context**:
Detect:
- `postMessage()` without origin validation
- Missing `event.origin` checks in message handlers
- Trusting messages from `*` origin
- Missing source validation in `message` event listeners

**Implementation Notes**:
- Detect `window.addEventListener('message')` without origin checks
- Flag `postMessage()` calls without target origin specification
- Check for missing `event.origin` validation
- Recommend whitelist of allowed origins

---

### 12. Improper Restriction of Rendered UI Layers (Clickjacking)
**Rule Name**: `no-clickjacking`  
**CWE**: CWE-1021  
**OWASP**: A04:2021 - Insecure Design  
**CVSS**: Medium (5.0-6.5)  
**Priority**: High  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/1021.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#improper-restriction-of-rendered-ui-layers-or-frames
- https://owasp.org/www-community/attacks/Clickjacking

**Context**:
Detect:
- Missing `X-Frame-Options` header
- Missing `Content-Security-Policy: frame-ancestors`
- `X-Frame-Options: ALLOW-FROM` (deprecated)
- Missing frame protection in Express/Next.js apps

**Implementation Notes**:
- Check for missing security headers middleware
- Detect `X-Frame-Options` not set to `DENY` or `SAMEORIGIN`
- Flag missing CSP frame-ancestors directive
- Recommend helmet.js or similar security middleware

---

### 13. Weak Password Recovery Mechanism
**Rule Name**: `no-weak-password-recovery`  
**CWE**: CWE-640  
**OWASP**: A07:2021 - Identification and Authentication Failures  
**CVSS**: Medium (5.0-6.5)  
**Priority**: High  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/640.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#weak-password-recovery-mechanism-for-forgotten-password
- https://owasp.org/www-community/vulnerabilities/Weak_Password_Recovery_Mechanism_for_Forgotten_Password

**Context**:
Detect:
- Password reset tokens with insufficient entropy
- Password reset without rate limiting
- Predictable password reset token generation
- Missing expiration on password reset tokens
- Password reset via email without verification

**Implementation Notes**:
- Detect password reset token generation using weak random
- Flag missing rate limiting on password reset endpoints
- Check for predictable token patterns
- Recommend cryptographically secure random tokens with expiration

---

### 14. Improper Type Validation
**Rule Name**: `no-improper-type-validation`  
**CWE**: CWE-1287  
**OWASP**: A03:2021 - Injection  
**CVSS**: Medium (5.0-6.5)  
**Priority**: High  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/1287.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#improper-type-validation
- https://owasp.org/www-community/vulnerabilities/Improper_Input_Validation

**Context**:
Detect:
- Missing type checking before operations
- Type coercion vulnerabilities
- Missing validation of array/object types
- Unsafe type conversions

**Implementation Notes**:
- Detect operations without `typeof` or `instanceof` checks
- Flag missing type validation before JSON operations
- Check for unsafe type coercion patterns
- Recommend explicit type validation

---

### 15. Unchecked Input for Loop Condition
**Rule Name**: `no-unchecked-loop-condition`  
**CWE**: CWE-400, CWE-606  
**OWASP**: A03:2021 - Injection  
**CVSS**: Medium-High (6.0-7.5)  
**Priority**: High  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/400.html
- https://cwe.mitre.org/data/definitions/606.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#unchecked-input-for-loop-condition
- https://owasp.org/www-community/vulnerabilities/Uncontrolled_Loop_Condition

**Context**:
Detect:
- Loop conditions controlled by user input without validation
- Missing bounds checking in loop conditions
- User-controlled array length in loops
- Potential infinite loops from user input

**Implementation Notes**:
- Detect loops with user-controlled conditions
- Flag missing max iteration limits
- Check for DoS via loop conditions
- Recommend input validation and max iteration limits

---

### 16. Allocation of Resources Without Limits or Throttling
**Rule Name**: `no-unlimited-resource-allocation`  
**CWE**: CWE-770  
**OWASP**: A04:2021 - Insecure Design  
**CVSS**: Medium-High (6.0-7.5)  
**Priority**: High  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/770.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#allocation-of-resources-without-limits-or-throttling
- https://owasp.org/www-community/vulnerabilities/Uncontrolled_Resource_Consumption

**Context**:
Detect:
- Missing rate limiting on API endpoints
- Unlimited array/object creation from user input
- Missing pagination limits
- Unbounded memory allocation
- Missing request size limits

**Implementation Notes**:
- Detect API endpoints without rate limiting
- Flag missing pagination limits
- Check for unbounded array operations
- Recommend rate limiting and resource quotas

---

### 17. Improper Neutralization of Directives in Statically Saved Code
**Rule Name**: `no-directive-injection`  
**CWE**: CWE-96  
**OWASP**: A03:2021 - Injection  
**CVSS**: High (7.0-8.5)  
**Priority**: High  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/96.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#improper-neutralization-of-directives-in-statically-saved-code
- https://owasp.org/www-community/attacks/Code_Injection

**Context**:
Detect:
- Template engines with user-controlled directives
- EJS/Handlebars templates with user input
- Server-side template injection
- Dynamic code generation from user input

**Implementation Notes**:
- Detect template rendering with user-controlled input
- Flag template engines without sandboxing
- Check for server-side template injection patterns
- Recommend input sanitization and template sandboxing

---

### 18. Use of Externally-Controlled Format String
**Rule Name**: `no-format-string-injection`  
**CWE**: CWE-134  
**OWASP**: A03:2021 - Injection  
**CVSS**: Medium-High (6.0-7.5)  
**Priority**: High  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/134.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#use-of-externally-controlled-format-string
- https://owasp.org/www-community/attacks/Format_string_attack

**Context**:
Detect:
- `util.format()` with user-controlled format strings
- `sprintf`-style functions with user input
- Template strings with user-controlled format specifiers
- Missing validation of format strings

**Implementation Notes**:
- Detect format string functions with user input
- Flag `util.format()` patterns with user-controlled format
- Check for format string injection vulnerabilities
- Recommend validating format strings or using safe alternatives

---

### 19. Improper Code Sanitization
**Rule Name**: `no-improper-sanitization`  
**CWE**: CWE-94, CWE-79, CWE-116  
**OWASP**: A03:2021 - Injection  
**CVSS**: High (7.0-8.5)  
**Priority**: High  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/94.html
- https://cwe.mitre.org/data/definitions/79.html
- https://cwe.mitre.org/data/definitions/116.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#improper-code-sanitization
- https://owasp.org/www-community/vulnerabilities/Improper_Neutralization_of_Input_During_Web_Page_Generation

**Context**:
Detect:
- Incomplete HTML sanitization
- Missing sanitization before DOM manipulation
- Bypassed sanitization functions
- Inadequate input validation

**Implementation Notes**:
- Detect DOM manipulation without sanitization
- Flag incomplete sanitization patterns
- Check for sanitization bypasses
- Recommend using DOMPurify or similar libraries

---

### 20. Electron Security Issues
**Rule Name**: `no-electron-security-issues`  
**CWE**: CWE-16  
**OWASP**: A05:2021 - Security Misconfiguration  
**CVSS**: High (7.0-8.5)  
**Priority**: High  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/16.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#electron-disable-security-warnings
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#electron-insecure-web-preferences
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#electron-load-insecure-content
- https://www.electronjs.org/docs/latest/tutorial/security

**Context**:
Detect:
- `nodeIntegration: true` in Electron BrowserWindow
- `webSecurity: false` in Electron
- `allowRunningInsecureContent: true`
- Missing `contextIsolation: true`
- `enableRemoteModule: true`

**Implementation Notes**:
- Detect Electron BrowserWindow configuration issues
- Flag insecure webPreferences
- Check for disabled security features
- Recommend Electron security best practices

---

## 🟡 Medium Priority Rules

### 21. Introspection Enabled (GraphQL/API)
**Rule Name**: `no-introspection-enabled`  
**CWE**: CWE-200  
**OWASP**: A01:2021 - Broken Access Control  
**CVSS**: Low-Medium (3.0-5.0)  
**Priority**: Medium  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/200.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#introspection-enabled
- https://graphql.org/learn/introspection/

**Context**:
Detect:
- GraphQL introspection enabled in production
- API schema exposure
- Missing introspection disabling in production

**Implementation Notes**:
- Detect GraphQL servers with introspection enabled
- Flag missing introspection disabling
- Check for schema exposure vulnerabilities
- Recommend disabling introspection in production

---

### 22. Improper Restriction of XML External Entity Reference
**Rule Name**: `no-xml-external-entity`  
**CWE**: CWE-611 (related)  
**OWASP**: A05:2021 - Security Misconfiguration  
**CVSS**: Medium (5.0-6.5)  
**Priority**: Medium  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/611.html
- https://rules.sonarsource.com/javascript/type/Vulnerability/RSPEC-2755
- https://owasp.org/www-community/vulnerabilities/XML_External_Entity_(XXE)_Processing

**Context**:
Detect:
- XML parsing with external entity processing enabled
- Missing DTD processing disabling
- XML parsers without XXE protection

**Implementation Notes**:
- Detect XML parser configuration issues
- Flag missing external entity disabling
- Check for XXE vulnerabilities
- Recommend secure XML parsing configuration

---

### 23. Origin Validation Error
**Rule Name**: `no-origin-validation-error`  
**CWE**: CWE-942, CWE-346  
**OWASP**: A05:2021 - Security Misconfiguration, A07:2021 - Identification and Authentication Failures  
**CVSS**: Medium (5.0-6.5)  
**Priority**: Medium  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/942.html
- https://cwe.mitre.org/data/definitions/346.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#origin-validation-error
- https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy

**Context**:
Detect:
- Missing origin validation in CORS configuration
- Permissive CORS policies (`origin: '*'`)
- Missing origin whitelist validation
- Insecure cross-origin resource sharing

**Implementation Notes**:
- Detect CORS configuration issues
- Flag permissive origin policies
- Check for missing origin validation
- Recommend origin whitelisting

---

### 24. Permissive Cross-domain Policy
**Rule Name**: `no-permissive-crossdomain`  
**CWE**: CWE-942  
**OWASP**: A05:2021 - Security Misconfiguration  
**CVSS**: Medium (5.0-6.5)  
**Priority**: Medium  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/942.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#permissive-cross-domain-policy
- https://www.adobe.com/devnet/articles/crossdomain_policy_file_spec.html

**Context**:
Detect:
- `crossdomain.xml` with permissive policies
- Missing cross-domain policy restrictions
- Insecure Flash/Adobe cross-domain policies

**Implementation Notes**:
- Detect crossdomain.xml files
- Flag permissive cross-domain policies
- Check for insecure cross-domain configurations
- Recommend restrictive cross-domain policies

---

### 25. Unsafe JQuery Plugin Usage
**Rule Name**: `no-unsafe-jquery-plugin`  
**CWE**: CWE-79, CWE-116  
**OWASP**: A03:2021 - Injection  
**CVSS**: Medium-High (6.0-7.5)  
**Priority**: Medium  
**Status**: Missing

**Links**:
- https://cwe.mitre.org/data/definitions/79.html
- https://cwe.mitre.org/data/definitions/116.html
- https://docs.snyk.io/scan-with-snyk/snyk-code/snyk-code-security-rules/javascript-and-typescript-rules#unsafe-jquery-plugin
- https://owasp.org/www-community/vulnerabilities/Unsafe_Use_of_Reflection

**Context**:
Detect:
- JQuery plugins that bypass security controls
- Unsafe JQuery DOM manipulation
- JQuery plugins with XSS vulnerabilities
- Missing sanitization in JQuery operations

**Implementation Notes**:
- Detect unsafe JQuery plugin patterns
- Flag JQuery operations without sanitization
- Check for XSS vulnerabilities in JQuery usage
- Recommend safe alternatives or sanitization

---

## 📊 Summary Statistics

### By OWASP Top 10 Category:
- **A01: Broken Access Control**: 3 rules
- **A02: Cryptographic Failures**: 2 rules
- **A03: Injection**: 12 rules
- **A04: Insecure Design**: 2 rules
- **A05: Security Misconfiguration**: 4 rules
- **A07: Identification and Authentication Failures**: 2 rules
- **A08: Software and Data Integrity Failures**: 2 rules
- **A10: SSRF**: 1 rule (covered in GraphQL)

### By Priority:
- **Critical**: 10 rules
- **High**: 10 rules
- **Medium**: 5 rules
- **Total**: 25 rules

### Coverage Comparison:
- **SonarQube**: ~60% coverage
- **Snyk Code**: ~80% coverage
- **Microsoft SDL**: ~40% coverage
- **Your Plugin**: ~35% coverage (estimated)
- **After Implementation**: ~95% coverage

---

## 🎯 Implementation Strategy

1. **Phase 1 (Critical)**: Implement all 10 critical priority rules
2. **Phase 2 (High)**: Implement all 10 high priority rules
3. **Phase 3 (Medium)**: Implement remaining 5 medium priority rules
4. **Phase 4 (Enhancement)**: Add advanced detection patterns and edge cases

### Competitive Advantages:
1. **Comprehensive Coverage**: More rules than eslint-plugin-security
2. **Modern Vulnerabilities**: Prototype pollution, JWT, GraphQL
3. **LLM-Optimized**: Better error messages and suggestions
4. **Framework-Aware**: Detects framework-specific vulnerabilities
5. **Actionable Fixes**: Provides specific remediation guidance

---

## 📚 Additional Resources

### OWASP Resources:
- https://owasp.org/Top10/
- https://owasp.org/www-project-web-security-testing-guide/
- https://cheatsheetseries.owasp.org/

### CWE Resources:
- https://cwe.mitre.org/
- https://cwe.mitre.org/top25/

### CVSS Resources:
- https://www.first.org/cvss/

### Security Standards:
- https://owasp.org/www-project-application-security-verification-standard/
- https://www.pcisecuritystandards.org/

