import assert from 'node:assert/strict';
import test from 'node:test';
import { modulesForPlans, usedSemesterPlanIds } from './semesterPlans.js';

test('a semester shows plans actually taught there and keeps their whole curriculum', () => {
  const modules = [{ id: 1, planId: 10 }, { id: 2, planId: 10 }, { id: 3, planId: 20 }, { id: 4, planId: null }];
  const relations = [{ planId: 10, moduloId: 1 }, { planId: 20, moduloId: 3 }, { planId: 30, moduloId: 4 }];
  const used = usedSemesterPlanIds(modules, relations, [{ moduloId: 1 }, { moduloId: 4 }]);
  assert.deepEqual([...used], [10, 30]);
  assert.deepEqual(modulesForPlans(modules, relations, used).map(m => m.id), [1, 2, 4]);
  assert.equal(usedSemesterPlanIds(modules, relations, []).size, 0);
});

test('a module’s primary plan identifies its edition even with legacy shared relations', () => {
  assert.deepEqual([...usedSemesterPlanIds([{ id: 1, planId: 10 }], [{ moduloId: 1, planId: 20 }], [{ moduloId: 1 }])], [10]);
});
