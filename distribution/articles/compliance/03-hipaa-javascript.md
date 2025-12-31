---
title: 'HIPAA for JavaScript Developers: Protecting PHI in Your Code'
published: false
description: 'Building healthcare apps? Here are the HIPAA Technical Safeguards that affect your JavaScript code—and the rules to enforce them.'
tags: security, compliance, hipaa, healthcare
cover_image:
series: Compliance Automation
---

# HIPAA for JavaScript Developers: Protecting PHI in Your Code

You're building a healthcare app. Congratulations—you're now subject to HIPAA.

The good news: Only a subset of HIPAA affects your code directly.

The bad news: Violations can cost $50,000 per incident.

## What is PHI in Code?

Protected Health Information (PHI) includes:

- Patient names, SSNs, phone numbers
- Medical record numbers
- Health conditions, diagnoses
- Treatment dates

If your JavaScript touches ANY of this, you're in HIPAA territory.

## The 5 Technical Safeguards That Affect Your Code

### 1. Access Controls (§164.312(a))

```javascript
// ❌ Flagged: No auth check before PHI access
app.get('/patient/:id', (req, res) => {
  const patient = db.getPatient(req.params.id);
  res.json(patient);
});

// ✅ Compliant: Role-based access control
app.get('/patient/:id', requireAuth('provider'), (req, res) => {
  const patient = db.getPatient(req.params.id);
  auditLog.record('PHI_ACCESS', req.user, req.params.id);
  res.json(patient);
});
```

### 2. Audit Controls (§164.312(b))

Every PHI access must be logged:

```javascript
// ✅ Flagged if missing audit log
function getPatientRecords(userId, patientId) {
  auditLog.log({
    action: 'READ_PHI',
    user: userId,
    patient: patientId,
    timestamp: new Date().toISOString(),
  });
  return db.query('SELECT * FROM patients WHERE id = $1', [patientId]);
}
```

### 3. Transmission Security (§164.312(e))

```javascript
// ❌ Flagged: HTTP transmission of PHI
fetch('http://api.health.com/patient/123');

// ✅ Compliant: HTTPS only
fetch('https://api.health.com/patient/123');
```

### 4. Encryption (§164.312(a)(2)(iv))

```javascript
// ❌ Flagged: Unencrypted PHI storage
localStorage.setItem('patientDOB', patient.dateOfBirth);

// ✅ Compliant: Encrypted storage
const encrypted = await encrypt(patient.dateOfBirth, key);
secureStorage.setItem('patientDOB', encrypted);
```

### 5. No PHI in Logs (§164.530(c))

```javascript
// ❌ Flagged: PHI in console logs
console.log('Processing patient:', patient.name, patient.ssn);

// ✅ Compliant: Redacted logging
console.log('Processing patient:', patient.id);
```

## ESLint Rules for HIPAA

```javascript
// eslint.config.js
import secureCoding from 'eslint-plugin-secure-coding';

export default [
  secureCoding.configs['hipaa'],
  {
    rules: {
      'secure-coding/no-pii-in-logs': 'error',
      'secure-coding/require-https': 'error',
      'secure-coding/require-storage-encryption': 'error',
      'secure-coding/require-audit-log': 'warn',
    },
  },
];
```

## The Compliance Evidence

```bash
src/patient/records.ts
  28:5  error  🔒 CWE-532 [HIPAA-164.530(c)] | PHI in log output
               Fix: Remove patient.ssn from console.log
```

---

{% cta https://npmjs.com/package/eslint-plugin-secure-coding %}
📦 npm install eslint-plugin-secure-coding
{% endcta %}

---

🚀 **Building healthcare apps? What's your biggest HIPAA challenge?**


{% cta https://github.com/ofri-peretz/eslint %}
⭐ Star on GitHub
{% endcta %}
[GitHub](https://github.com/ofri-peretz) | [LinkedIn](https://linkedin.com/in/ofri-peretz)
