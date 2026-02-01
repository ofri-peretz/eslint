import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';

/**
 * Shared layout options for ESLint Interlace documentation
 * Used by both docs and homepage layouts
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Image
            src="/eslint-interlace-logo.svg"
            alt="ESLint Interlace"
            width={24}
            height={24}
            className="dark:hidden"
            priority
          />
          <Image
            src="/eslint-interlace-logo-light.svg"
            alt="ESLint Interlace"
            width={24}
            height={24}
            className="hidden dark:block"
            priority
          />
          <span className="font-semibold">ESLint Interlace</span>
        </>
      ),
      transparentMode: 'top',
    },
    githubUrl: 'https://github.com/interlace-app/eslint-ecosystem',
  };
}
