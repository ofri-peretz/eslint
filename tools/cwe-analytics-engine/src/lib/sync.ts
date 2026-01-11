import axios from 'axios';
import fs from 'fs-extra';
import path from 'node:path';
import { format } from 'date-fns';

// --- Configuration ---
const DATA_DIR = path.join(__dirname, '../../data');
const RAW_DATA_DIR = path.join(DATA_DIR, 'raw');
const STATS_FILE = path.join(__dirname, '../../../../apps/docs/src/data/cwe-stats.json');
const METADATA_FILE = path.join(DATA_DIR, 'metadata.json');
const NVD_API_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const RESULTS_PER_PAGE = 2000;

// Ensure directories exist
fs.ensureDirSync(RAW_DATA_DIR);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, params: Record<string, unknown>, apiKey?: string, retries = 5): Promise<unknown> {
  const delay = apiKey ? 600 : 6000; // 6s without key, 0.6s with key
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Fetching batch... (startIndex: ${params.startIndex})`);
      const response = await axios.get(url, {
        params,
        headers: apiKey ? { apiKey } : {},
        timeout: 30000,
      });
      
      await sleep(delay); // Rate limit adherence
      return response.data;
    } catch (error: unknown) {
      if (i === retries - 1) throw error;
      const axiosError = error as { response?: { status?: number } };
      const status = axiosError.response?.status;
      if (status && [429, 500, 502, 503, 504].includes(status)) {
        const backoff = Math.pow(2, i) * 1000;
        console.warn(`Retry ${i + 1}/${retries} after status ${status}. Waiting ${backoff}ms...`);
        await sleep(backoff);
      } else {
        throw error;
      }
    }
  }
}

interface Vulnerability {
  cve?: {
    id?: string;
    published?: string;
    weaknesses?: Array<{
      description?: Array<{
        lang?: string;
        value?: string;
      }>;
    }>;
    metrics?: {
      cvssMetricV31?: Array<{ cvssData?: { baseScore?: number } }>;
      cvssMetricV30?: Array<{ cvssData?: { baseScore?: number } }>;
      cvssMetricV2?: Array<{ cvssData?: { baseScore?: number } }>;
    };
  };
}

async function upsertCve(vulnerability: Vulnerability) {
  const cve = vulnerability.cve || {};
  const cveId = cve.id;
  if (!cveId) return;

  const publishedDate = cve.published || '';
  const year = publishedDate ? publishedDate.split('-')[0] : 'unknown';
  const yearFile = path.join(RAW_DATA_DIR, `${year}.json`);

  let data: Record<string, Vulnerability> = {};
  if (await fs.pathExists(yearFile)) {
    data = await fs.readJson(yearFile);
  }

  data[cveId] = vulnerability;
  await fs.writeJson(yearFile, data, { spaces: 2 });
}

async function calculateStats() {
  console.log('Calculating aggregate stats...');
  const cweMap: Record<string, { scores: number[]; cveIds: string[] }> = {};

  const files = await fs.readdir(RAW_DATA_DIR);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;

    const cves = await fs.readJson(path.join(RAW_DATA_DIR, file));
    for (const [cveId, vuln] of Object.entries(cves) as [string, Vulnerability][]) {
      const cve = vuln.cve || {};
      
      // Extract CWEs
      const cwes: string[] = [];
      (cve.weaknesses || []).forEach((weak) => {
        (weak.description || []).forEach((desc) => {
          if (desc.lang === 'en' && desc.value?.startsWith('CWE-')) {
            cwes.push(desc.value);
          }
        });
      });

      // Extract CVSS
      const metrics = cve.metrics || {};
      let cvssScore: number | null = null;

      const v31 = metrics.cvssMetricV31 || [];
      const v30 = metrics.cvssMetricV30 || [];
      const v2 = metrics.cvssMetricV2 || [];

      if (v31.length) cvssScore = v31[0].cvssData?.baseScore ?? null;
      else if (v30.length) cvssScore = v30[0].cvssData?.baseScore ?? null;
      else if (v2.length) cvssScore = v2[0].cvssData?.baseScore ?? null;

      if (cvssScore !== null && cvssScore !== undefined) {
        cwes.forEach((cwe) => {
          if (!cweMap[cwe]) {
            cweMap[cwe] = { scores: [], cveIds: [] };
          }
          cweMap[cwe].scores.push(Number(cvssScore));
          if (cweMap[cwe].cveIds.length < 5) {
            cweMap[cwe].cveIds.push(cveId);
          }
        });
      }
    }
  }

  const finalStats: Record<string, { mean_cvss: number; max_cvss: number; cve_count: number; top_cves: string[] }> = {};
  for (const [cwe, data] of Object.entries(cweMap)) {
    const sum = data.scores.reduce((a, b) => a + b, 0);
    finalStats[cwe] = {
      mean_cvss: Number((sum / data.scores.length).toFixed(2)),
      max_cvss: Math.max(...data.scores),
      cve_count: data.scores.length,
      top_cves: data.cveIds,
    };
  }

  await fs.writeJson(STATS_FILE, finalStats, { spaces: 2 });
  console.log(`Stats saved to ${STATS_FILE}`);
}

interface NvdResponse {
  totalResults?: number;
  vulnerabilities?: Vulnerability[];
}

export async function sync() {
  const apiKey = process.env.NVD_API_KEY;
  let lastRun: string | null = null;

  if (await fs.pathExists(METADATA_FILE)) {
    const meta = await fs.readJson(METADATA_FILE);
    lastRun = meta.last_run_timestamp;
  }

  let startIndex = 0;
  let totalResults = 1;

  while (startIndex < totalResults) {
    const params: Record<string, unknown> = {
      resultsPerPage: RESULTS_PER_PAGE,
      startIndex,
    };

    if (lastRun) {
      params.lastModStartDate = lastRun;
      params.lastModEndDate = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.000");
    }

    try {
      const data = await fetchWithRetry(NVD_API_URL, params, apiKey) as NvdResponse;
      totalResults = data.totalResults || 0;
      const vulnerabilities = data.vulnerabilities || [];

      console.log(`Processing ${vulnerabilities.length} vulnerabilities...`);
      for (const vuln of vulnerabilities) {
        await upsertCve(vuln);
      }

      startIndex += RESULTS_PER_PAGE;
      if (vulnerabilities.length === 0) break;
    } catch (error) {
      console.error('Fatal error during sync:', error);
      break;
    }
  }

  await fs.writeJson(METADATA_FILE, {
    last_run_timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.000"),
    last_sync_count: startIndex,
  }, { spaces: 2 });

  await calculateStats();
}

export { calculateStats };
