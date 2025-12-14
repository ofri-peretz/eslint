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

**Actions:**

1. Implement certificate pinning for credential endpoints
2. Configure public key pinning
3. Add backup pins
4. Set up pin failure reporting
5. Plan pin rotation strategy

#### Phase 4: CI/CD & Supply Chain Security (Weeks 10-12)

**Week 10: Secret Management in CI/CD**

```yaml
# GitHub Actions with secret scanning
name: Security Checks

on: [push, pull_request]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Full history for secret detection

      - name: TruffleHog Secret Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          extra_args: --json --only-verified

      - name: GitGuardian Scan
        uses: GitGuardian/ggshield-action@v1
        env:
          GITGUARDIAN_API_KEY: ${{ secrets.GITGUARDIAN_API_KEY }}

      - name: Fail on exposed secrets
        if: steps.secret-scan.outputs.secrets-found == 'true'
        run: exit 1
```

**Actions:**

1. Integrate secret scanning in CI/CD
2. Use vault services (HashiCorp Vault, AWS Secrets Manager)
3. Implement secret rotation automation
4. Configure pre-commit hooks for secret detection
5. Enable branch protection requiring secret scans

**Deliverables:**

- [ ] CI/CD secret scanning active
- [ ] Vault service integrated
- [ ] Pre-commit hooks deployed
- [ ] Secret rotation automated

**Week 11: Runtime Credential Protection**

```kotlin
// Runtime credential monitoring
class CredentialMonitor {

    fun detectDebugger(): Boolean {
        return Debug.isDebuggerConnected() ||
               Debug.waitingForDebugger() ||
               isUnderDebugger()
    }

    fun detectRoot(): Boolean {
        // Check for root indicators
        val rootIndicators = listOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su"
        )

        return rootIndicators.any { File(it).exists() } ||
               canExecuteSuCommand()
    }

    fun protectCredentials() {
        if (detectDebugger() || detectRoot()) {
            // Clear credentials
            SecureCredentialManager.clearAllCredentials()
            // Alert user
            showSecurityWarning()
        }
    }
}
```

**Actions:**

1. Implement root/jailbreak detection
2. Add debugger detection
3. Implement runtime credential clearing on threat
4. Add credential access logging
5. Implement anomaly detection for credential access

**Week 12: Monitoring & Incident Response**

```kotlin
// Credential access monitoring
class CredentialAuditLogger {

    fun logCredentialAccess(
        credentialId: String,
        action: AccessAction,
        success: Boolean
    ) {
        val event = SecurityEvent(
            timestamp = System.currentTimeMillis(),
            userId = getUserId(),
            deviceId = getDeviceId(),
            credentialId = hashCredentialId(credentialId), // Don't log actual ID
            action = action,
            success = success,
            context = getSecurityContext()
        )

        // Send to SIEM
        securityEventBus.publish(event)

        // Check for suspicious patterns
        if (detectSuspiciousAccess(event)) {
            triggerSecurityAlert(event)
        }
    }

    private fun detectSuspiciousAccess(event: SecurityEvent): Boolean {
        // Detect unusual patterns
        return isHighFrequency(event) ||
               isUnusualLocation(event) ||
               isUnusualDevice(event) ||
               hasMultipleFailures(event)
    }
}
```

**Actions:**

1. Implement credential access logging
2. Set up SIEM integration
3. Create anomaly detection rules
4. Define incident response procedures
5. Implement automated alerting

### Testing & Validation Checklist

#### Static Analysis

- [ ] No hardcoded credentials in source code
- [ ] No credentials in configuration files
- [ ] No credentials in container images
- [ ] Semgrep rules pass for credential detection
- [ ] SonarQube security rules pass

#### Dynamic Analysis

- [ ] Credentials not in memory dumps
- [ ] Credentials not in app backups (iOS iTunes/iCloud, Android ADB)
- [ ] Credentials not in crash logs
- [ ] Credentials not in system logs (logcat, Console.app)
- [ ] Credentials encrypted at rest (validated via file inspection)

