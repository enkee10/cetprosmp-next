'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import DownloadIcon from '@mui/icons-material/Download';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TableChartIcon from '@mui/icons-material/TableChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { GridColDef, GridRowId, GridRowSelectionModel } from '@mui/x-data-grid';
import { httpsCallable } from 'firebase/functions';
import FormLoadingOverlay from '@/components/FormLoadingOverlay';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import { dateOnlyTimestamp } from '@/lib/dateOnly';
import { auth, functions } from '@/lib/firebase';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';

type TipoDocumento = 'acta' | 'nomina';
type DownloadFormat = 'pdf' | 'excel';

type SemestreOption = {
  id: number;
  titulo?: string | null;
  inicio?: string | null;
  fin?: string | null;
};

type RegistroAcademicoDocumento = {
  id: number;
  tipoDocumento: string;
  grupoModuloId: number;
  pdfPath?: string | null;
  pdfUrl?: string | null;
  excelPath?: string | null;
  excelUrl?: string | null;
  generadoEn?: string | null;
};

type GrupoModuloOption = {
  id: number;
  nombre?: string | null;
  semestreId?: number | null;
  semestreTitulo?: string | null;
  grupoNombre?: string | null;
  turno?: string | null;
  horario?: string | null;
  docente?: string | null;
  moduloNombre?: string | null;
  tipoCarrera?: string | null;
};

type RegistroAcademicoRow = GrupoModuloOption & {
  selectionOrder: number | null;
  label: string;
  documento?: RegistroAcademicoDocumento | null;
  generado: boolean;
  generadoEnText: string;
};

type ReportOptionsResponse = {
  semestres?: SemestreOption[];
  grupoModulos?: GrupoModuloOption[];
  documentos?: RegistroAcademicoDocumento[];
};

type GeneratedFile = {
  path: string;
  url: string;
  contentType: string;
};

type GenerateResponse = {
  tipoDocumento: TipoDocumento;
  semestreId: number | null;
  grupoModuloId: number | null;
  totalReportes: number;
  pdf: GeneratedFile;
  excel: GeneratedFile;
  documento?: RegistroAcademicoDocumento;
};

type DownloadResponse = {
  formato: DownloadFormat;
  file: GeneratedFile;
};

const createEmptySelectionModel = (): GridRowSelectionModel => ({ type: 'include', ids: new Set<GridRowId>() });

const selectMenuProps = {
  disableScrollLock: true,
  PaperProps: {
    sx: { maxHeight: 360 },
  },
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForCallableAuthToken(timeoutMs = 3000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.getIdToken(false);
      return;
    }

    await Promise.race([
      auth.authStateReady(),
      sleep(200),
    ]).catch(() => undefined);
  }

  throw new Error('La sesion aun no esta lista. Vuelve a intentarlo en unos segundos.');
}

function selectionModelToIds(model: GridRowSelectionModel) {
  return Array.from(model.ids).map((id) => Number(id)).filter((id) => Number.isFinite(id));
}

function getGrupoModuloLabel(option: GrupoModuloOption) {
  return String(option.moduloNombre || option.nombre || `Modulo ${option.id}`).trim();
}

function formatDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function openUrl(url?: string | null) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function toTimestamp(value?: string | null) {
  return dateOnlyTimestamp(value);
}

function getDefaultSemestreId(semestres: SemestreOption[], current: string) {
  if (current && semestres.some((semestre) => String(semestre.id) === current)) return current;
  const now = Date.now();
  const dated = semestres.map((semestre) => ({
    semestre,
    inicio: toTimestamp(semestre.inicio),
    fin: toTimestamp(semestre.fin),
  }));
  const active = dated.find((item) =>
    (item.inicio != null || item.fin != null) &&
    (item.inicio == null || item.inicio <= now) &&
    (item.fin == null || item.fin >= now),
  )?.semestre.id;
  if (active) return String(active);
  const lastStarted = dated
    .filter((item) => item.inicio != null && item.inicio <= now)
    .sort((a, b) => (b.inicio ?? 0) - (a.inicio ?? 0))[0]?.semestre.id;
  return String(lastStarted || semestres[0]?.id || '');
}

