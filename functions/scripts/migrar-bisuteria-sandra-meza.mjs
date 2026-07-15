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
const { deleteMatriculaTree } = require("../lib/modules/core/matriculaDeletion.js");
const { getDocenteNombreForGrupoModulo } = require("../lib/modules/core/grupoModuloNombre.js");
const {
  DELETE_GRUPO_MODULOS_BY_GRUPO_MUTATION,
  DELETE_GRUPO_MUTATION,
  INSERT_GRUPO_MODULO_MUTATION,
  INSERT_GRUPO_MODULO_UNIDAD_DIDACTICA_MUTATION,
  INSERT_GRUPO_MUTATION,
  INSERT_MATRICULA_MUTATION,
  INSERT_MODULO_ESTUDIANTE_MUTATION,
  INSERT_PAQUETE_MODULO_MUTATION,
  INSERT_PAQUETE_MUTATION,
} = require("../lib/dataconnectOperations.js");

const TARGET_TEACHER = "sandra meza";
const TARGET_GROUP_TOKENS = ["bisuter"];
const OLD_MATRICULA_TOKENS = ["bisuter", "pintura"];
const MODULE_TOKEN = "bisuter";
const SPECIALS = [
  { suffix: "mar-may", packageTitle: "Bisutería (mar-may)" },
  { suffix: "mayo-jul", packageTitle: "Bisutería (mayo-jul)" },
];

const LIST_CONTEXT_QUERY = `
  query ListBisuteriaSandraContext {
    grupos(limit: 5000) {
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
      paquete {
        id
        titulo
      }
      semestre {
        id
        titulo
      }
      turno {
        id
        nombre
      }
      horario {
        id
        nombre
      }
      personal {
        id
        displayName
        user {
          username
          apellidoPaterno
        }
      }
    }
    grupoModulos(limit: 5000) {
      id
      nombre
      grupoId
      moduloId
      orden
      obligatorio
      inicio
      fin
      calendarioId
      modulo {
        id
        titulo
        tituloComercial
      }
    }
    paquetes(limit: 5000) {
      id
      titulo
      archivado
    }
  }
`;

const LIST_UNIDADES_BY_MODULO_QUERY = `
  query ListUnidadesByModulo($moduloId: Int!) {
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

const LIST_MATRICULAS_BY_GRUPO_QUERY = `
  query ListMatriculasByGrupo($grupoId: Int!) {
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

const FIND_MATRICULA_QUERY = `
  query FindMatricula($userId: Int!, $semestreId: Int!, $paqueteId: Int!) {
    matriculas(where: { userId: { eq: $userId }, semestreId: { eq: $semestreId }, paqueteId: { eq: $paqueteId } }, limit: 1) {
      id
    }
  }
`;

const FIND_PAQUETE_MODULO_QUERY = `
  query FindPaqueteModulo($paqueteId: Int!, $moduloId: Int!) {
    paqueteModulos(where: { paqueteId: { eq: $paqueteId }, moduloId: { eq: $moduloId } }, limit: 1) {
      id
    }
  }
`;

const LIST_MATRICULAS_CODIGO_QUERY = `
  query ListMatriculasCodigoBisuteriaFix {
    matriculas(limit: 50000) {
      id
      fecha
      codigoInscripcion
    }
  }
`;

const UPDATE_MATRICULA_CODIGO_MUTATION = `
  mutation UpdateMatriculaCodigoBisuteriaFix($id: Int!, $data: Matricula_Data! @allow(fields: "codigoInscripcion")) {
    matricula_update(id: $id, data: $data)
  }
`;

const CODIGO_PREFIX = "0437863";
const CODIGO_SEQUENCE_WIDTH = 4;
const LIMA_TIME_ZONE = "America/Lima";

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function compactName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function includesAll(text, tokens) {
  const normalized = normalize(text);
  return tokens.every((token) => normalized.includes(token));
}

function getIdFromKeyOutput(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "object") return null;
  const raw = value.id ?? value.key?.id;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function getModuloName(modulo) {
  return compactName(modulo?.titulo || modulo?.tituloComercial || (modulo?.id ? `Modulo ${modulo.id}` : ""));
}

function buildDisplayName(baseModuloName, grupo) {
  const turnoNombre = compactName(grupo?.turno?.nombre || grupo?.turnoNombre);
  const horarioNombre = compactName(grupo?.horario?.nombre);
  const docenteNombre = getDocenteNombreForGrupoModulo(grupo?.personal ?? null);
  return [
    baseModuloName,
    turnoNombre ? `[${turnoNombre}]` : "",
    horarioNombre,
    docenteNombre ? `(${docenteNombre})` : "",
  ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function buildStudentName(user) {
  return [
    user?.apellidoPaterno,
    user?.apellidoMaterno,
    user?.nombre,
  ].filter(Boolean).join(" ").trim() || user?.username || `Usuario ${user?.id ?? ""}`;
}

function getLimaYear(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().getFullYear();
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: LIMA_TIME_ZONE,
    year: "numeric",
  }).format(date));
}

