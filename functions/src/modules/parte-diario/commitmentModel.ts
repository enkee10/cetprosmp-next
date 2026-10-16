export interface ParteCompromiso {
  id: string | null;
  observacionIndex: number;
  texto: string;
  creadoEn: string | null;
  creadoPor: string | null;
  cumplidoEn: string | null;
  cumplidoPor: string | null;
  comentario: string | null;
  comentadoEn: string | null;
  comentadoPor: string | null;
}

export function readCompromisos(value: unknown): ParteCompromiso[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('Los compromisos guardados no son válidos.');
  return value.map(c => {
    if (!c || typeof c !== 'object' || typeof c.id !== 'string' || typeof c.texto !== 'string'
      || !Number.isInteger(c.observacionIndex) || c.observacionIndex < 0) throw new Error('El compromiso guardado no es válido.');
    return c as ParteCompromiso;
  });
}

/** Accept editable fields only; authors, dates and follow-up always come from the server. */
export function normalizeCompromisos(input: unknown, observations: string[], previous: ParteCompromiso[], uid: string, now: string, newId: () => string): ParteCompromiso[] {
  if (!Array.isArray(input) || input.length > observations.length) throw new Error('Los compromisos no corresponden a las observaciones.');
  const indices = new Set<number>(), ids = new Set<string>();
  return input.map(c => {
    if (!c || typeof c !== 'object' || !Number.isInteger(c.observacionIndex) || c.observacionIndex < 0 || c.observacionIndex >= observations.length
      || indices.has(c.observacionIndex) || typeof c.texto !== 'string' || !c.texto.trim() || c.texto.trim().length > 4000) throw new Error('Escribe un compromiso válido para cada observación seleccionada.');
    indices.add(c.observacionIndex);
    const old = c.id ? previous.find(p => p.id === c.id) : null;
    if (c.id && (!old || ids.has(c.id))) throw new Error('El compromiso no pertenece a este registro.');
    if (old?.id) ids.add(old.id);
    const text = c.texto.trim();
    if (old?.cumplidoEn && old.texto !== text) throw new Error('Un compromiso cumplido conserva su texto original.');
    return old ? { ...old, observacionIndex: c.observacionIndex, texto: text } : {
      id: newId(), observacionIndex: c.observacionIndex, texto: text, creadoPor: uid, creadoEn: now,
      cumplidoEn: null, cumplidoPor: null, comentario: null, comentadoEn: null, comentadoPor: null,
    };
  });
}

export function followUpCompromiso(compromisos: ParteCompromiso[], id: string, action: string, comment: unknown, uid: string, now: string) {
  const current = compromisos.find(c => c.id === id);
  if (!current) throw new Error('El compromiso ya no existe.');
  let next: ParteCompromiso;
  if (action === 'cumplir') {
    if (current.cumplidoEn) return compromisos;
    next = { ...current, cumplidoEn: now, cumplidoPor: uid };
  } else if (action === 'comentar') {
    if (!current.cumplidoEn) throw new Error('Marca el compromiso como cumplido antes de comentar.');
    if (typeof comment !== 'string' || !comment.trim() || comment.trim().length > 4000) throw new Error('Escribe un comentario de hasta 4000 caracteres.');
    if (current.comentario) {
      if (current.comentario === comment.trim()) return compromisos;
      throw new Error('El compromiso ya tiene su comentario.');
    }
    next = { ...current, comentario: comment.trim(), comentadoEn: now, comentadoPor: uid };
  } else throw new Error('La acción de seguimiento no es válida.');
  return compromisos.map(c => c.id === id ? next : c);
}