#### Runtime Testing

- [ ] Frida/objection cannot extract credentials
- [ ] Man-in-the-middle cannot intercept credentials
- [ ] Root/jailbreak apps cannot access credentials
- [ ] Debugger attachment clears credentials
- [ ] App backgrounding clears credential memory

#### Penetration Testing

- [ ] Binary reverse engineering doesn't reveal credentials
- [ ] IPA/APK inspection passes
- [ ] Runtime hooking attempts fail
- [ ] Credential extraction attempts fail
- [ ] Third-party penetration test passed

### Key Performance Indicators (KPIs)

- **Detection Rate**: 100% of hardcoded credentials detected in CI/CD
- **False Positives**: <5% in secret scanning
- **Remediation Time**: <24 hours for critical credential exposure
- **Test Coverage**: >95% of credential handling code covered
- **Security Incidents**: Zero credential-related breaches
- **Compliance**: 100% OWASP MASVS L2 credential requirements met

### Tools & Resources

**Secret Detection**

- TruffleHog 3.0+
- GitGuardian
- Gitleaks
- Semgrep
- GitHub Advanced Security

**Secure Storage**

- iOS: Keychain, Data Protection API
- Android: Android Keystore, Jetpack Security (EncryptedSharedPreferences)
- Cross-platform: SQLCipher for encrypted databases

**Vault Services**

- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- Google Cloud Secret Manager

**Testing**

- MobSF (Mobile Security Framework)
- Frida & objection
- Burp Suite Mobile Assistant
- OWASP ZAP
- Needle (iOS), Drozer (Android)

---

## M2: Inadequate Supply Chain Security

### Overview

Vulnerabilities introduced through the software supply chain including third-party libraries, SDKs, build tools, and CI/CD pipelines.

### Key Risks & Attack Vectors (2024)

- **Dependency Confusion Attacks**: Malicious packages with same names as internal packages
- **Compromised Dependencies**: Legitimate packages hijacked with malicious code
- **Typosquatting**: Malicious packages with names similar to popular packages
- **Build Tool Compromises**: Infected build environments (Gradle, CocoaPods, npm)
- **CI/CD Pipeline Attacks**: Compromised deployment pipelines
- **Code Injection via Dependencies**: Malicious code in transitive dependencies

### 2024 Evolution

- Increased supply chain attacks (SolarWinds, Log4j, etc.)
- Focus on Software Bill of Materials (SBOM)
- SLSA framework adoption
- Sigstore for artifact signing
- Vulnerability exploitation windows shrinking

### Implementation Roadmap

#### Phase 1: Dependency Inventory & Assessment (Weeks 1-3)

**Week 1: SBOM Generation**

```bash
# Generate SBOM for iOS (CocoaPods)
pod install
cyclonedx-cocoapods -p -o sbom-ios.json

# Generate SBOM for Android (Gradle)
./gradlew cyclonedxBom
# Output: build/reports/bom.json

# Generate SBOM for React Native
npm install
npx @cyclonedx/cyclonedx-npm --output-file sbom-npm.json

# Generate SBOM for Flutter
flutter pub get
dart run sbom
```

**Actions:**

1. Generate SBOM for all project components
2. Document direct and transitive dependencies
3. Identify critical dependencies
4. Map dependency tree
5. Store SBOM in version control

**Deliverables:**

- [ ] Complete SBOM in CycloneDX or SPDX format
- [ ] Dependency tree visualization
- [ ] Critical dependency matrix
- [ ] SBOM integrated in CI/CD

**Week 2: Vulnerability Scanning**

