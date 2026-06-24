'use client';

import { AcademicCrudPage } from '@/components/intranet/academico/AcademicCrudPage';

const fields = [
  { name: 'descripcion', label: 'Descripcion', type: 'textarea' as const, required: true },
  { name: 'sigla', label: 'Sigla' },
  { name: 'indicadorCapacidadId', label: 'Indicador de Capacidad ID', type: 'number' as const, required: true },
];

const columns = [
  { field: 'descripcion', headerName: 'Descripcion', flex: 1.5, minWidth: 240 },
  { field: 'sigla', headerName: 'Sigla', flex: 0.7, minWidth: 100 },
  { field: 'indicadorCapacidadId', headerName: 'Indicador Capacidad ID', flex: 0.95, minWidth: 165 },
];

export default function AprendizajesPage() {
  return (
    <AcademicCrudPage
      rowsKey="aprendizajes"
      entityKey="aprendizaje"
      entityLabel="Aprendizaje"
      entityPluralLabel="Aprendizajes"
      title="Gestion de Aprendizajes"
      createLabel="Crear Aprendizaje"
      listCallableName="listAprendizajes"
      getCallableName="getAprendizaje"
      saveCallableName="createOrUpdateAprendizaje"
      deleteCallableName="deleteAprendizaje"
      fields={fields}
      columns={columns}
      labelField="descripcion"
    />
  );
}
