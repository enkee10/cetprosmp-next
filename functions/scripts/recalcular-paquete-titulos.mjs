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

const LIST_PAQUETES_TITULOS_QUERY = `
  query ListPaquetesParaRecalcularTitulos {
    paquetes(limit: 10000) {
      id
      titulo
    }
    paqueteModulos(limit: 30000) {
      id
      orden
      paqueteId
      moduloId
      modulo {
        id
        titulo
        tituloComercial
      }
    }
  }
`;

const UPDATE_PAQUETE_TITULO_MUTATION = `
  mutation UpdatePaqueteTitulo($id: Int!, $data: Paquete_Data! @allow(fields: "titulo")) {
    paquete_update(id: $id, data: $data)
  }
`;

function normalize(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function moduloLabel(item) {
  return normalize(item?.modulo?.tituloComercial || item?.modulo?.titulo || `Modulo ${item.moduloId}`);
}

function buildPaqueteTitulo(items) {
  return items
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId)
    .map(moduloLabel)
    .filter(Boolean)
    .join(" / ");
}

async function main() {
  const response = await dataConnect.executeGraphql(LIST_PAQUETES_TITULOS_QUERY);
  const paquetes = response.data.paquetes ?? [];
  const paqueteModulos = response.data.paqueteModulos ?? [];
  const modulosByPaqueteId = new Map();

  for (const item of paqueteModulos) {
    const current = modulosByPaqueteId.get(item.paqueteId) ?? [];
    current.push(item);
    modulosByPaqueteId.set(item.paqueteId, current);
  }

  const changes = paquetes
    .map((paquete) => {
      const nextTitulo = normalize(buildPaqueteTitulo(modulosByPaqueteId.get(paquete.id) ?? []));
      return {
        id: paquete.id,
        previousTitulo: normalize(paquete.titulo),
        nextTitulo,
      };
    })
    .filter((item) => item.nextTitulo && item.previousTitulo !== item.nextTitulo);

  console.log(`Paquetes leidos: ${paquetes.length}`);
  console.log(`Paquetes por actualizar: ${changes.length}`);
  for (const item of changes.slice(0, 15)) {
    console.log(`Paquete #${item.id}: "${item.previousTitulo}" -> "${item.nextTitulo}"`);
  }

  if (!APPLY) {
    console.log("Modo vista previa. Ejecuta con --apply para aplicar cambios.");
    return;
  }

  for (const item of changes) {
    await dataConnect.executeGraphql(UPDATE_PAQUETE_TITULO_MUTATION, {
      variables: {
        id: item.id,
        data: { titulo: item.nextTitulo },
      },
    });
  }

  console.log(`Paquetes actualizados: ${changes.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
