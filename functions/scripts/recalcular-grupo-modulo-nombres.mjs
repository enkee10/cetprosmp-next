#!/usr/bin/env node

import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const PROJECT_ID = "cetprosmp-2026";
const APPLY = process.argv.includes("--apply");

if (!process.argv.includes("--emulator")) {
  delete process.env.DATA_CONNECT_EMULATOR_HOST;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
}

process.env.GCLOUD_PROJECT ||= PROJECT_ID;
process.env.GOOGLE_CLOUD_PROJECT ||= PROJECT_ID;

const { dataConnect } = require("../lib/modules/core/dataConnectCore.js");
const { buildGrupoModuloNombreRelacional } = require("../lib/modules/core/grupoModuloNombre.js");

const LIST_GRUPO_MODULOS_NOMBRE_QUERY = `
  query ListGrupoModulosParaRecalcularNombre {
    grupoModulos(limit: 10000) {
      id
      nombre
      grupoId
      grupo {
        id
        turnoNombre
        semestre {
          titulo
        }
        turno {
          nombre
        }
        horario {
          nombre
        }
        personal {
          displayName
          user {
            username
            apellidoPaterno
          }
        }
      }
      moduloId
      modulo {
        id
        titulo
        tituloComercial
      }
    }
  }
`;

const UPDATE_GRUPO_MODULO_NOMBRE_MUTATION = `
  mutation UpdateGrupoModuloNombre($id: Int!, $data: GrupoModulo_Data! @allow(fields: "nombre")) {
    grupoModulo_update(id: $id, data: $data)
  }
`;

function normalize(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

async function main() {
  const response = await dataConnect.executeGraphql(LIST_GRUPO_MODULOS_NOMBRE_QUERY);
  const grupoModulos = response.data.grupoModulos ?? [];
  const changes = grupoModulos
    .map((item) => {
      const nextNombre = normalize(buildGrupoModuloNombreRelacional(item.grupo, item.modulo));
      return {
        id: item.id,
        grupoId: item.grupoId,
        moduloId: item.moduloId,
        previousNombre: normalize(item.nombre),
        nextNombre,
      };
    })
    .filter((item) => item.nextNombre && item.previousNombre !== item.nextNombre);

  console.log(`Grupo-modulos leidos: ${grupoModulos.length}`);
  console.log(`Nombres por actualizar: ${changes.length}`);
  for (const item of changes.slice(0, 10)) {
    console.log(`#${item.id}: "${item.previousNombre}" -> "${item.nextNombre}"`);
  }

  if (!APPLY) {
    console.log("Modo vista previa. Ejecuta con --apply para aplicar cambios.");
    return;
  }

  for (const item of changes) {
    await dataConnect.executeGraphql(UPDATE_GRUPO_MODULO_NOMBRE_MUTATION, {
      variables: {
        id: item.id,
        data: { nombre: item.nextNombre },
      },
    });
  }

  console.log(`Actualizados: ${changes.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