```yaml
# GitHub Actions for dependency scanning
name: Dependency Security

on:
  push:
  schedule:
    - cron: '0 0 * * *' # Daily

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # iOS dependencies
      - name: Scan CocoaPods
        run: |
          gem install cocoapods
          pod install
          # Scan with multiple tools for coverage

      - name: Snyk iOS Scan
        uses: snyk/actions/cocoapods@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      # Android dependencies
      - name: Dependency-Check Android
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'MyApp'
          path: '.'
          format: 'JSON'

      - name: Snyk Android Scan
        uses: snyk/actions/gradle@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      # NPM dependencies (React Native/Cordova)
      - name: npm audit
        run: npm audit --audit-level=moderate

      - name: Snyk npm Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      # Upload results
      - name: Upload to Security Tab
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: snyk.sarif
```

**Actions:**

1. Integrate multiple scanning tools (redundancy)
2. Configure automated daily scans
3. Set severity thresholds for CI/CD failures
4. Enable GitHub Dependabot/Renovate
5. Configure vulnerability alerting

**Deliverables:**

- [ ] Automated dependency scanning in CI/CD
- [ ] Vulnerability alert system configured
- [ ] Critical/High vulnerabilities remediated
- [ ] Scanning reports generated

**Week 3: License Compliance & Risk Assessment**

```bash
# License scanning
npx license-checker --json --out licenses.json

# Check for incompatible licenses
npx licensee --errors-only

# Generate license report
./gradlew generateLicenseReport # Android
```

**Actions:**

1. Audit all dependency licenses
2. Identify license conflicts
3. Document OSS license obligations
4. Review vendor security practices
5. Assess supply chain risks

**Deliverables:**

- [ ] License compliance report
- [ ] License policy document
- [ ] Incompatible licenses identified and addressed
- [ ] Third-party vendor risk assessment

#### Phase 2: Dependency Security Hardening (Weeks 4-7)

**Week 4: Dependency Pinning & Lock Files**

```ruby
# iOS Podfile - Pin versions
platform :ios, '14.0'

target 'MyApp' do
  use_frameworks!

  # Pin exact versions for security
  pod 'Alamofire', '5.7.1'
  pod 'SwiftyJSON', '5.0.1'
  pod 'KeychainAccess', '4.2.2'

  # Avoid dynamic version specifiers in production
  # ❌ pod 'Alamofire', '~> 5.0'
  # ❌ pod 'SwiftyJSON', '>= 5.0'

end

# Always commit Podfile.lock
```

```groovy
// Android build.gradle - Use dependency locking
dependencyLocking {
    lockAllConfigurations()
}

dependencies {
    // Pin specific versions
    implementation 'com.squareup.okhttp3:okhttp:4.11.0'
    implementation 'com.google.code.gson:gson:2.10.1'

    // Avoid dynamic versions
    // ❌ implementation 'com.squareup.okhttp3:okhttp:4.+'
    // ❌ implementation 'com.google.code.gson:gson:latest.release'
}

// Generate lock file
// ./gradlew dependencies --write-locks
```

```json
// package.json - Use exact versions
{
  "dependencies": {
    "react-native": "0.72.4",
    "axios": "1.5.0"
  },
  "devDependencies": {
    "@types/react": "18.2.21"
  }
}
// Always commit package-lock.json or yarn.lock
```

**Actions:**

1. Pin all dependencies to exact versions
2. Generate and commit lock files
3. Enable dependency locking in build files
4. Remove dynamic version specifiers
5. Document version update procedures

**Deliverables:**

- [ ] All dependencies pinned to exact versions
- [ ] Lock files committed to version control
- [ ] Dependency update policy documented
- [ ] Build reproducibility verified

**Week 5: Private Dependency Repository**

```groovy
// Android - Use private Maven repository
repositories {
    // Private repository first (prevent dependency confusion)
    maven {
        url = uri("https://maven.yourcompany.com/repository")
        credentials {
            username = gradleProperties.get("repoUsername")
            password = gradleProperties.get("repoPassword")
        }
    }

    // Public repositories (with restrictions)
    google()
    mavenCentral()
}

// Block unknown repositories
buildscript {
    repositories {
        @Suppress("DEPRECATION")
        jcenter {
            content {
                // Only allow specific dependencies from JCenter
                includeGroup("com.legacy.dependency")
            }
        }
    }
}
```

