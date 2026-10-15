import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { validarInstancias } from './configuracion.js';

test('new repeated modules need different suffixes on consecutive instances', () => {
  assert.throws(() => validarInstancias([{moduloId:1,instancia:1},{moduloId:1,instancia:2}]), /sufijo/);
  assert.throws(() => validarInstancias([{moduloId:1,instancia:1,sufijo:'A'},{moduloId:1,instancia:2,sufijo:'a'}]), /sufijo/);
  assert.throws(() => validarInstancias([{moduloId:1,instancia:1},{moduloId:1,instancia:1}]), /repetida/);
  assert.throws(() => validarInstancias([{moduloId:1,instancia:2}]), /consecutivamente/);
  validarInstancias([{moduloId:1,instancia:1,sufijo:'A'}]);
  validarInstancias([{moduloId:1,instancia:1}]);
  validarInstancias([{moduloId:1,instancia:1,sufijo:'A'},{moduloId:2,instancia:1,sufijo:'A'}]);
  validarInstancias([{moduloId:1,instancia:1,sufijo:'A'},{moduloId:1,instancia:2,sufijo:'B'}]);
});

test('existing configurations without suffixes remain unchanged; adding an instance requires suffixes', () => {
  const old = [{moduloId:1,instancia:1},{moduloId:1,instancia:2}];
  validarInstancias(old,old);
  assert.throws(() => validarInstancias([...old,{moduloId:1,instancia:3,sufijo:'C'}],old), /sufijo/);
  assert.throws(() => validarInstancias(Array.from({length:7},(_,i)=>({moduloId:i+1,instancia:1}))), /entre 1 y 6/);
});
