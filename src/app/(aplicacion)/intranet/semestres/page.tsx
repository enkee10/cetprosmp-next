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
        { name: 'inicio', label: 'Inicio', type: 'date' },
        { name: 'fin', label: 'Fin', type: 'date' },
        { name: 'fechaActa', label: 'Fecha Acta', type: 'date' },
        { name: 'fechaCertificado', label: 'Fecha Certificado', type: 'date' },
        { name: 'fechaNomina', label: 'Fecha Nomina', type: 'date' },
        {
          name: 'directorId',
          label: 'Director',
          type: 'select',
          optionsCallableName: 'listPersonal',
          optionsRowsKey: 'personal',
          optionValueField: 'id',
          optionLabelField: 'userUsername',
          optionValueType: 'number',
        },
        {
          name: 'coordinador1Id',
          label: 'Coordinador 1',
          type: 'select',
          optionsCallableName: 'listPersonal',
          optionsRowsKey: 'personal',
          optionValueField: 'id',
          optionLabelField: 'userUsername',
          optionValueType: 'number',
        },
        {
          name: 'coordinador2Id',
          label: 'Coordinador 2',
          type: 'select',
          optionsCallableName: 'listPersonal',
          optionsRowsKey: 'personal',
          optionValueField: 'id',
          optionLabelField: 'userUsername',
          optionValueType: 'number',
        },
        { name: 'descripcion', label: 'Descripcion', type: 'textarea' },
      ]}
      columns={[
        { field: 'titulo', headerName: 'Titulo', flex: 1, minWidth: 180 },
        { field: 'anioTitulo', headerName: 'Anio', flex: 0.8, minWidth: 160, hidden: true },
        { field: 'inicio', headerName: 'Inicio', flex: 0.8, minWidth: 160 },
        { field: 'fin', headerName: 'Fin', flex: 0.8, minWidth: 160 },
        { field: 'fechaActa', headerName: 'Fecha Acta', flex: 0.8, minWidth: 160, hidden: true },
        { field: 'fechaCertificado', headerName: 'Fecha Certificado', flex: 0.9, minWidth: 170, hidden: true },
        { field: 'fechaNomina', headerName: 'Fecha Nomina', flex: 0.8, minWidth: 160, hidden: true },
        { field: 'directorUsername', headerName: 'Director', flex: 0.9, minWidth: 160, hidden: true },
        { field: 'coordinador1Username', headerName: 'Coordinador 1', flex: 0.9, minWidth: 160, hidden: true },
        { field: 'coordinador2Username', headerName: 'Coordinador 2', flex: 0.9, minWidth: 160, hidden: true },
        { field: 'descripcion', headerName: 'Descripcion', flex: 1.2, minWidth: 220, hidden: true },
      ]}
    />
  );
}
