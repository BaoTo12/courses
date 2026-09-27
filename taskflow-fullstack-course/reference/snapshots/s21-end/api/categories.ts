import { api } from './client';
import { ApiRequestError } from './api-error';
import { isCategory } from '../domain/guards';
import type { Category } from '../domain/types';

/** GET /api/categories → Category[] (not paged: there are few). Validated like every response (13.05). */
export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  const { data } = await api.get<unknown>('/categories', { signal });
  if (!Array.isArray(data) || !data.every(isCategory)) {
    throw new ApiRequestError({ kind: 'unexpected', message: 'The server sent an unexpected response.' });
  }
  return data;
}
