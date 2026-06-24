'use client';

import { AcademicCrudPage } from '@/components/intranet/academico/AcademicCrudPage';

const fields = [
  { name: 'nombre', label: 'Nombre', required: true },
  { name: 'descripcion', label: 'Descripcion', type: 'textarea' as const },
  { name: 'proposito', label: 'Proposito', type: 'textarea' as const },
  { name: 'ambiente', label: 'Ambiente' },
  { name: 'duracion', label: 'Duracion', type: 'number' as const },
  { name: 'fecha', label: 'Fecha', type: 'timestamp' as const },
  { name: 'bibliografia', label: 'Bibliografia', type: 'textarea' as const },
  { name: 'aprendizajeId', label: 'Aprendizaje ID', type: 'number' as const, required: true },
  { name: 'ejeTransversalId', label: 'Eje Transversal ID', type: 'number' as const },
  { name: 'valorInstitucionalId', label: 'Valor Institucional ID', type: 'number' as const },
];

const columns = [
  { field: 'nombre', headerName: 'Nombre', flex: 1.2, minWidth: 190 },
  { field: 'duracion', headerName: 'Duracion', flex: 0.7, minWidth: 110 },
  { field: 'fecha', headerName: 'Fecha', flex: 1, minWidth: 170 },
  { field: 'ambiente', headerName: 'Ambiente', flex: 0.9, minWidth: 140 },
  { field: 'aprendizajeId', headerName: 'Aprendizaje ID', flex: 0.8, minWidth: 125 },
  { field: 'ejeTransversalId', headerName: 'Eje ID', flex: 0.65, minWidth: 95 },
  { field: 'valorInstitucionalId', headerName: 'Valor ID', flex: 0.65, minWidth: 95 },
  { field: 'descripcion', headerName: 'Descripcion', flex: 1.5, minWidth: 240, hidden: true },
  { field: 'proposito', headerName: 'Proposito', flex: 1.5, minWidth: 240, hidden: true },
  { field: 'bibliografia', headerName: 'Bibliografia', flex: 1.5, minWidth: 240, hidden: true },
];

export default function ActividadesPage() {
  return (
    <AcademicCrudPage
      rowsKey="actividades"
      entityKey="actividad"
      entityLabel="Actividad"
      entityPluralLabel="Actividades"
      title="Gestion de Actividades"
      createLabel="Crear Actividad"
      listCallableName="listActividades"
      getCallableName="getActividad"
      saveCallableName="createOrUpdateActividad"
      deleteCallableName="deleteActividad"
      fields={fields}
      columns={columns}
      labelField="nombre"
    />
  );
}
