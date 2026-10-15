const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function declarations(file, names) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  return names.map(name => {
    const statement = source.statements.find(node =>
      ts.isVariableStatement(node) && node.declarationList.declarations.some(item => item.name.getText(source) === name));
    assert.ok(statement, `${name} missing from ${file}`);
    return statement.getText(source).replace(/^export /, '');
  }).join('\n');
}

const source = declarations('src/components/intranet/grupos/personalName.ts', [
  'normalizeSpaces', 'normalizeComparable', 'SECOND_NAME_EXCEPTIONS', 'toTitleToken', 'inferApellidoPaterno', 'getPersonalShortName',
]) + declarations('src/components/intranet/grupos/nombres.ts', [
  'tituloModulo', 'tituloModulos', 'tituloModulosAgrupadosAnterior', 'nombreGrupoCalculado', 'isNombreGrupoGenerado',
]);
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const { nombreGrupoCalculado, isNombreGrupoGenerado } = vm.runInNewContext(
  `${compiled}\n({ nombreGrupoCalculado, isNombreGrupoGenerado })`,
);
const melamina = { moduloId: 32, orden: 1, instancia: 1, sufijo: null,
  modulo: { titulo: 'Confecciones de Muebles en Melamine', tituloComercial: 'Carpintería en Melamina' } };
const madera = { moduloId: 31, orden: 2, instancia: 1, sufijo: '(oct-dic)',
  modulo: { titulo: 'Mantenimiento de Carpintería', tituloComercial: 'Carpintería en Madera' } };
const grupo = { nombreDisplay: 'Carpintería en Melamina [Noche] Lun, Mie, @Vie (Richard Ramos)',
  turno: { nombre: 'Noche' }, horario: { nombre: 'Lun, Mie, @Vie' },
  personal: { displayName: 'Richard Ramos Ipanaque', user: { apellidoPaterno: 'Ramos' } }, grupoModulos: [melamina] };
assert.equal(isNombreGrupoGenerado(grupo), true, 'The legacy generated commercial name should be replaced in the form');
assert.equal(nombreGrupoCalculado(grupo.grupoModulos, 'Noche', 'Lun, Mie, @Vie', 'Richard Ramos'),
  'Confecciones de Muebles en Melamine [Noche] Lun, Mie, @Vie (Richard Ramos)');
assert.equal(nombreGrupoCalculado([melamina, madera], 'Noche', 'Lun - Vie', 'Richard Ramos'),
  'Confecciones de Muebles en Melamine / Mantenimiento de Carpintería (oct-dic) [Noche] Lun - Vie (Richard Ramos)');
assert.equal(isNombreGrupoGenerado({ ...grupo, nombreDisplay: 'Grupo especial de Richard' }), false,
  'A manually entered group name must remain editable without being replaced automatically');
assert.equal(isNombreGrupoGenerado({ ...grupo, nombreDisplay: null }), true,
  'A group without a stored display name should use its calculated name');
assert.equal(isNombreGrupoGenerado({ ...grupo, grupoModulos: [melamina, { ...melamina, instancia: 2, orden: 2 }],
  nombreDisplay: 'Carpintería en Melamina x2 [Noche] Lun, Mie, @Vie (Richard Ramos)' }), true,
  'Legacy repeated-module names must be recognized before switching to per-instance suffixes');
console.log('Passed: academic titles and per-module suffixes appear in group names; generated legacy and manual names are distinguished.');
