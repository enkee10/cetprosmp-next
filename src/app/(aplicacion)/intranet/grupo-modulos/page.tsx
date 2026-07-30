'use client';

import { Avatar, Box } from '@mui/material';
import type { GridRenderCellParams } from '@mui/x-data-grid';
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
  { name: 'instancia', label: 'Instancia', type: 'number' as const },
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
  {
    field: 'numero',
    headerName: '#',
    width: 40,
    minWidth: 40,
    maxWidth: 40,
    align: 'center' as const,
    headerAlign: 'center' as const,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    renderCell: (params: GridRenderCellParams) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
  },
  {
    field: 'docenteAvatar',
    headerName: 'Avatar',
    width: 68,
    minWidth: 68,
    maxWidth: 68,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    renderCell: (params: GridRenderCellParams) => {
      const row = params.row as { docenteAvatar?: string | null; docenteNombre?: string | null };
      const docenteNombre = row.docenteNombre?.trim() || 'Docente';
      const avatarSrc = row.docenteAvatar?.trim() || undefined;

      return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 0 }}>
          <Avatar
            src={avatarSrc}
            alt={docenteNombre}
            sx={{
              width: 48,
              height: 48,
              fontSize: 16,
              fontWeight: 700,
              color: '#ffffff',
              bgcolor: 'transparent',
              background: 'linear-gradient(180deg, #8fd8ff 0%, #ffffff 100%)',
            }}
            imgProps={{ referrerPolicy: 'no-referrer', style: { objectFit: 'contain' } }}
          >
            {docenteNombre.slice(0, 1).toUpperCase()}
          </Avatar>
        </Box>
      );
    },
  },
  { field: 'nombre', headerName: 'Nombre', flex: 1.2, minWidth: 190 },
  { field: 'grupoLabel', headerName: 'Grupo', flex: 1.4, minWidth: 220, hidden: true },
  { field: 'moduloLabel', headerName: 'Modulo', flex: 1.2, minWidth: 190, hidden: true },
  { field: 'instancia', headerName: 'Inst.', flex: 0.45, minWidth: 80, hidden: true },
  { field: 'orden', headerName: 'Orden', flex: 0.55, minWidth: 90, hidden: true },
  { field: 'obligatorio', headerName: 'Obligatorio', flex: 0.75, minWidth: 120, hidden: true },
  { field: 'inicio', headerName: 'Inicio', width: 100, minWidth: 100, maxWidth: 100 },
  { field: 'fin', headerName: 'Fin', width: 100, minWidth: 100, maxWidth: 100 },
  { field: 'calendarioLabel', headerName: 'Calendario', flex: 1, minWidth: 160, hidden: true },
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
      defaultPageSize={50}
    />
  );
}