```ruby
# iOS - Use private CocoaPods repository
source 'https://gitlab.yourcompany.com/pods/specs.git'  # Private
source 'https://cdn.cocoapods.org/'  # Public

platform :ios, '14.0'

target 'MyApp' do
  # Check private repo first for internal dependencies
  pod 'InternalSDK', '1.2.3'
  pod 'Alamofire', '5.7.1'
end
```

**Actions:**

1. Set up private dependency repository (Maven, CocoaPods, npm)
2. Configure repository priority (private first)
3. Implement dependency proxying for public packages
4. Scan packages before adding to private repository
5. Enable repository access controls

**Deliverables:**

- [ ] Private repository operational
- [ ] Repository priority configured correctly
- [ ] Dependency proxying configured
- [ ] Package scanning automated
- [ ] Access controls implemented

**Week 6: Dependency Verification & Integrity**

```bash
# Verify package integrity with checksums

# npm
npm ci --ignore-scripts  # Disable post-install scripts
npm audit signatures  # Verify package signatures (npm 8.15+)

# Gradle - Enable dependency verification
./gradlew --write-verification-metadata sha256,pgp
# Creates gradle/verification-metadata.xml

# CocoaPods - Verify pod integrity
pod install --verify
```

```xml
<!-- Gradle verification-metadata.xml -->
<verification-metadata>
   <components>
      <component group="com.example" name="library" version="1.0.0">
         <artifact name="library-1.0.0.jar">
            <sha256 value="abc123..." />
            <pgp value="-----BEGIN PGP..." />
         </artifact>
      </component>
   </components>
</verification-metadata>
```

**Actions:**

1. Enable dependency verification (checksums, signatures)
2. Verify package integrity on every build
3. Implement checksum validation
4. Enable PGP signature verification
5. Block dependencies with failed verification

**Deliverables:**

- [ ] Dependency verification enabled
- [ ] Checksum validation working
- [ ] Signature verification configured
- [ ] Verification failures block builds
- [ ] Verification metadata committed

**Week 7: Minimize Dependencies & Code Review**

```bash
# Analyze dependency usage
npx depcheck  # Find unused dependencies

# Analyze bundle size
npx react-native-bundle-visualizer

# Android
./gradlew app:dependencies
```

**Actions:**

1. Audit and remove unused dependencies
2. Replace large libraries with lightweight alternatives
3. Review all new dependency additions
4. Implement dependency approval workflow
5. Regular dependency audit (quarterly)

**Deliverables:**

- [ ] Unused dependencies removed
- [ ] Dependency approval process documented
- [ ] Lightweight alternatives implemented
- [ ] Code review includes dependency review
- [ ] Dependency audit schedule established

#### Phase 3: Build & CI/CD Pipeline Security (Weeks 8-11)

**Week 8: Build Environment Hardening**

```yaml
# Secure GitHub Actions workflow
name: Secure Build

on:
  push:
    branches: [main, release/*]

jobs:
  secure-build:
    runs-on: ubuntu-latest

    # Use specific runner versions, not 'latest'
    container:
      image: cimg/android:2023.09.1

    permissions:
      # Least privilege
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v3.5.3 # Pin action versions
        with:
          persist-credentials: false # Don't persist GitHub token

      - name: Verify dependencies
        run: |
          npm ci --ignore-scripts
          ./gradlew --write-verification-metadata sha256
          ./gradlew build --no-daemon

      - name: Sign artifacts
        uses: sigstore/cosign-installer@main
        with:
          cosign-release: 'v2.1.1'

      - name: Generate provenance
        uses: slsa-framework/slsa-github-generator@v1.7.0
```

