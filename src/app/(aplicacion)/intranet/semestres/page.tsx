'use client';

import { AcademicCrudPage } from '@/components/intranet/academico/AcademicCrudPage';

export default function SemestresPage() {
  return (
    <AcademicCrudPage
      rowsKey="semestres"
      entityKey="semestre"
      entityLabel="Semestre"
      entityPluralLabel="Semestres"
      title="Gestion de Semestres"
      createLabel="Crear Semestre"
      listCallableName="listSemestres"
      getCallableName="getSemestre"
      saveCallableName="createOrUpdateSemestre"
      deleteCallableName="deleteSemestre"
      labelField="titulo"
      modalMaxWidth={600}
      fields={[
        { name: 'titulo', label: 'Titulo', required: true },
        {
          name: 'anioId',
          label: 'Anio',
          type: 'select',
          required: true,
          optionsCallableName: 'listAnios',
          optionsRowsKey: 'anios',
          optionValueField: 'id',
          optionLabelField: 'nombre',
          optionValueType: 'number',
        },
        { name: 'inicio', label: 'Inicio', type: 'timestamp' },
        { name: 'fin', label: 'Fin', type: 'timestamp' },
        { name: 'descripcion', label: 'Descripcion', type: 'textarea' },
      ]}
      columns={[
        { field: 'titulo', headerName: 'Titulo', flex: 1, minWidth: 180 },
        { field: 'anioTitulo', headerName: 'Anio', flex: 0.8, minWidth: 160 },
        { field: 'inicio', headerName: 'Inicio', flex: 0.8, minWidth: 160 },
        { field: 'fin', headerName: 'Fin', flex: 0.8, minWidth: 160 },
        { field: 'descripcion', headerName: 'Descripcion', flex: 1.2, minWidth: 220 },
      ]}
    />
  );
}
