import { randomInt } from 'node:crypto';

export function needsAvanzaPhoneReplacement(value: string | null): boolean {
  if (!value?.trim()) return true;
  const digits = value.replace(/\D/g, '');
  return digits === '999999999' || digits === '51999999999';
}

/** Reserve formatted numbers too, including +51, spaces and punctuation. */
export function reserveAvanzaPhoneNumbers(reserved: Set<string>, value: string | null): void {
  const digits = (value || '').replace(/\D/g, '');
  for (const number of digits.match(/9\d{8}/g) || []) reserved.add(number);
}

export function generateAvanzaPhone(reserved: Set<string>): string {
  if (reserved.size >= 100000000) throw new Error('No quedan números disponibles para la exportación.');
  // Retry collisions; reserve each generated number across the entire ZIP.
  for (let attempts = 0; attempts < 10000; attempts++) {
    const number = String(randomInt(900000000, 1000000000));
    if (number === '999999999' || reserved.has(number)) continue;
    reserved.add(number);
    return number;
  }
  throw new Error('No se pudo generar un número único para la exportación.');
}
