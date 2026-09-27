import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { fieldErrorsOf } from '../../api/api-error';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../components/Button';
import { useTranslation } from 'react-i18next';
import { useErrorMessage } from '../../i18n/useErrorMessage';
import { formatDate } from '../../i18n/format';
import { useAddCommentMutation, useGetCommentsQuery } from './commentsApi';
import styles from './CommentsSection.module.scss';
import { SanitizedHtml } from '../../security/RichText';

const MAX_LENGTH = 1000; // the server's limit (02-project-spec §5); the server checks it again

/**
 * 22.11: a task's comments. Server state only: no slice. The list comes from `getComments(taskId)`;
 * posting invalidates `{ type: 'Comment', id: taskId }`, so exactly this list refetches.
 */
export function CommentsSection({ taskId }: { taskId: number }) {
  const { user } = useAuth();
  const { data: comments = [], isLoading, isFetching, isError, error } = useGetCommentsQuery(taskId);
  const [addComment, { isLoading: isPosting }] = useAddCommentMutation();
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  // 26.04: plain text by default; "Show formatting" renders the SAME bodies as sanitised HTML.
  const [showFormatting, setShowFormatting] = useState(false);
  const fieldId = useId();
  const { t, i18n } = useTranslation('tasks');
  const errorMessage = useErrorMessage();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text === '') return setFormError(t('comments.blank'));
    try {
      await addComment({ taskId, body: text }).unwrap();
      setBody(''); // cleared only on success: a failed post keeps the text
      setFormError(null);
    } catch (err) {
      // Field messages come from the server in English: S44's backend localises them from the lang cookie.
      setFormError(fieldErrorsOf(err)?.body ?? errorMessage(err));
    }
  }

  return (
    <section className={styles.comments} aria-labelledby={`${fieldId}-heading`}>
      <h2 id={`${fieldId}-heading`} className={styles.heading}>
        {t('comments.heading')} {isFetching && !isLoading && <span className="text-muted">{t('comments.refreshing')}</span>}
      </h2>
      {comments.length > 0 && (
        <label className="text-muted">
          <input type="checkbox" checked={showFormatting} onChange={(e) => setShowFormatting(e.target.checked)} />{' '}
          {t('comments.showFormatting')}
        </label>
      )}
      {isLoading && <p className="text-muted">{t('comments.loading')}</p>}
      {isError && (
        <p role="alert" className="text-danger">
          {errorMessage(error)}
        </p>
      )}
      {!isLoading && !isError && comments.length === 0 && <p className="text-muted">{t('comments.empty')}</p>}
      <ul className={styles.list}>
        {comments.map((comment) => (
          <li key={comment.id} className={styles.comment}>
            {/* Plain text: React escapes it (26.02). Formatting: DOMPurify first, always (26.04). */}
            {showFormatting ? <SanitizedHtml html={comment.body} /> : <p>{comment.body}</p>}
            <span className="text-muted">{formatDate(comment.createdAt.slice(0, 10), i18n.language)}</span>
          </li>
        ))}
      </ul>
      {user && (
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className={`form-field${formError ? ' form-field--error' : ''}`}>
            <label className="form-field__label" htmlFor={fieldId}>
              {t('comments.add')}
            </label>
            <textarea
              id={fieldId}
              className="form-field__input"
              value={body}
              maxLength={MAX_LENGTH}
              aria-invalid={formError !== null}
              aria-describedby={formError ? `${fieldId}-error` : undefined}
              onChange={(e) => {
                setBody(e.target.value);
                setFormError(null);
              }}
            />
            {formError && (
              <span id={`${fieldId}-error`} className="form-field__error">
                {formError}
              </span>
            )}
          </div>
          <div className="form__actions">
            <Button type="submit" size="sm" disabled={isPosting}>
              {isPosting ? t('comments.posting') : t('comments.post')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
