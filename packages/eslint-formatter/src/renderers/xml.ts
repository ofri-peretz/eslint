/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * XML renderer — Anthropic-native structured format.
 *
 * Anthropic's [official prompt-engineering guidance](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)
 * explicitly recommends XML tags for structuring multi-component content
 * fed to Claude:
 *
 *   > XML tags help Claude parse complex prompts unambiguously,
 *   > especially when your prompt mixes instructions, context, examples,
 *   > and variable inputs.
 *
 * Use this mode when piping lint output back into a Claude conversation
 * — the model parses tag-delimited content with notably higher accuracy
 * than free prose. Pattern: nest tags when the content has a natural
 * hierarchy (here: a list of findings, each with sub-elements).
 *
 * Schema (mirrors the JSON schema's semantic content; tag-based instead
 * of brace-based):
 *
 *   <lint_report>
 *     <summary errors="N" warnings="N" files="N" fixable="N" rules="N" />
 *     <findings count="N">
 *       <finding rank="1">
 *         <rule>@interlace/pg/no-unsafe-query</rule>
 *         <severity>error</severity>
 *         <count>3</count>
 *         <fixable>false</fixable>
 *         <has_suggestions>false</has_suggestions>
 *         <cwe>CWE-89</cwe>
 *         <cvss>9.8</cvss>
 *         <message>SQL injection: query built via string concatenation</message>
 *         <description>Detect SQL injection via string concatenation</description>
 *         <docs_url>https://...</docs_url>
 *         <locations>
 *           <location file="src/db.ts" line="23" column="5" node_type="CallExpression" />
 *         </locations>
 *       </finding>
 *     </findings>
 *   </lint_report>
 *
 * Self-closing tags for leaf data (locations, summary) keep the byte
 * count tighter than fully-paired tags. Element values are XML-escaped
 * (`<`, `>`, `&`, `"`, `'`) so an ESLint message containing markup or
 * quotes can't break the parse.
 */

import type { GroupedRule, LintSummary } from '../types';

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, ch => XML_ESCAPES[ch]!);
}

function escapeAttr(s: string): string {
  return escapeXml(s);
}

/**
 * Renders grouped results as Anthropic-style XML.
 */
export function renderXML(
  grouped: GroupedRule[],
  summary: LintSummary,
): string {
  const lines: string[] = [];
  lines.push('<lint_report>');
  lines.push(
    `  <summary errors="${summary.errorCount}" warnings="${summary.warningCount}" ` +
    `files="${summary.filesWithIssues}" fixable="${summary.fixableCount}" ` +
    `rules="${summary.uniqueRules}" />`,
  );

  if (grouped.length === 0) {
    lines.push('  <findings count="0" />');
    lines.push('</lint_report>');
    return lines.join('\n') + '\n';
  }

  lines.push(`  <findings count="${grouped.length}">`);
  let rank = 1;
  for (const rule of grouped) {
    lines.push(`    <finding rank="${rank}">`);
    lines.push(`      <rule>${escapeXml(rule.ruleId)}</rule>`);
    lines.push(`      <severity>${rule.severity}</severity>`);
    lines.push(`      <count>${rule.count}</count>`);
    lines.push(`      <fixable>${rule.fixable}</fixable>`);
    lines.push(`      <has_suggestions>${rule.hasSuggestions}</has_suggestions>`);
    if (rule.cwe) lines.push(`      <cwe>${escapeXml(rule.cwe)}</cwe>`);
    if (typeof rule.cvss === 'number') lines.push(`      <cvss>${rule.cvss}</cvss>`);
    if (rule.message) lines.push(`      <message>${escapeXml(rule.message)}</message>`);
    if (rule.description) lines.push(`      <description>${escapeXml(rule.description)}</description>`);
    if (rule.docsUrl) lines.push(`      <docs_url>${escapeXml(rule.docsUrl)}</docs_url>`);
    lines.push(`      <locations>`);
    for (const loc of rule.locations) {
      const nodeAttr = loc.nodeType ? ` node_type="${escapeAttr(loc.nodeType)}"` : '';
      lines.push(
        `        <location file="${escapeAttr(loc.file)}" ` +
        `line="${loc.line}" column="${loc.column}"${nodeAttr} />`,
      );
    }
    if (rule.count > rule.locations.length) {
      lines.push(`        <truncated remaining="${rule.count - rule.locations.length}" />`);
    }
    lines.push(`      </locations>`);
    lines.push(`    </finding>`);
    rank++;
  }
  lines.push('  </findings>');
  lines.push('</lint_report>');
  return lines.join('\n') + '\n';
}
