import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { safeReturnTo } from '../domain/safe-redirect';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../i18n/useErrorMessage';
import { FormField } from '../components/forms/FormField';
import { Button } from '../components/Button';

/** S24 (24.12): a real login. The server sets the HttpOnly session cookie; we only get the user back. */
export function LoginPage() {
  const { user, login } = useAuth();
  const { t } = useTranslation();
  const errorMessage = useErrorMessage(); // translated by error CODE (25.13)
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 🛡 never navigate to an unvalidated returnTo (open redirect, 24.14)
  const returnTo = safeReturnTo(searchParams.get('returnTo'));

  if (user) return <Navigate to={returnTo} replace />; // already logged in (e.g. Back after login)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (username.trim() === '' || password === '') return setError(t('auth.missing'));
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      // One message for "no such user" and "wrong password": the server doesn't say which, neither do we.
      setError(errorMessage(err)); // BAD_CREDENTIALS → "Invalid username or password." / Vietnamese
      setPassword(''); // never keep a rejected password on screen
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="page__title">{t('auth.title')}</h1>
      <form className="form" onSubmit={handleSubmit} aria-label={t('auth.title')} noValidate>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <FormField label={t('auth.username')} help={t('auth.usernameHelp')}>
          {(control) => (
            <input
              {...control}
              className="form-field__input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          )}
        </FormField>
        <FormField label={t('auth.password')}>
          {(control) => (
            <input
              {...control}
              type="password"
              className="form-field__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          )}
        </FormField>
        <div className="form__actions">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? t('auth.submitting') : t('auth.submit')}
          </Button>
        </div>
      </form>
    </>
  );
}
