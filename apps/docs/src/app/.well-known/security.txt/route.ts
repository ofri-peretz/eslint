import { NextResponse } from 'next/server';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://interlace-eslint.vercel.app';

export async function GET() {
  const content = `Contact: https://github.com/ofri-peretz
Preferred-Languages: en
Canonical: ${baseUrl}/.well-known/security.txt
Policy: https://github.com/ofri-peretz/interlace-eslint/security

# For security vulnerabilities in the Interlace ESLint ecosystem,
# please open a GitHub security advisory or contact via the methods above.
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
