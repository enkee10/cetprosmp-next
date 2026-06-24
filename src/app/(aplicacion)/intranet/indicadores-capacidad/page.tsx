'use client';

import { AcademicCrudPage } from '@/components/intranet/academico/AcademicCrudPage';

const fields = [
  { name: 'descripcion', label: 'Descripcion', type: 'textarea' as const, required: true },
  { name: 'sigla', label: 'Sigla' },
  { name: 'capacidadTerminalId', label: 'Capacidad Terminal ID', type: 'number' as const, required: true },
];

const columns = [
  { field: 'descripcion', headerName: 'Descripcion', flex: 1.5, minWidth: 240 },
  { field: 'sigla', headerName: 'Sigla', flex: 0.7, minWidth: 100 },
  { field: 'capacidadTerminalId', headerName: 'Capacidad Terminal ID', flex: 0.9, minWidth: 155 },
];

export default function IndicadoresCapacidadPage() {
  return (
    <AcademicCrudPage
      rowsKey="indicadoresCapacidad"
      entityKey="indicadorCapacidad"
      entityLabel="Indicador de Capacidad"
      entityPluralLabel="Indicadores de Capacidad"
      title="Gestion de Indicadores de Capacidad"
      createLabel="Crear Indicador"
      listCallableName="listIndicadoresCapacidad"
      getCallableName="getIndicadorCapacidad"
      saveCallableName="createOrUpdateIndicadorCapacidad"
      deleteCallableName="deleteIndicadorCapacidad"
      fields={fields}
      columns={columns}
      labelField="descripcion"
    />
  );
}
