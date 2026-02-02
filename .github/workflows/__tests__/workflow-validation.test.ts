/**
 * GitHub Actions Workflow Validation Tests
 *
 * These tests ensure that all GitHub Actions workflows follow best practices
 * and are compatible with the monorepo's package manager (pnpm).
 *
 * Prevents regressions where:
 * - Workflows use npm instead of pnpm
 * - Explicit pnpm versions conflict with packageManager field
 * - Node.js cache is misconfigured
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const WORKFLOWS_DIR = path.join(__dirname, '../../../.github/workflows');

interface WorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
}

interface WorkflowJob {
  steps?: WorkflowStep[];
}

interface Workflow {
  name?: string;
  jobs?: Record<string, WorkflowJob>;
}

describe('GitHub Actions Workflow Validation', () => {
  let workflowFiles: string[] = [];
  let workflows: Map<string, Workflow> = new Map();

  beforeAll(() => {
    if (fs.existsSync(WORKFLOWS_DIR)) {
      workflowFiles = fs.readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
      workflowFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf-8');
        try {
          workflows.set(file, yaml.parse(content) as Workflow);
        } catch {
          // Invalid YAML will be caught in separate test
        }
      });
    }
  });

  it('should have workflow files', () => {
    expect(workflowFiles.length).toBeGreaterThan(0);
  });

  it('should use pnpm instead of npm for caching', () => {
    const errors: string[] = [];

    workflows.forEach((workflow, filename) => {
      Object.entries(workflow.jobs || {}).forEach(([jobName, job]) => {
        (job.steps || []).forEach((step, idx) => {
          if (step.uses?.includes('actions/setup-node')) {
            const cacheValue = step.with?.cache;
            if (cacheValue === 'npm') {
              errors.push(
                `${filename} → job "${jobName}" → step ${idx + 1} (${step.name || 'unnamed'}): ` +
                  `uses cache: "npm" but this monorepo uses pnpm. Change to cache: "pnpm"`
              );
            }
          }
        });
      });
    });

    expect(errors).toEqual([]);
  });

  it('should not use npm ci or npm install (except in SDK compatibility workflows)', () => {
    const errors: string[] = [];

    // SDK workflows legitimately use npm for testing against external SDKs
    // release.yml updates npm itself globally
    const excludedWorkflows = [
      'sdk-express.yml',
      'sdk-jwt.yml',
      'sdk-lambda.yml',
      'sdk-mongodb.yml',
      'sdk-nestjs.yml',
      'sdk-pg.yml',
      'sdk-vercel-ai.yml',
      'release.yml',
    ];

    workflows.forEach((workflow, filename) => {
      if (excludedWorkflows.includes(filename)) return;

      Object.entries(workflow.jobs || {}).forEach(([jobName, job]) => {
        (job.steps || []).forEach((step, idx) => {
          const run = step.run || '';
          // Match "npm ci" or "npm install" but NOT "pnpm install"
          const usesNpmCi = /(?<![p])npm\s+ci\b/.test(run);
          const usesNpmInstall = /(?<![p])npm\s+install\b/.test(run);
          if (usesNpmCi || usesNpmInstall) {
            errors.push(
              `${filename} → job "${jobName}" → step ${idx + 1} (${step.name || 'unnamed'}): ` +
                `uses "npm ci" or "npm install". Use "pnpm install --frozen-lockfile" instead`
            );
          }
        });
      });
    });

    expect(errors).toEqual([]);
  });

  it('should not specify hardcoded pnpm version in action-setup when packageManager is in package.json', () => {
    const errors: string[] = [];

    // Check if package.json has packageManager field
    const pkgJsonPath = path.join(__dirname, '../../../package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      if (pkgJson.packageManager) {
        workflows.forEach((workflow, filename) => {
          Object.entries(workflow.jobs || {}).forEach(([jobName, job]) => {
            (job.steps || []).forEach((step, idx) => {
              if (step.uses?.includes('pnpm/action-setup')) {
                const version = step.with?.version;
                // Allow env var references like ${{ env.PNPM_VERSION }}
                // Only flag hardcoded version numbers
                if (version && typeof version === 'string' && !version.includes('${{')) {
                  errors.push(
                    `${filename} → job "${jobName}" → step ${idx + 1}: ` +
                      `specifies hardcoded pnpm version "${version}" but package.json has "${pkgJson.packageManager}". ` +
                      `Remove the version to let pnpm/action-setup read from package.json`
                  );
                }
              }
            });
          });
        });
      }
    }

    expect(errors).toEqual([]);
  });

  it('should have pnpm/action-setup before actions/setup-node with pnpm cache', () => {
    const errors: string[] = [];

    workflows.forEach((workflow, filename) => {
      Object.entries(workflow.jobs || {}).forEach(([jobName, job]) => {
        const steps = job.steps || [];
        let pnpmSetupIndex = -1;
        let nodeSetupWithPnpmCacheIndex = -1;

        steps.forEach((step, idx) => {
          if (step.uses?.includes('pnpm/action-setup')) {
            pnpmSetupIndex = idx;
          }
          if (step.uses?.includes('actions/setup-node') && step.with?.cache === 'pnpm') {
            nodeSetupWithPnpmCacheIndex = idx;
          }
        });

        if (nodeSetupWithPnpmCacheIndex !== -1 && pnpmSetupIndex === -1) {
          errors.push(
            `${filename} → job "${jobName}": uses setup-node with cache: "pnpm" but pnpm/action-setup is missing`
          );
        }

        if (nodeSetupWithPnpmCacheIndex !== -1 && pnpmSetupIndex > nodeSetupWithPnpmCacheIndex) {
          errors.push(
            `${filename} → job "${jobName}": pnpm/action-setup must come BEFORE setup-node with pnpm cache`
          );
        }
      });
    });

    expect(errors).toEqual([]);
  });

  it('should use valid YAML syntax', () => {
    const errors: string[] = [];

    workflowFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf-8');
      try {
        yaml.parse(content);
      } catch (e) {
        errors.push(`${file}: Invalid YAML - ${(e as Error).message}`);
      }
    });

    expect(errors).toEqual([]);
  });
});
