'use client';

import { AcademicCrudPage } from '@/components/intranet/academico/AcademicCrudPage';

export default function TiposCarreraPage() {
  return (
    <AcademicCrudPage
      rowsKey="tiposCarrera"
      entityKey="tipoCarrera"
      entityLabel="Tipo de Carrera"
      entityPluralLabel="Tipos de Carrera"
      title="Gestion de Tipos de Carrera"
      createLabel="Crear Tipo de Carrera"
      listCallableName="listTiposCarrera"
      getCallableName="getTipoCarrera"
      saveCallableName="createOrUpdateTipoCarrera"
      deleteCallableName="deleteTipoCarrera"
      labelField="nombre"
      fields={[
        { name: 'nombre', label: 'Nombre', required: true },
      ]}
      columns={[
        { field: 'nombre', headerName: 'Nombre', flex: 1, minWidth: 220 },
      ]}
    />
  );
}
