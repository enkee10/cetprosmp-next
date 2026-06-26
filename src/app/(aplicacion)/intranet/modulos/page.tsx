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
import { ModuloForm } from '@/components/intranet/modulos/ModuloForm';

interface Modulo {
  id: number;
  titulo: string | null;
  tituloComercial: string | null;
  orden: number | null;
  descripcion: string | null;
  horas: number | null;
  creditos: number | null;
  metas: number | null;
  activo: boolean | null;
  slug: string | null;
  plan: { planEstudio: string | null } | null;
  planId: number | null;
}

export default function ModulosPage() {
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModuloModal, setOpenModuloModal] = useState(false);
  const [editingModuloId, setEditingModuloId] = useState<string | null>(null);
  const [moduloFormResetKey, setModuloFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuModuloId, setMenuModuloId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      numero: true,
      titulo: true,
      plan: true,
      horas: true,
      creditos: true,
      actions: true,
    });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchModulos = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listModulos = httpsCallable<undefined, { modulos?: Modulo[] }>(
        functions,
        'listModulos',
      );
      const result = await listModulos();
      setModulos(result.data.modulos || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching modulos: ', err);
      setError(
        'No se pudieron cargar los modulos. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchModulos();
  }, [fetchModulos]);

  const handleDismissModuloModal = useCallback(() => {
    setOpenModuloModal(false);
  }, []);

  const handleModuloSaved = useCallback(() => {
    setOpenModuloModal(false);
    setEditingModuloId(null);
    setModuloFormResetKey((prev) => prev + 1);
    void fetchModulos();
    setTimeout(() => {
      void fetchModulos();
    }, 400);
  }, [fetchModulos]);

  const handleCreateModulo = useCallback(() => {
    setEditingModuloId(null);
    setOpenModuloModal(true);
  }, []);

  const handleEditModulo = useCallback((id: string) => {
    setEditingModuloId(id);
    setOpenModuloModal(true);
    setMenuAnchorEl(null);
    setMenuModuloId(null);
  }, []);

  const handleDeleteModulo = useCallback(async (id: string) => {
    const modulo = modulos.find((item) => String(item.id) === id);
    const moduloTitle = modulo?.titulo ? ` "${modulo.titulo}"` : '';

    if (!window.confirm(`Estas seguro de eliminar el modulo${moduloTitle}? Esta accion es irreversible.`)) {
      return;
    }

    try {
      const deleteModulo = httpsCallable<{ id: number }, { id: number | null }>(
        functions,
        'deleteModulo',
      );
      await deleteModulo({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuModuloId(null);
      void fetchModulos();
      setTimeout(() => {
        void fetchModulos();
      }, 400);
    } catch (err) {
      console.error('Error deleting modulo: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para eliminar modulos (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo eliminar el modulo: ${message}`);
      } else {
        setError('No se pudo eliminar el modulo en Data Connect.');
      }
    }
  }, [fetchModulos, functions, modulos]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'numero',
        headerName: 'Nro.',
        align: 'center',
        headerAlign: 'center',
        width: 82,
        minWidth: 82,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
      },
      {
        field: 'titulo',
        headerName: 'Titulo',
        flex: 1.25,
        minWidth: 190,
        valueGetter: (_value, row: Modulo) => row.titulo || '',
      },
      {
        field: 'plan',
        headerName: 'Plan',
        flex: 1,
        minWidth: 170,
        valueGetter: (_value, row: Modulo) => row.plan?.planEstudio || '',
      },
      {
        field: 'horas',
        headerName: 'Horas',
        flex: 0.6,
        minWidth: 95,
        valueGetter: (_value, row: Modulo) => (row.horas != null ? row.horas : ''),
      },
      {
        field: 'creditos',
        headerName: 'Creditos',
        flex: 0.7,
        minWidth: 110,
        valueGetter: (_value, row: Modulo) => (row.creditos != null ? row.creditos : ''),
      },
      {
        field: 'actions',
        headerName: '...',
        align: 'center',
        headerAlign: 'center',
        width: 56,
        minWidth: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => (
          <IconButton
            size="small"
            aria-label="Opciones"
            onClick={(event) => {
              setMenuAnchorEl(event.currentTarget);
              setMenuModuloId(String((params.row as Modulo).id));
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
    () =>
      columns.map((column) => ({
        field: column.field,
        label:
          typeof column.headerName === 'string' && column.headerName.trim().length > 0
            ? column.headerName
            : column.field,
        checked: columnVisibilityModel[column.field] !== false,
        disabled: column.field === 'numero' || column.field === 'actions',
      })),
    [columnVisibilityModel, columns],
  );

  return (
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title="Gestion de Modulos"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreateModulo}>
            Crear Modulo
          </Button>
        </Stack>
      }
      columnToggleItems={columnToggleItems}
      onToggleColumn={(field, checked) =>
        setColumnVisibilityModel((prev) => ({ ...prev, [field]: checked }))
      }
      columnToggleLabel="Campos"
    >
      <IntranetDataGrid
        rows={modulos}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        loading={loading}
        getRowId={(row) => row.id}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
      />

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        disableScrollLock
        onClose={() => {
          setMenuAnchorEl(null);
          setMenuModuloId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuModuloId) handleEditModulo(menuModuloId);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuModuloId) void handleDeleteModulo(menuModuloId);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openModuloModal}
        onClose={handleDismissModuloModal}
        title={editingModuloId ? 'Editar Modulo' : 'Crear Modulo'}
      >
        <ModuloForm
          key={`${editingModuloId ?? 'new-modulo'}-${moduloFormResetKey}`}
          asModal
          moduloId={editingModuloId ?? undefined}
          onCancel={handleDismissModuloModal}
          onSaved={handleModuloSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
