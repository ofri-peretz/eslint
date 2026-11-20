/**
 * @provenBy {"file":"skills/security-linting/references/stack-map.json","find":"\"no-ldap-injection\"","replace":"\"no-ldap-injectionx\""}
 */

/**
 * Lock: the security-linting skill, its plugin manifests and context7.json say
 * only what the packages actually export.
 *
 * The skill tells an assistant which package and which preset key to put in a
 * user's ESLint config. A renamed preset, a dropped rule or a typo'd package
 * name would make the assistant write a config that throws. Nothing else would
 * notice, because the skill is Markdown and JSON. Every name in
 * skills/security-linting/references/stack-map.json is checked against the
 * plugin's own `configs` and `rules` (read from source, no build needed).
 *
 * The dynamic half (the rendered config loads on ESLint 9 and 10 and flags the
 * planted issues) is evals/security-linting-skill/run.mjs, which needs built
 * plugins and runs in .github/workflows/security-linting-skill.yml.
 */
/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const json = (p: string) => JSON.parse(read(p));
const MAP = json('skills/security-linting/references/stack-map.json');
const loaders = import.meta.glob('../../packages/eslint-plugin-*/src/index.ts');

const sev = (v: unknown) => (Array.isArray(v) ? v[0] : v);
const on = (v: unknown) => !['off', 0].includes(sev(v) as string | number);

