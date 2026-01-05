import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Github, Package } from 'lucide-react';
import Image from 'next/image';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2">
          <Image
            src="/eslint-logo.svg"
            alt="ESLint"
            width={24}
            height={24}
            className="size-6"
          />
          <span className="font-semibold">Interlace ESLint</span>
        </div>
      ),
    },
    links: [
      {
        text: 'Docs',
        url: '/docs',
        active: 'nested-url',
      },
      {
        text: 'Benchmarks',
        url: '/docs/benchmarks',
        active: 'nested-url',
      },
      {
        icon: <Package className="size-4" />,
        text: 'npm',
        url: 'https://www.npmjs.com/~ofri-peretz',
        external: true,
      },
      {
        icon: <Github className="size-4" />,
        text: 'GitHub',
        url: 'https://github.com/ofri-peretz/eslint',
        external: true,
      },
    ],
    githubUrl: 'https://github.com/ofri-peretz/eslint',
  };
}


