import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { getIdFromKeyOutput } from "../core/userMappers.js";

const SEQUENCE_KEY = "certificadosTitulos.siguienteNumeroCodigoInscripcion";
const REUSE_FROM_KEY = "certificadosTitulos.reutilizarDesdeNumero";
const DEFAULT_REUSE_FROM_NUMBER = 139;
const FIRST_CERTIFICATE_NUMBER = 87;
const MAX_SETTING_INTEGER = 2_147_483_647;
const SEQUENCE_CHANGED = "El consecutivo del certificado cambió durante la operación.";
export const CERTIFICATE_DOCUMENT_CHANGED = "El certificado cambió. Actualiza la lista y vuelve a intentarlo.";
export const CERTIFICATE_SEQUENCE_ATTEMPTS = 8;

type CounterSetting = { id: number; intValue: number | null; stringValue?: string | null; boolValue?: boolean | null; updatedAt?: string | null };
type Sequence = {
  setting: CounterSetting | null; nextNumber: number; releasedNumbers: number[]; reuseReleased: boolean;
  reuseFromSetting: Pick<CounterSetting, "id" | "intValue"> | null; reuseFromNumber: number;
};

export function certificateNumberToIssue(sequence: Sequence) {
  const { nextNumber, releasedNumbers, reuseReleased, reuseFromNumber } = sequence;
  if (reuseReleased) return releasedNumbers.find(number => number >= reuseFromNumber) ?? nextNumber;

  // With general reuse off, only the uninterrupted block ending before nextNumber is eligible.
  let first = nextNumber;
  for (let index = releasedNumbers.length - 1; index >= 0 && releasedNumbers[index] === first - 1; index--) {
    first = releasedNumbers[index];
  }
  return first;
}

export function certificateNumberSettings(sequence: Sequence) {
  const issueNumber = certificateNumberToIssue(sequence);
  return {
    nextNumber: sequence.nextNumber,
    nextReusableNumber: issueNumber === sequence.nextNumber ? null : issueNumber,
    reuseReleased: sequence.reuseReleased,
    reuseFromNumber: sequence.reuseFromNumber,
  };
}

type NewCertificateRecord = {
  codigoInstitucional: string;
  correlativo: number;
  codigoLag: number;
  periodoNumero: number;
  anio: number;
  semestreId: number;
  estudianteId: number | null;
  matriculaId: number;
  grupoModuloId: number;
  moduloEstudianteId: number;
  docenteId: number | null;
  carreraId: number | null;
  generadoEn: string;
  creadoEn: string;
  actualizadoEn: string;
};

type CertificateMutation = {
  bindings: string[];
  variables: Record<string, unknown>;
  fields: string;
};

const READ_SEQUENCE = `
  query ReadCertificateSequence($key: String!, $reuseFromKey: String!) {
    appSettings(where: { settingKey: { eq: $key } }, limit: 1) { id intValue stringValue boolValue updatedAt }
    reuseFromSettings: appSettings(where: { settingKey: { eq: $reuseFromKey } }, limit: 1) { id intValue }
    certificados(orderBy: [{ correlativo: DESC }], limit: 1) { correlativo }
  }
`;

function sortReleasedNumbers(numbers: number[]) {
  return Array.from(new Set(numbers)).sort((a, b) => a - b);
}

export async function readCertificateSequence(): Promise<Sequence> {
  const { data } = await dataConnect.executeGraphql<{
    appSettings: CounterSetting[];
    reuseFromSettings: Array<Pick<CounterSetting, "id" | "intValue">>;
    certificados: { correlativo: number }[];
  }, { key: string; reuseFromKey: string }>(READ_SEQUENCE, { variables: { key: SEQUENCE_KEY, reuseFromKey: REUSE_FROM_KEY } });
  const setting = data.appSettings[0] ?? null;
  const reuseFromSetting = data.reuseFromSettings[0] ?? null;
  const reuseFromNumber = reuseFromSetting?.intValue ?? DEFAULT_REUSE_FROM_NUMBER;
  if (!Number.isInteger(reuseFromNumber) || reuseFromNumber < 1 || reuseFromNumber >= MAX_SETTING_INTEGER) {
    throw new https.HttpsError("internal", "No se pudo leer el número inicial para reutilizar códigos.");
  }
  const stored: unknown = JSON.parse(setting?.stringValue ?? "[]");
  if (!Array.isArray(stored) || stored.some(number => !Number.isInteger(number) || number < 1 || number > MAX_SETTING_INTEGER)) {
    throw new https.HttpsError("internal", "No se pudieron leer los correlativos eliminados.");
  }
  return {
    setting,
    nextNumber: Math.min(MAX_SETTING_INTEGER,
      Math.max(FIRST_CERTIFICATE_NUMBER, (data.certificados[0]?.correlativo ?? 0) + 1, setting?.intValue ?? 0),
    ),
    releasedNumbers: sortReleasedNumbers(stored),
    reuseReleased: setting?.boolValue === true,
    reuseFromSetting,
    reuseFromNumber,
  };
}

