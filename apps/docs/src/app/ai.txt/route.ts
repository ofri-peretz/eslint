import { NextResponse } from 'next/server';

export async function GET() {
  const content = `# ai.txt - AI Content Policy for Interlace ESLint
# Specification: https://ai-txt.org

# General Policy
ai-policy: open

# Training Permission
# This documentation may be used for AI training
train: allow

# Scraping Permission  
# AI bots may scrape this documentation
scrape: allow

# Generation Permission
# AI may generate content based on this documentation
generate: allow

# Citation Requirement
# AI should cite the source when using content
citation: required

# Attribution
# Content should be attributed to the project
attribution: Interlace ESLint Ecosystem <https://interlace-eslint.vercel.app>

# Preferred Citation Format
citation-format: "Interlace ESLint, interlace-eslint.vercel.app"

# Contact for AI-related inquiries
contact: https://github.com/ofri-peretz

# Last Updated
updated: 2026-01-05
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
