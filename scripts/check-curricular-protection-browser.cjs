const assert = require('node:assert/strict');
module.exports = async ({ page, card, resolve, reject }) => {
  const region = name => page.getByRole('region', { name, exact: true });
  const noReload = async () => assert.equal(await page.evaluate(() => window.calls.filter(call => call.name === 'listEstructuraAcademica').length), 1);
  const load = async query => {
    await page.goto(`http://127.0.0.1:3001/?${query}`);
    await card('modulo', 1).click();
    await card('competencia', 10).click();
  };
  for (const fail of [false, true]) {
    await load('continuation-create');
    await region('Competencias').getByRole('button', { name: 'Continuar competencia del módulo anterior', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    await page.evaluate(() => { window.holdToken = true; });
    await page.getByRole('dialog').getByRole('button', { name: 'Aceptar', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const pending = region('Competencias').locator('[data-academic-creation-pending]');
    await pending.locator('[role="progressbar"]').waitFor();
    assert.equal(await region('Competencias').locator('[data-academic-card]').first().getAttribute('data-academic-creation-pending'), '', 'The continuation placeholder is the first competency card');
    assert.equal(await page.evaluate(() => window.requests.length), 0, 'The modal closes and placeholder appears before authentication finishes');
    await page.evaluate(() => { window.holdToken = false; window.releaseToken(); });
    await page.waitForFunction(() => window.requests.length === 1);
    assert.equal(await page.evaluate(() => window.requests[0].name), 'continueEstructuraAcademicaCompetencia');
    if (fail) await reject(); else await resolve({ id: 70 });
    await pending.waitFor({ state: 'detached' });
    if (fail) assert.equal(await card('competencia', 110).count(), 0);
    else {
      await card('competencia', 110).waitFor();
      assert.equal(await card('competencia', 110).getAttribute('data-academic-continuacion-id'), '70');
    }
    await noReload();

    await load('continuation');
    await card('competencia', 110).click();
    await page.evaluate(() => { window.holdToken = true; });
    await region('Competencias').getByRole('button', { name: 'Eliminar competencia', exact: true }).click();
    await card('competencia', 110).locator('[role="progressbar"]').waitFor();
    assert.equal(await page.locator('[data-academic-card][aria-busy="true"]').count(), 1);
    assert.equal(await page.evaluate(() => window.requests.length), 0);
    await page.evaluate(() => { window.holdToken = false; window.releaseToken(); });
    await page.waitForFunction(() => window.requests.length === 1);
    assert.equal(await page.evaluate(() => window.requests[0].name), 'deleteEstructuraAcademicaCompetenciaContinuacion');
    if (fail) await reject(); else await resolve({ id: 70 });
    if (fail) await card('competencia', 110).locator('[role="progressbar"]').waitFor({ state: 'detached' });
    else await card('competencia', 110).waitFor({ state: 'detached' });
    await noReload();
    await card('modulo', 2).click();
    await card('competenciaUnidadDidactica', 221).waitFor();
  }
  await load('period-grades');
  await card('indicadorCapacidad', 40).waitFor();
  for (const [panel, button] of [['Módulos', 'Quitar modulo del plan'], ['Competencias', 'Eliminar competencia'], ['Unidades', 'Quitar unidad del modulo'], ['Capacidades', 'Quitar capacidad'], ['Indicadores', 'Quitar indicador']]) {
    assert.equal(await region(panel).getByRole('button', { name: button, exact: true }).isDisabled(), true, `${panel} with saved descendant grades cannot be deleted`);
  }
  for (const [entity, id] of [['competencia', 10], ['competenciaUnidadDidactica', 21], ['capacidadTerminal', 30], ['indicadorCapacidad', 40]]) {
    assert.equal(await card(entity, id).getByRole('button', { name: /^(Ocultar|Incluir) en este semestre$/ }).isEnabled(), true, 'Graded elements keep their visibility eye');
  }
  await card('indicadorCapacidad', 40).getByRole('button', { name: 'Ocultar en este semestre', exact: true }).click();
  await page.waitForFunction(() => window.requests.length === 1);
  assert.equal(await page.evaluate(() => window.requests[0].input.active), false);
  await resolve({ selection: { ...await page.evaluate(() => window.fixture.selecciones[0]), indicadorIds: [], revision: 1 } });
  await card('indicadorCapacidad', 40).waitFor({ state: 'detached' });
  await region('Indicadores').getByRole('button', { name: 'Mostrar activos y ocultos', exact: true }).click();
  await card('indicadorCapacidad', 40).getByRole('button', { name: 'Incluir en este semestre', exact: true }).click();
  await page.waitForFunction(() => window.requests.length === 2);
  assert.equal(await page.evaluate(() => window.requests[1].input.active), true);
  await resolve({ selection: { ...await page.evaluate(() => window.fixture.selecciones[0]), revision: 2 } });
  await card('indicadorCapacidad', 40).getByRole('button', { name: 'Ocultar en este semestre', exact: true }).waitFor();
  assert.equal(await region('Indicadores').getByRole('button', { name: 'Quitar indicador', exact: true }).isDisabled(), true);
  assert.equal(await page.evaluate(() => window.calls.some(call => call.input.previewOnly)), false);
  await load('period-grades-hidden');
  await region('Indicadores').getByRole('button', { name: 'Mostrar activos y ocultos', exact: true }).click();
  await card('indicadorCapacidad', 40).waitFor();
  assert.equal(await region('Indicadores').getByRole('button', { name: 'Quitar indicador', exact: true }).isDisabled(), true, 'Hidden graded elements remain protected');
  assert.equal(await card('indicadorCapacidad', 40).getByRole('button', { name: 'Incluir en este semestre', exact: true }).isEnabled(), true);

  await load('period-own-averages');
  assert.equal(await region('Unidades').getByRole('button', { name: 'Quitar unidad del modulo', exact: true }).isDisabled(), true);
  assert.equal(await region('Capacidades').getByRole('button', { name: 'Quitar capacidad', exact: true }).isDisabled(), true);
  assert.equal(await region('Indicadores').getByRole('button', { name: 'Quitar indicador', exact: true }).isEnabled(), true, 'An empty indicator remains deletable when its parent has an average');
  await region('Indicadores').getByRole('button', { name: 'Quitar indicador', exact: true }).click();
  await page.waitForFunction(() => window.requests.length === 1);
  assert.equal(await page.evaluate(() => window.calls.filter(call => call.name === 'detachEstructuraAcademicaItem').length), 1);
  assert.equal(await page.evaluate(() => /notas|Advertencia/.test(window.confirmations[0].message)), false);
  await resolve({ id: 40 });
  await card('indicadorCapacidad', 40).waitFor({ state: 'detached' });
  await noReload();
  console.log('Continuación: modal inmediato, tarjeta inicial, eliminación y errores sin recarga. Notas: protección heredada, ocultos y promedios propios; borrado sin conteo.');
};
