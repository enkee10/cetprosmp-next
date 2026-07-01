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
import { TurnoForm } from '@/components/intranet/turnos/TurnoForm';

interface Turno {
  id: number;
  nombre: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  estado: string | null;
}

const formatTime = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(11, 16);
};

export default function TurnosPage() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
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
    horaInicio: true,
    horaFin: true,
    estado: true,
    actions: true,
  });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchTurnos = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) await auth.currentUser.getIdToken(true);
      const listTurnos = httpsCallable<undefined, { turnos?: Turno[] }>(functions, 'listTurnos');
      const result = await listTurnos();
      setTurnos(result.data.turnos || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching turnos: ', err);
      setError('No se pudieron cargar los turnos.');
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchTurnos();
  }, [fetchTurnos]);

  const handleSaved = useCallback(() => {
    setOpenModal(false);
    setEditingId(null);
    setResetKey((prev) => prev + 1);
    void fetchTurnos();
  }, [fetchTurnos]);

  const handleDelete = useCallback(async (id: string) => {
    const turno = turnos.find((item) => String(item.id) === id);
    if (!window.confirm(`Estas seguro de eliminar el turno${turno?.nombre ? ` "${turno.nombre}"` : ''}?`)) return;

    try {
      const deleteTurno = httpsCallable<{ id: number }, { id: number | null }>(functions, 'deleteTurno');
      await deleteTurno({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuId(null);
      void fetchTurnos();
    } catch (err) {
      console.error('Error deleting turno: ', err);
      setError('No se pudo eliminar el turno. Revisa si esta siendo usado por grupos o recurrencias.');
    }
  }, [fetchTurnos, functions, turnos]);

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
      { field: 'nombre', headerName: 'Turno', flex: 1.3, minWidth: 180, valueGetter: (_value, row: Turno) => row.nombre || '' },
      { field: 'horaInicio', headerName: 'Inicio', flex: 0.7, minWidth: 110, valueGetter: (_value, row: Turno) => formatTime(row.horaInicio) },
      { field: 'horaFin', headerName: 'Fin', flex: 0.7, minWidth: 110, valueGetter: (_value, row: Turno) => formatTime(row.horaFin) },
      { field: 'estado', headerName: 'Estado', flex: 0.7, minWidth: 110, valueGetter: (_value, row: Turno) => row.estado || '' },
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
              setMenuId(String((params.row as Turno).id));
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
      title="Gestion de Turnos"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={() => { setEditingId(null); setOpenModal(true); }}>
            Crear Turno
          </Button>
        </Stack>
      }
      columnToggleItems={columnToggleItems}
      onToggleColumn={(field, checked) => setColumnVisibilityModel((prev) => ({ ...prev, [field]: checked }))}
      columnToggleLabel="Campos"
    >
      <IntranetDataGrid
        rows={turnos}
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

      <Modal1 open={openModal} onClose={() => setOpenModal(false)} title={editingId ? 'Editar Turno' : 'Crear Turno'} maxWidth={560}>
        <TurnoForm
          key={`${editingId ?? 'new-turno'}-${resetKey}`}
          asModal
          turnoId={editingId ?? undefined}
          onCancel={() => setOpenModal(false)}
          onSaved={handleSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
