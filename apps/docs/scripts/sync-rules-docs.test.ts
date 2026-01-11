
import { describe, it, expect } from 'vitest';
import { convertMdToMdx } from './sync-rules-docs.mjs';

describe('sync-rules-docs', () => {
  describe('convertMdToMdx', () => {
    it('should generate valid MDX with frontmatter', () => {
      const md = `
# Rule Title

Rule description is long enough to be picked up.

## Header
Content
      `;
      const mdx = convertMdToMdx(md, 'rule.md');
      
      expect(mdx).toContain('title: "Rule Title"');
      expect(mdx).toContain('description: "Rule description is long enough to be picked up."');
      expect(mdx).toContain('import { FalseNegativeCTA, WhenNotToUse } from "@/components/RuleComponents";');
    });

    it('should strip HTML comments', () => {
        const md = `
# Title

<!-- COMMENT -->
Description
        `;
        const mdx = convertMdToMdx(md, 'rule.md');
        expect(mdx).not.toContain('<!-- COMMENT -->');
    });
    
    it('should inject FalseNegativeCTA', () => {
        const md = `
# Title

## Known False Negatives
- item
        `;
        const mdx = convertMdToMdx(md, 'rule.md');
        expect(mdx).toContain('<FalseNegativeCTA />');
        expect(mdx).toContain('<WhenNotToUse />');
    });

    it('should sanitize Mermaid charts', () => {
        const md = `
# Title

\`\`\`mermaid
graph TD
A[Label]
B{Decision}
\`\`\`
        `;
        const mdx = convertMdToMdx(md, 'rule.md');
        expect(mdx).toContain('A["Label"]');
        expect(mdx).toContain('B{"Decision"}');
    });
  });
});
