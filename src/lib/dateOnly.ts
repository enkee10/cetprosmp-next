export function getDateOnlyParts(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function getDateOnlyLocalDate(value: string | null | undefined) {
  const parts = getDateOnlyParts(value);
  if (parts) return new Date(parts.year, parts.month - 1, parts.day);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateOnlyInputValue(value: string | null | undefined) {
  const parts = getDateOnlyParts(value);
  if (parts) {
    const month = String(parts.month).padStart(2, '0');
    const day = String(parts.day).padStart(2, '0');
    return `${parts.year}-${month}-${day}`;
  }
  const date = getDateOnlyLocalDate(value);
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDateOnly(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  const date = getDateOnlyLocalDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('es-PE', options).format(date);
}

export function dateOnlyTimestamp(value: string | null | undefined) {
  const date = getDateOnlyLocalDate(value);
  return date ? date.getTime() : null;
}
