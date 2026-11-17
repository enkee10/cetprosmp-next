import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lookupIdentityDocument } from './documentLookup.js';
import { getIdentityDocumentType, getIdentityDocumentError, normalizeIdentityDate, validateManualStudent } from '../../shared/identityDocument.js';

const dni = '12345678';
const ce = '001234567';
const factiliza = (numero = dni) => ({ status: 200, success: true, message: 'Exito', data: {
  numero, nombres: 'ALUMNO', apellido_paterno: 'PRUEBA', apellido_materno: 'LOCAL',
  fecha_nacimiento: '', sexo: '', direccion: 'DIRECCIÓN DE PRUEBA',
} });
const perudevs = { estado: true, resultado: { id: dni, nombres: 'RESPALDO', apellido_paterno: 'PRUEBA', fecha_nacimiento: '03/02/2010', genero: 'M' } };
function options(responses: Array<Response | Error>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const request = (async (url, init) => {
    calls.push({ url: String(url), init });
    const response = responses.shift();
    if (response instanceof Error) throw response;
    assert.ok(response, 'No se esperaban más consultas');
    return response;
  }) as typeof fetch;
  return { request, calls, factilizaToken: 'test-token', peruDevsKey: 'test-key' };
}

test('detects DNI/CE without dropping leading zeros or truncating an invalid DNI', () => {
  assert.equal(getIdentityDocumentType(dni), 'DNI');
  assert.equal(getIdentityDocumentType(ce), 'CE');
  for (const invalid of ['123456789', '1234567', '0012345678', '1234567a']) assert.equal(getIdentityDocumentType(invalid), null);
  assert.match(getIdentityDocumentError('123456789')!, /comenzar con 0/);
  assert.equal(normalizeIdentityDate('31/02/2010'), null);
  assert.equal(normalizeIdentityDate('03/02/2010'), '2010-02-03');
});

test('Factiliza success uses its data only, without requiring birth date or gender', async () => {
  const config = options([Response.json(factiliza())]);
  const result = await lookupIdentityDocument(dni, config);
  assert.equal(result.nombre, 'ALUMNO');
  assert.equal(result.sexo, null);
  assert.equal(result.fechaNacimiento, null);
  assert.equal(result.nacionalidad, null);
  assert.equal(config.calls.length, 1);
  assert.equal(config.calls[0].url, `https://api.factiliza.com/v1/dni/info/${dni}`);
  assert.equal((config.calls[0].init!.headers as Record<string, string>).Authorization, 'Bearer test-token');
});

test('CE uses /cee and accepts the documented response without success; never consults PeruDevs', async () => {
  const payload = factiliza(ce) as Record<string, unknown>;
  delete payload.success;
  const config = options([Response.json(payload)]);
  assert.equal((await lookupIdentityDocument(ce, config)).nombre, 'ALUMNO');
  assert.match(config.calls[0].url, /\/cee\/info\/001234567$/);
  const failure = options([Response.json({ status: 400, message: 'Saldo vencido' })]);
  await assert.rejects(lookupIdentityDocument(ce, failure), (error: unknown) =>
    Boolean((error as { details: { manualEntryRequired: boolean } }).details.manualEntryRequired));
  assert.equal(failure.calls.length, 1);
});

test('every Factiliza failure falls back to PeruDevs for DNI', async () => {
  for (const failure of [
    Response.json({ status: 400, success: false, message: 'Saldo vencido' }),
    Response.json({ status: 200, success: true, message: 'Tiempo de saldo vencido', data: factiliza().data }),
    Response.json({ status: 401 }, { status: 401 }),
    Response.json({ status: 200, success: false, message: 'Error' }),
    Response.json({ status: 200, success: true, data: {} }),
    Response.json(factiliza('87654321')),
    new Response('not JSON'), new TypeError('network'), new DOMException('timeout', 'TimeoutError'),
  ]) {
    const config = options([failure, Response.json(perudevs)]);
    const result = await lookupIdentityDocument(dni, config);
    assert.equal(result.nombre, 'RESPALDO');
    assert.equal(result.fechaNacimiento, '2010-02-03');
    assert.equal(result.direccion, undefined, 'No mezclar información de otra fuente');
    assert.equal(config.calls.length, 2);
    const fallback = new URL(config.calls[1].url);
    assert.equal(fallback.origin, 'https://api.perudevs.com');
    assert.equal(fallback.searchParams.get('document'), dni);
  }
});

test('both providers failing return a manual-entry marker, never credentials', async () => {
  const config = options([new Error('test-token'), Response.json({ estado: false })]);
  await assert.rejects(lookupIdentityDocument(dni, config), (error: unknown) => {
    const e = error as { message: string; details: { manualEntryRequired: boolean } };
    assert.equal(e.details.manualEntryRequired, true);
    assert.ok(!e.message.includes('test-token'));
    return true;
  });
});

test('manual creation requires only personal essentials and school conditionally; editing requires no fields', () => {
  const student = { nombre: 'ALUMNO', apellidoPaterno: 'PRUEBA', apellidoMaterno: 'LOCAL', fechaNacimiento: '2010-01-01', sexo: 'M' };
  assert.deepEqual(validateManualStudent(student), {});
  assert.equal(Object.keys(validateManualStudent({})).length, 5);
  assert.ok(validateManualStudent({ ...student, instruccion: 'Secundaria en curso..' }).nombreColegio);
  assert.deepEqual(validateManualStudent({ ...student, instruccion: 'Secundaria en curso..', nombreColegio: 'Mi colegio' }), {});
  assert.deepEqual(validateManualStudent({}, false), {});
  assert.deepEqual(validateManualStudent({ nombre: '', sexo: '', fechaNacimiento: '', instruccion: 'Secundaria en curso..', nombreColegio: '' }, false), {});
  assert.ok(validateManualStudent({ fechaNacimiento: '2030-01-01' }, false, '2026-11-17').fechaNacimiento);
});
