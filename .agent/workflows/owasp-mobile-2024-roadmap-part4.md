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
