# no-data-in-temp-storage

> Prevents sensitive data in temporary directories

**Severity:** 🟠 HIGH  
**CWE:** [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html)  
**OWASP Mobile:** [M9: Insecure Data Storage](https://owasp.org/www-project-mobile-top-10/)

## Rule Details

This rule detects when files are written to temporary directories (`/tmp`, `/var/tmp`, `temp/`) or when temp directory paths are assigned to variables. Temporary storage may survive app uninstall, be accessible to other apps, or persist longer than expected.

### Why This Matters

Temporary directories are inherently insecure for sensitive data:

- Temp files may persist after app termination or device restart
- Other apps or processes may have read access to `/tmp`
- Temp directories are often excluded from full-disk encryption
- Forensic recovery can retrieve "deleted" temp files

## ❌ Incorrect

```typescript
// Writing sensitive data to /tmp
import fs from 'fs';

const userData = { email: user.email, password: user.password };
fs.writeFileSync('/tmp/user-session.json', JSON.stringify(userData)); // ❌ Sensitive data in temp

// Using temp directory for credentials
fs.writeFile('/var/tmp/api-key.txt', process.env.API_KEY, (err) => {
  // ❌ API key in temp storage
});

// Temp path in variable assignment
const cachePath = '/tmp/cache/user-data.json'; // ❌ Flagged: temp path
fs.writeFileSync(cachePath, sensitiveData);

// Windows temp directory
const tempFile = 'C:\\temp\\credentials.json'; // ❌ Windows temp
fs.writeFileSync(tempFile, JSON.stringify(creds));
```

## ✅ Correct

```typescript
// Use secure, app-specific storage
import path from 'path';
import fs from 'fs';

// App-specific data directory (encrypted on mobile)
const dataDir = path.join(process.env.HOME, '.myapp', 'data');
fs.writeFileSync(path.join(dataDir, 'session.json'), encryptedData); // ✅ Secure location

// Use in-memory storage for ephemeral data
const sessionCache = new Map<string, UserSession>(); // ✅ In-memory, not persisted
sessionCache.set(userId, session);

// For mobile: Use secure keychain/keystore
// iOS: Keychain Services
// Android: EncryptedSharedPreferences
await SecureStore.setItemAsync('user-token', token); // ✅ Platform secure storage

// Encrypt before writing to any storage
const encrypted = await encrypt(sensitiveData, encryptionKey);
fs.writeFileSync(dataPath, encrypted); // ✅ Encrypted data
```

## ⚙️ Configuration

This rule has no configuration options.

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Temp Paths from Variables or Environment

**Why**: We only detect literal string paths. Paths from variables, env vars, or `os.tmpdir()` are not traced.

```typescript
// ❌ NOT DETECTED - Path from function
import os from 'os';
const tempPath = os.tmpdir(); // Returns '/tmp' on Unix
fs.writeFileSync(path.join(tempPath, 'data.json'), data);
```

**Mitigation**: Avoid using `os.tmpdir()` for sensitive data. Use app-specific secure directories.

### Temp Streams and Buffers

**Why**: We only detect `fs.writeFile` and `fs.writeFileSync`. Stream-based writes are not analyzed.

```typescript
// ❌ NOT DETECTED - Stream API
const writeStream = fs.createWriteStream('/tmp/upload.dat');
writeStream.write(sensitiveData);
```

**Mitigation**: Review all file I/O operations manually. Avoid temp directories entirely for sensitive data.

### Third-Party Library Temp Usage

**Why**: Libraries that internally use temp storage are not detected.

```typescript
// ❌ NOT DETECTED - Library uses temp internally
await someLibrary.cache(sensitiveData); // May use /tmp internally
```

**Mitigation**: Review third-party library documentation for temp file usage. Configure libraries to use secure storage locations.

## 🔗 Related Rules

- [`require-storage-encryption`](./require-storage-encryption.md) - Require encrypted storage
- [`require-secure-deletion`](./require-secure-deletion.md) - Secure file deletion

## 📚 References

- [CWE-312: Cleartext Storage of Sensitive Information](https://cwe.mitre.org/data/definitions/312.html)
- [OWASP Mobile M9: Insecure Data Storage](https://owasp.org/www-project-mobile-top-10/)
- [iOS Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [Android EncryptedSharedPreferences](https://developer.android.com/reference/androidx/security/crypto/EncryptedSharedPreferences)
