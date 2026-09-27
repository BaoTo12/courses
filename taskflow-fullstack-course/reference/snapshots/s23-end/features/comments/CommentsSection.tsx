import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { fieldErrorsOf } from '../../api/api-error';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../components/Button';
import { toErrorMessage } from '../../domain/guards';
import { useAddCommentMutation, useGetCommentsQuery } from './commentsApi';
import styles from './CommentsSection.module.scss';

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
  const fieldId = useId();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text === '') return setFormError('Write something first.');
    try {
      await addComment({ taskId, body: text }).unwrap();
      setBody(''); // cleared only on success: a failed post keeps the text
      setFormError(null);
    } catch (err) {
      setFormError(fieldErrorsOf(err)?.body ?? toErrorMessage(err));
    }
  }

  return (
    <section className={styles.comments} aria-labelledby={`${fieldId}-heading`}>
      <h2 id={`${fieldId}-heading`} className={styles.heading}>
        Comments {isFetching && !isLoading && <span className="text-muted">· refreshing…</span>}
      </h2>
      {isLoading && <p className="text-muted">Loading comments…</p>}
      {isError && (
        <p role="alert" className="text-danger">
          {toErrorMessage(error)}
        </p>
      )}
      {!isLoading && !isError && comments.length === 0 && <p className="text-muted">No comments yet.</p>}
      <ul className={styles.list}>
        {comments.map((comment) => (
          <li key={comment.id} className={styles.comment}>
            {/* Plain text: React escapes it. Never dangerouslySetInnerHTML with user content (S26). */}
            <p>{comment.body}</p>
            <span className="text-muted">{comment.createdAt.slice(0, 10)}</span>
          </li>
        ))}
      </ul>
      {user && (
        <form className="form" onSubmit={handleSubmit} noValidate>
          <div className={`form-field${formError ? ' form-field--error' : ''}`}>
            <label className="form-field__label" htmlFor={fieldId}>
              Add a comment
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
              {isPosting ? 'Posting…' : 'Post comment'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
