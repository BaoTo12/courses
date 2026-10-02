import { useId } from 'react';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBox({ value, onChange }: SearchBoxProps) {
  const id = useId();
  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={id}>
        Search
      </label>
      <input
        id={id}
        className="form-field__input"
        type="search"
        placeholder="Search by title…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
