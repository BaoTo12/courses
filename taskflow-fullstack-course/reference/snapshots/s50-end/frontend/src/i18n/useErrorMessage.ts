import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toErrorMessage } from '../domain/guards';

/**
 * 25.13: translate an API error by its machine-readable CODE ('BAD_CREDENTIALS', 'NETWORK'…), never by its
 * English message. Unknown codes fall back to the server's message, so a new server error is still readable.
 */
export function useErrorMessage(): (error: unknown) => string {
  const { t } = useTranslation();
  return useCallback(
    (error: unknown) => {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      const fallback = toErrorMessage(error);
      return typeof code === 'string' ? t(`errors.${code}`, { defaultValue: fallback }) : fallback;
    },
    [t],
  );
}
