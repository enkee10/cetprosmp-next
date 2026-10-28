'use client';

import { AcademicCrudPage } from '@/components/intranet/academico/AcademicCrudPage';

const fields = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'duracion', label: 'Duracion', type: 'number' as const },
  { name: 'creditos', label: 'Creditos', type: 'number' as const },
  { name: 'sigla', label: 'Sigla' },
  { name: 'competenciaId', label: 'Competencia', type: 'select' as const, required: true,
    optionValueType: 'number' as const, optionsCallableName: 'listCompetenciaOpciones', optionsRowsKey: 'competencias', optionLabelField: 'etiqueta' },
];

const columns = [
  { field: 'nombre', headerName: 'Nombre', flex: 1.2, minWidth: 190 },
  { field: 'sigla', headerName: 'Sigla', flex: 0.7, minWidth: 100 },
  { field: 'duracion', headerName: 'Duracion', flex: 0.7, minWidth: 110 },
  { field: 'creditos', headerName: 'Creditos', flex: 0.7, minWidth: 110 },
  { field: 'competenciaId', headerName: 'Competencia', flex: 0.85, minWidth: 130 },
];

export default function UnidadesDidacticasPage() {
  return (
    <AcademicCrudPage
      rowsKey="unidadesDidacticas"
      entityKey="unidadDidactica"
      entityLabel="Unidad Didactica"
      entityPluralLabel="Unidades Didacticas"
      title="Unidades Didacticas"
      createLabel="Crear Unidad Didactica"
      listCallableName="listUnidadesDidacticas"
      getCallableName="getUnidadDidactica"
      saveCallableName="createOrUpdateUnidadDidactica"
      deleteCallableName="deleteUnidadDidactica"
      fields={fields}
      columns={columns}
      labelField="nombre"
    />
  );
}
