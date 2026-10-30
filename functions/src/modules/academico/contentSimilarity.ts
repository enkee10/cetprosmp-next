const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();

export function splitIndicatorContents(value: unknown) {
  const text = String(value ?? "");
  if (!text.trim() || text.length > 50000) return [];
  return text.split(/\r?\n/).map(normalizeSpaces).filter(Boolean);
}

export function normalizeIndicatorContent(value: string) {
  return normalizeSpaces(value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/^\s*(?:[-*•‣◦]+|\(?\d+[.)-]|[a-z][.)-])\s*/i, "")
    .replace(/[^a-z0-9ñ]+/g, " ")
    .replace(/^(?:(?:silabo\s+\d{4}|conocimiento)\s*)+/g, ""));
}

const canonicalToken = (value: string) => {
  if (value.length > 5 && value.endsWith("es")) return value.slice(0, -2);
  if (value.length > 4 && value.endsWith("s")) return value.slice(0, -1);
  return value;
};

function ngrams(value: string, size = 3) {
  const compact = value.replace(/\s+/g, " ");
  if (compact.length <= size) return new Set([compact]);
  const result = new Set<string>();
  for (let index = 0; index <= compact.length - size; index += 1) result.add(compact.slice(index, index + size));
  return result;
}

function dice(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const value of left) if (right.has(value)) shared += 1;
  return (2 * shared) / (left.size + right.size);
}

export function indicatorContentsAreSimilar(left: string, right: string) {
  const a = normalizeIndicatorContent(left), b = normalizeIndicatorContent(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (shorter.length < 8) return false;
  const leftTokens = new Set(a.split(" ").map(canonicalToken)), rightTokens = new Set(b.split(" ").map(canonicalToken));
  const tokenScore = dice(leftTokens, rightTokens);
  if (tokenScore === 1) return true;
  if (longer.includes(shorter) && shorter.length / longer.length >= 0.9) return true;
  const phraseScore = dice(ngrams(a), ngrams(b));
  return phraseScore >= 0.97 && tokenScore >= 0.9;
}

export function fuseIndicatorContents<T extends { texto: string }>(items: T[]) {
  const result: T[] = [];
  for (const item of items) {
    const match = result.findIndex(saved => indicatorContentsAreSimilar(saved.texto, item.texto));
    if (match < 0) result.push(item);
    else if (normalizeIndicatorContent(item.texto).length > normalizeIndicatorContent(result[match].texto).length) result[match] = item;
  }
  return result;
}
