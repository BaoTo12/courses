import { useId } from 'react';
import { useTranslation } from 'react-i18next';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBox({ value, onChange }: SearchBoxProps) {
  const id = useId();
  const { t } = useTranslation('tasks');
  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={id}>
        {t('search.label')}
      </label>
      <input
        id={id}
        className="form-field__input"
        type="search"
        placeholder={t('search.placeholder')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