describe('stack map matches the plugins', () => {
  it.each(MAP.plugins.map((p: { package: string }) => p.package))(
    '%s',
    async (pkgName: string) => {
      const row = MAP.plugins.find(
        (p: { package: string }) => p.package === pkgName,
      );
      expect(existsSync(join(ROOT, 'packages', pkgName, 'package.json'))).toBe(
        true,
      );
      const mod = (await loaders[
        `../../packages/${pkgName}/src/index.ts`
      ]!()) as {
        configs: Record<
          string,
          { plugins?: object; rules?: Record<string, unknown> }
        >;
        rules: Record<string, unknown>;
      };
      const preset = mod.configs[row.preset];
      expect(preset, `${pkgName} has no configs.${row.preset}`).toBeDefined();
      // A single flat config object, so it goes into the array as one element.
      expect(Array.isArray(preset)).toBe(false);
      expect(Object.keys(preset.plugins ?? {}).length).toBeGreaterThan(0);

      const inPreset = Object.entries(preset.rules ?? {})
        .filter(([, v]) => on(v))
        .map(([k]) => k.slice(k.indexOf('/') + 1));
      for (const ex of row.examples) {
        expect(Object.keys(mod.rules), `${pkgName}: no rule ${ex}`).toContain(
          ex,
        );
        expect(inPreset, `${pkgName}: ${ex} is not in ${row.preset}`).toContain(
          ex,
        );
      }
      if (row.recommendedIsExactly)
        expect([...inPreset].sort()).toEqual(
          [...row.recommendedIsExactly].sort(),
        );
      expect(row.why.length).toBeGreaterThan(10);
      expect(row.limits?.length ?? row.always).toBeTruthy();
      if (!row.always)
        expect(
          (row.dependencies?.length ?? 0) +
            (row.dependencyPrefixes?.length ?? 0) +
            (row.fields?.length ?? 0),
        ).toBeGreaterThan(0);
    },
  );

  it('the baseline plugin is the real eslint-plugin-security with a flat recommended', async () => {
    const mod = await import('eslint-plugin-security');
    const m = mod as {
      default?: { configs: Record<string, unknown> };
      configs?: Record<string, unknown>;
    };
    const configs = (m.configs ?? m.default?.configs) as Record<
      string,
      unknown
    >;
    expect(MAP.baseline.package).toBe('eslint-plugin-security');
    expect(configs[MAP.baseline.preset]).toBeDefined();
    expect(Array.isArray(configs[MAP.baseline.preset])).toBe(false);
  });

  it('every security plugin in packages/ is either in the map or deliberately not', () => {
    const inMap = new Set(
      MAP.plugins.map((p: { package: string }) => p.package),
    );
    const notSecurity = new Set([
      'eslint-plugin-import-next',
      'eslint-plugin-react-a11y',
      'eslint-plugin-react-features',
      'eslint-plugin-cli-floor',
      'eslint-plugin-conventions',
      'eslint-plugin-maintainability',
      'eslint-plugin-modernization',
      'eslint-plugin-modularity',
      'eslint-plugin-operability',
      'eslint-plugin-reliability',
      'eslint-plugin-eslint-devkit',
    ]);
    const securityDirs = Object.keys(loaders)
      .map((k) => /packages\/(eslint-plugin-[^/]+)\//.exec(k)![1])
      .filter((d) => /-security$|secure-coding$/.test(d));
    for (const d of securityDirs)
      expect(
        inMap.has(d) || notSecurity.has(d),
        `${d} is a security plugin missing from stack-map.json`,
      ).toBe(true);
  });
});

describe('SKILL.md', () => {
  const skill = read('skills/security-linting/SKILL.md');
  const front = /^---\n([\s\S]*?)\n---\n/.exec(skill)![1];

  it('follows the agent-skill frontmatter contract', () => {
    expect(/^name: security-linting$/m.test(front)).toBe(true);
    const description = /^description: (.+)$/m.exec(front)![1];
    expect(description.length).toBeLessThanOrEqual(1024);
    for (const w of [
      'security linting',
      'eslint-plugin-security',
      'flat config',
    ])
      expect(description.toLowerCase()).toContain(w);
    expect(skill.split('\n').length).toBeLessThan(500);
  });

  it('names every package in the map (by its short name)', () => {
    for (const p of MAP.plugins) {
      const short = p.package.replace('eslint-plugin-', '');
      expect(skill, `${short} missing from SKILL.md`).toContain(short);
    }
  });

  it('keeps the honesty rules and the limits', () => {
    expect(skill).toMatch(/Never remove or rewrite a plugin/);
    expect(skill).toMatch(/What this does not cover/);
    expect(skill).toMatch(/does not flag React's\s+`dangerouslySetInnerHTML`/);
    expect(skill).not.toMatch(/replaces? eslint-plugin-security/i);
  });
});

describe('render-config.mjs', () => {
  const render = (dir: string) =>
    JSON.parse(
      execFileSync(
        'node',
        [
          join(ROOT, 'skills/security-linting/scripts/render-config.mjs'),
          '--dir',
          join(ROOT, 'evals/security-linting-skill/apps', dir),
          '--json',
        ],
        { encoding: 'utf8' },
      ),
    );

  it.each([
    [
      'express-pg',
      [
        'eslint-plugin-secure-coding',
        'eslint-plugin-node-security',
        'eslint-plugin-express-security',
        'eslint-plugin-jwt-security',
        'eslint-plugin-postgresql-security',
      ],
    ],
    [
      'nest',
      [
        'eslint-plugin-secure-coding',
        'eslint-plugin-node-security',
        'eslint-plugin-nestjs-security',
      ],
    ],
    [
      'react',
      [
        'eslint-plugin-security',
        'eslint-plugin-secure-coding',
        'eslint-plugin-browser-security',
      ],
    ],
  ])(
    '%s gets exactly the matching plugins and keeps the baseline',
    (app, expected) => {
      const plan = render(app);
      expect(plan.additions.map((a: { package: string }) => a.package)).toEqual(
        expected,
      );
      // Existing baseline is left where it is, never duplicated.
      expect(plan.baselineAlreadyWired).toBe(app !== 'react');
      expect(plan.file.contents).not.toMatch(/\.\.\.\w+\.configs/);
      expect(plan.file.contents).not.toMatch(/from 'eslint(\/config)?'/);
      const dir = mkdtempSync(join(tmpdir(), 'skill-render-'));
      const file = join(dir, 'x.mjs');
      writeFileSync(file, plan.file.contents);
      execFileSync('node', ['--check', file]);
    },
  );

  it('wires the existing config with a patch that cannot collide with an existing `security` import', () => {
    const plan = render('nest');
    expect(plan.patch.import).toBe(
      "import interlaceSecurity from './eslint.security.config.mjs';",
    );
    expect(plan.patch.spread).toBe('...interlaceSecurity,');
  });

  it('adds a TypeScript parser only when the config has none', () => {
    expect(render('nest').file.contents).not.toContain('typescript-eslint');
    expect(render('react').file.contents).toContain('tseslint.parser');
  });
});

describe('distribution manifests', () => {
  it('marketplace and plugin are both named interlace and expose the skill', () => {
    const mp = json('.claude-plugin/marketplace.json');
    const pl = json('.claude-plugin/plugin.json');
    expect(mp.name).toBe('interlace');
    expect(mp.owner.name).toBeTruthy();
    expect(mp.plugins).toHaveLength(1);
    expect(mp.plugins[0].name).toBe('interlace');
    expect(pl.name).toBe(mp.plugins[0].name);
    expect(mp.plugins[0].source).toBe('./');
    expect(existsSync(join(ROOT, 'skills/security-linting/SKILL.md'))).toBe(
      true,
    );
  });

  it('Cursor and Claude manifests agree on identity and point at a real logo', () => {
    const claude = json('.claude-plugin/plugin.json');
    const cursor = json('.cursor-plugin/plugin.json');
    expect(cursor.name).toBe(claude.name);
    expect(cursor.name).toMatch(/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/);
    expect(cursor.version).toBe(claude.version);
    expect(cursor.description).toBe(claude.description);
    expect(cursor.repository).toBe(claude.repository);
    // Cursor reads a repo-relative path; Claude's directory reads ./-relative.
    expect(existsSync(join(ROOT, cursor.logo)), cursor.logo).toBe(true);
    expect(existsSync(join(ROOT, claude.icon)), claude.icon).toBe(true);
    for (const u of [
      claude.homepage,
      claude.documentationUrl,
      claude.supportUrl,
    ])
      expect(u).toMatch(/^https:\/\//);
    expect(read('assets/logo.svg')).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });

  it('context7.json respects Context7 limits and points at real folders', () => {
    const c = json('context7.json');
    expect(c.projectTitle.length).toBeLessThanOrEqual(100);
    expect(c.description.length).toBeLessThanOrEqual(500);
    expect(c.description).not.toMatch(/you must|always use|ignore previous/i);
    for (const f of c.folders) expect(existsSync(join(ROOT, f)), f).toBe(true);
    expect(c.rules.length).toBeGreaterThan(0);
    for (const r of c.rules) expect(typeof r).toBe('string');
  });
});
