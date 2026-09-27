import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  tone: ToastTone;
  /** English text: the fallback, and what logs/tests see. */
  message: string;
  /** S27: a translation key + values, translated when RENDERED (25.13 §4), so the language can change later. */
  i18nKey?: string;
  values?: Record<string, string | number>;
}

export interface Toast extends ToastInput {
  id: string; // nanoid() since S20 (20.07)
}

export interface ToastContextValue {
  show: (toast: ToastInput) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return context;
}
