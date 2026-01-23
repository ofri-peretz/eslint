---
description: OWASP Mobile Top 10 2024 Security Roadmap
---

# OWASP Mobile Top 10 2024 - Final Release Security Roadmap

This roadmap provides a comprehensive guide to addressing the OWASP Mobile Top 10 2024 (Final Release) security risks in modern mobile application development.

> **Note**: The OWASP Mobile Top 10 2024 is the latest final release, representing the current state of mobile security threats as of 2024-2025.

---

## M1: Improper Credential Usage

### Overview

Improper handling, storage, or transmission of credentials including API keys, passwords, tokens, and cryptographic keys.

### Key Risks & Attack Vectors

- **Hardcoded Secrets**: API keys, passwords, or tokens embedded in source code or compiled binaries
- **Insecure Storage**: Credentials stored in plaintext in shared preferences, databases, or configuration files
- **Memory Exposure**: Credentials accessible in memory dumps or crash logs
- **Insecure Transmission**: Credentials sent over unencrypted channels or logged
- **Weak Key Management**: Predictable or static encryption keys, improper key rotation

### 2024 Evolution

- Increased focus on cloud service credentials (AWS, Azure, GCP)
- API key exposure in CI/CD pipelines and container images
- OAuth/OIDC token mishandling
- Service account credential leakage

### Implementation Roadmap

#### Phase 1: Discovery & Risk Assessment (Weeks 1-2)

**Week 1: Automated Secret Detection**

```bash
# Tools to deploy
- TruffleHog 3.0+ for secret scanning
- GitGuardian for repository scanning
- Semgrep with secret detection rules
- GitHub Advanced Security (if using GitHub)
```

**Actions:**

1. Scan entire codebase history for exposed secrets
2. Scan container images and build artifacts
3. Review CI/CD environment variables
4. Audit third-party SDK credential usage
5. Create credential inventory matrix

**Deliverables:**

- [ ] Complete secret scan report
- [ ] Credential inventory (type, location, sensitivity)
- [ ] Risk assessment matrix
- [ ] Immediate remediation list

**Week 2: Manual Code Review**

1. Review authentication implementations
2. Audit custom credential handling code
3. Evaluate client-side credential validation
4. Review logging and error handling for credential leaks
5. Assess credential lifecycle management

**Deliverables:**

- [ ] Code review findings report
- [ ] High-risk credential usage patterns documented
- [ ] Remediation priority list

#### Phase 2: Secure Storage Implementation (Weeks 3-6)

**iOS Implementation (Weeks 3-4)**

**Week 3: Keychain Integration**

```swift
// Modern iOS credential storage
import Security
import CryptoKit

class SecureCredentialManager {
    static let shared = SecureCredentialManager()

    // Store credentials in Keychain with biometric protection
    func storeCredential(key: String, value: String, requireBiometric: Bool = true) throws {
        let data = value.data(using: .utf8)!

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecAttrAccessControl as String: try createAccessControl(requireBiometric: requireBiometric)
        ]

        SecItemDelete(query as CFDictionary) // Remove old value
        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw KeychainError.storeFailed(status)
        }
    }

    private func createAccessControl(requireBiometric: Bool) throws -> SecAccessControl {
        var flags: SecAccessControlCreateFlags = []
        if requireBiometric {
            flags = .biometryCurrentSet // Reset if biometric changes
        }

        guard let access = SecAccessControlCreateWithFlags(
            kCFAllocatorDefault,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            flags,
            nil
        ) else {
            throw KeychainError.accessControlFailed
        }

        return access
    }
}
```

**Actions:**

1. Migrate all credentials to Keychain
2. Implement biometric protection for sensitive credentials
3. Configure appropriate accessibility levels
4. Add secure credential rotation mechanism
5. Implement credential backup/restore (encrypted)

**Deliverables:**

- [ ] Keychain integration complete
- [ ] Biometric protection implemented
- [ ] Migration script for existing users
- [ ] Unit tests for credential storage

**Week 4: iOS Data Protection & Memory Safety**

```swift
// Secure memory handling
class SecureString {
    private var data: Data

    init?(_ string: String) {
        guard let data = string.data(using: .utf8) else { return nil }
        self.data = data
    }

    func withUnsafeString<T>(_ body: (String) -> T) -> T? {
        defer { data.resetBytes(in: 0..<data.count) } // Clear after use
        return String(data: data, encoding: .utf8).map(body)
    }

    deinit {
        data.resetBytes(in: 0..<data.count) // Clear on dealloc
    }
}
```

**Actions:**

1. Enable Data Protection for credential files
2. Implement secure string handling
3. Clear credentials from memory after use
4. Disable credential caching in memory
5. Configure file protection attributes

**Android Implementation (Weeks 5-6)**

**Week 5: Android Keystore & EncryptedSharedPreferences**

