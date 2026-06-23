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
import { EspecialidadForm } from '@/components/intranet/especialidades/EspecialidadForm';

interface Especialidad {
  id: number;
  titulo: string | null;
  tituloComercial: string | null;
  descripcion: string | null;
  descripcion2: string | null;
  slug: string | null;
  actEconomicaId: number | null;
}

export default function EspecialidadesPage() {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openEspecialidadModal, setOpenEspecialidadModal] = useState(false);
  const [editingEspecialidadId, setEditingEspecialidadId] = useState<string | null>(null);
  const [especialidadFormResetKey, setEspecialidadFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuEspecialidadId, setMenuEspecialidadId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      titulo: true,
      tituloComercial: true,
      slug: true,
      actEconomicaId: true,
      descripcion: false,
      descripcion2: false,
      actions: true,
    });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchEspecialidades = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listEspecialidades = httpsCallable<undefined, { especialidades?: Especialidad[] }>(
        functions,
        'listEspecialidades',
      );
      const result = await listEspecialidades();
      setEspecialidades(result.data.especialidades || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching especialidades: ', err);
      setError(
        'No se pudieron cargar las especialidades. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchEspecialidades();
  }, [fetchEspecialidades]);

  const handleDismissEspecialidadModal = useCallback(() => {
    setOpenEspecialidadModal(false);
  }, []);

  const handleEspecialidadSaved = useCallback(() => {
    setOpenEspecialidadModal(false);
    setEditingEspecialidadId(null);
    setEspecialidadFormResetKey((prev) => prev + 1);
    void fetchEspecialidades();
    setTimeout(() => {
      void fetchEspecialidades();
    }, 400);
  }, [fetchEspecialidades]);

  const handleCreateEspecialidad = useCallback(() => {
    setEditingEspecialidadId(null);
    setOpenEspecialidadModal(true);
  }, []);

  const handleEditEspecialidad = useCallback((id: string) => {
    setEditingEspecialidadId(id);
    setOpenEspecialidadModal(true);
    setMenuAnchorEl(null);
    setMenuEspecialidadId(null);
  }, []);

  const handleDeleteEspecialidad = useCallback(async (id: string) => {
    const especialidad = especialidades.find((item) => String(item.id) === id);
    const especialidadTitle = especialidad?.titulo ? ` "${especialidad.titulo}"` : '';

    if (!window.confirm(`Estas seguro de eliminar la especialidad${especialidadTitle}? Esta accion es irreversible.`)) {
      return;
    }

    try {
      const deleteEspecialidad = httpsCallable<{ id: number }, { id: number | null }>(
        functions,
        'deleteEspecialidad',
      );
      await deleteEspecialidad({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuEspecialidadId(null);
      void fetchEspecialidades();
      setTimeout(() => {
        void fetchEspecialidades();
      }, 400);
    } catch (err) {
      console.error('Error deleting especialidad: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para eliminar especialidades (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo eliminar la especialidad: ${message}`);
      } else {
        setError('No se pudo eliminar la especialidad en Data Connect.');
      }
    }
  }, [especialidades, fetchEspecialidades, functions]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'titulo',
        headerName: 'Titulo',
        flex: 1,
        minWidth: 170,
        valueGetter: (_value, row: Especialidad) => row.titulo || '',
      },
      {
        field: 'tituloComercial',
        headerName: 'Titulo Comercial',
        flex: 1.1,
        minWidth: 190,
        valueGetter: (_value, row: Especialidad) => row.tituloComercial || '',
      },
      {
        field: 'slug',
        headerName: 'Slug',
        flex: 1,
        minWidth: 160,
        valueGetter: (_value, row: Especialidad) => row.slug || '',
      },
      {
        field: 'actEconomicaId',
        headerName: 'Act. Economica ID',
        flex: 0.8,
        minWidth: 145,
        valueGetter: (_value, row: Especialidad) => (row.actEconomicaId != null ? row.actEconomicaId : ''),
      },
      {
        field: 'descripcion',
        headerName: 'Descripcion',
        flex: 1.5,
        minWidth: 240,
        valueGetter: (_value, row: Especialidad) => row.descripcion || '',
      },
      {
        field: 'descripcion2',
        headerName: 'Descripcion 2',
        flex: 1.5,
        minWidth: 240,
        valueGetter: (_value, row: Especialidad) => row.descripcion2 || '',
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
              setMenuEspecialidadId(String((params.row as Especialidad).id));
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
      title="Gestion de Especialidades"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreateEspecialidad}>
            Crear Especialidad
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
        rows={especialidades}
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
          setMenuEspecialidadId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuEspecialidadId) handleEditEspecialidad(menuEspecialidadId);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuEspecialidadId) void handleDeleteEspecialidad(menuEspecialidadId);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openEspecialidadModal}
        onClose={handleDismissEspecialidadModal}
        title={editingEspecialidadId ? 'Editar Especialidad' : 'Crear Especialidad'}
      >
        <EspecialidadForm
          key={`${editingEspecialidadId ?? 'new-especialidad'}-${especialidadFormResetKey}`}
          asModal
          especialidadId={editingEspecialidadId ?? undefined}
          onCancel={handleDismissEspecialidadModal}
          onSaved={handleEspecialidadSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
