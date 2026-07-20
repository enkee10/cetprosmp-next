'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  ListItemText,
  Menu,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SchoolIcon from '@mui/icons-material/School';
import TableChartIcon from '@mui/icons-material/TableChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { GridColDef, GridRowId, GridRowSelectionModel } from '@mui/x-data-grid';
import { httpsCallable } from 'firebase/functions';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import IntranetDataGrid from '@/components/intranet/IntranetDataGrid';
import { dateOnlyTimestamp } from '@/lib/dateOnly';
import { functions } from '@/lib/firebase';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';

type TipoDocumento = 'certificado' | 'titulo';
type DownloadFormat = 'pdf' | 'excel';

type SemestreOption = {
  id: number;
  titulo?: string | null;
  inicio?: string | null;
  fin?: string | null;
};

type GrupoModuloOption = {
  id: number;
  nombre: string;
  semestreId?: number | null;
  semestreTitulo?: string | null;
  moduloNombre?: string | null;
};

type CertificadoTituloDocumento = {
  id: number;
  tipoDocumento: string;
  semestreCodigo?: string | null;
  grupoModuloId: number;
  moduloEstudianteId: number;
  pdfPath?: string | null;
  pdfUrl?: string | null;
  excelPath?: string | null;
  excelUrl?: string | null;
  generadoEn?: string | null;
};

type CertificadoTituloRow = {
  id: string;
  grupoModuloId: number;
  moduloEstudianteId: number;
  matriculaId: number;
  semestreId?: number | null;
  semestreTitulo?: string | null;
  semestreCodigo: string;
  estudianteNombre: string;
  grupoModuloNombre: string;
  moduloNombre: string;
  promedioFinal: number;
  selectionOrder: number | null;
  documento?: CertificadoTituloDocumento | null;
  generado: boolean;
  generadoEnText: string;
};

type OptionsResponse = {
  semestres?: SemestreOption[];
  grupoModulos?: GrupoModuloOption[];
  estudiantes?: Omit<CertificadoTituloRow, 'selectionOrder' | 'documento' | 'generado' | 'generadoEnText'>[];
  documentos?: CertificadoTituloDocumento[];
};

