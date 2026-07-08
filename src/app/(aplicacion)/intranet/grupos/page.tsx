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
import { GrupoForm } from '@/components/intranet/grupos/GrupoForm';
import { getPersonalShortName } from '@/components/intranet/grupos/personalName';

interface Grupo {
  id: number;
  turnoNombre: string | null;
  descripcion: string | null;
  nombreDisplay: string | null;
  workspaceName: string | null;
  workspaceCorreo: string | null;
  estado: string | null;
  archivado: boolean | null;
  semestreId: number | null;
  semestre?: { titulo: string | null } | null;
  personalId: number | null;
  personal?: {
    displayName?: string | null;
    user?: { username?: string | null; apellidoPaterno?: string | null } | null;
  } | null;
  paqueteId: number | null;
  paquete?: { titulo: string | null } | null;
  turnoId: number | null;
  turno?: { nombre: string | null; horaInicio: string | null; horaFin: string | null } | null;
  horarioId: number | null;
  horario?: { nombre: string | null; regla: string | null; diasSemana: string | null; viernesAlternoInicio: string | null } | null;
  grupoOrd: number | null;
  grupoModulos?: Array<{
    id: number;
    orden: number | null;
    obligatorio: boolean | null;
    grupoId: number;
    moduloId: number;
    modulo?: { titulo: string | null; tituloComercial: string | null } | null;
  }>;
}

const getSemestreCodigo = (value: string | null | undefined) => String(value ?? '').trim().slice(-4);

const getGrupoPersonalUsername = (grupo: Grupo) =>
  getPersonalShortName(
    grupo.personal?.user?.username || grupo.personal?.displayName || '',
    grupo.personal?.user?.apellidoPaterno,
  );

const getGrupoNombre = (grupo: Grupo) => {
  const semestreCodigo = getSemestreCodigo(grupo.semestre?.titulo);
  const paqueteTitulo = grupo.paquete?.titulo || (grupo.paqueteId ? `Paquete ${grupo.paqueteId}` : '');
  const turnoTitulo = grupo.turno?.nombre || grupo.turnoNombre || '';
  const horarioTitulo = grupo.horario?.nombre || '';
  const personalUsername = getGrupoPersonalUsername(grupo);

  return [
    semestreCodigo,
    paqueteTitulo,
    turnoTitulo ? `[${turnoTitulo}]` : '',
    horarioTitulo,
    personalUsername ? `(${personalUsername})` : '',
  ].filter(Boolean).join(' ') || grupo.nombreDisplay || '';
};

