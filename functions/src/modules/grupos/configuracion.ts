export const MAX_INSTANCIAS_GRUPO = 6;

export const claveInstancia = (moduloId: number, instancia = 1) => `${moduloId}:${instancia}`;

export function nombreConSufijo(nombre: string, anterior?: string | null, siguiente?: string | null) {
  let base = nombre.trim();
  const old = anterior?.trim();
  if (old && base.endsWith(` ${old}`)) base = base.slice(0, -old.length).trimEnd();
  return [base, siguiente?.trim()].filter(Boolean).join(' ');
}

export function validarInstancias(
  items: Array<{ moduloId: number; instancia: number; sufijo?: string | null }>,
  anteriores: Array<{ moduloId: number; instancia?: number | null; sufijo?: string | null }> = [],
) {
  if (!items.length || items.length > MAX_INSTANCIAS_GRUPO) throw new Error('El grupo debe tener entre 1 y 6 instancias de módulos.');
  const keys = new Set<string>();
  const byModulo = new Map<number, typeof items>();
  for (const item of items) {
    if (!Number.isInteger(item.moduloId) || item.moduloId <= 0 || !Number.isInteger(item.instancia) || item.instancia < 1 || item.instancia > MAX_INSTANCIAS_GRUPO) throw new Error('Módulo o instancia no válido.');
    const key = claveInstancia(item.moduloId, item.instancia);
    if (keys.has(key)) throw new Error('Hay una instancia de módulo repetida.');
    keys.add(key);
    if ((item.sufijo?.trim().length ?? 0) > 80) throw new Error('El sufijo no puede superar 80 caracteres.');
    const list = byModulo.get(item.moduloId) ?? [];
    list.push(item); byModulo.set(item.moduloId, list);
  }
  for (const [moduloId, list] of byModulo) {
    const ordered = list.slice().sort((a,b) => a.instancia - b.instancia);
    if (ordered.some((item,i) => item.instancia !== i + 1)) throw new Error('Las instancias deben numerarse consecutivamente desde 1.');
    if (list.length === 1) {
      if (list[0].sufijo?.trim()) throw new Error('El sufijo solo corresponde a módulos con más de una instancia.');
      continue;
    }
    const old = anteriores.filter(item => item.moduloId === moduloId);
    // An existing configuration without suffixes remains valid until it is changed.
    if (old.length === list.length && old.every(item => !item.sufijo?.trim()) && list.every(item => !item.sufijo?.trim())) continue;
    const suffixes = list.map(item => item.sufijo?.trim().toLocaleLowerCase('es-PE') ?? '');
    if (suffixes.some(value => !value) || new Set(suffixes).size !== list.length) throw new Error('Escribe un sufijo diferente para cada instancia del módulo repetido.');
  }
}
