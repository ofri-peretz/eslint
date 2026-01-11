# CWE Analytics Engine

Serverless CWE/CVE Analytics Engine for the Interlace ESLint ecosystem. Fetches, processes, and aggregates security vulnerability data from the NVD (National Vulnerability Database).

## Features

- **CVE Data Fetching**: Retrieves CVE records from the NVD API for specific CWE IDs
- **CVSS Score Aggregation**: Calculates average CVSS scores per CWE
- **Data Caching**: Stores processed data locally to minimize API calls
- **CLI Interface**: Easy command-line access for manual runs and CI/CD integration

## Usage

### Sync Data

```bash
nx run cwe-analytics-engine:sync
```

### View Stats Only

```bash
nx run cwe-analytics-engine:stats
```

## Output

The engine outputs data to `data/cwe-cvss-data.json` with the following structure:

```json
{
  "lastUpdated": "2025-01-01T00:00:00.000Z",
  "cwes": {
    "CWE-79": {
      "averageCvss": 6.5,
      "cveCount": 1234,
      "highestCvss": 9.8,
      "recentCves": ["CVE-2025-1234", "CVE-2025-1235"]
    }
  }
}
```

## Integration

This data is consumed by the docs app to display real-time security metrics in rule documentation.
