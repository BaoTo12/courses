// S51: who this task is shared with (owner or admin only; TaskDetailsPage decides whether to render it).
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { fieldErrorsOf } from '../../api/api-error';
import { Button } from '../../components/Button';
import { useErrorMessage } from '../../i18n/useErrorMessage';
import { useAddShareMutation, useGetSharesQuery, useRemoveShareMutation } from './sharesApi';

export function SharesPanel({ taskId }: { taskId: number }) {
  const { data: shares = [], isLoading } = useGetSharesQuery(taskId);
  const [addShare, { isLoading: isAdding }] = useAddShareMutation();
  const [removeShare] = useRemoveShareMutation();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const errorMessage = useErrorMessage();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (username.trim() === '') return;
    try {
      await addShare({ taskId, username: username.trim() }).unwrap();
      setUsername('');
      setError(null);
    } catch (err) {
      setError(fieldErrorsOf(err)?.username ?? errorMessage(err));
    }
  }

  return (
    <section aria-labelledby="sharing-heading">
      <h2 id="sharing-heading">{t('sharing.title')}</h2>
      {!isLoading && shares.length === 0 && <p className="text-muted">{t('sharing.nobody')}</p>}
      <ul>
        {shares.map((share) => (
          <li key={share.userId}>
            {share.displayName} ({share.username}){' '}
            <Button size="sm" onClick={() => void removeShare({ taskId, userId: share.userId })}>{t('sharing.remove')}</Button>
          </li>
        ))}
      </ul>
      <form className="form" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className={`form-field${error ? ' form-field--error' : ''}`}>
          <label className="form-field__label" htmlFor={`share-${taskId}`}>{t('sharing.with')}</label>
          <input id={`share-${taskId}`} className="form-field__input" value={username} maxLength={50}
            onChange={(e) => { setUsername(e.target.value); setError(null); }} />
          {error && <span className="form-field__error">{error}</span>}
        </div>
        <div className="form__actions">
          <Button type="submit" size="sm" disabled={isAdding}>{t('sharing.share')}</Button>
        </div>
      </form>
    </section>
  );
}