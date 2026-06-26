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
import { PaqueteForm } from '@/components/intranet/paquetes/PaqueteForm';

interface Paquete {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  archivado: boolean | null;
  moduloIds?: number[];
}

interface Modulo {
  id: number;
  titulo: string | null;
  tituloComercial: string | null;
}

export default function PaquetesPage() {
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPaqueteModal, setOpenPaqueteModal] = useState(false);
  const [editingPaqueteId, setEditingPaqueteId] = useState<string | null>(null);
  const [paqueteFormResetKey, setPaqueteFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuPaqueteId, setMenuPaqueteId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      titulo: true,
      modulos: true,
      cantidadModulos: true,
      archivado: true,
      descripcion: false,
      actions: true,
    });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchPaquetes = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listPaquetes = httpsCallable<undefined, { paquetes?: Paquete[] }>(functions, 'listPaquetes');
      const listModulos = httpsCallable<undefined, { modulos?: Modulo[] }>(functions, 'listModulos');
      const [paquetesResult, modulosResult] = await Promise.all([
        listPaquetes(),
        listModulos(),
      ]);
      setPaquetes(paquetesResult.data.paquetes || []);
      setModulos(modulosResult.data.modulos || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching paquetes: ', err);
      setError(
        'No se pudieron cargar los paquetes. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchPaquetes();
  }, [fetchPaquetes]);

  const moduloTitleById = useMemo(
    () => new Map(modulos.map((modulo) => [modulo.id, modulo.tituloComercial || modulo.titulo || `Modulo ${modulo.id}`])),
    [modulos],
  );

  const handleDismissPaqueteModal = useCallback(() => {
    setOpenPaqueteModal(false);
  }, []);

  const handlePaqueteSaved = useCallback(() => {
    setOpenPaqueteModal(false);
    setEditingPaqueteId(null);
    setPaqueteFormResetKey((prev) => prev + 1);
    void fetchPaquetes();
    setTimeout(() => {
      void fetchPaquetes();
    }, 400);
  }, [fetchPaquetes]);

  const handleCreatePaquete = useCallback(() => {
    setEditingPaqueteId(null);
    setOpenPaqueteModal(true);
  }, []);

  const handleEditPaquete = useCallback((id: string) => {
    setEditingPaqueteId(id);
    setOpenPaqueteModal(true);
    setMenuAnchorEl(null);
    setMenuPaqueteId(null);
  }, []);

  const handleDeletePaquete = useCallback(async (id: string) => {
    const paquete = paquetes.find((item) => String(item.id) === id);
    const paqueteTitle = paquete?.titulo ? ` "${paquete.titulo}"` : '';

    if (!window.confirm(`Estas seguro de eliminar el paquete${paqueteTitle}? Esta accion es irreversible.`)) {
      return;
    }

    try {
      const deletePaquete = httpsCallable<{ id: number }, { id: number | null }>(functions, 'deletePaquete');
      await deletePaquete({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuPaqueteId(null);
      void fetchPaquetes();
      setTimeout(() => {
        void fetchPaquetes();
      }, 400);
    } catch (err) {
      console.error('Error deleting paquete: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para eliminar paquetes (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo eliminar el paquete: ${message}`);
      } else {
        setError('No se pudo eliminar el paquete en Data Connect.');
      }
    }
  }, [fetchPaquetes, functions, paquetes]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'titulo',
        headerName: 'Titulo',
        flex: 1,
        minWidth: 180,
        valueGetter: (_value, row: Paquete) => row.titulo || '',
      },
      {
        field: 'modulos',
        headerName: 'Modulos',
        flex: 1.8,
        minWidth: 280,
        valueGetter: (_value, row: Paquete) =>
          (row.moduloIds || [])
            .map((id) => moduloTitleById.get(id) || `Modulo ${id}`)
            .join(', '),
      },
      {
        field: 'cantidadModulos',
        headerName: 'Cant.',
        flex: 0.45,
        minWidth: 80,
        valueGetter: (_value, row: Paquete) => row.moduloIds?.length || 0,
      },
      {
        field: 'archivado',
        headerName: 'Archivado',
        flex: 0.7,
        minWidth: 115,
        valueGetter: (_value, row: Paquete) => (row.archivado ? 'Si' : 'No'),
      },
      {
        field: 'descripcion',
        headerName: 'Descripcion',
        flex: 1.5,
        minWidth: 240,
        valueGetter: (_value, row: Paquete) => row.descripcion || '',
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
              setMenuPaqueteId(String((params.row as Paquete).id));
            }}
          >
            <MoreHorizIcon />
          </IconButton>
        ),
      },
    ],
    [moduloTitleById],
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
        disabled: column.field === 'actions',
      })),
    [columnVisibilityModel, columns],
  );

  return (
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title="Gestion de Paquetes"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreatePaquete}>
            Crear Paquete
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
        rows={paquetes}
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
          setMenuPaqueteId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuPaqueteId) handleEditPaquete(menuPaqueteId);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuPaqueteId) void handleDeletePaquete(menuPaqueteId);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openPaqueteModal}
        onClose={handleDismissPaqueteModal}
        title={editingPaqueteId ? 'Editar Paquete' : 'Crear Paquete'}
      >
        <PaqueteForm
          key={`${editingPaqueteId ?? 'new-paquete'}-${paqueteFormResetKey}`}
          asModal
          paqueteId={editingPaqueteId ?? undefined}
          onCancel={handleDismissPaqueteModal}
          onSaved={handlePaqueteSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
