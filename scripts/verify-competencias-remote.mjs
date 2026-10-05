import assert from 'node:assert/strict';

for (const name of ['listCompetencias','listCompetenciaFormularioOpciones','listCompetenciaOpciones','createOrUpdateCompetencia','listEstructuraAcademica','getRegistroAuxiliar','getUnidadDidactica','getMatricula','generateReporteDocumento']) {
  const response = await fetch(`https://us-central1-cetprosmp-2026.cloudfunctions.net/${name}`, {
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{id:1,grupoModuloId:1}}),
  });
  const body = await response.json();
  assert.equal(response.status,401,`${name} debe exigir autenticacion y estar accesible al cliente`);
  assert.equal(body.error.status,'UNAUTHENTICATED');
}
const page = await fetch('https://cetprosmp-2026.web.app/intranet/competencias');
assert.equal(page.status,200);
console.log('Funciones remotas accesibles con autenticacion obligatoria; ruta de Competencias publicada.');
