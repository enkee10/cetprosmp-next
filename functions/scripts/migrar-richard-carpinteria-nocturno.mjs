#!/usr/bin/env node

import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const PROJECT_ID = "cetprosmp-2026";
const APPLY = process.argv.includes("--apply");
const REMOTE = process.argv.includes("--remote");

if (!REMOTE) {
  process.env.DATA_CONNECT_EMULATOR_HOST ||= "127.0.0.1:9399";
  process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST ||= "127.0.0.1:9399";
} else {
  delete process.env.DATA_CONNECT_EMULATOR_HOST;
  delete process.env.FIREBASE_DATA_CONNECT_EMULATOR_HOST;
}

process.env.GCLOUD_PROJECT ||= PROJECT_ID;
process.env.GOOGLE_CLOUD_PROJECT ||= PROJECT_ID;

const { dataConnect } = require("../lib/modules/core/dataConnectCore.js");
const {
  INSERT_GRUPO_MODULO_UNIDAD_DIDACTICA_MUTATION,
  INSERT_MATRICULA_MUTATION,
  INSERT_MODULO_ESTUDIANTE_MUTATION,
  UPDATE_GRUPO_MODULO_MUTATION,
  UPDATE_GRUPO_MUTATION,
} = require("../lib/dataconnectOperations.js");

const MELAMINA_GROUP_ID = 157;
const MANTENIMIENTO_GROUP_ID = 158;
const MELAMINA_MODULE_ID = 32;
const MANTENIMIENTO_MODULE_ID = 31;
const MELAMINA_PACKAGE_ID = 45;
const MANTENIMIENTO_PACKAGE_ID = 44;
const TURNO_NOCHE_ID = 3;
const HORARIO_MELAMINA_ID = 1;
const HORARIO_MANTENIMIENTO_ID = 3;
const CODIGO_PREFIX = "0437863";
const CODIGO_YEAR_SUFFIX = "26";
const LIMA_TIME_ZONE = "America/Lima";

const LIST_CONTEXT_QUERY = `
  query ListRichardCarpinteriaContext {
    grupos(where: { id: { in: [157, 158] } }, limit: 10) {
      id
      nombreDisplay
      turnoNombre
      descripcion
      estado
      archivado
      fechaCreacion
      fechaActualizacion
      semestreId
      personalId
      paqueteId
      turnoId
      horarioId
      grupoOrd
      workspaceName
      workspaceCorreo
      semestre { id titulo }
      paquete { id titulo }
      turno { id nombre }
      horario { id nombre }
      personal {
        id
        displayName
        user {
          username
          apellidoPaterno
        }
      }
    }
    grupoModulos(where: { grupoId: { in: [157, 158] } }, limit: 20) {
      id
      nombre
      grupoId
      moduloId
      orden
      obligatorio
      inicio
      fin
      calendarioId
      modulo { id titulo tituloComercial }
    }
    horarios(where: { id: { in: [1, 3] } }, limit: 10) {
      id
      nombre
    }
    turnos(where: { id: { eq: 3 } }, limit: 5) {
      id
      nombre
    }
    modulos(where: { id: { in: [31, 32] } }, limit: 10) {
      id
      titulo
      tituloComercial
    }
  }
`;

const LIST_MATRICULAS_BY_GROUP_QUERY = `
  query ListRichardMatriculasByGroup($grupoId: Int!) {
    modulosEstudiantes(where: { grupoId: { eq: $grupoId } }, limit: 2000) {
      id
      matriculaId
      moduloId
      grupoId
      matricula {
        id
        recibo
        fecha
        codigoInscripcion
        archivado
        paqueteId
        semestreId
        userId
        user {
          id
          username
          apellidoPaterno
          apellidoMaterno
          nombre
          dni
        }
      }
      modulo {
        id
        titulo
        tituloComercial
      }
    }
  }
`;

const LIST_UNIDADES_BY_MODULO_QUERY = `
  query ListUnidadesRichardByModulo($moduloId: Int!) {
    unidadDidacticaModulos(where: { moduloId: { eq: $moduloId } }, limit: 500) {
      id
      moduloId
      unidadDidacticaId
      orden
      unidadDidactica {
        id
        nombre
      }
    }
  }
`;

const LIST_CODIGOS_QUERY = `
  query ListMatriculasCodigoRichardFix {
    matriculas(limit: 50000) {
      id
      fecha
      codigoInscripcion
    }
  }
`;

