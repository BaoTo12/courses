import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { ToastContext } from './toast-context';
import type { Toast, ToastContextValue, ToastInput, ToastTone } from './toast-context';

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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...input, id }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS));
    },
    [dismiss],
  );

  // Clear any pending timers if the provider unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Viewport>
        {toasts.map((toast) => (
          <Item
            key={toast.id}
            $tone={toast.tone}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
          >
            <span>{toast.message}</span>
            <Close aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
              ×
            </Close>
          </Item>
        ))}
      </Viewport>
    </ToastContext.Provider>
  );
}
