import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lookupIdentityDocument } from './documentLookup.js';
import { getDniError, getIdentityDocumentType, normalizeIdentityDate, validateManualStudent } from '../../shared/identityDocument.js';

const dni = '01234567';
const ce = '001234567';
const panel = (number = dni) => ({
  DNI: number, NOMBRES: 'ALUMNO', AP_PAT: 'PRUEBA', AP_MAT: 'LOCAL', FECHA_NAC: '15/06/1990',
  SEXO: '2', DIRECCION: 'DIRECCIÓN DE PRUEBA', UBIGEO_DIR: 'LIMA-LIMA-MIRAFLORES', EST_CIVIL: 'SOLTERO',
});
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
  return { request, calls, panelApiPeruToken: 'test-token', peruDevsKey: 'test-key' };
}

test('detects DNI/CE without dropping leading zeros or truncating an invalid DNI', () => {
  assert.equal(getIdentityDocumentType(dni), 'DNI');
  assert.equal(getIdentityDocumentType(ce), 'CE');
  for (const invalid of ['123456789', '1234567', '0012345678', '1234567a']) assert.equal(getIdentityDocumentType(invalid), null);
  assert.equal(getDniError(dni), null);
  assert.match(getDniError(ce)!, /DNI de 8 dígitos/);
  assert.equal(normalizeIdentityDate('31/02/2010'), null);
  assert.equal(normalizeIdentityDate('03/02/2010'), '2010-02-03');
});

test('Panel API Perú maps its documented response without requesting a second provider', async () => {
  const config = options([Response.json(panel())]);
  const result = await lookupIdentityDocument(dni, config);
  assert.deepEqual(result, {
    nombre: 'ALUMNO', apellidoPaterno: 'PRUEBA', apellidoMaterno: 'LOCAL', fechaNacimiento: '1990-06-15',
    sexo: 'F', direccion: 'DIRECCIÓN DE PRUEBA', distrito: 'MIRAFLORES', estadoCivil: 'Soltero',
  });
  assert.equal(config.calls.length, 1);
  assert.equal(config.calls[0].url, `https://api2.cluzter.dev/api/dni/${dni}`);
  assert.equal((config.calls[0].init!.headers as Record<string, string>).Authorization, 'Bearer test-token');
});

test('accepts a Panel result with optional data missing', async () => {
  const config = options([Response.json({ DNI: dni, NOMBRES: 'ALUMNO', AP_PAT: 'PRUEBA' })]);
  const result = await lookupIdentityDocument(dni, config);
  assert.equal(result.nombre, 'ALUMNO');
  assert.equal(result.sexo, null);
  assert.equal(result.fechaNacimiento, null);
  assert.equal(config.calls.length, 1);
});

test('rejects CE before consulting any provider', async () => {
  const config = options([]);
  await assert.rejects(lookupIdentityDocument(ce, config), { code: 'invalid-argument' });
  assert.equal(config.calls.length, 0);
});

test('Panel API Perú failures fall back to PeruDevs for DNI', async () => {
  for (const failure of [
    Response.json({ message: 'Saldo vencido' }),
    Response.json(panel(), { status: 401 }),
    Response.json({}),
    Response.json(panel('87654321')),
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
