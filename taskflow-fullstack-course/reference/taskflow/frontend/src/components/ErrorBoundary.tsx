import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Where to report (the crash endpoint in production). Receives NO user data: just the error and the component stack. */
  onError?: (error: unknown, componentStack: string | null | undefined) => void;
}

interface ErrorBoundaryState {
  error: unknown;
}

/**
 * S27: catches errors thrown while RENDERING the page below it (and in its lifecycle methods/effects set-up),
 * so one broken page doesn't blank the whole app. It does NOT catch errors in event handlers, in async code
 * (promises, RTK Query), or in itself: those are handled where they happen (toasts, error states).
 * Still a class: React has no hook for getDerivedStateFromError/componentDidCatch.
 * Mounted with `key={location.pathname}` in AppLayout, so navigating away resets it.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.props.onError?.(error, info.componentStack);
  }

  render() {
    if (this.state.error !== null) {
      return <ErrorFallback onRetry={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert">
      <h1 className="page__title">{t('errorBoundary.title')}</h1>
      <p className="text-muted">{t('errorBoundary.text')}</p>
      <Button onClick={onRetry}>{t('errorBoundary.retry')}</Button>{' '}
      <Link className="btn btn--secondary btn--sm" to="/tasks">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
