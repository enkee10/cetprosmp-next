'use client';

import { AcademicCrudPage } from '@/components/intranet/academico/AcademicCrudPage';

export default function AniosPage() {
  return (
    <AcademicCrudPage
      rowsKey="anios"
      entityKey="anio"
      entityLabel="Año"
      entityPluralLabel="Años"
      title="Gestión de Años"
      createLabel="Crear Año"
      listCallableName="listAnios"
      getCallableName="getAnio"
      saveCallableName="createOrUpdateAnio"
      deleteCallableName="deleteAnio"
      labelField="titulo"
      modalMaxWidth={600}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true },
        { name: 'titulo', label: 'Título' },
      ]}
      columns={[
        { field: 'nombre', headerName: 'Nombre', flex: 0.8, minWidth: 160 },
        { field: 'titulo', headerName: 'Título', flex: 1.2, minWidth: 220 },
      ]}
    />
  );
}
