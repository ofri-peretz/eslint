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