export function isCertificateSequenceConflict(error: unknown) {
  const details = error as { message?: string; errors?: unknown; response?: { data?: unknown } };
  const reason = JSON.stringify([details?.message, details?.errors, details?.response?.data]).toLowerCase();
  return [SEQUENCE_CHANGED.toLowerCase(), "duplicate key", "unique", "already exists", "serialization", "could not serialize", "deadlock"]
    .some(message => reason.includes(message));
}

function certificateCounterUpdate(previous: Sequence, updated: Sequence, now: string): CertificateMutation {
  const { setting } = previous;
  const counterBindings = setting
    ? ["$id: Int!", "$previous: Int", "$previousReleased: String", "$previousReuse: Boolean", "$previousUpdatedAt: Timestamp"]
    : ["$key: String!"];
  const bindings = ["$next: Int!", "$released: String!", "$reuse: Boolean!", "$now: Timestamp!", ...counterBindings];
  const variables: Record<string, unknown> = {
    next: updated.nextNumber, released: JSON.stringify(updated.releasedNumbers), reuse: updated.reuseReleased, now,
  };
  const counterData = "intValue: $next, stringValue: $released, boolValue: $reuse, updatedAt: $now";

  const counterWrite = setting ? `
    appSetting_updateMany(
      where: {
        id: { eq: $id }, intValue: { eq: $previous },
        stringValue: { eq: $previousReleased }, boolValue: { eq: $previousReuse }, updatedAt: { eq: $previousUpdatedAt }
      }
      data: { ${counterData} }
    ) @check(expr: "this == 1", message: "${SEQUENCE_CHANGED}")
  ` : `
    appSetting_insert(data: {
      settingKey: $key, section: "certificadosTitulos", label: "Siguiente número de código de inscripción", ${counterData}
    })
  `;
  if (setting) {
    variables.id = setting.id;
    variables.previous = setting.intValue;
    variables.previousReleased = setting.stringValue ?? null;
    variables.previousReuse = setting.boolValue ?? null;
    variables.previousUpdatedAt = setting.updatedAt ?? null;
  } else {
    variables.key = SEQUENCE_KEY;
  }
  return { bindings, variables, fields: counterWrite };
}

async function writeCertificateSequence(...changes: CertificateMutation[]) {
  const bindings = changes.flatMap(change => change.bindings);
  const variables = Object.assign({}, ...changes.map(change => change.variables)) as Record<string, unknown>;
  // Failed checks roll back the counter and the certificate records together.
  const result = await dataConnect.executeGraphql<{ certificado_insert?: unknown }, Record<string, unknown>>(`
    mutation WriteCertificateSequence(${bindings.join(", ")}) @transaction {
      ${changes.map(change => change.fields).join("\n")}
    }
  `, { variables });
  return getIdFromKeyOutput(result.data.certificado_insert);
}

function certificateReuseFromUpdate(sequence: Sequence, reuseFromNumber: number): CertificateMutation {
  const setting = sequence.reuseFromSetting;
  return setting ? {
    bindings: ["$reuseFromId: Int!", "$previousReuseFrom: Int", "$reuseFrom: Int!"],
    variables: { reuseFromId: setting.id, previousReuseFrom: setting.intValue, reuseFrom: reuseFromNumber },
    fields: `reuseFromWrite: appSetting_updateMany(
      where: { id: { eq: $reuseFromId }, intValue: { eq: $previousReuseFrom } }
      data: { intValue: $reuseFrom, updatedAt: $now }
    ) @check(expr: "this == 1", message: "${SEQUENCE_CHANGED}")`,
  } : {
    bindings: ["$reuseFromKey: String!", "$reuseFrom: Int!"],
    variables: { reuseFromKey: REUSE_FROM_KEY, reuseFrom: reuseFromNumber },
    fields: `reuseFromWrite: appSetting_insert(data: {
      settingKey: $reuseFromKey, section: "certificadosTitulos", label: "Reutilizar códigos eliminados desde el número",
      intValue: $reuseFrom, updatedAt: $now
    })`,
  };
}

