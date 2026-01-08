import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
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
    links: [],
    githubUrl: 'https://github.com/ofri-peretz/eslint',
  };
}
