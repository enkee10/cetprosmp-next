'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, IconButton, Menu, MenuItem, Stack } from '@mui/material';
import { GridColDef, GridColumnVisibilityModel, GridPaginationModel } from '@mui/x-data-grid';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';
import { HorarioForm } from '@/components/intranet/horarios/HorarioForm';

interface Horario {
  id: number;
  nombre: string | null;
  descripcion: string | null;
  diasSemana: string | null;
  activo: boolean | null;
}

const DIA_LABELS = new Map([
  ['1', 'Lun'],
  ['2', 'Mar'],
  ['3', 'Mie'],
  ['4', 'Jue'],
  ['5', 'Vie'],
  ['6', 'Sab'],
  ['0', 'Dom'],
]);

const formatDias = (value: string | null) =>
  (value || '')
    .split(',')
    .filter(Boolean)
    .map((dia) => DIA_LABELS.get(dia) || dia)
    .join(' / ');

export default function HorariosPage() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 15 });
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({
    numero: true,
    nombre: true,
    diasSemana: true,
    activo: true,
    descripcion: false,
    actions: true,
  });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchHorarios = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) await auth.currentUser.getIdToken(true);
      const listHorarios = httpsCallable<undefined, { horarios?: Horario[] }>(functions, 'listHorarios');
      const result = await listHorarios();
      setHorarios(result.data.horarios || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching horarios: ', err);
      setError('No se pudieron cargar los horarios.');
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchHorarios();
  }, [fetchHorarios]);

  const handleSaved = useCallback(() => {
    setOpenModal(false);
    setEditingId(null);
    setResetKey((prev) => prev + 1);
    void fetchHorarios();
  }, [fetchHorarios]);

  const handleDelete = useCallback(async (id: string) => {
    const horario = horarios.find((item) => String(item.id) === id);
    if (!window.confirm(`Estas seguro de eliminar el horario${horario?.nombre ? ` "${horario.nombre}"` : ''}?`)) return;

    try {
      const deleteHorario = httpsCallable<{ id: number }, { id: number | null }>(functions, 'deleteHorario');
      await deleteHorario({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuId(null);
      void fetchHorarios();
    } catch (err) {
      console.error('Error deleting horario: ', err);
      setError('No se pudo eliminar el horario. Revisa si esta siendo usado por grupos o recurrencias.');
    }
  }, [fetchHorarios, functions, horarios]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'numero',
        headerName: '#',
        align: 'center',
        headerAlign: 'center',
        width: 72,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
      },
      { field: 'nombre', headerName: 'Horario', flex: 1.3, minWidth: 210, valueGetter: (_value, row: Horario) => row.nombre || '' },
      { field: 'diasSemana', headerName: 'Dias', flex: 1, minWidth: 160, valueGetter: (_value, row: Horario) => formatDias(row.diasSemana) },
      { field: 'activo', headerName: 'Activo', flex: 0.6, minWidth: 100, valueGetter: (_value, row: Horario) => (row.activo === false ? 'No' : 'Si') },
      { field: 'descripcion', headerName: 'Descripcion', flex: 1.4, minWidth: 220, valueGetter: (_value, row: Horario) => row.descripcion || '' },
      {
        field: 'actions',
        headerName: '...',
        align: 'center',
        headerAlign: 'center',
        width: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <IconButton
            size="small"
            aria-label="Opciones"
            onClick={(event) => {
              setMenuAnchorEl(event.currentTarget);
              setMenuId(String((params.row as Horario).id));
            }}
          >
            <MoreHorizIcon />
          </IconButton>
        ),
      },
    ],
    [],
  );

  const columnToggleItems = useMemo(
    () => columns.map((column) => ({
      field: column.field,
      label: typeof column.headerName === 'string' && column.headerName.trim() ? column.headerName : column.field,
      checked: columnVisibilityModel[column.field] !== false,
      disabled: column.field === 'numero' || column.field === 'actions',
    })),
    [columnVisibilityModel, columns],
  );

  return (
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title="Gestion de Horarios"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={() => { setEditingId(null); setOpenModal(true); }}>
            Crear Horario
          </Button>
        </Stack>
      }
      columnToggleItems={columnToggleItems}
      onToggleColumn={(field, checked) => setColumnVisibilityModel((prev) => ({ ...prev, [field]: checked }))}
      columnToggleLabel="Campos"
    >
      <IntranetDataGrid
        rows={horarios}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        loading={loading}
        getRowId={(row) => row.id}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />

      <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} disableScrollLock onClose={() => { setMenuAnchorEl(null); setMenuId(null); }}>
        <MenuItem onClick={() => { if (menuId) { setEditingId(menuId); setOpenModal(true); setMenuAnchorEl(null); setMenuId(null); } }}>
          Editar
        </MenuItem>
        <MenuItem onClick={() => { if (menuId) void handleDelete(menuId); }}>
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1 open={openModal} onClose={() => setOpenModal(false)} title={editingId ? 'Editar Horario' : 'Crear Horario'} maxWidth={720}>
        <HorarioForm
          key={`${editingId ?? 'new-horario'}-${resetKey}`}
          asModal
          horarioId={editingId ?? undefined}
          onCancel={() => setOpenModal(false)}
          onSaved={handleSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
