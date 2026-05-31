import { DataConnectRoleInput, DataConnectUserInput } from "./types.js";

export function separarNombreCompleto(displayName: string | null) {
  const texto = (displayName || "").trim().replace(/\s+/g, " ");
  if (!texto) {
    return { nombre: "", apellido_paterno: "", apellido_materno: "" };
  }

  const partes = texto.split(" ");
  if (partes.length >= 3) {
    return {
      nombre: partes.slice(0, -2).join(" "),
      apellido_paterno: partes[partes.length - 2],
      apellido_materno: partes[partes.length - 1],
    };
  }
  if (partes.length === 2) {
    return { nombre: partes[0], apellido_paterno: partes[1], apellido_materno: "" };
  }
  return { nombre: partes[0], apellido_paterno: "", apellido_materno: "" };
}

export function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const asString = String(value).trim();
  return asString.length ? asString : null;
}

export function asNullableTimestamp(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (ymd) {
      const year = Number(ymd[1]);
      if (year < 1900 || year > 2100) return null;
      const dt = new Date(`${raw}T00:00:00.000Z`);
      if (Number.isNaN(dt.getTime())) return null;
      return dt.toISOString().slice(0, 10) === raw ? dt.toISOString() : null;
    }
    const iso = /^(\d{4})-(\d{2})-(\d{2})T/.exec(raw);
    if (iso) {
      const year = Number(iso[1]);
      if (year < 1900 || year > 2100) return null;
      const dt = new Date(raw);
      if (Number.isNaN(dt.getTime())) return null;
      return dt.toISOString();
    }
    return null;
  }
  if (typeof value === "object" && value !== null && "_seconds" in (value as Record<string, unknown>)) {
    const seconds = Number((value as { _seconds: number })._seconds);
    if (Number.isNaN(seconds)) return null;
    return new Date(seconds * 1000).toISOString();
  }
  return null;
}

export function toBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  return Boolean(value);
}

export function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toNumberOrNull(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getIdFromKeyOutput(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    try {
      return getIdFromKeyOutput(JSON.parse(value));
    } catch {
      return null;
    }
  }
  if (typeof value === "object" && value !== null && "id" in value) {
    return toNumberOrNull((value as { id?: unknown }).id) ?? null;
  }
  return null;
}

export function compactUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).filter(([, v]) => v !== undefined),
  ) as T;
}

export function buildUserDataFromInput(
  input: Record<string, unknown>,
  defaults?: {
    documentId?: string;
    email?: string;
    username?: string;
    displayName?: string;
    photoURL?: string | null;
    provider?: string | null;
    rolId?: number | null;
  },
): DataConnectUserInput {
  const apellidoPaterno = asNullableString(input.apellido_paterno ?? input.apellidoPaterno) ?? null;
  const apellidoMaterno = asNullableString(input.apellido_materno ?? input.apellidoMaterno) ?? null;
  const nombre = asNullableString(input.nombre) ?? null;
  const apellidos = [apellidoPaterno, apellidoMaterno].filter(Boolean).join(" ") || null;

  const payload: DataConnectUserInput = {
    documentId: asNullableString(input.documentId) ?? asNullableString(defaults?.documentId) ?? null,
    username: asNullableString(input.username) ?? asNullableString(defaults?.username) ?? null,
    email: asNullableString(input.email) ?? asNullableString(defaults?.email) ?? null,
    provider: asNullableString(input.provider) ?? asNullableString(defaults?.provider) ?? null,
    confirmed: toBoolean(input.confirmed),
    blocked: toBoolean(input.bloqueado ?? input.blocked),
    dni: asNullableString(input.dni),
    tipoDocumento: asNullableString(input.tipo_documento ?? input.tipoDocumento),
    nombre,
    apellidos,
    apellidoPaterno,
    apellidoMaterno,
    sexo: asNullableString(input.sexo),
    estadoCivil: asNullableString(input.estado_civil ?? input.estadoCivil),
    instruccion: asNullableString(input.instruccion),
    fechaNacimiento: asNullableTimestamp(input.fecha_nacimiento ?? input.fechaNacimiento),
    direccion: asNullableString(input.direccion),
    distrito: asNullableString(input.distrito),
    telefono: asNullableString(input.telefono),
    celular: asNullableString(input.celular),
    avatar: asNullableString(input.avatar ?? input.foto) ?? asNullableString(defaults?.photoURL) ?? null,
    rolId: toNumberOrNull(input.rolId) ?? defaults?.rolId ?? null,
  };

  if (!payload.username) payload.username = asNullableString(defaults?.displayName) ?? null;
  return compactUndefined(payload);
}

export function buildRoleDataFromInput(input: Record<string, unknown>): DataConnectRoleInput {
  return compactUndefined({
    titulo: asNullableString(input.titulo),
    scala: toNumberOrNull(input.scala),
  });
}
