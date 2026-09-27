// S51: the user's profile: display name and language (PATCH /api/users/me) and theme (the tf_theme cookie).
// The same fields as the Admin Portal's /profile, and the same cookies: a change here shows there, and back (44.08).
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { fieldErrorsOf } from '../api/api-error';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/Button';
import { useUpdateProfileMutation } from '../features/auth/authApi';
import { isAppLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from '../i18n/i18n';
import { useErrorMessage } from '../i18n/useErrorMessage';
import { THEME_PREFERENCES, useTheme, isThemePreference } from '../theme/theme-context';
import { useToast } from '../toast/toast-context';

export function ProfilePage() {
  const { user } = useAuth();
  const { preference, setPreference } = useTheme();
  const { t, i18n } = useTranslation();
  const errorMessage = useErrorMessage();
  const { show } = useToast();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [locale, setLocale] = useState<AppLanguage>(isAppLanguage(user?.locale) ? user.locale : 'en');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    try {
      await updateProfile({ displayName: displayName.trim(), locale }).unwrap();
      await i18n.changeLanguage(locale);            // the detector writes tf_lang too (25.05)
      show({ tone: 'success', message: t('profile.saved'), i18nKey: 'profile.saved' });
    } catch (error) {
      const fieldErrors = fieldErrorsOf(error);
      if (fieldErrors && Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else show({ tone: 'error', message: errorMessage(error) });
    }
  }

  return (
    <>
      <h1 className="page__title">{t('profile.title')}</h1>
      <form className="form" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className={`form-field${errors.displayName ? ' form-field--error' : ''}`}>
          <label className="form-field__label" htmlFor="profile-name">{t('profile.displayName')}</label>
          <input
            id="profile-name"
            className="form-field__input"
            value={displayName}
            maxLength={100}
            aria-invalid={errors.displayName !== undefined}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          {errors.displayName && <span className="form-field__error">{errors.displayName}</span>}
        </div>
        <div className={`form-field${errors.locale ? ' form-field--error' : ''}`}>
          <label className="form-field__label" htmlFor="profile-locale">{t('language.label')}</label>
          <select id="profile-locale" className="form-field__input" value={locale}
            onChange={(e) => { if (isAppLanguage(e.target.value)) setLocale(e.target.value); }}>
            {SUPPORTED_LANGUAGES.map((language) => (
              <option key={language} value={language}>{t(`language.${language}`)}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label className="form-field__label" htmlFor="profile-theme">{t('profile.theme')}</label>
          {/* Applied at once, like the header's toggle: a cookie preference, nothing to save on the server. */}
          <select id="profile-theme" className="form-field__input" value={preference}
            onChange={(e) => { if (isThemePreference(e.target.value)) setPreference(e.target.value); }}>
            {THEME_PREFERENCES.map((option) => (
              <option key={option} value={option}>{t(`profile.themes.${option}`)}</option>
            ))}
          </select>
        </div>
        <div className="form__actions">
          <Button type="submit" variant="primary" disabled={isLoading}>{t('profile.save')}</Button>
        </div>
      </form>
    </>
  );
}