'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, FormControl, IconButton, InputLabel, Menu, MenuItem, Select, Stack } from '@mui/material';
import { GridColDef, GridColumnVisibilityModel, GridPaginationModel } from '@mui/x-data-grid';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import IntranetListLayout from '@/components/intranet/IntranetListLayout';
import Modal1 from '@/components/Modal1';
import { formatDateOnly } from '@/lib/dateOnly';
import { useAppSettings } from '@/hooks/useAppSettings';
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
  modalMaxWidth?: number | string;
  semestreFilter?: boolean;
}

interface SemestreFilterOption {
  id: number;
  titulo: string;
  inicio?: string | null;
  fin?: string | null;
  archivado?: boolean | null;
}

function renderCellValue(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  return String(value);
}

function renderNumberCellValue(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function renderTimestampCellValue(value: unknown) {
  if (typeof value !== 'string' || !value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function renderDateCellValue(value: unknown) {
  if (typeof value !== 'string' || !value) return '';
  return formatDateOnly(value, { dateStyle: 'short' }) || value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function toNumberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getRowSemestre(row: AcademicRow): SemestreFilterOption | null {
  const directSemestre = asRecord(row.semestre);
  const grupo = asRecord(row.grupo);
  const grupoSemestre = asRecord(grupo?.semestre);
  const semestre = directSemestre ?? grupoSemestre;
  const id = toNumberOrNull(row.semestreId) ?? toNumberOrNull(grupo?.semestreId) ?? toNumberOrNull(semestre?.id);
  if (!id) return null;
  const titulo = String(semestre?.titulo ?? `Semestre ${id}`).trim() || `Semestre ${id}`;
  return {
    id,
    titulo,
    inicio: typeof semestre?.inicio === 'string' ? semestre.inicio : null,
    fin: typeof semestre?.fin === 'string' ? semestre.fin : null,
    archivado: typeof semestre?.archivado === 'boolean' ? semestre.archivado : null,
  };
}

function pickDefaultSemestreId(options: SemestreFilterOption[], configuredSemestreId?: number | null) {
  if (configuredSemestreId && options.some((option) => option.id === configuredSemestreId)) {
    return String(configuredSemestreId);
  }
  const today = new Date();
  const current = options.find((option) => {
    if (option.archivado) return false;
    if (!option.inicio || !option.fin) return false;
    const start = new Date(`${option.inicio}T00:00:00`);
    const end = new Date(`${option.fin}T23:59:59`);
    return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= today && today <= end;
  });
  if (current) return String(current.id);

  const sorted = options.slice().sort((a, b) => {
    const aTime = a.inicio ? new Date(`${a.inicio}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const bTime = b.inicio ? new Date(`${b.inicio}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    return bTime - aTime || b.id - a.id;
  });
  return sorted[0] ? String(sorted[0].id) : '';
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
  modalMaxWidth = 720,
  semestreFilter = false,
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
  const [selectedSemestreId, setSelectedSemestreId] = useState('');
  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>(() => ({
      ...Object.fromEntries(columnConfigs.map((column) => [column.field, !column.hidden])),
      actions: true,
    }));
  const { settings } = useAppSettings();

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

  const fieldTypeByName = useMemo(
    () => new Map(fields.map((field) => [field.name, field.type])),
    [fields],
  );

  const columns = useMemo<GridColDef[]>(
    () => [
      ...columnConfigs.map<GridColDef>((column) => ({
        field: column.field,
        headerName: column.headerName,
        flex: column.flex ?? 1,
        minWidth: column.minWidth ?? 140,
        type: fieldTypeByName.get(column.field) === 'number' ? 'number' : undefined,
        valueGetter: (_value, row: AcademicRow) =>
          fieldTypeByName.get(column.field) === 'number'
            ? renderNumberCellValue(row[column.field])
            : fieldTypeByName.get(column.field) === 'date'
              ? renderDateCellValue(row[column.field])
            : fieldTypeByName.get(column.field) === 'timestamp'
              ? renderTimestampCellValue(row[column.field])
            : renderCellValue(row[column.field]),
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
    [columnConfigs, fieldTypeByName],
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

  const semestreOptions = useMemo(() => {
    const byId = new Map<number, SemestreFilterOption>();
    rows.forEach((row) => {
      const semestre = getRowSemestre(row);
      if (semestre && !byId.has(semestre.id)) byId.set(semestre.id, semestre);
    });
    return Array.from(byId.values()).sort((a, b) =>
      String(b.titulo).localeCompare(String(a.titulo), 'es', { numeric: true }) || b.id - a.id,
    );
  }, [rows]);

  useEffect(() => {
    if (!semestreFilter) return;
    if (semestreOptions.length === 0) {
      if (selectedSemestreId) setSelectedSemestreId('');
      return;
    }
    if (selectedSemestreId && semestreOptions.some((option) => String(option.id) === selectedSemestreId)) return;
    setSelectedSemestreId(pickDefaultSemestreId(semestreOptions, settings.general.semestreActualId));
  }, [selectedSemestreId, semestreFilter, semestreOptions, settings.general.semestreActualId]);

  const displayRows = useMemo(() => {
    if (!semestreFilter || !selectedSemestreId) return rows;
    const selected = Number(selectedSemestreId);
    return rows.filter((row) => getRowSemestre(row)?.id === selected);
  }, [rows, selectedSemestreId, semestreFilter]);

  return (
    <IntranetListLayout
      message={error}
      messageSeverity="error"
      title={title}
      commands={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          {semestreFilter ? (
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 190 } }}>
              <InputLabel>Semestre</InputLabel>
              <Select
                label="Semestre"
                value={selectedSemestreId}
                onChange={(event) => setSelectedSemestreId(String(event.target.value))}
                disabled={loading || semestreOptions.length === 0}
              >
                {semestreOptions.map((option) => (
                  <MenuItem key={option.id} value={String(option.id)}>
                    {option.titulo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
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
        rows={displayRows}
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
        maxWidth={modalMaxWidth}
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
