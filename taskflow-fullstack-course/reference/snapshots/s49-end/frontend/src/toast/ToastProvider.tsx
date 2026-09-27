import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { ToastContext } from './toast-context';
import type { Toast, ToastContextValue, ToastTone } from './toast-context';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { toastDismissed, toastShown } from '../features/ui/toastActions';
import { useTranslation } from 'react-i18next';

const AUTO_DISMISS_MS = 4000;

const slideIn = keyframes`
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`;

const Viewport = styled.div`
  position: fixed;
  right: ${({ theme }) => theme.space(4)};
  bottom: ${({ theme }) => theme.space(4)};
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space(2)};
  max-width: min(360px, calc(100vw - 32px));
`;

const toneStyles = {
  success: css`
    border-left-color: ${({ theme }) => theme.colors.success};
  `,
  error: css`
    border-left-color: ${({ theme }) => theme.colors.danger};
  `,
  info: css`
    border-left-color: ${({ theme }) => theme.colors.primary};
  `,
} satisfies Record<ToastTone, ReturnType<typeof css>>;

const Item = styled.div<{ $tone: ToastTone }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space(3)};
  padding: ${({ theme }) => `${theme.space(3)} ${theme.space(4)}`};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left-width: 4px;
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
  font-size: ${({ theme }) => theme.fontSizes.sm};
  animation: ${slideIn} 200ms ease-out;

  ${({ $tone }) => toneStyles[$tone]}
`;

const Close = styled.button.attrs({ type: 'button' })`
  margin-left: auto;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

/**
 * S18: the toast LIST lives in the Redux ui slice, so thunks (non-React code) can show toasts too.
 * This provider keeps the useToast() API from S10: show() and dismiss() now dispatch actions.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const toasts = useAppSelector((state) => state.ui.toasts);
  const dispatch = useAppDispatch();

  const value = useMemo<ToastContextValue>(
    () => ({
      show: (input) => dispatch(toastShown(input)),
      dismiss: (id) => dispatch(toastDismissed(id)),
    }),
    [dispatch],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Viewport>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={value.dismiss} />
        ))}
      </Viewport>
    </ToastContext.Provider>
  );
}

/** One toast. Its own effect schedules the auto-dismiss, and cleans up if it's dismissed early. */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);
  const { t } = useTranslation();
  const text = toast.i18nKey ? t(toast.i18nKey, { ...toast.values, defaultValue: toast.message }) : toast.message;

  return (
    <Item
      $tone={toast.tone}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
    >
      <span>{text}</span>
      <Close aria-label={t('toasts.dismiss')} onClick={() => onDismiss(toast.id)}>
        ×
      </Close>
    </Item>
  );
}
