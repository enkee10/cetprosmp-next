const assert = require('node:assert/strict');
module.exports = async ({ page, card, resolve, reject }) => {
  const load = async mode => { await page.goto('http://127.0.0.1:3001/?ancestor-' + mode); await card('actividad', 60).waitFor(); };
  const drag = async () => {
    const transfer = await page.evaluateHandle(() => new DataTransfer());
    await card('actividad', 60).locator('[draggable="true"]').dispatchEvent('dragstart', { dataTransfer: transfer });
    await card('modulo', 2).dispatchEvent('dragover', { dataTransfer: transfer });
    await card('modulo', 2).dispatchEvent('drop', { dataTransfer: transfer });
    await page.waitForFunction(() => window.requests.length === 1);
    const input = await page.evaluate(() => window.requests[0].input);
    assert.deepEqual(input, { entity: 'actividad', id: 60, parentId: 2, previousParentId: 50, targetAncestor: { entity: 'modulo', id: 2 } });
  };
  const comp = { id: 110, nombre: '', tipo: 'TECNICA', orden: 1, moduloId: 2 };
  const creations = [
    { entity: 'competencia', id: 110, item: comp },
    { entity: 'unidadDidactica', id: 120, item: { id: 120, nombre: '', duracion: null, creditos: null, sigla: null }, unitAssignments: [{ id: 121, unidadDidacticaId: 120, competenciaId: 110, orden: 1, competencia: comp }] },
    { entity: 'capacidadTerminal', id: 130, item: { id: 130, descripcion: '', sigla: null, orden: 1, unidadDidacticaId: 120 } },
    { entity: 'indicadorCapacidad', id: 140, item: { id: 140, descripcion: '', sigla: null, orden: 1, capacidadTerminalId: 130 } },
    { entity: 'aprendizaje', id: 150, item: { id: 150, descripcion: '', sigla: null, orden: 1, indicadorCapacidadId: 140 } },
  ];
  for (const mode of ['empty', 'filled', 'period-empty']) {
    await load(mode); await drag();
    await page.getByRole('status').filter({ hasText: 'Guardando reasignación' }).waitFor();
    await resolve({ entity: 'actividad', id: 60, previousParentId: 50, parentId: 150, orden: 1, moduleId: 2, creations: mode.includes('empty') ? creations : [] });
    if (mode.includes('period')) {
      const selection = { id: 1, planId: 5, semestreId: 1, revision: 0, competenciaIds: [10], unidadIds: [20], capacidadIds: [30], indicadorIds: [40] };
      const columns = { competencia: 'competenciaIds', unidadDidactica: 'unidadIds', capacidadTerminal: 'capacidadIds', indicadorCapacidad: 'indicadorIds' };
      for (let index = 0; index < 4; index++) {
        await page.waitForFunction(count => window.requests.length === count, index + 2);
        const input = await page.evaluate(() => window.requests.at(-1).input);
        assert.equal(input.revision, index); assert.equal(input.active, true);
        selection[columns[input.entity]].push(input.id); selection.revision++;
        await resolve({ selection });
      }
    }
    await page.getByRole('status').filter({ hasText: 'Guardando reasignación' }).waitFor({ state: 'detached' });
    await card('modulo', 2).click(); await card('actividad', 60).waitFor();
    assert.equal(await card('competencia', 110).count(), 1);
    assert.equal(await card('competenciaUnidadDidactica', 121).count(), 1);
    assert.equal(await card('indicadorCapacidad', 140).count(), 1);
    assert.equal(await card('actividad', 60).count(), 1, 'The moved session appears once under its new branch');
    await card('modulo', 1).click(); await card('indicadorCapacidad', 40).waitFor();
    assert.equal(await card('actividad', 60).count(), 0, 'The former branch no longer contains the session');
  }
  await load('empty'); await drag(); await reject();
  await page.getByRole('alert').filter({ hasText: 'Falló la solicitud' }).waitFor();
  await card('actividad', 60).waitFor();
  await card('modulo', 2).click();
  assert.equal(await card('competencia', 110).count(), 0, 'A failed move leaves no blank levels on screen');
  console.log('Correcto en navegador: arrastre a módulo con ruta existente o vacía, aplicación de IDs reales, sesión conservada y fallo sin cambios parciales.');
};