export async function updateCertificateNumberSettings(requested: unknown, reuseReleased: unknown, reuseFromNumber?: unknown) {
  if (requested !== undefined &&
    (typeof requested !== "number" || !Number.isInteger(requested) || requested < 1 || requested >= MAX_SETTING_INTEGER)) {
    throw new https.HttpsError("invalid-argument", "Ingresa un número entero válido para el siguiente código.");
  }
  if (reuseReleased !== undefined && typeof reuseReleased !== "boolean") {
    throw new https.HttpsError("invalid-argument", "Selecciona una opción válida para reutilizar códigos.");
  }
  if (reuseFromNumber !== undefined &&
    (typeof reuseFromNumber !== "number" || !Number.isInteger(reuseFromNumber) || reuseFromNumber < 1 || reuseFromNumber >= MAX_SETTING_INTEGER)) {
    throw new https.HttpsError("invalid-argument", "Ingresa un número entero positivo válido para reutilizar códigos eliminados.");
  }
  for (let attempt = 0; attempt < CERTIFICATE_SEQUENCE_ATTEMPTS; attempt++) {
    const sequence = await readCertificateSequence();
    if (typeof requested === "number" && requested < sequence.nextNumber) {
      throw new https.HttpsError("failed-precondition",
        `El siguiente número no puede ser menor que ${sequence.nextNumber}.`,
        { minimum: sequence.nextNumber, ...certificateNumberSettings(sequence) });
    }
    const updated = {
      ...sequence,
      nextNumber: typeof requested === "number" ? requested : sequence.nextNumber,
      reuseReleased: typeof reuseReleased === "boolean" ? reuseReleased : sequence.reuseReleased,
      reuseFromNumber: typeof reuseFromNumber === "number" ? reuseFromNumber : sequence.reuseFromNumber,
    };
    const saveReuseFrom = typeof reuseFromNumber === "number" && reuseFromNumber !== sequence.reuseFromSetting?.intValue;
    if (updated.nextNumber === sequence.nextNumber && updated.reuseReleased === sequence.reuseReleased && !saveReuseFrom) {
      return certificateNumberSettings(sequence);
    }
    try {
      await writeCertificateSequence(
        certificateCounterUpdate(sequence, updated, new Date().toISOString()),
        ...(saveReuseFrom ? [certificateReuseFromUpdate(sequence, updated.reuseFromNumber)] : []),
      );
      return certificateNumberSettings(updated);
    } catch (error) {
      if (!isCertificateSequenceConflict(error)) throw error;
    }
  }
  throw new https.HttpsError("aborted", "El consecutivo cambió mientras guardabas. Vuelve a intentarlo.");
}

export async function insertCertificateWithSequence(sequence: Sequence, certificate: NewCertificateRecord) {
  const reusing = certificate.correlativo !== sequence.nextNumber;
  if (!reusing && sequence.nextNumber >= MAX_SETTING_INTEGER) {
    throw new https.HttpsError("failed-precondition", "Se alcanzó el límite de numeración de certificados.");
  }
  const id = await writeCertificateSequence(
    certificateCounterUpdate(sequence, {
      ...sequence,
      nextNumber: reusing ? sequence.nextNumber : sequence.nextNumber + 1,
      releasedNumbers: reusing ? sequence.releasedNumbers.filter(number => number !== certificate.correlativo) : sequence.releasedNumbers,
    }, certificate.generadoEn),
    {
      bindings: [`$certificate: Certificado_Data! @allow(fields: "codigoInstitucional correlativo codigoLag periodoNumero anio semestreId estudianteId matriculaId grupoModuloId moduloEstudianteId docenteId carreraId generadoEn creadoEn actualizadoEn")`],
      variables: { certificate },
      fields: "certificado_insert(data: $certificate)",
    },
  );
  return { id: id ?? 0, ...certificate };
}

export async function deleteCertificateRecords(
  documento: { id: number; pdfPath?: string | null; excelPath?: string | null },
  certificado: { id: number; correlativo: number } | null,
) {
  const records: CertificateMutation = {
    bindings: ["$documentoId: Int!", "$previousPdf: String", "$previousEditable: String"],
    variables: {
      documentoId: documento.id, previousPdf: documento.pdfPath ?? null, previousEditable: documento.excelPath ?? null,
    },
    fields: `
      certificadoTituloDocumento_deleteMany(where: {
        id: { eq: $documentoId }, pdfPath: { eq: $previousPdf }, excelPath: { eq: $previousEditable }
      }) @check(expr: "this == 1", message: "${CERTIFICATE_DOCUMENT_CHANGED}")
    `,
  };
  if (!certificado) {
    await writeCertificateSequence(records);
    return false;
  }

  records.bindings.push("$certificadoId: Int!");
  records.variables.certificadoId = certificado.id;
  records.fields = `
    certificado_deleteMany(where: { id: { eq: $certificadoId } })
      @check(expr: "this == 1", message: "${CERTIFICATE_DOCUMENT_CHANGED}")
    ${records.fields}
  `;
  for (let attempt = 0; attempt < CERTIFICATE_SEQUENCE_ATTEMPTS; attempt++) {
    const sequence = await readCertificateSequence();
    const updated = {
      ...sequence,
      releasedNumbers: sortReleasedNumbers([...sequence.releasedNumbers, certificado.correlativo]),
    };
    try {
      await writeCertificateSequence(certificateCounterUpdate(sequence, updated, new Date().toISOString()), records);
      return updated.reuseReleased
        ? certificado.correlativo >= updated.reuseFromNumber
        : certificado.correlativo >= certificateNumberToIssue(updated) && certificado.correlativo < updated.nextNumber;
    } catch (error) {
      if (!isCertificateSequenceConflict(error)) throw error;
    }
  }
  throw new https.HttpsError("aborted", CERTIFICATE_DOCUMENT_CHANGED);
}