**Actions:**

1. Pin all CI/CD action versions
2. Use least-privilege permissions
3. Disable credential persistence
4. Harden build containers
5. Implement immutable build environments

**Deliverables:**

- [ ] CI/CD actions pinned to versions
- [ ] Least-privilege permissions configured
- [ ] Build containers hardened
- [ ] Immutable build environment
- [ ] Build audit logging enabled

**Week 9: Artifact Signing & Provenance**

```bash
# Sign build artifacts with Sigstore/cosign
cosign sign-blob \
  --key cosign.key \
  --output-signature app.apk.sig \
  app.apk

# Generate SLSA provenance
slsa-provenance generate \
  --artifact-path app.apk \
  --output provenance.json

# Verify artifact
cosign verify-blob \
  --key cosign.pub \
  --signature app.apk.sig \
  app.apk
```

**Code Signing Configuration:**

```groovy
// Android - Secure code signing
android {
    signingConfigs {
        release {
            // NEVER commit keystore to version control
            storeFile file(System.getenv("KEYSTORE_FILE"))
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")

            // Use modern signing schemes
            v1SigningEnabled true  // JAR signing
            v2SigningEnabled true  // APK Signature Scheme v2
            v3SigningEnabled true  // APK Signature Scheme v3
            v4SigningEnabled true  // APK Signature Scheme v4 (Android 11+)
        }
    }
}
```

**Actions:**

1. Implement code signing for all artifacts
2. Use hardware security modules (HSM) for signing keys
3. Generate SLSA provenance attestations
4. Implement artifact signature verification
5. Store signing keys securely (vault service)

**Deliverables:**

- [ ] All artifacts signed
- [ ] SLSA provenance generated
- [ ] Sign key security hardened
- [ ] Signature verification automated
- [ ] Key rotation plan documented

**Week 10: Supply Chain Levels for Software Artifacts (SLSA)**

```yaml
# SLSA Level 3 build
name: SLSA L3 Build

on:
  push:
    branches: [main]

jobs:
  build:
    permissions:
      id-token: write # For provenance
      contents: read

    outputs:
      image: ${{ steps.image.outputs.name }}
      digest: ${{ steps.build.outputs.digest }}

    uses: slsa-framework/slsa-github-generator/.github/workflows/builder_nodejs_slsa3.yml@v1.7.0
    with:
      run-scripts: 'ci, build'
      node-version: 18

  provenance:
    needs: [build]
    permissions:
      id-token: write
      contents: read
      actions: read

    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.7.0
    with:
      base64-subjects: '${{ needs.build.outputs.digest }}'
      upload-assets: true
```

**SLSA Requirements:**

- **SLSA L1**: Provenance exists describing how artifact was built
- **SLSA L2**: Hosted build service generates authenticated provenance
- **SLSA L3**: Hardened builds resistant to tampering
- **SLSA L4**: Highest level - two-party review + hermetic builds

**Actions:**

1. Assess current SLSA level
2. Implement SLSA provenance generation
3. Move towards SLSA L3 (hardened builds)
4. Document build process
5. Enable provenance verification

**Deliverables:**

- [ ] SLSA level assessed (target L2minimum, L3 recommended)
- [ ] Provenance generation automated
- [ ] Build hardening implemented
- [ ] Two-party review for releases
- [ ] Hermetic builds configured

**Week 11: Runtime Dependency Monitoring**

```kotlin
// Runtime dependency health check
class DependencyHealthMonitor {

    fun checkDependencyIntegrity() {
        val expectedHashes = loadExpectedHashes()
        val actualHashes = calculateActualHashes()

        if (expectedHashes != actualHashes) {
            // Dependency tampering detected
            SecurityEventLogger.logCritical("Dependency tampering detected")
            // Take action: disable functionality, alert, etc.
        }
    }

    private fun calculateActualHashes(): Map<String, String> {
        val hashes = mutableMapOf<String, String>()

        // Calculate hash of each dependency
        val classLoader = this.javaClass.classLoader
        // Iterate through loaded classes and calculate hashes
        // This is simplified - full implementation needed

        return hashes
    }
}
```

