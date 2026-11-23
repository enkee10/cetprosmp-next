const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('functions/src/modules/reportes/certificateSequence.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
const sequenceKey = 'certificadosTitulos.siguienteNumeroCodigoInscripcion';
const thresholdKey = 'certificadosTitulos.reutilizarDesdeNumero';
const stored = new Map();
const mutations = new Map();
let writes = 0;
let revision = 0;
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
function reset(reuse = false, threshold) {
  stored.clear(); writes = 0;
  stored.set(sequenceKey, { id: 1, intValue: 140, boolValue: reuse, stringValue: '[89,90,91,92,139]', updatedAt: `2026-11-22T10:00:00.${String(++revision).padStart(3, '0')}Z` });
  if (threshold !== undefined) stored.set(thresholdKey, { id: 2, intValue: threshold });
}
new Function('module', 'exports', 'require', code)(mod, mod.exports, name => {
  if (name === 'firebase-functions/v1') return { https: { HttpsError } };
  if (name === '../core/userMappers.js') return { getIdFromKeyOutput: value => value?.id ?? null };
  if (name === '../core/dataConnectCore.js') return { dataConnect: { executeGraphql: async (query, { variables } = {}) => {
    if (query.includes('query ReadCertificateSequence')) return { data: {
      appSettings: stored.has(sequenceKey) ? [structuredClone(stored.get(sequenceKey))] : [],
      reuseFromSettings: stored.has(thresholdKey) ? [structuredClone(stored.get(thresholdKey))] : [],
      certificados: [{ correlativo: 138 }],
    } };
    assert(query.includes('@transaction'), 'Counter and threshold are saved atomically');
    const mode = variables.reuseFrom === undefined ? 'counter' : variables.reuseFromId ? 'thresholdUpdate' : 'thresholdInsert';
    mutations.set(mode, query);
    const previous = stored.get(sequenceKey);
    if (variables.id && (previous.intValue !== variables.previous || previous.stringValue !== variables.previousReleased
      || previous.boolValue !== variables.previousReuse || previous.updatedAt !== variables.previousUpdatedAt)) {
      throw new HttpsError('aborted', 'El consecutivo del certificado cambió durante la operación.');
    }
    const next = { ...previous, intValue: variables.next, stringValue: variables.released, boolValue: variables.reuse,
      updatedAt: `2026-11-22T11:00:00.${String(++revision).padStart(3, '0')}Z` };
    if (variables.reuseFrom !== undefined) stored.set(thresholdKey, { id: 2, intValue: variables.reuseFrom });
    if (variables.next !== undefined) stored.set(sequenceKey, next);
    writes++;
    return { data: { certificado_insert: variables.certificate ? { id: 100 } : undefined } };
  } } };
  throw Error(`Unexpected dependency ${name}`);
});
const api = mod.exports;

async function main() {
  reset();
  let sequence = await api.readCertificateSequence();
  assert.equal(sequence.reuseFromNumber, 139, 'Existing installations default to 139');
  assert.equal(api.certificateNumberToIssue({ ...sequence, reuseReleased: true }), 139);
  assert.equal(api.certificateNumberToIssue({ ...sequence, reuseReleased: true, reuseFromNumber: 91 }), 91);
  assert.equal(api.certificateNumberToIssue({ ...sequence, reuseReleased: true, reuseFromNumber: 140 }), 140);
  assert.equal(api.certificateNumberToIssue({ ...sequence, reuseFromNumber: 999 }), 139, 'Disabled mode retains consecutive-tail reuse');
  assert.equal(api.certificateNumberToIssue({ ...sequence, releasedNumbers: [89, 90, 92, 138] }), 140);
  assert.equal(api.certificateNumberToIssue({ ...sequence, releasedNumbers: [137, 138, 139] }), 137);
  assert.equal(api.certificateNumberToIssue({ ...sequence, reuseReleased: true, releasedNumbers: [], reuseFromNumber: 91 }), 140, 'No gaps are invented');

  const initial = await api.updateCertificateNumberSettings(undefined, undefined, 139);
  assert.equal(initial.reuseReleased, false, 'Initializing the input does not enable reuse');
  assert.equal(stored.get(thresholdKey).intValue, 139);
  assert.equal(initial.nextNumber, 140);
  assert.equal(initial.nextReusableNumber, 139);
  const initialPool = stored.get(sequenceKey).stringValue;
  let result = await api.updateCertificateNumberSettings(undefined, true, 91);
  assert.equal(result.nextReusableNumber, 91);
  assert.equal(result.reuseFromNumber, 91);
  assert.equal(stored.get(sequenceKey).stringValue, initialPool, 'Excluded codes stay available for a future lower threshold');
  sequence = await api.readCertificateSequence();
  await api.insertCertificateWithSequence(sequence, { correlativo: 91, generadoEn: '2026-11-22T12:00:00.000Z' });
  assert.deepEqual(JSON.parse(stored.get(sequenceKey).stringValue), [89, 90, 92, 139]);
  assert.equal(stored.get(sequenceKey).intValue, 140, 'Reusing does not advance the regular counter');
  assert.equal((await api.readCertificateSequence()).reuseFromNumber, 91);

  reset(true, 139);
  const stale = await api.readCertificateSequence();
  await api.updateCertificateNumberSettings(undefined, undefined, 140);
  await assert.rejects(() => api.insertCertificateWithSequence(stale, { correlativo: 139, generadoEn: '2026-11-22T12:00:00.000Z' }), /consecutivo/);
  assert.deepEqual(JSON.parse(stored.get(sequenceKey).stringValue), [89, 90, 91, 92, 139], 'A stale issuance cannot consume an excluded code');
  sequence = await api.readCertificateSequence();
  assert.equal(api.certificateNumberToIssue(sequence), 140);
  await api.insertCertificateWithSequence(sequence, { correlativo: 140, generadoEn: '2026-11-22T12:00:00.000Z' });
  assert.equal(stored.get(sequenceKey).intValue, 141);
  assert.equal(stored.get(thresholdKey).intValue, 140);

  reset(true, 139);
  assert.equal(await api.deleteCertificateRecords({ id: 10 }, { id: 11, correlativo: 88 }), false);
  assert(JSON.parse(stored.get(sequenceKey).stringValue).includes(88), 'Deleting below the threshold still saves the number');
  assert.equal(await api.deleteCertificateRecords({ id: 12 }, { id: 13, correlativo: 138 }), false);
  assert.equal(await api.deleteCertificateRecords({ id: 14 }, { id: 15, correlativo: 139 }), true);
  reset(false, 139);
  assert.equal(await api.deleteCertificateRecords({ id: 16 }, { id: 17, correlativo: 138 }), true);

  const beforeWrites = writes;
  for (const value of [0, -1, 1.5, '139', null, NaN, Infinity, 2_147_483_647]) {
    await assert.rejects(() => api.updateCertificateNumberSettings(undefined, undefined, value), error => error.code === 'invalid-argument');
  }
  assert.equal(writes, beforeWrites);
  await assert.rejects(() => api.updateCertificateNumberSettings(139, undefined, 139), error => error.code === 'failed-precondition');
  result = await api.updateCertificateNumberSettings(undefined, true, 1);
  assert.equal(result.reuseFromNumber, 1);
  result = await api.updateCertificateNumberSettings(undefined, undefined, 2_147_483_646);
  assert.equal(result.nextReusableNumber, null);
  reset(false, null);
  await api.updateCertificateNumberSettings(undefined, undefined, 139);
  assert.equal(stored.get(thresholdKey).intValue, 139, 'An explicitly saved default replaces an empty stored value');

  if (process.argv.includes('--validation-operations')) {
    const readQuery = source.match(/const READ_SEQUENCE = `([\s\S]*?)`;/)[1];
    const output = [readQuery, ...[...mutations.entries()].map(([mode, query]) => query.replace('WriteCertificateSequence(', `ValidateCertificateSequence_${mode}(`))];
    fs.writeFileSync('dataconnect/example/certificate-sequence.validation.gql', output.map(query => query.replace(/\)\s*(?=@transaction|\{)/, ') @auth(level: NO_ACCESS) ')).join('\n'));
  }
  console.log('Correlativos: mínimo inclusivo 139, guardado/recarga, conservación de eliminados, emisión, retiro, validación y conflicto concurrente: correctos.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