```kotlin
// Modern Android credential storage
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties

class SecureCredentialManager(private val context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .setUserAuthenticationRequired(true) // Require device auth
        .setUserAuthenticationValidityDurationSeconds(300) // 5 min
        .build()

    private val encryptedPrefs = EncryptedSharedPreferences.create(
        context,
        "secure_credentials",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun storeCredential(key: String, value: String) {
        encryptedPrefs.edit().putString(key, value).apply()
    }

    fun retrieveCredential(key: String): String? {
        return encryptedPrefs.getString(key, null)
    }

    // For cryptographic keys
    fun generateSecureKey(alias: String) {
        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            "AndroidKeyStore"
        )

        val spec = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)
            .setUserAuthenticationValidityDurationSeconds(300)
            .setRandomizedEncryptionRequired(true)
            .build()

        keyGenerator.init(spec)
        keyGenerator.generateKey()
    }
}
```

**Actions:**

1. Migrate to EncryptedSharedPreferences for credentials
2. Use AndroidKeystore for cryptographic keys
3. Enable hardware-backed keystore
4. Implement user authentication requirements
5. Configure StrongBox when available (Android 9+)

**Deliverables:**

- [ ] Android Keystore integration complete
- [ ] EncryptedSharedPreferences implemented
- [ ] Hardware-backed keys enabled
- [ ] Migration complete for existing users

**Week 6: Android Memory & Process Security**

```kotlin
// Secure memory handling
import java.security.SecureRandom

class SecureByteArray(size: Int) : AutoCloseable {
    private val data = ByteArray(size)

    fun get(): ByteArray = data

    override fun close() {
        // Overwrite with random data before clearing
        SecureRandom().nextBytes(data)
        data.fill(0)
    }
}

// Usage
SecureByteArray(32).use { secureData ->
    // Use secureData.get()
    // Automatically cleared when done
}
```

**Actions:**

1. Implement secure memory clearing
2. Prevent credential exposure in logcat
3. Configure FLAG_SECURE for sensitive screens
4. Implement anti-screenshot for credential screens
5. Clear credentials from memory on app background

#### Phase 3: Secure Transmission & API Security (Weeks 7-9)

**Week 7: OAuth 2.0 & OIDC Implementation**

```kotlin
// Modern OAuth 2.0 with PKCE
import net.openid.appauth.*

class OAuth2Manager(private val context: Context) {

    fun performAuthorizationRequest() {
        val serviceConfig = AuthorizationServiceConfiguration(
            Uri.parse("https://auth.example.com/authorize"),
            Uri.parse("https://auth.example.com/token")
        )

        // PKCE for mobile security
        val authRequest = AuthorizationRequest.Builder(
            serviceConfig,
            CLIENT_ID,
            ResponseTypeValues.CODE,
            Uri.parse("myapp://oauth/callback")
        )
            .setCodeVerifier(CodeVerifierUtil.generateRandomCodeVerifier())
            .setScope("openid profile email")
            .build()

        val authService = AuthorizationService(context)
        val authIntent = authService.getAuthorizationRequestIntent(authRequest)
        startActivityForResult(authIntent, AUTH_REQUEST_CODE)
    }
}
```

**Actions:**

1. Implement OAuth 2.0 with PKCE for native apps
2. Replace hardcoded credentials with OAuth flows
3. Implement secure token storage
4. Add automatic token refresh
5. Implement secure logout and token revocation

**Deliverables:**

- [ ] OAuth 2.0/OIDC implementation complete
- [ ] PKCE enabled for all flows
- [ ] Token refresh working
- [ ] Secure token storage verified

**Week 8: API Key & Token Management**

```javascript
// Backend API key proxy pattern
// DON'T store API keys in mobile app
// Instead, proxy through your backend

// Mobile app
class APIClient {
  async makeSecureRequest(endpoint) {
    // Use short-lived session token, not API key
    const sessionToken = await this.getSessionToken();

    const response = await fetch(`https://api.yourbackend.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'X-Request-ID': generateRequestId(),
        'X-Timestamp': Date.now(),
      },
    });

    return response.json();
  }
}

// Backend server
app.post('/api/proxy/:service', authenticate, async (req, res) => {
  // Backend holds the actual API keys
  const apiKey = process.env.THIRD_PARTY_API_KEY;

  // Proxy request to third-party service
  const response = await fetch(`https://thirdparty.com/${req.params.service}`, {
    headers: { 'X-API-Key': apiKey },
  });

  res.json(await response.json());
});
```

**Actions:**

1. Move API keys to backend proxy
2. Implement short-lived session tokens (15-30 min)
3. Add token binding/fingerprinting
4. Implement request signing
5. Add rate limiting per user/device

**Deliverables:**

- [ ] API keys removed from mobile app
- [ ] Backend proxy implemented
- [ ] Session token system working
- [ ] Request signing implemented

**Week 9: Certificate Pinning & Network Security**

```swift
// iOS Certificate Pinning with TrustKit
import TrustKit

class NetworkManager {
    init() {
        let trustKitConfig: [String: Any] = [
            kTSKSwizzleNetworkDelegates: false,
            kTSKPinnedDomains: [
                "api.example.com": [
                    kTSKEnforcePinning: true,
                    kTSKIncludeSubdomains: true,
                    kTSKPublicKeyHashes: [
                        "SHA256:primary_key_hash_base64",
                        "SHA256:backup_key_hash_base64" // Always have backup
                    ],
                    kTSKReportUris: ["https://your-report-endpoint.com/pin-validation"]
                ]
            ]
        ]

        TrustKit.initSharedInstance(withConfiguration: trustKitConfig)
    }
}
```

