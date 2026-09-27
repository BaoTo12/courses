import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { Button } from '../../components/Button';
import { Stack } from '../../components/styled/Stack';
import { apiSlice, useDeleteTasksMutation } from '../api/apiSlice';
import { selectionCleared } from '../ui/uiSlice';

/**
 * S27 bulk actions on the selected tasks (ui.selectedTaskIds, since S15).
 * - Mark done: one optimistic PATCH per task (23.05), so each card flips at once and rolls back on its own.
 * - Delete: ONE `deleteTasks` mutation, optimistic removal from every list; partial failures come back with the
 *   LIST refetch, and a toast counts them. Failed ids stay selected (uiSlice), ready for a retry.
 */
export function BulkBar() {
  const selectedIds = useAppSelector((state) => state.ui.selectedTaskIds);
  const dispatch = useAppDispatch();
  const [deleteTasks, { isLoading: isDeleting }] = useDeleteTasksMutation();
  const { t } = useTranslation('tasks');

  if (selectedIds.length === 0) return null;
  const count = selectedIds.length;

  function completeAll() {
    for (const id of selectedIds) {
      void dispatch(apiSlice.endpoints.patchTask.initiate({ id, changes: { status: 'DONE' } }));
    }
    dispatch(selectionCleared());
  }

  function deleteAll() {
    if (!window.confirm(t('bulk.deleteConfirm', { count }))) return;
    void deleteTasks([...selectedIds]);
  }

  return (
    <Stack role="toolbar" aria-label={t('bulk.label')} $direction="row" $gap={2} $align="center" $wrap>
      <strong>{t('bulk.selected', { count })}</strong>
      <Button size="sm" variant="primary" onClick={completeAll}>
        {t('bulk.complete')}
      </Button>
      <Button size="sm" variant="danger" onClick={deleteAll} disabled={isDeleting}>
        {t('bulk.delete')}
      </Button>
      <Button size="sm" variant="secondary" onClick={() => dispatch(selectionCleared())}>
        {t('bulk.clear')}
      </Button>
    </Stack>
  );
}