function buildCodigoInscripcion(year, sequence) {
  return `${CODIGO_PREFIX}${String(sequence).padStart(CODIGO_SEQUENCE_WIDTH, "0")}${String(year).slice(-2)}`;
}

function parseCodigoSequence(value, year) {
  const text = String(value ?? "").trim();
  const yearSuffix = String(year).slice(-2);
  if (!text.startsWith(CODIGO_PREFIX) || !text.endsWith(yearSuffix)) return null;
  const rawSequence = text.slice(CODIGO_PREFIX.length, -yearSuffix.length);
  if (!/^\d+$/.test(rawSequence)) return null;
  const sequence = Number(rawSequence);
  return Number.isFinite(sequence) ? sequence : null;
}

async function createCodigoAllocator(year) {
  const response = await dataConnect.executeGraphql(LIST_MATRICULAS_CODIGO_QUERY);
  let nextSequence = 1;
  for (const matricula of response.data.matriculas ?? []) {
    if (getLimaYear(matricula.fecha) !== year) continue;
    const sequence = parseCodigoSequence(matricula.codigoInscripcion, year);
    if (sequence && sequence >= nextSequence) nextSequence = sequence + 1;
  }

  return () => buildCodigoInscripcion(year, nextSequence++);
}

async function findOrCreatePaquete(title, moduloId, paquetesByTitle) {
  const key = normalize(title);
  const existing = paquetesByTitle.get(key);
  if (existing) {
    await ensurePaqueteModulo(existing.id, moduloId);
    return existing.id;
  }

  const created = await dataConnect.executeGraphql(INSERT_PAQUETE_MUTATION, {
    variables: {
      data: {
        titulo: title,
        archivado: false,
      },
    },
  });
  const paqueteId = getIdFromKeyOutput(created.data.paquete_insert);
  if (!paqueteId) throw new Error(`No se pudo crear el paquete ${title}.`);

  await ensurePaqueteModulo(paqueteId, moduloId);

  paquetesByTitle.set(key, { id: paqueteId, titulo: title });
  return paqueteId;
}

async function ensurePaqueteModulo(paqueteId, moduloId) {
  const existing = await dataConnect.executeGraphql(FIND_PAQUETE_MODULO_QUERY, {
    variables: { paqueteId, moduloId },
  });
  if (existing.data.paqueteModulos?.[0]?.id) return existing.data.paqueteModulos[0].id;

  const inserted = await dataConnect.executeGraphql(INSERT_PAQUETE_MODULO_MUTATION, {
    variables: {
      data: {
        paqueteId,
        moduloId,
        orden: 1,
        obligatorio: true,
      },
    },
  });
  const paqueteModuloId = getIdFromKeyOutput(inserted.data.paqueteModulo_insert);
  if (!paqueteModuloId) throw new Error(`No se pudo asociar paquete ${paqueteId} con modulo ${moduloId}.`);
  return paqueteModuloId;
}

