import { PAGE_SIZES, type PageSize } from '../features/listPrefs/listPrefsSlice';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Stack } from './styled/Stack';

interface PagerProps {
  /** 0-based, like the API. */
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: PageSize;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}

/** Previous / next + page size (23.07). Presentational: the page decides where page and size live. */
export function Pager({ page, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }: PagerProps) {
  const { t } = useTranslation('tasks');
  const lastPage = Math.max(totalPages - 1, 0);
  return (
    <Stack as="nav" aria-label={t('pager.label')} $direction="row" $gap={2} $align="center" $wrap>
      <Button size="sm" variant="secondary" disabled={page <= 0} onClick={() => onPageChange(page - 1)}>
        {t('pager.previous')}
      </Button>
      <span className="text-muted">
        {/* A plural key (25.09): "1 task" / "5 tasks"; Vietnamese has one form for every count. */}
        {t('pager.position', { page: Math.min(page, lastPage) + 1, pages: lastPage + 1, count: totalItems })}
      </span>
      <Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
        {t('pager.next')}
      </Button>
      <label className="text-muted">
        {t('pager.perPage')}{' '}
        <select
          value={pageSize}
          onChange={(e) => {
            const size = Number(e.target.value);
            const match = PAGE_SIZES.find((s) => s === size); // validate: a <select> value is a string
            if (match) onPageSizeChange(match);
          }}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </Stack>
  );
}
