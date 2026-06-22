'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  GridColDef,
  GridColumnVisibilityModel,
  GridPaginationModel,
} from '@mui/x-data-grid';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';
import { SectorForm } from '@/components/intranet/sectores/SectorForm';

interface Sector {
  id: number;
  titulo: string | null;
  descripcion: string | null;
}

export default function SectoresPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSectorModal, setOpenSectorModal] = useState(false);
  const [editingSectorId, setEditingSectorId] = useState<string | null>(null);
  const [sectorFormResetKey, setSectorFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuSectorId, setMenuSectorId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      titulo: true,
      descripcion: true,
      actions: true,
    });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchSectors = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listSectors = httpsCallable<undefined, { sectors?: Sector[] }>(
        functions,
        'listSectors',
      );
      const result = await listSectors();
      setSectors(result.data.sectors || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching sectors: ', err);
      setError(
        'No se pudieron cargar los sectores. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchSectors();
  }, [fetchSectors]);

  const handleDismissSectorModal = useCallback(() => {
    setOpenSectorModal(false);
  }, []);

  const handleSectorSaved = useCallback(() => {
    setOpenSectorModal(false);
    setEditingSectorId(null);
    setSectorFormResetKey((prev) => prev + 1);
    void fetchSectors();
    setTimeout(() => {
      void fetchSectors();
    }, 400);
  }, [fetchSectors]);

  const handleCreateSector = useCallback(() => {
    setEditingSectorId(null);
    setOpenSectorModal(true);
  }, []);

  const handleEditSector = useCallback((id: string) => {
    setEditingSectorId(id);
    setOpenSectorModal(true);
    setMenuAnchorEl(null);
    setMenuSectorId(null);
  }, []);

  const handleDeleteSector = useCallback(async (id: string) => {
    const sector = sectors.find((item) => String(item.id) === id);
    const sectorTitle = sector?.titulo ? ` "${sector.titulo}"` : '';

    if (!window.confirm(`Estas seguro de eliminar el sector${sectorTitle}? Esta accion es irreversible.`)) {
      return;
    }

    try {
      const deleteSector = httpsCallable<{ id: number }, { id: number | null }>(
        functions,
        'deleteSector',
      );
      await deleteSector({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuSectorId(null);
      void fetchSectors();
      setTimeout(() => {
        void fetchSectors();
      }, 400);
    } catch (err) {
      console.error('Error deleting sector: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para eliminar sectores (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo eliminar el sector: ${message}`);
      } else {
        setError('No se pudo eliminar el sector en Data Connect.');
      }
    }
  }, [fetchSectors, functions, sectors]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'titulo',
        headerName: 'Titulo',
        flex: 1,
        minWidth: 170,
        valueGetter: (_value, row: Sector) => row.titulo || '',
      },
      {
        field: 'descripcion',
        headerName: 'Descripcion',
        flex: 1.6,
        minWidth: 240,
        valueGetter: (_value, row: Sector) => row.descripcion || '',
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
              setMenuSectorId(String((params.row as Sector).id));
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
        disabled: column.field === 'actions',
      })),
    [columnVisibilityModel, columns],
  );

  return (
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title="Gestion de Sectores"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreateSector}>
            Crear Sector
          </Button>
          <Button variant="outlined" disabled>
            Otros...
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
        rows={sectors}
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
          setMenuSectorId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuSectorId) handleEditSector(menuSectorId);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuSectorId) void handleDeleteSector(menuSectorId);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openSectorModal}
        onClose={handleDismissSectorModal}
        title={editingSectorId ? 'Editar Sector' : 'Crear Sector'}
      >
        <SectorForm
          key={`${editingSectorId ?? 'new-sector'}-${sectorFormResetKey}`}
          asModal
          sectorId={editingSectorId ?? undefined}
          onCancel={handleDismissSectorModal}
          onSaved={handleSectorSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
