# no-zip-slip

> **Keywords:** zip slip, CWE-22, path traversal, archive extraction, tar, security

Detects zip slip/archive extraction vulnerabilities. This rule is part of [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding).

💼 This rule is set to **error** in the `recommended` config.

## Quick Summary

| Aspect | Details |
|--------|---------|
| **CWE Reference** | CWE-22 (Path Traversal) |
| **Severity** | High (CVSS 8.1) |
| **Auto-Fix** | 💡 Suggestions available |
| **Category** | Path & File Security |

## Rule Details

Zip slip vulnerabilities occur when extracting archives without properly validating file paths. Attackers can include files with path traversal sequences like `../` to write files outside the intended extraction directory, potentially:
- Overwrite critical system files
- Plant backdoors or web shells
- Replace application binaries
- Modify configuration files

### Why This Matters

| Issue | Impact | Solution |
|-------|--------|----------|
| 📂 **File Overwrite** | System compromise | Validate extraction paths |
| 🚪 **Backdoor** | Persistent access | Use safe extraction libraries |
| ⚙️ **Config Tampering** | Application hijacking | Sandbox extraction directory |

## Examples

### ❌ Incorrect

```typescript
// Extracting without path validation
const zip = new AdmZip(uploadedFile);
zip.extractAllTo(targetDir); // Vulnerable!

// Using entry path directly
for (const entry of archive.entries()) {
  const outputPath = path.join(targetDir, entry.name);
  fs.writeFileSync(outputPath, entry.getData()); // Vulnerable!
}

// tar extraction without validation
tar.extract({ file: uploadedTar, cwd: targetDir });
```

### ✅ Correct

```typescript
// Validate path before extraction
for (const entry of archive.entries()) {
  const targetPath = path.join(targetDir, entry.name);
  const realTarget = path.normalize(targetPath);
  
  // Ensure path stays within target directory
  if (!realTarget.startsWith(path.resolve(targetDir) + path.sep)) {
    throw new Error('Path traversal detected');
  }
  
  fs.writeFileSync(realTarget, entry.getData());
}

// Use safe extraction libraries
import { extractSafe } from 'safe-archive';
await extractSafe(uploadedFile, targetDir);

// Or use library with built-in protection
const zip = new AdmZip(uploadedFile);
zip.extractAllTo(targetDir, true, true); // With overwrite protection
```

## Configuration

```javascript
{
  rules: {
    'secure-coding/no-zip-slip': ['error', {
      archiveFunctions: ['extract', 'extractAll', 'extractAllTo', 'unzip'],
      pathValidationFunctions: ['validatePath', 'isWithinDirectory'],
      safeLibraries: ['safe-archive', 'secure-unzip']
    }]
  }
}
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `archiveFunctions` | `string[]` | `['extract', 'extractAll']` | Archive extraction functions to check |
| `pathValidationFunctions` | `string[]` | `['validatePath']` | Path validation functions |
| `safeLibraries` | `string[]` | `[]` | Libraries with safe extraction |

## Error Message Format

```
🔒 CWE-22 OWASP:A01-Broken-Access CVSS:8.1 | Zip Slip Vulnerability | HIGH [SOC2,PCI-DSS]
   Fix: Use safe extraction libraries or validate all paths | https://snyk.io/research/zip-slip-vulnerability
```

## Further Reading

- **[Snyk Zip Slip Research](https://snyk.io/research/zip-slip-vulnerability)** - Original research
- **[CWE-22](https://cwe.mitre.org/data/definitions/22.html)** - Path traversal documentation
- **[OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)** - Attack techniques

## Related Rules

- [`detect-non-literal-fs-filename`](./detect-non-literal-fs-filename.md) - Path traversal in fs operations
- [`no-toctou-vulnerability`](./no-toctou-vulnerability.md) - Race condition vulnerabilities