async function createGrupoWithModulo({ oldGroup, paqueteId, moduloId, moduloNombre, oldGrupoModulo, unidades }) {
  const now = new Date().toISOString();
  const nombre = buildDisplayName(moduloNombre, oldGroup);
  const created = await dataConnect.executeGraphql(INSERT_GRUPO_MUTATION, {
    variables: {
      data: {
        turnoNombre: oldGroup.turnoNombre ?? oldGroup.turno?.nombre ?? null,
        descripcion: oldGroup.descripcion ?? null,
        nombreDisplay: nombre,
        estado: oldGroup.estado || "activo",
        archivado: false,
        fechaCreacion: now,
        fechaActualizacion: now,
        semestreId: oldGroup.semestreId ?? null,
        personalId: oldGroup.personalId ?? null,
        paqueteId,
        turnoId: oldGroup.turnoId ?? null,
        horarioId: oldGroup.horarioId ?? null,
        grupoOrd: oldGroup.grupoOrd ?? null,
        workspaceName: null,
        workspaceCorreo: null,
      },
    },
  });
  const grupoId = getIdFromKeyOutput(created.data.grupo_insert);
  if (!grupoId) throw new Error(`No se pudo crear el grupo ${nombre}.`);

  const insertedGrupoModulo = await dataConnect.executeGraphql(INSERT_GRUPO_MODULO_MUTATION, {
    variables: {
      data: {
        nombre,
        grupoId,
        moduloId,
        orden: oldGrupoModulo?.orden ?? 1,
        obligatorio: oldGrupoModulo?.obligatorio ?? true,
        inicio: oldGrupoModulo?.inicio ?? null,
        fin: oldGrupoModulo?.fin ?? null,
        calendarioId: oldGrupoModulo?.calendarioId ?? null,
      },
    },
  });
  const grupoModuloId = getIdFromKeyOutput(insertedGrupoModulo.data.grupoModulo_insert);
  if (!grupoModuloId) throw new Error(`No se pudo crear el grupo-modulo ${nombre}.`);

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

  return { grupoId, grupoModuloId, nombre };
}

async function findExistingMatricula(userId, semestreId, paqueteId) {
  const response = await dataConnect.executeGraphql(FIND_MATRICULA_QUERY, {
    variables: { userId, semestreId, paqueteId },
  });
  return response.data.matriculas?.[0]?.id ?? null;
}

async function createMatriculaForStudent({ oldMatricula, paqueteId, grupoId, moduloId, nextCodigoInscripcion }) {
  const existingId = await findExistingMatricula(oldMatricula.userId, oldMatricula.semestreId, paqueteId);
  if (existingId) return { id: existingId, reused: true };

  const created = await dataConnect.executeGraphql(INSERT_MATRICULA_MUTATION, {
    variables: {
      data: {
        recibo: null,
        fecha: oldMatricula.fecha ?? new Date().toISOString(),
        codigoInscripcion: nextCodigoInscripcion(),
        archivado: false,
        paqueteId,
        semestreId: oldMatricula.semestreId,
        userId: oldMatricula.userId,
      },
    },
  });
  const matriculaId = getIdFromKeyOutput(created.data.matricula_insert);
  if (!matriculaId) throw new Error(`No se pudo crear matricula para usuario ${oldMatricula.userId}.`);

  await dataConnect.executeGraphql(INSERT_MODULO_ESTUDIANTE_MUTATION, {
    variables: {
      data: {
        promedio: null,
        puntaje: null,
        matriculaId,
        moduloId,
        grupoId,
      },
    },
  });

  return { id: matriculaId, reused: false };
}

