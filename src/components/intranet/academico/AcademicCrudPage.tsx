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
import { AcademicEntityForm, AcademicFieldConfig } from './AcademicEntityForm';

type AcademicRow = Record<string, unknown> & { id: number };

export interface AcademicColumnConfig {
  field: string;
  headerName: string;
  flex?: number;
  minWidth?: number;
  hidden?: boolean;
}

interface AcademicCrudPageProps {
  rowsKey: string;
  entityKey: string;
  entityLabel: string;
  entityPluralLabel: string;
  title: string;
  createLabel: string;
  listCallableName: string;
  getCallableName: string;
  saveCallableName: string;
  deleteCallableName: string;
  fields: AcademicFieldConfig[];
  columns: AcademicColumnConfig[];
  labelField: string;
}

function renderCellValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  return String(value);
}

export function AcademicCrudPage({
  rowsKey,
  entityKey,
  entityLabel,
  entityPluralLabel,
  title,
  createLabel,
  listCallableName,
  getCallableName,
  saveCallableName,
  deleteCallableName,
  fields,
  columns: columnConfigs,
  labelField,
}: AcademicCrudPageProps) {
  const [rows, setRows] = useState<AcademicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuRowId, setMenuRowId] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 15,
  });
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>(() => ({
      ...Object.fromEntries(columnConfigs.map((column) => [column.field, !column.hidden])),
      actions: true,
    }));

  const auth = getAuth(app);
  const functions = useMemo(() => getFunctions(app), []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }
      const listRows = httpsCallable<undefined, Record<string, AcademicRow[]>>(
        functions,
        listCallableName,
      );
      const result = await listRows();
      setRows(result.data[rowsKey] || []);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${rowsKey}: `, err);
      setError(
        `No se pudieron cargar ${entityPluralLabel.toLowerCase()}. Verifica que tu usuario tenga claim level >= 600 y vuelve a iniciar sesion.`,
      );
    } finally {
      setLoading(false);
    }
  }, [auth, entityPluralLabel, functions, listCallableName, rowsKey]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const handleDismissModal = useCallback(() => {
    setOpenModal(false);
  }, []);

  const handleSaved = useCallback(() => {
    setOpenModal(false);
    setEditingId(null);
    setFormResetKey((prev) => prev + 1);
    void fetchRows();
    setTimeout(() => {
      void fetchRows();
    }, 400);
  }, [fetchRows]);

  const handleCreate = useCallback(() => {
    setEditingId(null);
    setOpenModal(true);
  }, []);

  const handleEdit = useCallback((id: string) => {
    setEditingId(id);
    setOpenModal(true);
    setMenuAnchorEl(null);
    setMenuRowId(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const row = rows.find((item) => String(item.id) === id);
    const rowTitle = row?.[labelField] ? ` "${row[labelField]}"` : '';

    if (!window.confirm(`Estas seguro de eliminar ${entityLabel.toLowerCase()}${rowTitle}? Esta accion es irreversible.`)) {
      return;
    }

    try {
      const deleteRow = httpsCallable<{ id: number }, { id: number | null }>(
        functions,
        deleteCallableName,
      );
      await deleteRow({ id: Number(id) });
      setMenuAnchorEl(null);
      setMenuRowId(null);
      void fetchRows();
      setTimeout(() => {
        void fetchRows();
      }, 400);
    } catch (err) {
      console.error(`Error deleting ${entityKey}: `, err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError(`No tienes acceso para eliminar ${entityPluralLabel.toLowerCase()} (requiere level >= 600).`);
      } else if (message) {
        setError(`No se pudo eliminar ${entityLabel.toLowerCase()}: ${message}`);
      } else {
        setError(`No se pudo eliminar ${entityLabel.toLowerCase()} en Data Connect.`);
      }
    }
  }, [deleteCallableName, entityKey, entityLabel, entityPluralLabel, fetchRows, functions, labelField, rows]);

  const columns = useMemo<GridColDef[]>(
    () => [
      ...columnConfigs.map<GridColDef>((column) => ({
        field: column.field,
        headerName: column.headerName,
        flex: column.flex ?? 1,
        minWidth: column.minWidth ?? 140,
        valueGetter: (_value, row: AcademicRow) => renderCellValue(row[column.field]),
      })),
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
              setMenuRowId(String((params.row as AcademicRow).id));
            }}
          >
            <MoreHorizIcon />
          </IconButton>
        ),
      },
    ],
    [columnConfigs],
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
      title={title}
      commands={
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={handleCreate}>
            {createLabel}
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
        rows={rows}
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
          setMenuRowId(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuRowId) handleEdit(menuRowId);
          }}
        >
          Editar
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuRowId) void handleDelete(menuRowId);
          }}
        >
          Eliminar
        </MenuItem>
      </Menu>

      <Modal1
        open={openModal}
        onClose={handleDismissModal}
        title={editingId ? `Editar ${entityLabel}` : `Crear ${entityLabel}`}
      >
        <AcademicEntityForm
          key={`${editingId ?? `new-${entityKey}`}-${formResetKey}`}
          entityId={editingId ?? undefined}
          entityKey={entityKey}
          entityLabel={entityLabel}
          getCallableName={getCallableName}
          saveCallableName={saveCallableName}
          fields={fields}
          onCancel={handleDismissModal}
          onSaved={handleSaved}
        />
      </Modal1>
    </IntranetListLayout>
  );
}
