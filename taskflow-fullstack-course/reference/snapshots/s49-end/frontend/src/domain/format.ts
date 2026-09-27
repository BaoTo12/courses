/** 'IN_PROGRESS' → 'in-progress' (matches the SCSS token map keys, 03.07). */
export const toKebab = (value: string) => value.toLowerCase().replaceAll('_', '-');