export default function GruposPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openGrupoModal, setOpenGrupoModal] = useState(false);
  const [editingGrupoId, setEditingGrupoId] = useState<string | null>(null);
  const [grupoFormResetKey, setGrupoFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuGrupoId, setMenuGrupoId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      numero: true,
      nombreDisplay: true,
      paquete: false,
      modulos: false,
      semestre: false,
      turno: false,
      horario: false,
      workspaceName: false,
      workspaceCorreo: false,
      estado: true,
      archivado: true,
      descripcion: false,
      actions: true,
    });

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchGrupos = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listGrupos = httpsCallable<undefined, { grupos?: Grupo[] }>(functions, 'listGrupos');
      const result = await listGrupos();
      setGrupos(result.data.grupos || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching grupos: ', err);
      setError(
        'No se pudieron cargar los grupos. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.',
      );
    } finally {
      setLoading(false);
    }
  }, [auth, functions]);

  useEffect(() => {
    void fetchGrupos();
  }, [fetchGrupos]);

  const handleDismissGrupoModal = useCallback(() => {
    setOpenGrupoModal(false);
  }, []);

  const handleGrupoSaved = useCallback(() => {
    setOpenGrupoModal(false);
    setEditingGrupoId(null);
    setGrupoFormResetKey((prev) => prev + 1);
    void fetchGrupos();
    setTimeout(() => {
      void fetchGrupos();
    }, 400);
  }, [fetchGrupos]);

  const handleCreateGrupo = useCallback(() => {
    setEditingGrupoId(null);
    setOpenGrupoModal(true);
  }, []);

  const handleEditGrupo = useCallback((id: string) => {
    setEditingGrupoId(id);
    setOpenGrupoModal(true);
    setMenuAnchorEl(null);
    setMenuGrupoId(null);
  }, []);

  const handleDeleteGrupo = useCallback(async (id: string) => {
    const grupo = grupos.find((item) => String(item.id) === id);
    const grupoTitle = grupo ? ` "${getGrupoNombre(grupo)}"` : '';

    if (!window.confirm(`Estas seguro de eliminar el grupo${grupoTitle}? Esta accion es irreversible.`)) {
      return;
    }

    try {
      const deleteGrupo = httpsCallable<{ id: number }, { id: number | null }>(functions, 'deleteGrupo');
      await deleteGrupo({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuGrupoId(null);
      void fetchGrupos();
      setTimeout(() => {
        void fetchGrupos();
      }, 400);
    } catch (err) {
      console.error('Error deleting grupo: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para eliminar grupos (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo eliminar el grupo: ${message}`);
      } else {
        setError('No se pudo eliminar el grupo en Data Connect.');
      }
    }
  }, [fetchGrupos, functions, grupos]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'numero',
        headerName: '#',
        align: 'center',
        headerAlign: 'center',
        width: 36,
        minWidth: 36,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
      },
      {
        field: 'nombreDisplay',
        headerName: 'Grupo',
        flex: 1.4,
        minWidth: 220,
        valueGetter: (_value, row: Grupo) => getGrupoNombre(row),
      },
      {
        field: 'paquete',
        headerName: 'Paquete',
        flex: 1.2,
        minWidth: 190,
        valueGetter: (_value, row: Grupo) => row.paquete?.titulo || (row.paqueteId ? `Paquete ${row.paqueteId}` : ''),
      },
      {
        field: 'modulos',
        headerName: 'Modulos',
        flex: 1.4,
        minWidth: 220,
        valueGetter: (_value, row: Grupo) =>
          (row.grupoModulos || [])
            .slice()
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.moduloId - b.moduloId)
            .map((item) => item.modulo?.tituloComercial || item.modulo?.titulo || `Modulo ${item.moduloId}`)
            .join(' / '),
      },
      {
        field: 'semestre',
        headerName: 'Semestre',
        flex: 0.9,
        minWidth: 145,
        valueGetter: (_value, row: Grupo) => row.semestre?.titulo || (row.semestreId ? `Semestre ${row.semestreId}` : ''),
      },
      {
        field: 'turno',
        headerName: 'Turno',
        flex: 0.7,
        minWidth: 120,
        valueGetter: (_value, row: Grupo) => row.turno?.nombre || row.turnoNombre || '',
      },
      {
        field: 'horario',
        headerName: 'Horario',
        flex: 1,
        minWidth: 180,
        valueGetter: (_value, row: Grupo) => row.horario?.nombre || (row.horarioId ? `Horario ${row.horarioId}` : ''),
      },
      {
        field: 'workspaceName',
        headerName: 'Nombre Workspace',
        flex: 1,
        minWidth: 180,
        valueGetter: (_value, row: Grupo) => row.workspaceName || '',
      },
      {
        field: 'workspaceCorreo',
        headerName: 'Correo Workspace',
        flex: 1,
        minWidth: 190,
        valueGetter: (_value, row: Grupo) => row.workspaceCorreo || '',
      },
      {
        field: 'estado',
        headerName: 'Estado',
        flex: 0.32,
        minWidth: 55,
        valueGetter: (_value, row: Grupo) => row.estado || '',
      },
      {
        field: 'archivado',
        headerName: 'Archivado',
        flex: 0.35,
        minWidth: 58,
        valueGetter: (_value, row: Grupo) => (row.archivado ? 'Si' : 'No'),
      },
      {
        field: 'descripcion',
        headerName: 'Descripcion',
        flex: 1.4,
        minWidth: 220,
        valueGetter: (_value, row: Grupo) => row.descripcion || '',
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
              setMenuGrupoId(String((params.row as Grupo).id));
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
      title="Gestion de Grupos"
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreateGrupo}>
            Crear Grupo
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
        rows={grupos}
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
          setMenuGrupoId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuGrupoId) handleEditGrupo(menuGrupoId);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuGrupoId) void handleDeleteGrupo(menuGrupoId);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openGrupoModal}
        onClose={handleDismissGrupoModal}
        title={editingGrupoId ? 'Editar Grupo' : 'Crear Grupo'}
        maxWidth={900}
      >
        <GrupoForm
          key={`${editingGrupoId ?? 'new-grupo'}-${grupoFormResetKey}`}
          asModal
          grupoId={editingGrupoId ?? undefined}
          onCancel={handleDismissGrupoModal}
          onSaved={handleGrupoSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
