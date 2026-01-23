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