const FIND_MATRICULA_QUERY = `
  query FindRichardMatricula($userId: Int!, $semestreId: Int!, $paqueteId: Int!) {
    matriculas(where: { userId: { eq: $userId }, semestreId: { eq: $semestreId }, paqueteId: { eq: $paqueteId } }, limit: 1) {
      id
    }
  }
`;

const DELETE_UNIDADES_BY_GRUPO_MODULO_MUTATION = `
  mutation DeleteUnidadesByGrupoModuloRichard($grupoModuloId: Int!) {
    grupoModuloUnidadDidactica_deleteMany(where: { grupoModuloId: { eq: $grupoModuloId } })
  }
`;

function compact(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function getIdFromKeyOutput(value) {
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
  if (!value || typeof value !== "object") return null;
  const raw = value.id ?? value.key?.id;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
}

function getDocenteNombre(personal) {
  const value = compact(personal?.user?.username || personal?.displayName);
  if (!value) return "";
  const tokens = value.split(" ").filter(Boolean);
  const nombre = tokens[0] ?? "";
  const apellido = personal?.user?.apellidoPaterno || (tokens.length >= 3 ? tokens[2] : tokens[1]);
  return [nombre, apellido].filter(Boolean).map((item) => {
    const lower = compact(item).toLocaleLowerCase("es-PE");
    return lower ? lower.charAt(0).toLocaleUpperCase("es-PE") + lower.slice(1) : "";
  }).join(" ");
}

function buildName(moduloNombre, turnoNombre, horarioNombre, personal) {
  const docente = getDocenteNombre(personal);
  return [
    compact(moduloNombre),
    turnoNombre ? `[${compact(turnoNombre)}]` : "",
    compact(horarioNombre),
    docente ? `(${docente})` : "",
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function buildStudentName(user) {
  return [user?.apellidoPaterno, user?.apellidoMaterno, user?.nombre]
    .filter(Boolean)
    .join(" ")
    .trim() || user?.username || `Usuario ${user?.id ?? ""}`;
}

function getLimaYear(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().getFullYear();
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: LIMA_TIME_ZONE,
    year: "numeric",
  }).format(date));
}

function parseCodigoSequence(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^0437863(\d{4})(\d{2})$/);
  if (!match || match[2] !== CODIGO_YEAR_SUFFIX) return null;
  return Number(match[1]);
}

function buildCodigo(sequence) {
  return `${CODIGO_PREFIX}${String(sequence).padStart(4, "0")}${CODIGO_YEAR_SUFFIX}`;
}

async function createCodigoAllocator() {
  const response = await dataConnect.executeGraphql(LIST_CODIGOS_QUERY);
  const rows = response.data.matriculas ?? [];
  const used = new Set();
  let max = 0;
  for (const item of rows) {
    if (getLimaYear(item.fecha) !== 2026) continue;
    const sequence = parseCodigoSequence(item.codigoInscripcion);
    if (!sequence) continue;
    used.add(sequence);
    if (sequence > max) max = sequence;
  }
  const holes = [];
  for (let i = 1; i <= max; i += 1) {
    if (!used.has(i)) holes.push(i);
  }
  let next = max + 1;
  return () => buildCodigo(holes.shift() ?? next++);
}

