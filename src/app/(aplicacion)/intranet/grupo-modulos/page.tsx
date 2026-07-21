'use client';

import { AcademicCrudPage } from '@/components/intranet/academico/AcademicCrudPage';

const fields = [
  { name: 'nombre', label: 'Nombre' },
  {
    name: 'grupoId',
    label: 'Grupo',
    type: 'select' as const,
    required: true,
    optionsCallableName: 'listGrupoModuloOpciones',
    optionsRowsKey: 'grupos',
    optionLabelField: 'label',
    optionValueType: 'number' as const,
  },
  {
    name: 'moduloId',
    label: 'Modulo',
    type: 'select' as const,
    required: true,
    optionsCallableName: 'listGrupoModuloOpciones',
    optionsRowsKey: 'modulos',
    optionLabelField: 'label',
    optionValueType: 'number' as const,
  },
  { name: 'orden', label: 'Orden', type: 'number' as const },
  { name: 'obligatorio', label: 'Obligatorio', type: 'boolean' as const },
  { name: 'inicio', label: 'Inicio', type: 'date' as const },
  { name: 'fin', label: 'Fin', type: 'date' as const },
  {
    name: 'calendarioId',
    label: 'Calendario',
    type: 'select' as const,
    optionsCallableName: 'listGrupoModuloOpciones',
    optionsRowsKey: 'calendarios',
    optionLabelField: 'label',
    optionValueType: 'number' as const,
  },
];

const columns = [
  { field: 'nombre', headerName: 'Nombre', flex: 1.2, minWidth: 190 },
  { field: 'grupoLabel', headerName: 'Grupo', flex: 1.4, minWidth: 220 },
  { field: 'moduloLabel', headerName: 'Modulo', flex: 1.2, minWidth: 190 },
  { field: 'orden', headerName: 'Orden', flex: 0.55, minWidth: 90 },
  { field: 'obligatorio', headerName: 'Obligatorio', flex: 0.75, minWidth: 120 },
  { field: 'inicio', headerName: 'Inicio', flex: 0.8, minWidth: 125 },
  { field: 'fin', headerName: 'Fin', flex: 0.8, minWidth: 125 },
  { field: 'calendarioLabel', headerName: 'Calendario', flex: 1, minWidth: 160 },
  { field: 'grupoId', headerName: 'Grupo ID', flex: 0.7, minWidth: 105, hidden: true },
  { field: 'moduloId', headerName: 'Modulo ID', flex: 0.7, minWidth: 110, hidden: true },
  { field: 'calendarioId', headerName: 'Calendario ID', flex: 0.8, minWidth: 130, hidden: true },
];

export default function GrupoModulosPage() {
  return (
    <AcademicCrudPage
      rowsKey="grupoModulos"
      entityKey="grupoModulo"
      entityLabel="Grupo-Modulo"
      entityPluralLabel="Grupo-Modulos"
      title="Gestion de Grupo-Modulo"
      createLabel="Crear Grupo-Modulo"
      listCallableName="listGrupoModulos"
      getCallableName="getGrupoModulo"
      saveCallableName="createOrUpdateGrupoModulo"
      deleteCallableName="deleteGrupoModulo"
      fields={fields}
      columns={columns}
      labelField="nombre"
      modalMaxWidth={760}
      semestreFilter
    />
  );
}
