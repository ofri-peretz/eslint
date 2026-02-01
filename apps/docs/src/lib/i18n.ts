import { defineI18n } from 'fumadocs-core/i18n';

/**
 * Internationalization configuration
 * 
 * To enable i18n:
 * 1. Create /app/[lang] folder and move layouts into it
 * 2. Create middleware.ts with createI18nMiddleware
 * 3. Update RootProvider with i18n provider
 * 4. Create localized content in content/docs/{lang}/
 * 
 * @see https://fumadocs.dev/docs/internationalization/next
 */
export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en'], // Add more: 'es', 'zh', 'ja', 'ko', etc.
});

/**
 * Language display names and UI translations
 * Expand this when adding new languages
 */
export const translations = {
  en: {
    displayName: 'English',
    // Add UI translations here when needed
  },
  // Example for Spanish:
  // es: {
  //   displayName: 'Español',
  //   search: 'Buscar...',
  // },
} as const;
