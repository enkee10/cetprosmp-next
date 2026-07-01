'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, Button, IconButton, Menu, MenuItem, Stack } from '@mui/material';
import { GridColDef, GridColumnVisibilityModel, GridPaginationModel } from '@mui/x-data-grid';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';
import { FamiliaForm } from '@/components/intranet/familias/FamiliaForm';

interface Familia {
  id: number;
  titulo: string | null;
  descripcion: string | null;
  imagenPortadaUrl: string | null;
  sectorId: number | null;
}

interface SectorOption {
  id: number;
  titulo: string | null;
}

export default function FamiliasPage() {
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [sectores, setSectores] = useState<SectorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openFamiliaModal, setOpenFamiliaModal] = useState(false);
  const [editingFamiliaId, setEditingFamiliaId] = useState<string | null>(null);
  const [familiaFormResetKey, setFamiliaFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuFamiliaId, setMenuFamiliaId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      portada: true,
      titulo: true,
      descripcion: false,
      sectorTitulo: true,
      actions: true,
    });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchFamilias = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listFamilias = httpsCallable<undefined, { familias?: Familia[] }>(
        functions,
        'listFamilias',
      );
      const listSectors = httpsCallable<undefined, { sectors?: SectorOption[] }>(
        functions,
        'listSectors',
      );
      const [familiasResult, sectoresResult] = await Promise.all([
        listFamilias(),
        listSectors(),
      ]);
      setFamilias(familiasResult.data.familias || []);
      setSectores(sectoresResult.data.sectors || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching familias: ', err);
      setError(
        'No se pudieron cargar las familias. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  const sectorTitleById = useMemo(
    () => new Map(sectores.map((sector) => [sector.id, sector.titulo || `Sector ${sector.id}`])),
    [sectores],
  );

  useEffect(() => {
    void fetchFamilias();
  }, [fetchFamilias]);

  const handleDismissFamiliaModal = useCallback(() => {
    setOpenFamiliaModal(false);
  }, []);

  const handleFamiliaSaved = useCallback(() => {
    setOpenFamiliaModal(false);
    setEditingFamiliaId(null);
    setFamiliaFormResetKey((prev) => prev + 1);
    void fetchFamilias();
    setTimeout(() => {
      void fetchFamilias();
    }, 400);
  }, [fetchFamilias]);

  const handleCreateFamilia = useCallback(() => {
    setEditingFamiliaId(null);
    setOpenFamiliaModal(true);
  }, []);

  const handleEditFamilia = useCallback((id: string) => {
    setEditingFamiliaId(id);
    setOpenFamiliaModal(true);
    setMenuAnchorEl(null);
    setMenuFamiliaId(null);
  }, []);

  const handleDeleteFamilia = useCallback(async (id: string) => {
    const familia = familias.find((item) => String(item.id) === id);
    const familiaTitle = familia?.titulo ? ` "${familia.titulo}"` : '';

    if (!window.confirm(`Estas seguro de eliminar la familia${familiaTitle}? Esta accion es irreversible.`)) {
      return;
    }

    try {
      const deleteFamilia = httpsCallable<{ id: number }, { id: number | null }>(
        functions,
        'deleteFamilia',
      );
      await deleteFamilia({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuFamiliaId(null);
      void fetchFamilias();
      setTimeout(() => {
        void fetchFamilias();
      }, 400);
    } catch (err) {
      console.error('Error deleting familia: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para eliminar familias (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo eliminar la familia: ${message}`);
      } else {
        setError('No se pudo eliminar la familia en Data Connect.');
      }
    }
  }, [familias, fetchFamilias, functions]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'portada',
        headerName: 'Portada',
        width: 60,
        minWidth: 60,
        maxWidth: 60,
        align: 'center',
        headerAlign: 'center',
        cellClassName: 'cover-cell',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          const row = params.row as Familia;
          return (
            <Stack
              sx={{
                width: 60,
                height: 52,
                px: '10px',
                boxSizing: 'border-box',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Avatar
                src={row.imagenPortadaUrl || undefined}
                alt={row.titulo || 'Familia'}
                variant="rounded"
                sx={{ width: 40, height: 40 }}
              >
                {(row.titulo || 'F').trim().charAt(0).toUpperCase()}
              </Avatar>
            </Stack>
          );
        },
      },
      {
        field: 'titulo',
        headerName: 'Titulo',
        flex: 1,
        minWidth: 170,
        valueGetter: (_value, row: Familia) => row.titulo || '',
      },
      {
        field: 'descripcion',
        headerName: 'Descripcion',
        flex: 1.5,
        minWidth: 240,
        valueGetter: (_value, row: Familia) => row.descripcion || '',
      },
      {
        field: 'sectorTitulo',
        headerName: 'Sector',
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row: Familia) =>
          row.sectorId != null ? sectorTitleById.get(row.sectorId) || `Sector ${row.sectorId}` : '',
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
              setMenuFamiliaId(String((params.row as Familia).id));
            }}
          >
            <MoreHorizIcon />
          </IconButton>
        ),
      },
    ],
    [sectorTitleById],
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
      title="Gestion de Familias"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreateFamilia}>
            Crear Familia
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
        rows={familias}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        loading={loading}
        sx={{ '& .cover-cell': { p: 0 } }}
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
          setMenuFamiliaId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuFamiliaId) handleEditFamilia(menuFamiliaId);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFamiliaId) void handleDeleteFamilia(menuFamiliaId);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openFamiliaModal}
        onClose={handleDismissFamiliaModal}
        title={editingFamiliaId ? 'Editar Familia' : 'Crear Familia'}
        maxWidth={720}
      >
        <FamiliaForm
          key={`${editingFamiliaId ?? 'new-familia'}-${familiaFormResetKey}`}
          asModal
          familiaId={editingFamiliaId ?? undefined}
          onCancel={handleDismissFamiliaModal}
          onSaved={handleFamiliaSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
