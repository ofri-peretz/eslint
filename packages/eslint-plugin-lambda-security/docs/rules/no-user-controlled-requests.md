---
title: no-user-controlled-requests
description: Detect HTTP requests with user-controlled URLs (SSRF)
category: security
severity: critical
tags: ['security', 'ssrf', 'cwe-918', 'lambda', 'aws']
autofix: false
cwe: CWE-918
owasp: A10:2021-Server-Side-Request-Forgery
---

> **Keywords:** SSRF, Server-Side Request Forgery, fetch, axios, user input, CWE-918, Lambda, serverless
> **CWE:** [CWE-918](https://cwe.mitre.org/data/definitions/918.html)  
> **OWASP:** [A10:2021-Server-Side Request Forgery](https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/)

Detects HTTP requests where the URL contains user-controlled input from Lambda events. This rule is part of [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) and provides LLM-optimized error messages.

**🚨 Security rule** | **💡 Provides suggestions** | **⚠️ Set to error in `recommended`**

## Quick Summary

| Aspect            | Details                                                           |
| ----------------- | ----------------------------------------------------------------- |
| **CWE Reference** | [CWE-918](https://cwe.mitre.org/data/definitions/918.html) (SSRF) |
| **CVSS Score**    | 9.1 Critical                                                      |
| **Auto-Fix**      | 💡 Suggests URL allowlist                                         |
| **Category**      | Security                                                          |
| **Best For**      | Lambda functions making outbound HTTP requests                    |

## Vulnerability and Risk

**Vulnerability:** When a Lambda function makes HTTP requests using URLs derived from user input (event body, query parameters, headers), attackers can redirect those requests to internal services or external systems.

**Risk:** SSRF attacks can:

- Access internal AWS metadata (`http://169.254.169.254/`)
- Reach VPC-internal services not exposed to the internet
- Exfiltrate data through controlled external servers
- Perform port scanning of internal networks

## Rule Details

This rule tracks data flow from Lambda event properties to HTTP client calls, detecting when user-controlled data reaches URL parameters.

## Why This Matters

| Risk                     | Impact                                   | Solution                    |
| ------------------------ | ---------------------------------------- | --------------------------- |
| 🔓 **Metadata Access**   | AWS credentials from IMDS endpoint       | Block 169.254.x.x addresses |
| 🏠 **Internal Access**   | Reach VPC services, databases            | Use URL allowlist           |
| 📤 **Data Exfiltration** | Send data to attacker-controlled servers | Validate and sanitize URLs  |

## Configuration

| Option         | Type      | Default | Description         |
| -------------- | --------- | ------- | ------------------- |
| `allowInTests` | `boolean` | `true`  | Allow in test files |

```javascript
{
  rules: {
    'lambda-security/no-user-controlled-requests': ['error', {
      allowInTests: true
    }]
  }
}
```

## Examples

### ❌ Incorrect

```typescript
export const handler = async (event) => {
  const body = JSON.parse(event.body);

  // User controls the URL - CRITICAL SSRF
  const response = await fetch(body.webhookUrl); // ❌

  // User input in template literal
  const data = await axios.get(
    `https://${event.queryStringParameters.domain}/api`,
  ); // ❌

  // Object config with user-controlled URL
  await axios({
    url: body.targetUrl, // ❌ User-controlled
    method: 'POST',
    data: payload,
  });
};
```

### ✅ Correct

```typescript
const ALLOWED_HOSTS = ['api.trusted.com', 'webhook.partner.com'];

export const handler = async (event) => {
  const body = JSON.parse(event.body);

  // Validate URL against allowlist
  const url = new URL(body.webhookUrl);
  if (!ALLOWED_HOSTS.includes(url.host)) {
    // ✅ Allowlist check
    return { statusCode: 400, body: 'Invalid webhook URL' };
  }

  // Block internal addresses
  if (isInternalUrl(url)) {
    // ✅ Internal address check
    return { statusCode: 400, body: 'Invalid URL' };
  }

  const response = await fetch(url.toString());
  return { statusCode: 200, body: await response.text() };
};

function isInternalUrl(url) {
  const host = url.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('169.254.') || // Link-local (IMDS)
    host.startsWith('10.') || // Private Class A
    host.startsWith('192.168.') || // Private Class C
    host.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) // Private Class B
  );
}
```

## SSRF in AWS Lambda Context

### AWS Metadata Service (IMDS)

```typescript
// Attacker payload: { "url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/" }
// This exposes temporary AWS credentials attached to the Lambda role

// Always block these patterns:
const BLOCKED_PATTERNS = [
  /^169\.254\./, // Link-local (IMDS)
  /^fd[0-9a-f]{2}:/i, // IPv6 link-local
  /\.internal$/, // AWS internal DNS
  /\.amazonaws\.com$/, // AWS services (unless specifically allowed)
];
```

### VPC Internal Services

```typescript
// Attacker payload: { "url": "http://internal-api.vpc:3000/admin" }
// This reaches services not exposed to the internet

// Use strict allowlisting for internal access patterns
```

## Security Impact

| Vulnerability    | CWE | OWASP    | CVSS         | Impact                  |
| ---------------- | --- | -------- | ------------ | ----------------------- |
| SSRF             | 918 | A10:2021 | 9.1 Critical | Internal service access |
| Credential Theft | 522 | A07:2021 | 8.6 High     | AWS credential exposure |

## Related Rules

- [`no-unvalidated-event-body`](./no-unvalidated-event-body.md) - Validate all event input
- [`no-hardcoded-credentials-sdk`](./no-hardcoded-credentials-sdk.md) - Secure credential handling

## Known False Negatives

### Multi-Step Taint Flow

**Why**: Complex data transformations not fully tracked.

```typescript
// ❌ NOT DETECTED - multi-step flow
const userInput = event.body;
const parsed = JSON.parse(userInput);
const url = buildUrl(parsed); // Lost track of taint
await fetch(url);
```

**Mitigation**: Apply validation at the point of URL construction.

## Further Reading

- **[OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)** - Comprehensive guide
- **[CWE-918: Server-Side Request Forgery](https://cwe.mitre.org/data/definitions/918.html)** - Official CWE entry
- **[AWS IMDS Security](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)** - IMDSv2 protection
