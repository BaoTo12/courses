import { useTranslation } from 'react-i18next';
import { isAppLanguage, SUPPORTED_LANGUAGES } from './i18n';

/**
 * 25.07: `changeLanguage` re-renders every `useTranslation` consumer, loads missing namespaces for the new
 * language, and (detector `caches: ['cookie']`) writes `tf_lang`. `<html lang>` follows via 'languageChanged'.
 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  // `resolvedLanguage`: the supported language actually in use ('vi'), not the raw detected one ('vi-VN').
  const current = i18n.resolvedLanguage ?? 'en';

  return (
    <select
        value={current}
        aria-label={t('language.label')}
        onChange={(e) => {
          const language = e.target.value;
          if (isAppLanguage(language)) void i18n.changeLanguage(language);
        }}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          // Each language's name in ITSELF: someone who can't read the current language still finds theirs.
          <option key={language} value={language} lang={language}>
            {t(`language.${language}`)}
          </option>
        ))}
    </select>
  );
}