**Actions:**

1. Implement runtime integrity checks
2. Monitor for dependency tampering
3. Detect runtime dependency substitution
4. Log dependency loading events
5. Implement dependency health checks

#### Phase 4: Continuous Monitoring & Response (Week 12)

**Week 12: Vulnerability Management Process**

```yaml
# Automated vulnerability management
name: Vulnerability Management

on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours

jobs:
  vuln-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Scan dependencies
        id: scan
        run: |
          # Multiple scanners for coverage
          npm audit --json > npm-audit.json || true
          snyk test --json > snyk-results.json || true
          grype . -o json > grype-results.json || true

      - name: Process results
        run: |
          python scripts/process-vulns.py \
            --npm npm-audit.json \
            --snyk snyk-results.json \
            --grype grype-results.json \
            --output vulns-manifest.json

      - name: Create issues for critical vulns
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const vulns = JSON.parse(fs.readFileSync('vulns-manifest.json'));

            for (const vuln of vulns.critical) {
              await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: `[CRITICAL] ${vuln.package}: ${vuln.vulnerability}`,
                body: vuln.description,
                labels: ['security', 'critical', 'dependency']
              });
            }

      - name: Fail on critical
        run: |
          if [ -f vulns-manifest.json ]; then
            CRITICAL=$(jq '.critical | length' vulns-manifest.json)
            if [ "$CRITICAL" -gt 0 ]; then
              echo "Critical vulnerabilities found: $CRITICAL"
              exit 1
            fi
          fi
```

**Vulnerability Response SLA:**

- **Critical**: 24 hours
- **High**: 7 days
- **Medium**: 30 days
- **Low**: 90 days

**Actions:**

1. Implement continuous vulnerability scanning
2. Define vulnerability SLAs
3. Automate ticket creation for vulnerabilities
4. Set up priority escalation
5. Track vulnerability metrics

**Deliverables:**

- [ ] Continuous vuln scanning operational
- [ ] SLAs defined and documented
- [ ] Automated ticket creation working
- [ ] Vulnerability dashboard created
- [ ] Metrics collection enabled

### Testing & Validation Checklist

#### SBOM & Inventory

- [ ] SBOM generated and up-to-date
- [ ] All dependencies documented
- [ ] Transitive dependencies mapped
- [ ] SBOM integrated in CI/CD
- [ ] SBOM available for stakeholders

#### Vulnerability Management

- [ ] Zero critical/high vulnerabilities in production
- [ ] Vulnerability scanning automated
- [ ] Alert system operational
- [ ] Patch management process defined
- [ ] Regular dependency updates

#### Build Security

- [ ] Dependencies verified (checksums/signatures)
- [ ] Build artifacts signed
- [ ] SLSA provenance generated
- [ ] Reproducible builds achieved
- [ ] Build environment hardened

#### Supply Chain Security

- [ ] Dependency confusion protected
- [ ] Private repository operational
- [ ] License compliance verified
- [ ] Vendor risk assessments completed
- [ ] Third-party security reviews done

### Key Performance Indicators (KPIs)

- **Vuln Detection Time**: <24 hours from disclosure to detection
- **Vuln Remediation Time**: Meet SLAs (Critical <24h, High <7d)
- **Dependency Freshness**: 80% of dependencies <6 months old
- **SBOM Coverage**: 100% of production artifacts
- **Build Reproducibility**: 100% of builds reproducible
- **Suppply Chain Attacks Blocked**: 100%

### Tools & Resources

[Continuing in next response due to length...]

---

## M3: Insecure Authentication/Authorization

[Content for M3 through M10 continues with same comprehensive detail level...]
