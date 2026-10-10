'use client';

import { AcademicCrudPage } from '@/components/intranet/academico/AcademicCrudPage';
import type { AcademicFieldConfig } from '@/components/intranet/academico/AcademicEntityForm';

const fields: AcademicFieldConfig[] = [{ name: 'nombre', label: 'Material', type: 'textarea', required: true }];
const columns = [{ field: 'nombre', headerName: 'Material', flex: 1, minWidth: 280 }];

export default function MaterialesPage() {
  return <AcademicCrudPage rowsKey="materiales" entityKey="material" entityLabel="Material" entityPluralLabel="Materiales"
    title="Materiales" createLabel="Crear Material" listCallableName="listMateriales" getCallableName="getMaterial"
    saveCallableName="createOrUpdateMaterial" deleteCallableName="deleteMaterial" fields={fields} columns={columns} labelField="nombre"
    directActions deleteWarning="El material también se retirará de las sesiones que lo utilicen." />;
}