type GeneratedFile = {
  path: string;
  url: string;
  contentType: string;
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

function selectionModelToIds(model: GridRowSelectionModel) {
  return Array.from(model.ids).map((id) => String(id));
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

function renderSelectedNames(ids: number[], options: Array<{ id: number; nombre?: string | null; titulo?: string | null }>) {
  if (!ids.length) return 'Todos';
  const names = ids
    .map((id) => options.find((option) => option.id === id)?.nombre || options.find((option) => option.id === id)?.titulo)
    .filter(Boolean);
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
}

function semesterDateTime(value?: string | null) {
  return dateOnlyTimestamp(value);
}

function currentOrLatestSemester(semestres: SemestreOption[]) {
  const today = Date.now();
  const current = semestres.find((semestre) => {
    const inicio = semesterDateTime(semestre.inicio);
    const fin = semesterDateTime(semestre.fin);
    return inicio !== null && fin !== null && inicio <= today && today <= fin;
  });
  if (current) return current;
  return [...semestres].sort((a, b) => (semesterDateTime(b.inicio) ?? b.id) - (semesterDateTime(a.inicio) ?? a.id))[0] ?? null;
}

export default function CertificadosTitulosPage() {
  const { can, loading: permissionsLoading } = useIntranetPermissions();
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageSeverity, setMessageSeverity] = useState<'success' | 'error' | 'info'>('info');
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [grupoModulos, setGrupoModulos] = useState<GrupoModuloOption[]>([]);
  const [estudiantes, setEstudiantes] = useState<OptionsResponse['estudiantes']>([]);
  const [documentos, setDocumentos] = useState<CertificadoTituloDocumento[]>([]);
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('certificado');
  const [semestreIds, setSemestreIds] = useState<number[]>([]);
  const [grupoModuloIds, setGrupoModuloIds] = useState<number[]>([]);
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>(createEmptySelectionModel);
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);
  const [rowMenuAnchor, setRowMenuAnchor] = useState<HTMLElement | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [toolbarDownloadAnchor, setToolbarDownloadAnchor] = useState<HTMLElement | null>(null);

  const canView = can('certificados-titulos', 'view');
  const canGenerate = can('certificados-titulos', 'create');

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setMessage('');
    try {
      const listCertificadosTitulosOptions = httpsCallable<undefined, OptionsResponse>(
        functions,
        'listCertificadosTitulosOptions',
      );
      const result = await listCertificadosTitulosOptions();
      const nextEstudiantes = result.data.estudiantes || [];
      const semestreIdsConRegistros = new Set(
        nextEstudiantes
          .map((item) => item.semestreId)
          .filter((id): id is number => typeof id === 'number'),
      );
      const nextSemestres = (result.data.semestres || []).filter((semestre) => semestreIdsConRegistros.has(semestre.id));
      setSemestres(nextSemestres);
      setGrupoModulos(result.data.grupoModulos || []);
      setEstudiantes(nextEstudiantes);
      setDocumentos(result.data.documentos || []);
      setSemestreIds((current) => {
        const validCurrent = current.filter((id) => semestreIdsConRegistros.has(id));
        if (validCurrent.length) return validCurrent;
        const preferred = currentOrLatestSemester(nextSemestres);
        return preferred ? [preferred.id] : [];
      });
    } catch (err) {
      console.error('Error loading certificados y titulos:', err);
      setMessage('No se pudieron cargar los certificados y titulos.');
      setMessageSeverity('error');
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (permissionsLoading) return;
    if (!canView) {
      setLoadingOptions(false);
      return;
    }
    void loadOptions();
  }, [canView, loadOptions, permissionsLoading]);

  useEffect(() => {
    setSelectionModel(createEmptySelectionModel());
    setSelectionOrder([]);
  }, [tipoDocumento, semestreIds, grupoModuloIds]);

  const filteredGrupoModulos = useMemo(() => {
    if (!semestreIds.length) return grupoModulos;
    return grupoModulos.filter((item) => item.semestreId && semestreIds.includes(item.semestreId));
  }, [grupoModulos, semestreIds]);

  const documentoByKey = useMemo(() => {
    const map = new Map<string, CertificadoTituloDocumento>();
    documentos
      .filter((documento) => documento.tipoDocumento === tipoDocumento)
      .forEach((documento) => map.set(`${documento.grupoModuloId}:${documento.moduloEstudianteId}`, documento));
    return map;
  }, [documentos, tipoDocumento]);

  const rows = useMemo<CertificadoTituloRow[]>(() => {
    const orderById = new Map(selectionOrder.map((id, index) => [id, index + 1]));
    return (estudiantes || [])
      .filter((item) => !semestreIds.length || (item.semestreId && semestreIds.includes(item.semestreId)))
      .filter((item) => !grupoModuloIds.length || grupoModuloIds.includes(item.grupoModuloId))
      .map((item) => {
        const documento = documentoByKey.get(item.id) ?? null;
        return {
          ...item,
          selectionOrder: orderById.get(item.id) ?? null,
          documento,
          generado: Boolean(documento?.pdfUrl && documento?.excelUrl),
          generadoEnText: formatDateTime(documento?.generadoEn),
        };
      });
  }, [documentoByKey, estudiantes, grupoModuloIds, selectionOrder, semestreIds]);

  const selectedRows = useMemo(
    () => selectionOrder.map((id) => rows.find((row) => row.id === id)).filter((row): row is CertificadoTituloRow => Boolean(row)),
    [rows, selectionOrder],
  );
  const singleSelectedRow = selectedRows.length === 1 ? selectedRows[0] : null;
  const selectedHasMissingDocuments = selectedRows.some((row) => !row.generado);
  const activeRow = activeRowId ? rows.find((row) => row.id === activeRowId) ?? null : null;

  const handleSelectionChange = useCallback((model: GridRowSelectionModel) => {
    const selectedIds = selectionModelToIds(model);
    setSelectionModel(model);
    setSelectionOrder((current) => {
      const kept = current.filter((id) => selectedIds.includes(id));
      const added = selectedIds.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, []);

  const selectedItems = useCallback((items: CertificadoTituloRow[]) => items.map((row) => ({
    grupoModuloId: row.grupoModuloId,
    moduloEstudianteId: row.moduloEstudianteId,
  })), []);

  const handleGenerate = useCallback(async (items: CertificadoTituloRow[]) => {
    if (!items.length || !canGenerate) return;
    setGeneratingIds(new Set(items.map((item) => item.id)));
    setMessage('');
    try {
      const generateCertificadosTitulos = httpsCallable<
        { tipoDocumento: TipoDocumento; items: Array<{ grupoModuloId: number; moduloEstudianteId: number }> },
        { total: number }
      >(functions, 'generateCertificadosTitulos');
      await generateCertificadosTitulos({ tipoDocumento, items: selectedItems(items) });
      await loadOptions();
      setMessage(items.length === 1 ? 'Documento generado.' : 'Documentos generados.');
      setMessageSeverity('success');
    } catch (err) {
      console.error('Error generating certificados y titulos:', err);
      setMessage((err as { message?: string } | null)?.message || 'No se pudo generar el documento.');
      setMessageSeverity('error');
    } finally {
      setGeneratingIds(new Set());
      setRowMenuAnchor(null);
    }
  }, [canGenerate, loadOptions, selectedItems, tipoDocumento]);

  const handleDownloadSelected = useCallback(async (formato: DownloadFormat) => {
    if (!selectedRows.length) return;
    if (selectedHasMissingDocuments) {
      setMessage('Todos los estudiantes seleccionados deben tener documento generado.');
      setMessageSeverity('info');
      setToolbarDownloadAnchor(null);
      return;
    }

    setDownloading(true);
    setMessage('');
    try {
      const descargarCertificadosTitulosSeleccionados = httpsCallable<
        { tipoDocumento: TipoDocumento; items: Array<{ grupoModuloId: number; moduloEstudianteId: number }>; formato: DownloadFormat },
        DownloadResponse
      >(functions, 'descargarCertificadosTitulosSeleccionados');
      const result = await descargarCertificadosTitulosSeleccionados({
        tipoDocumento,
        items: selectedItems(selectedRows),
        formato,
      });
      openUrl(result.data.file.url);
    } catch (err) {
      console.error('Error downloading certificados y titulos:', err);
      setMessage((err as { message?: string } | null)?.message || 'No se pudo preparar la descarga.');
      setMessageSeverity('error');
    } finally {
      setDownloading(false);
      setToolbarDownloadAnchor(null);
    }
  }, [selectedHasMissingDocuments, selectedItems, selectedRows, tipoDocumento]);

  const columns = useMemo<GridColDef<CertificadoTituloRow>[]>(() => [
    {
      field: 'estudianteNombre',
      headerName: 'Estudiante',
      flex: 1,
      minWidth: 280,
      renderCell: (params) => (
        params.row.documento?.pdfUrl ? (
          <Link
            component="button"
            underline="hover"
            onClick={() => openUrl(params.row.documento?.pdfUrl)}
            sx={{ textAlign: 'left', color: 'inherit', fontWeight: 600 }}
          >
            {params.row.estudianteNombre}
          </Link>
        ) : (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.row.estudianteNombre}
          </Typography>
        )
      ),
    },
    {
      field: 'grupoModuloNombre',
      headerName: 'Grupo-modulo',
      minWidth: 300,
      flex: 1,
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
      width: 115,
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

  if (!permissionsLoading && !canView) {
    return (
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
        <Alert severity="info">No tienes permiso para ver este apartado.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1240, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <SchoolIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Certificados y Titulos
        </Typography>
      </Stack>

      <AutoDismissAlert message={message} severity={messageSeverity} />
      {selectedHasMissingDocuments && selectedRows.length > 0 ? (
        <Alert severity="info">La descarga multiple se habilita solo cuando todos los seleccionados ya tienen documento generado.</Alert>
      ) : null}

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: 'background.paper' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', lg: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="tipo-documento-label">Documento</InputLabel>
            <Select
              labelId="tipo-documento-label"
              label="Documento"
              value={tipoDocumento}
              MenuProps={selectMenuProps}
              onChange={(event) => setTipoDocumento(event.target.value as TipoDocumento)}
            >
              <MenuItem value="certificado">Certificado</MenuItem>
              <MenuItem value="titulo">Titulo</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="semestres-label">Semestres</InputLabel>
            <Select
              multiple
              labelId="semestres-label"
              label="Semestres"
              value={semestreIds}
              input={<OutlinedInput label="Semestres" />}
              MenuProps={selectMenuProps}
              renderValue={(selected) => renderSelectedNames(selected as number[], semestres.map((item) => ({ id: item.id, titulo: item.titulo })))}
              onChange={(event) => {
                const value = event.target.value;
                setSemestreIds(typeof value === 'string' ? value.split(',').map(Number) : value as number[]);
                setGrupoModuloIds([]);
              }}
              disabled={loadingOptions}
            >
              {semestres.map((semestre) => (
                <MenuItem key={semestre.id} value={semestre.id}>
                  <Checkbox checked={semestreIds.includes(semestre.id)} />
                  <ListItemText primary={semestre.titulo || `Semestre ${semestre.id}`} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 280, flex: 1 }}>
            <InputLabel id="grupo-modulos-label">Grupo-modulo</InputLabel>
            <Select
              multiple
              labelId="grupo-modulos-label"
              label="Grupo-modulo"
              value={grupoModuloIds}
              input={<OutlinedInput label="Grupo-modulo" />}
              MenuProps={selectMenuProps}
              renderValue={(selected) => renderSelectedNames(selected as number[], filteredGrupoModulos)}
              onChange={(event) => {
                const value = event.target.value;
                setGrupoModuloIds(typeof value === 'string' ? value.split(',').map(Number) : value as number[]);
              }}
              disabled={loadingOptions}
            >
              {filteredGrupoModulos.map((grupoModulo) => (
                <MenuItem key={grupoModulo.id} value={grupoModulo.id}>
                  <Checkbox checked={grupoModuloIds.includes(grupoModulo.id)} />
                  <ListItemText primary={grupoModulo.nombre} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="outlined" startIcon={<VisibilityIcon />} disabled={!singleSelectedRow?.documento?.pdfUrl} onClick={() => openUrl(singleSelectedRow?.documento?.pdfUrl)}>
            Visualizar
          </Button>
          <Button
            variant="contained"
            startIcon={generatingIds.size ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
            disabled={!canGenerate || loadingOptions || generatingIds.size > 0 || selectedRows.length === 0}
            onClick={() => void handleGenerate(selectedRows)}
          >
            Generar
          </Button>
          <Button
            variant="outlined"
            startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
            disabled={downloading || selectedRows.length === 0 || selectedHasMissingDocuments}
            onClick={(event) => setToolbarDownloadAnchor(event.currentTarget)}
          >
            Descargar
          </Button>
          <Menu anchorEl={toolbarDownloadAnchor} open={Boolean(toolbarDownloadAnchor)} onClose={() => setToolbarDownloadAnchor(null)} disableScrollLock>
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
          {rows.length} estudiantes aprobados
        </Typography>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', overflow: 'hidden' }}>
        <IntranetDataGrid
          rows={rows}
          columns={columns}
          checkboxSelection
          loading={loadingOptions}
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={handleSelectionChange}
          getRowId={(row) => row.id}
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 15 } } }}
        />
      </Paper>

      <Menu anchorEl={rowMenuAnchor} open={Boolean(rowMenuAnchor)} onClose={() => setRowMenuAnchor(null)} disableScrollLock>
        <MenuItem disabled={!canGenerate || !activeRow || generatingIds.has(activeRow.id)} onClick={() => activeRow && void handleGenerate([activeRow])}>
          <PlayArrowIcon fontSize="small" sx={{ mr: 1 }} />
          Generar
        </MenuItem>
        <MenuItem disabled={!activeRow?.documento?.pdfUrl} onClick={() => { openUrl(activeRow?.documento?.pdfUrl); setRowMenuAnchor(null); }}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          Visualizar
        </MenuItem>
        <MenuItem disabled={!activeRow?.documento?.pdfUrl} onClick={() => { openUrl(activeRow?.documento?.pdfUrl); setRowMenuAnchor(null); }}>
          <PictureAsPdfIcon fontSize="small" sx={{ mr: 1 }} />
          Descargar PDF
        </MenuItem>
        <MenuItem disabled={!activeRow?.documento?.excelUrl} onClick={() => { openUrl(activeRow?.documento?.excelUrl); setRowMenuAnchor(null); }}>
          <TableChartIcon fontSize="small" sx={{ mr: 1 }} />
          Descargar Excel
        </MenuItem>
      </Menu>
    </Box>
  );
}