async function listGroupMatriculas(grupoId) {
  const response = await dataConnect.executeGraphql(LIST_MATRICULAS_BY_GROUP_QUERY, {
    variables: { grupoId },
  });
  const byMatricula = new Map();
  for (const item of response.data.modulosEstudiantes ?? []) {
    if (!item.matricula?.id || !item.matricula.userId) continue;
    byMatricula.set(item.matricula.id, item.matricula);
  }
  return Array.from(byMatricula.values())
    .filter((item) => item.archivado !== true)
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

async function replaceGrupoModuloUnidades(grupoModuloId, moduloId) {
  const response = await dataConnect.executeGraphql(LIST_UNIDADES_BY_MODULO_QUERY, {
    variables: { moduloId },
  });
  const unidades = (response.data.unidadDidacticaModulos ?? [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.unidadDidacticaId - b.unidadDidacticaId);

  await dataConnect.executeGraphql(DELETE_UNIDADES_BY_GRUPO_MODULO_MUTATION, {
    variables: { grupoModuloId },
  });

  for (const [index, unidad] of unidades.entries()) {
    await dataConnect.executeGraphql(INSERT_GRUPO_MODULO_UNIDAD_DIDACTICA_MUTATION, {
      variables: {
        data: {
          grupoModuloId,
          unidadDidacticaId: unidad.unidadDidacticaId,
          orden: unidad.orden ?? index + 1,
          inicio: null,
          fin: null,
        },
      },
    });
  }

  return unidades.length;
}

async function findMatricula(userId, semestreId, paqueteId) {
  const response = await dataConnect.executeGraphql(FIND_MATRICULA_QUERY, {
    variables: { userId, semestreId, paqueteId },
  });
  return response.data.matriculas?.[0]?.id ?? null;
}

async function createMantenimientoMatricula({ oldMatricula, targetGroup, nextCodigo }) {
  const existingId = await findMatricula(oldMatricula.userId, targetGroup.semestreId, MANTENIMIENTO_PACKAGE_ID);
  if (existingId) return { id: existingId, reused: true };

  const inserted = await dataConnect.executeGraphql(INSERT_MATRICULA_MUTATION, {
    variables: {
      data: {
        recibo: null,
        fecha: oldMatricula.fecha ?? new Date().toISOString(),
        codigoInscripcion: nextCodigo(),
        archivado: false,
        paqueteId: MANTENIMIENTO_PACKAGE_ID,
        semestreId: targetGroup.semestreId,
        userId: oldMatricula.userId,
      },
    },
  });
  const matriculaId = getIdFromKeyOutput(inserted.data.matricula_insert);
  if (!matriculaId) throw new Error(`No se pudo crear matricula para usuario ${oldMatricula.userId}.`);

  await dataConnect.executeGraphql(INSERT_MODULO_ESTUDIANTE_MUTATION, {
    variables: {
      data: {
        promedio: null,
        puntaje: null,
        matriculaId,
        moduloId: MANTENIMIENTO_MODULE_ID,
        grupoId: MANTENIMIENTO_GROUP_ID,
      },
    },
  });

  return { id: matriculaId, reused: false };
}

async function main() {
  const context = await dataConnect.executeGraphql(LIST_CONTEXT_QUERY);
  const groups = context.data.grupos ?? [];
  const melaminaGroup = groups.find((item) => item.id === MELAMINA_GROUP_ID);
  const mantenimientoGroup = groups.find((item) => item.id === MANTENIMIENTO_GROUP_ID);
  if (!melaminaGroup || !mantenimientoGroup) throw new Error("No se encontraron los grupos 157 y 158.");

  const grupoModulos = context.data.grupoModulos ?? [];
  const melaminaGrupoModulo = grupoModulos.find((item) => item.grupoId === MELAMINA_GROUP_ID);
  const mantenimientoGrupoModulo = grupoModulos.find((item) => item.grupoId === MANTENIMIENTO_GROUP_ID);
  if (!melaminaGrupoModulo || !mantenimientoGrupoModulo) throw new Error("No se encontraron grupo-modulos para ambos grupos.");

  const horarios = new Map((context.data.horarios ?? []).map((item) => [item.id, item]));
  const turnoNoche = (context.data.turnos ?? []).find((item) => item.id === TURNO_NOCHE_ID);
  const modulos = new Map((context.data.modulos ?? []).map((item) => [item.id, item]));
  const melaminaModulo = modulos.get(MELAMINA_MODULE_ID);
  const mantenimientoModulo = modulos.get(MANTENIMIENTO_MODULE_ID);
  if (!melaminaModulo || !mantenimientoModulo || !turnoNoche) throw new Error("Falta contexto de modulos/turno.");

  const melaminaName = buildName(
    melaminaModulo.titulo,
    turnoNoche.nombre,
    horarios.get(HORARIO_MELAMINA_ID)?.nombre,
    melaminaGroup.personal,
  );
  const mantenimientoName = buildName(
    mantenimientoModulo.titulo,
    turnoNoche.nombre,
    horarios.get(HORARIO_MANTENIMIENTO_ID)?.nombre,
    mantenimientoGroup.personal,
  );

  const sourceMatriculas = await listGroupMatriculas(MELAMINA_GROUP_ID);
  const targetMatriculas = await listGroupMatriculas(MANTENIMIENTO_GROUP_ID);

  console.log(`Grupo Melamina #${MELAMINA_GROUP_ID}: ${melaminaGroup.nombreDisplay}`);
  console.log(`  Nuevo nombre: ${melaminaName}`);
  console.log(`Grupo Mantenimiento #${MANTENIMIENTO_GROUP_ID}: ${mantenimientoGroup.nombreDisplay}`);
  console.log(`  Nuevo nombre: ${mantenimientoName}`);
  console.log(`Matriculas fuente Melamina: ${sourceMatriculas.length}`);
  console.log(`Matriculas actuales Mantenimiento: ${targetMatriculas.length}`);
  for (const matricula of sourceMatriculas.slice(0, 10)) {
    console.log(`- ${buildStudentName(matricula.user)} | mat #${matricula.id} | codigo ${matricula.codigoInscripcion}`);
  }
  if (sourceMatriculas.length > 10) console.log(`... y ${sourceMatriculas.length - 10} mas`);

  if (!APPLY) {
    console.log("Modo vista previa. Ejecuta con --apply para aplicar en local.");
    return;
  }

  await dataConnect.executeGraphql(UPDATE_GRUPO_MUTATION, {
    variables: {
      id: MELAMINA_GROUP_ID,
      data: {
        nombreDisplay: melaminaName,
        paqueteId: MELAMINA_PACKAGE_ID,
        turnoId: TURNO_NOCHE_ID,
        turnoNombre: turnoNoche.nombre,
        horarioId: HORARIO_MELAMINA_ID,
        fechaActualizacion: new Date().toISOString(),
      },
    },
  });
  await dataConnect.executeGraphql(UPDATE_GRUPO_MODULO_MUTATION, {
    variables: {
      id: melaminaGrupoModulo.id,
      data: {
        nombre: melaminaName,
        grupoId: MELAMINA_GROUP_ID,
        moduloId: MELAMINA_MODULE_ID,
        orden: melaminaGrupoModulo.orden ?? 1,
        obligatorio: melaminaGrupoModulo.obligatorio ?? true,
        inicio: melaminaGrupoModulo.inicio ?? null,
        fin: melaminaGrupoModulo.fin ?? null,
        calendarioId: melaminaGrupoModulo.calendarioId ?? null,
      },
    },
  });
  const melaminaUnidades = await replaceGrupoModuloUnidades(melaminaGrupoModulo.id, MELAMINA_MODULE_ID);

  await dataConnect.executeGraphql(UPDATE_GRUPO_MUTATION, {
    variables: {
      id: MANTENIMIENTO_GROUP_ID,
      data: {
        nombreDisplay: mantenimientoName,
        paqueteId: MANTENIMIENTO_PACKAGE_ID,
        turnoId: TURNO_NOCHE_ID,
        turnoNombre: turnoNoche.nombre,
        horarioId: HORARIO_MANTENIMIENTO_ID,
        fechaActualizacion: new Date().toISOString(),
      },
    },
  });
  await dataConnect.executeGraphql(UPDATE_GRUPO_MODULO_MUTATION, {
    variables: {
      id: mantenimientoGrupoModulo.id,
      data: {
        nombre: mantenimientoName,
        grupoId: MANTENIMIENTO_GROUP_ID,
        moduloId: MANTENIMIENTO_MODULE_ID,
        orden: mantenimientoGrupoModulo.orden ?? 1,
        obligatorio: mantenimientoGrupoModulo.obligatorio ?? true,
        inicio: mantenimientoGrupoModulo.inicio ?? null,
        fin: mantenimientoGrupoModulo.fin ?? null,
        calendarioId: mantenimientoGrupoModulo.calendarioId ?? null,
      },
    },
  });
  const mantenimientoUnidades = await replaceGrupoModuloUnidades(mantenimientoGrupoModulo.id, MANTENIMIENTO_MODULE_ID);

  const nextCodigo = await createCodigoAllocator();
  let created = 0;
  let reused = 0;
  for (const oldMatricula of sourceMatriculas) {
    const result = await createMantenimientoMatricula({
      oldMatricula,
      targetGroup: mantenimientoGroup,
      nextCodigo,
    });
    if (result.reused) reused += 1;
    else created += 1;
  }

  console.log("Migracion aplicada.");
  console.log(`Grupo #${MELAMINA_GROUP_ID} actualizado. Unidades: ${melaminaUnidades}`);
  console.log(`Grupo #${MANTENIMIENTO_GROUP_ID} actualizado. Unidades: ${mantenimientoUnidades}`);
  console.log(`Matriculas mantenimiento nuevas: ${created}`);
  console.log(`Matriculas mantenimiento reutilizadas: ${reused}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