export default function RegistroAcademicosPage() {
  const { can, loading: permissionsLoading } = useIntranetPermissions();
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [generatingIds, setGeneratingIds] = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageSeverity, setMessageSeverity] = useState<'success' | 'error' | 'info'>('info');
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [grupoModulos, setGrupoModulos] = useState<GrupoModuloOption[]>([]);
  const [documentos, setDocumentos] = useState<RegistroAcademicoDocumento[]>([]);
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('acta');
  const [semestreId, setSemestreId] = useState('');
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>(createEmptySelectionModel);
  const [selectionOrder, setSelectionOrder] = useState<number[]>([]);
  const [rowMenuAnchor, setRowMenuAnchor] = useState<HTMLElement | null>(null);
  const [activeRowId, setActiveRowId] = useState<number | null>(null);
  const [toolbarDownloadAnchor, setToolbarDownloadAnchor] = useState<HTMLElement | null>(null);

  const canViewReportes = can('documentos-reportes', 'view');
  const canGenerateReportes = can('documentos-reportes', 'create');

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setMessage('');
    try {
      const listReporteDocumentosOptions = httpsCallable<undefined, ReportOptionsResponse>(
        functions,
        'listReporteDocumentosOptions',
      );
      await waitForCallableAuthToken();
      const result = await listReporteDocumentosOptions();
      const nextSemestres = result.data.semestres || [];
      setSemestres(nextSemestres);
      setGrupoModulos(result.data.grupoModulos || []);
      setDocumentos(result.data.documentos || []);
      setSemestreId((current) => getDefaultSemestreId(nextSemestres, current));
    } catch (err) {
      console.error('Error loading registros academicos options:', err);
      setMessage('No se pudieron cargar los registros academicos.');
      setMessageSeverity('error');
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canViewReportes) {
      setLoadingOptions(false);
      return;
    }
    void loadOptions();
  }, [canViewReportes, loadOptions, permissionsLoading]);

  useEffect(() => {
    setSelectionModel(createEmptySelectionModel());
    setSelectionOrder([]);
  }, [semestreId, tipoDocumento]);

  const documentoByGrupoModuloId = useMemo(() => {
    const map = new Map<number, RegistroAcademicoDocumento>();
    documentos
      .filter((documento) => documento.tipoDocumento === tipoDocumento)
      .forEach((documento) => map.set(documento.grupoModuloId, documento));
    return map;
  }, [documentos, tipoDocumento]);

  const rows = useMemo<RegistroAcademicoRow[]>(() => {
    const orderById = new Map(selectionOrder.map((id, index) => [id, index + 1]));
    return grupoModulos
      .filter((item) => String(item.semestreId || '') === semestreId)
      .map((item) => {
        const documento = documentoByGrupoModuloId.get(item.id) ?? null;
        return {
          ...item,
          selectionOrder: orderById.get(item.id) ?? null,
          label: getGrupoModuloLabel(item),
          documento,
          generado: Boolean(documento?.pdfUrl && documento?.excelUrl),
          generadoEnText: formatDateTime(documento?.generadoEn),
        };
      });
  }, [documentoByGrupoModuloId, grupoModulos, selectionOrder, semestreId]);

  const selectedRows = useMemo(
    () => selectionOrder.map((id) => rows.find((row) => row.id === id)).filter((row): row is RegistroAcademicoRow => Boolean(row)),
    [rows, selectionOrder],
  );
  const singleSelectedRow = selectedRows.length === 1 ? selectedRows[0] : null;
  const selectedHasMissingDocuments = selectedRows.some((row) => !row.generado);
  const activeRow = activeRowId ? rows.find((row) => row.id === activeRowId) ?? null : null;
  const selectedSemestreName = semestres.find((item) => String(item.id) === semestreId)?.titulo || '';
  const generationInProgress = generatingIds.size > 0;

  const handleSelectionChange = useCallback((model: GridRowSelectionModel) => {
    const selectedIds = selectionModelToIds(model);
    setSelectionModel(model);
    setSelectionOrder((current) => {
      const kept = current.filter((id) => selectedIds.includes(id));
      const added = selectedIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, []);

  const handleGenerate = useCallback(async (ids: number[]) => {
    if (!ids.length || !canGenerateReportes) return;
    setGeneratingIds(new Set(ids));
    setMessage('');
    try {
      const generateReporteDocumento = httpsCallable<
        { tipoDocumento: TipoDocumento; grupoModuloId: number },
        GenerateResponse
      >(functions, 'generateReporteDocumento');
      for (const id of ids) {
        await waitForCallableAuthToken();
        await generateReporteDocumento({ tipoDocumento, grupoModuloId: id });
      }
      await loadOptions();
      setMessage(ids.length === 1 ? 'Documento generado.' : 'Documentos generados.');
      setMessageSeverity('success');
    } catch (err) {
      console.error('Error generating registro academico:', err);
      setMessage((err as { message?: string } | null)?.message || 'No se pudo generar el documento.');
      setMessageSeverity('error');
    } finally {
      setGeneratingIds(new Set());
      setRowMenuAnchor(null);
    }
  }, [canGenerateReportes, loadOptions, tipoDocumento]);

  const handleDownloadSelected = useCallback(async (formato: DownloadFormat) => {
    if (!selectedRows.length) return;
    if (selectedHasMissingDocuments) {
      setMessage('Todos los grupos seleccionados deben tener documento generado.');
      setMessageSeverity('info');
      setToolbarDownloadAnchor(null);
      return;
    }

    setDownloading(true);
    setMessage('');
    try {
      const descargarRegistrosAcademicosSeleccionados = httpsCallable<
        { tipoDocumento: TipoDocumento; grupoModuloIds: number[]; formato: DownloadFormat },
        DownloadResponse
      >(functions, 'descargarRegistrosAcademicosSeleccionados');
      const result = await descargarRegistrosAcademicosSeleccionados({
        tipoDocumento,
        grupoModuloIds: selectedRows.map((row) => row.id),
        formato,
      });
      openUrl(result.data.file.url);
    } catch (err) {
      console.error('Error downloading registros academicos:', err);
      setMessage((err as { message?: string } | null)?.message || 'No se pudo preparar la descarga.');
      setMessageSeverity('error');
    } finally {
      setDownloading(false);
      setToolbarDownloadAnchor(null);
    }
  }, [selectedHasMissingDocuments, selectedRows, tipoDocumento]);

  const columns = useMemo<GridColDef<RegistroAcademicoRow>[]>(() => [
    {
      field: 'label',
      headerName: 'Modulo',
      flex: 1,
      minWidth: 360,
      renderCell: (params) => (
        params.row.documento?.pdfUrl ? (
          <Link
            component="button"
            underline="hover"
            onClick={() => openUrl(params.row.documento?.pdfUrl)}
            sx={{ textAlign: 'left', color: 'inherit', fontWeight: 600 }}
          >
            {params.row.label}
          </Link>
        ) : (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.row.label}
          </Typography>
        )
      ),
    },
    {
      field: 'selectionOrder',
      headerName: 'Orden',
      width: 72,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      filterable: false,
      valueGetter: (_value, row) => row.selectionOrder ?? '',
    },
    {
      field: 'generado',
      headerName: 'Generado',
      width: 120,
      valueGetter: (_value, row) => (row.generado ? 'Si' : 'No'),
    },
    {
      field: 'generadoEnText',
      headerName: 'Fecha generacion',
      width: 170,
    },
    {
      field: 'actions',
      headerName: '',
      width: 56,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'center',
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={(event) => {
            setActiveRowId(params.row.id);
            setRowMenuAnchor(event.currentTarget);
          }}
        >
          <MoreHorizIcon fontSize="small" />
        </IconButton>
      ),
    },
  ], []);

  if (!permissionsLoading && !canViewReportes) {
    return (
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
        <Alert severity="info">No tienes permiso para ver este apartado.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <ArticleIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Nominas y Actas
        </Typography>
      </Stack>

      <AutoDismissAlert message={message} severity={messageSeverity} />
      {selectedHasMissingDocuments && selectedRows.length > 0 ? (
        <Alert severity="info">La descarga multiple se habilita solo cuando todos los seleccionados ya tienen documento generado.</Alert>
      ) : null}

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="tipo-documento-label">Documento</InputLabel>
            <Select
              labelId="tipo-documento-label"
              label="Documento"
              value={tipoDocumento}
              MenuProps={selectMenuProps}
              onChange={(event) => setTipoDocumento(event.target.value as TipoDocumento)}
            >
              <MenuItem value="acta">Acta</MenuItem>
              <MenuItem value="nomina">Nomina</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="semestre-label">Semestre</InputLabel>
            <Select
              labelId="semestre-label"
              label="Semestre"
              value={semestreId}
              MenuProps={selectMenuProps}
              onChange={(event) => setSemestreId(event.target.value)}
              disabled={loadingOptions}
            >
              {semestres.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  {semestre.titulo || `Semestre ${semestre.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          <Button
            variant="outlined"
            startIcon={<VisibilityIcon />}
            disabled={!singleSelectedRow?.documento?.pdfUrl}
            onClick={() => openUrl(singleSelectedRow?.documento?.pdfUrl)}
          >
            Visualizar
          </Button>

          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            disabled={!canGenerateReportes || loadingOptions || generationInProgress || selectedRows.length === 0}
            onClick={() => void handleGenerate(selectedRows.map((row) => row.id))}
          >
            Generar
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={downloading || selectedRows.length === 0 || selectedHasMissingDocuments}
            onClick={(event) => setToolbarDownloadAnchor(event.currentTarget)}
          >
            Descargar
          </Button>
          <Menu
            anchorEl={toolbarDownloadAnchor}
            open={Boolean(toolbarDownloadAnchor)}
            onClose={() => setToolbarDownloadAnchor(null)}
            disableScrollLock
          >
            <MenuItem onClick={() => void handleDownloadSelected('pdf')}>
              <PictureAsPdfIcon fontSize="small" sx={{ mr: 1 }} />
              PDF unido
            </MenuItem>
            <MenuItem onClick={() => void handleDownloadSelected('excel')}>
              <TableChartIcon fontSize="small" sx={{ mr: 1 }} />
              Excel con hojas
            </MenuItem>
          </Menu>
        </Stack>

        <Typography variant="caption" sx={{ display: 'block', mt: 1.25, color: 'text.secondary' }}>
          {selectedSemestreName ? `${selectedSemestreName} - ${rows.length} grupos-modulo` : 'Selecciona un semestre'}
        </Typography>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <IntranetDataGrid
          rows={rows}
          columns={columns}
          checkboxSelection
          loading={loadingOptions}
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={handleSelectionChange}
          getRowId={(row) => row.id}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 15 } },
          }}
          sx={{
            '& .MuiDataGrid-cell': {
              alignItems: 'center',
              py: 0.75,
            },
            '& .MuiDataGrid-cellContent': {
              alignItems: 'center',
            },
          }}
        />
      </Paper>

      <Menu
        anchorEl={rowMenuAnchor}
        open={Boolean(rowMenuAnchor)}
        onClose={() => setRowMenuAnchor(null)}
        disableScrollLock
      >
        <MenuItem
          disabled={!canGenerateReportes || !activeRow || generationInProgress}
          onClick={() => activeRow && void handleGenerate([activeRow.id])}
        >
          <PlayArrowIcon fontSize="small" sx={{ mr: 1 }} />
          Generar
        </MenuItem>
        <MenuItem
          disabled={!activeRow?.documento?.pdfUrl}
          onClick={() => {
            openUrl(activeRow?.documento?.pdfUrl);
            setRowMenuAnchor(null);
          }}
        >
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          Visualizar
        </MenuItem>
        <MenuItem
          disabled={!activeRow?.documento?.pdfUrl}
          onClick={() => {
            openUrl(activeRow?.documento?.pdfUrl);
            setRowMenuAnchor(null);
          }}
        >
          <PictureAsPdfIcon fontSize="small" sx={{ mr: 1 }} />
          Descargar PDF
        </MenuItem>
        <MenuItem
          disabled={!activeRow?.documento?.excelUrl}
          onClick={() => {
            openUrl(activeRow?.documento?.excelUrl);
            setRowMenuAnchor(null);
          }}
        >
          <TableChartIcon fontSize="small" sx={{ mr: 1 }} />
          Descargar Excel
        </MenuItem>
      </Menu>
      <FormLoadingOverlay
        open={generationInProgress}
        message={tipoDocumento === 'acta' ? 'Generando acta...' : 'Generando nomina...'}
        variant="fullscreen"
      />
    </Box>
  );
}
