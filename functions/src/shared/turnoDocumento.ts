export function nombreTurnoDocumento(nombre?: string | null): string {
  return nombre?.trim().split(/\s+/, 1)[0] ?? '';
}

export function nombreGrupoDocumento(nombre?: string | null): string {
  // Los nombres de grupo identifican el turno entre corchetes.
  return (nombre ?? '').replace(/\[\s*((?:ma[ñn]ana|tarde|noche)(?:\s+[^\[\]\r\n]+)?)\s*\]/gi,
    (_, turno: string) => `[${nombreTurnoDocumento(turno)}]`);
}
