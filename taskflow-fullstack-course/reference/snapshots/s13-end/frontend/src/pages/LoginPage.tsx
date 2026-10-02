import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { safeReturnTo } from '../domain/safe-redirect';
import { FormField } from '../components/forms/FormField';
import { Button } from '../components/Button';

/** ⚠️ FAKE login for S12: no password, no server. Real authentication arrives in S24/S48. */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (username.trim() === '') return;
    login(username.trim());
    // 🛡 never navigate to an unvalidated returnTo (open redirect, 12.07 / S24)
    navigate(safeReturnTo(searchParams.get('returnTo')), { replace: true });
  }

  return (
    <>
      <h1 className="page__title">Log in</h1>
      <form className="form" onSubmit={handleSubmit} aria-label="Log in">
        <FormField label="Username" help="Demo only: any name works, no password (see S24).">
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
        <div className="form__actions">
          <Button type="submit" variant="primary">
            Log in
          </Button>
        </div>
      </form>
    </>
  );
}
