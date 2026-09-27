import { PAGE_SIZES, type PageSize } from '../features/listPrefs/listPrefsSlice';
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
  const lastPage = Math.max(totalPages - 1, 0);
  return (
    <Stack as="nav" aria-label="Pages" $direction="row" $gap={2} $align="center" $wrap>
      <Button size="sm" variant="secondary" disabled={page <= 0} onClick={() => onPageChange(page - 1)}>
        ‹ Previous
      </Button>
      <span className="text-muted">
        Page {Math.min(page, lastPage) + 1} of {lastPage + 1} · {totalItems} task(s)
      </span>
      <Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
        Next ›
      </Button>
      <label className="text-muted">
        Per page{' '}
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
