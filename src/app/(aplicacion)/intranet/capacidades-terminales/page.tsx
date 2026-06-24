'use client';

import { AcademicCrudPage } from '@/components/intranet/academico/AcademicCrudPage';

const fields = [
  { name: 'descripcion', label: 'Descripcion', type: 'textarea' as const, required: true },
  { name: 'sigla', label: 'Sigla' },
  { name: 'unidadDidacticaId', label: 'Unidad Didactica ID', type: 'number' as const, required: true },
];

const columns = [
  { field: 'descripcion', headerName: 'Descripcion', flex: 1.5, minWidth: 240 },
  { field: 'sigla', headerName: 'Sigla', flex: 0.7, minWidth: 100 },
  { field: 'unidadDidacticaId', headerName: 'Unidad Didactica ID', flex: 0.9, minWidth: 155 },
];

export default function CapacidadesTerminalesPage() {
  return (
    <AcademicCrudPage
      rowsKey="capacidadesTerminales"
      entityKey="capacidadTerminal"
      entityLabel="Capacidad Terminal"
      entityPluralLabel="Capacidades Terminales"
      title="Gestion de Capacidades Terminales"
      createLabel="Crear Capacidad Terminal"
      listCallableName="listCapacidadesTerminales"
      getCallableName="getCapacidadTerminal"
      saveCallableName="createOrUpdateCapacidadTerminal"
      deleteCallableName="deleteCapacidadTerminal"
      fields={fields}
      columns={columns}
      labelField="descripcion"
    />
  );
}
