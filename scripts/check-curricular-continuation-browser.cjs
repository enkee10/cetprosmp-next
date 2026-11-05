const assert = require('node:assert/strict');
module.exports = async ({ page, card, resolve, reject }) => {
  const load = async () => {
    await page.goto('http://127.0.0.1:3001/?continuation');
    await card('modulo', 1).click();
    await card('competencia', 10).click();
    await card('actividad', 60).waitFor();
    assert.equal(await card('competencia', 110).locator('[draggable="true"]').count(), 0, 'The continuation cannot be reordered');
    assert.equal(await card('competencia', 110).getAttribute('data-academic-continuacion-id'), '70');
  };
  const comp = { id: 110, nombre: 'Competencia anterior', tipo: 'TECNICA', orden: 1, moduloId: 1 };
  const creations = [
    { entity: 'unidadDidactica', id: 120, item: { id: 120, nombre: '' }, unitAssignments: [{ id: 121, unidadDidacticaId: 120, competenciaId: 110, competenciaContinuacionId: 70, competenciaContinuacionPlanId: 5, orden: 1, competencia: comp }] },
    { entity: 'capacidadTerminal', id: 130, item: { id: 130, descripcion: '', orden: 1, unidadDidacticaId: 120 } },
    { entity: 'indicadorCapacidad', id: 140, item: { id: 140, descripcion: '', orden: 1, capacidadTerminalId: 130 } },
    { entity: 'aprendizaje', id: 150, item: { id: 150, descripcion: '', orden: 1, indicadorCapacidadId: 140 } },
  ];
  const cases = [
    ['competenciaUnidadDidactica', 21, 10, 110, 0],
    ['capacidadTerminal', 30, 20, 120, 1],
    ['indicadorCapacidad', 40, 30, 130, 2],
    ['actividad', 60, 50, 150, 4],
  ];
  for (const [entity, id, previousParentId, parentId, count] of cases) {
    await load();
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    await card(entity, id).locator('[draggable="true"]').dispatchEvent('dragstart', { dataTransfer: transfer });
    await card('competencia', 110).dispatchEvent('dragover', { dataTransfer: transfer });
    await card('competencia', 110).dispatchEvent('drop', { dataTransfer: transfer });
    await page.waitForFunction(() => window.requests.length === 1);
    const input = await page.evaluate(() => window.requests[0].input);
    assert.deepEqual(input, { entity, id, previousParentId, parentId: 110,
      ...(count ? { targetAncestor: { entity: 'competencia', id: 110, continuacionId: 70 } } : { targetContinuacionId: 70 }) });
    await card(entity, id).waitFor();
    await resolve({ entity, id, previousParentId, parentId, orden: 1, moduleId: 1, creations: creations.slice(0, count),
      ...(count ? {} : { continuacionId: 70, continuacionPlanId: 5 }) });
    await page.getByRole('status').filter({ hasText: 'Guardando reasignación' }).waitFor({ state: 'detached' });
    await card('competencia', 110).click();
    await card('actividad', 60).waitFor();
    assert.equal(await card('actividad', 60).count(), 1);
    assert.equal(await card('competencia', 110).locator('[draggable="true"]').count(), 0);
    await card('competencia', 10).click();
    assert.equal(await card('actividad', 60).count(), 0, 'The source branch no longer contains the moved content');
    await card('modulo', 2).click();
    await card('competenciaUnidadDidactica', 221).waitFor();
    assert.equal(await page.getByRole('region', { name: 'Unidades', exact: true }).locator('[data-academic-card]').count(), 1, 'The original module is unchanged');
  }
  await load();
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await card('competenciaUnidadDidactica', 21).locator('[draggable="true"]').dispatchEvent('dragstart', { dataTransfer: transfer });
  await card('competencia', 110).dispatchEvent('drop', { dataTransfer: transfer });
  await page.waitForFunction(() => window.requests.length === 1);
  await reject();
  await page.getByRole('alert').filter({ hasText: 'Falló la solicitud' }).waitFor();
  await card('actividad', 60).waitFor();
  await card('competencia', 110).click();
  assert.equal(await card('competenciaUnidadDidactica', 21).count(), 0, 'Failed drops do not change either branch');
  console.log('Continuaciones verificadas en navegador: reciben unidades, capacidades, indicadores y sesiones; orden bloqueado, módulo original intacto y fallo sin pérdida.');
};
