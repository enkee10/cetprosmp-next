'use client';

import { AcademicCrudPage } from '@/components/intranet/academico/AcademicCrudPage';

const fields = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'duracion', label: 'Duracion', type: 'number' as const },
  { name: 'creditos', label: 'Creditos', type: 'number' as const },
  { name: 'sigla', label: 'Sigla' },
  { name: 'moduloId', label: 'Modulo ID', type: 'number' as const, required: true },
];

const columns = [
  { field: 'nombre', headerName: 'Nombre', flex: 1.2, minWidth: 190 },
  { field: 'sigla', headerName: 'Sigla', flex: 0.7, minWidth: 100 },
  { field: 'duracion', headerName: 'Duracion', flex: 0.7, minWidth: 110 },
  { field: 'creditos', headerName: 'Creditos', flex: 0.7, minWidth: 110 },
  { field: 'moduloId', headerName: 'Modulo ID', flex: 0.75, minWidth: 115 },
];

export default function UnidadesDidacticasPage() {
  return (
    <AcademicCrudPage
      rowsKey="unidadesDidacticas"
      entityKey="unidadDidactica"
      entityLabel="Unidad Didactica"
      entityPluralLabel="Unidades Didacticas"
      title="Gestion de Unidades Didacticas"
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