async function main() {
  const contextResponse = await dataConnect.executeGraphql(LIST_CONTEXT_QUERY);
  const grupos = contextResponse.data.grupos ?? [];
  const grupoModulos = contextResponse.data.grupoModulos ?? [];
  const paquetesByTitle = new Map(
    (contextResponse.data.paquetes ?? []).map((item) => [normalize(item.titulo), item]),
  );

  const candidates = grupos.filter((grupo) => {
    const paqueteTitulo = grupo.paquete?.titulo ?? "";
    const teacherText = [
      grupo.personal?.displayName,
      grupo.personal?.user?.username,
      grupo.nombreDisplay,
    ].join(" ");
    const groupText = [grupo.nombreDisplay, paqueteTitulo].join(" ");
    return !grupo.archivado
      && includesAll(groupText, TARGET_GROUP_TOKENS)
      && normalize(teacherText).includes(TARGET_TEACHER);
  });

  if (candidates.length !== 1) {
    console.log(`Candidatos encontrados: ${candidates.length}`);
    for (const grupo of candidates) {
      console.log(`#${grupo.id}: ${grupo.nombreDisplay} | paquete=${grupo.paquete?.titulo ?? ""}`);
    }
    throw new Error("No se encontro exactamente un grupo candidato. No se aplico nada.");
  }

  const oldGroup = candidates[0];
  const oldGrupoModulos = grupoModulos.filter((item) => item.grupoId === oldGroup.id);
  const bisuteriaGrupoModulo = oldGrupoModulos.find((item) =>
    normalize(getModuloName(item.modulo)).includes(MODULE_TOKEN)
  );
  if (!bisuteriaGrupoModulo) {
    throw new Error("No se encontro el modulo Bisuteria dentro del grupo candidato.");
  }

  const moduloId = bisuteriaGrupoModulo.moduloId;
  const unidadesResponse = await dataConnect.executeGraphql(LIST_UNIDADES_BY_MODULO_QUERY, { variables: { moduloId } });
  const unidades = (unidadesResponse.data.unidadDidacticaModulos ?? [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.unidadDidacticaId - b.unidadDidacticaId);

  const matriculasResponse = await dataConnect.executeGraphql(LIST_MATRICULAS_BY_GRUPO_QUERY, {
    variables: { grupoId: oldGroup.id },
  });
  const matriculasById = new Map();
  for (const item of matriculasResponse.data.modulosEstudiantes ?? []) {
    if (!item.matricula?.id || !item.matricula.userId) continue;
    matriculasById.set(item.matricula.id, item.matricula);
  }
  const oldMatriculas = Array.from(matriculasById.values())
    .filter((item) => item.archivado !== true)
    .sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const matriculaModuleText = (matriculasResponse.data.modulosEstudiantes ?? [])
    .map((item) => getModuloName(item.modulo))
    .join(" ");
  if (!includesAll(matriculaModuleText, OLD_MATRICULA_TOKENS)) {
    throw new Error("El grupo candidato no contiene matriculas con Bisuteria y Pintura Decorativa. No se aplico nada.");
  }

  console.log(`Grupo anterior: #${oldGroup.id} ${oldGroup.nombreDisplay}`);
  console.log(`Paquete anterior: #${oldGroup.paqueteId} ${oldGroup.paquete?.titulo ?? ""}`);
  console.log(`Modulo base: #${moduloId} ${getModuloName(bisuteriaGrupoModulo.modulo)}`);
  console.log(`Unidades didacticas a copiar: ${unidades.length}`);
  console.log(`Matriculas/estudiantes a migrar: ${oldMatriculas.length}`);
  for (const matricula of oldMatriculas.slice(0, 10)) {
    console.log(`- Matricula #${matricula.id}: ${buildStudentName(matricula.user)} | user #${matricula.userId}`);
  }
  if (oldMatriculas.length > 10) console.log(`... y ${oldMatriculas.length - 10} mas`);

  for (const special of SPECIALS) {
    console.log(`Nuevo paquete/grupo: ${special.packageTitle} -> ${buildDisplayName(special.packageTitle, oldGroup)}`);
  }

  if (!APPLY) {
    console.log("Modo vista previa. Ejecuta con --apply para aplicar en local.");
    return;
  }

  const createdGroups = [];
  for (const special of SPECIALS) {
    const paqueteId = await findOrCreatePaquete(special.packageTitle, moduloId, paquetesByTitle);
    const group = await createGrupoWithModulo({
      oldGroup,
      paqueteId,
      moduloId,
      moduloNombre: special.packageTitle,
      oldGrupoModulo: bisuteriaGrupoModulo,
      unidades,
    });
    createdGroups.push({ ...group, paqueteId, packageTitle: special.packageTitle });
  }

  let createdMatriculas = 0;
  let reusedMatriculas = 0;
  const firstMatriculaYear = getLimaYear(oldMatriculas[0]?.fecha);
  const nextCodigoInscripcion = await createCodigoAllocator(firstMatriculaYear);
  for (const oldMatricula of oldMatriculas) {
    for (const group of createdGroups) {
      const result = await createMatriculaForStudent({
        oldMatricula,
        paqueteId: group.paqueteId,
        grupoId: group.grupoId,
        moduloId,
        nextCodigoInscripcion,
      });
      if (result.reused) reusedMatriculas += 1;
      else createdMatriculas += 1;
    }
  }

  for (const oldMatricula of oldMatriculas) {
    await deleteMatriculaTree(oldMatricula.id);
  }

  await dataConnect.executeGraphql(DELETE_GRUPO_MODULOS_BY_GRUPO_MUTATION, {
    variables: { grupoId: oldGroup.id },
  });
  await dataConnect.executeGraphql(DELETE_GRUPO_MUTATION, {
    variables: { id: oldGroup.id },
  });

  console.log("Migracion aplicada.");
  console.log(`Grupos creados: ${createdGroups.map((item) => `#${item.grupoId} ${item.nombre}`).join(" | ")}`);
  console.log(`Matriculas nuevas: ${createdMatriculas}`);
  console.log(`Matriculas reutilizadas: ${reusedMatriculas}`);
  console.log(`Matriculas antiguas eliminadas: ${oldMatriculas.length}`);
  console.log(`Grupo antiguo eliminado: #${oldGroup.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
