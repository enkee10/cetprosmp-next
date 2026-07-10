'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import ArticleIcon from '@mui/icons-material/Article';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { isDocenteRole } from '@/lib/intranetPermissions';

type SemestreOption = {
  id: number;
  titulo?: string | null;
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

type ReportOptionsResponse = {
  semestres?: SemestreOption[];
  grupoModulos?: GrupoModuloOption[];
};

type GeneratedFile = {
  path: string;
  url: string;
  contentType: string;
};

type GenerateResponse = {
  tipoDocumento: 'acta' | 'nomina';
  semestreId: number | null;
  grupoModuloId: number | null;
  totalReportes: number;
  pdf: GeneratedFile;
  excel: GeneratedFile;
};

const getGrupoModuloLabel = (option: GrupoModuloOption) => {
  const parts = [
    option.moduloNombre || option.nombre || `Modulo ${option.id}`,
    option.turno,
    option.horario,
    option.docente,
  ].filter(Boolean);
  return parts.join(' - ');
};

const selectMenuProps = {
  disableScrollLock: true,
  PaperProps: {
    sx: {
      maxHeight: 360,
    },
  },
};

export default function ReporteDocumentosPage() {
  const { user } = useAuth();
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [semestres, setSemestres] = useState<SemestreOption[]>([]);
  const [grupoModulos, setGrupoModulos] = useState<GrupoModuloOption[]>([]);
  const [tipoDocumento, setTipoDocumento] = useState<'acta' | 'nomina'>('acta');
  const [semestreId, setSemestreId] = useState('');
  const [grupoModuloId, setGrupoModuloId] = useState('');
  const [generated, setGenerated] = useState<GenerateResponse | null>(null);
  const [downloadAnchor, setDownloadAnchor] = useState<HTMLElement | null>(null);

  const isDocente = isDocenteRole(user?.role);

  useEffect(() => {
    if (isDocente) {
      setLoadingOptions(false);
      return;
    }

    let active = true;
    const loadOptions = async () => {
      setLoadingOptions(true);
      setError('');
      try {
        const listReporteDocumentosOptions = httpsCallable<undefined, ReportOptionsResponse>(
          functions,
          'listReporteDocumentosOptions',
        );
        const result = await listReporteDocumentosOptions();
        if (!active) return;
        const nextSemestres = result.data.semestres || [];
        setSemestres(nextSemestres);
        setGrupoModulos(result.data.grupoModulos || []);
        setSemestreId((current) => current || String(nextSemestres[0]?.id || ''));
      } catch (err) {
        console.error('Error loading reporte documentos options:', err);
        if (active) setError('No se pudieron cargar las opciones de reportes.');
      } finally {
        if (active) setLoadingOptions(false);
      }
    };

    void loadOptions();
    return () => {
      active = false;
    };
  }, [isDocente]);

  const filteredGrupoModulos = useMemo(
    () => grupoModulos.filter((item) => String(item.semestreId || '') === semestreId),
    [grupoModulos, semestreId],
  );

  useEffect(() => {
    if (!semestreId) {
      setGrupoModuloId('');
      return;
    }
    if (filteredGrupoModulos.some((item) => String(item.id) === grupoModuloId)) return;
    setGrupoModuloId(filteredGrupoModulos[0] ? String(filteredGrupoModulos[0].id) : '');
    setGenerated(null);
  }, [filteredGrupoModulos, grupoModuloId, semestreId]);

  const selectedSemestreName = semestres.find((item) => String(item.id) === semestreId)?.titulo || '';

  const handleGenerate = async () => {
    if (!semestreId || !grupoModuloId) return;
    setGenerating(true);
    setError('');
    try {
      const generateReporteDocumento = httpsCallable<
        { tipoDocumento: 'acta' | 'nomina'; semestreId: number; grupoModuloId: number },
        GenerateResponse
      >(functions, 'generateReporteDocumento');
      const result = await generateReporteDocumento({
        tipoDocumento,
        semestreId: Number(semestreId),
        grupoModuloId: Number(grupoModuloId),
      });
      setGenerated(result.data);
    } catch (err) {
      console.error('Error generating reporte documento:', err);
      setError((err as { message?: string } | null)?.message || 'No se pudo generar el documento.');
    } finally {
      setGenerating(false);
    }
  };

  const openDownload = (url?: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    setDownloadAnchor(null);
  };

  if (isDocente) {
    return (
      <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
        <Alert severity="info">Este apartado esta disponible para administrativos, coordinadores, directivos y superusuario.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <ArticleIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Actas y Nominas
        </Typography>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

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
              onChange={(event) => {
                setTipoDocumento(event.target.value as 'acta' | 'nomina');
                setGenerated(null);
              }}
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
              onChange={(event) => {
                setSemestreId(event.target.value);
                setGrupoModuloId('');
                setGenerated(null);
              }}
              disabled={loadingOptions}
            >
              {semestres.map((semestre) => (
                <MenuItem key={semestre.id} value={String(semestre.id)}>
                  {semestre.titulo || `Semestre ${semestre.id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ flex: 1, minWidth: 260 }}>
            <InputLabel id="grupo-modulo-label">Modulos</InputLabel>
            <Select
              labelId="grupo-modulo-label"
              label="Modulos"
              value={grupoModuloId}
              MenuProps={selectMenuProps}
              onChange={(event) => {
                setGrupoModuloId(event.target.value);
                setGenerated(null);
              }}
              disabled={loadingOptions || !semestreId}
            >
              {filteredGrupoModulos.map((option) => (
                <MenuItem key={option.id} value={String(option.id)}>
                  {getGrupoModuloLabel(option)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <VisibilityIcon />}
            onClick={handleGenerate}
            disabled={loadingOptions || generating || !semestreId || !grupoModuloId}
            sx={{ minWidth: 128 }}
          >
            Visualizar
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={(event) => setDownloadAnchor(event.currentTarget)}
            disabled={!generated || generating}
            sx={{ minWidth: 126 }}
          >
            Descargar
          </Button>
          <Menu
            anchorEl={downloadAnchor}
            open={Boolean(downloadAnchor)}
            onClose={() => setDownloadAnchor(null)}
            disableScrollLock
          >
            <MenuItem onClick={() => openDownload(generated?.pdf.url)}>
              <PictureAsPdfIcon fontSize="small" sx={{ mr: 1 }} />
              PDF
            </MenuItem>
            <MenuItem onClick={() => openDownload(generated?.excel.url)}>
              <TableChartIcon fontSize="small" sx={{ mr: 1 }} />
              Excel
            </MenuItem>
          </Menu>
        </Stack>

        <Typography variant="caption" sx={{ display: 'block', mt: 1.25, color: 'text.secondary' }}>
          {selectedSemestreName ? `${selectedSemestreName} - ${filteredGrupoModulos.length} modulos disponibles` : 'Selecciona un semestre'}
        </Typography>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          minHeight: 620,
          overflow: 'hidden',
          bgcolor: '#f7f3e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {generating ? (
          <Stack alignItems="center" spacing={1.25}>
            <CircularProgress />
            <Typography color="text.secondary">Generando documento...</Typography>
          </Stack>
        ) : generated?.pdf.url ? (
          <Box
            component="iframe"
            src={generated.pdf.url}
            title="Visor PDF de reportes"
            sx={{
              width: '100%',
              height: { xs: 620, md: 720 },
              border: 0,
              bgcolor: '#fff',
            }}
          />
        ) : (
          <Typography color="text.secondary">Selecciona las opciones y pulsa Visualizar.</Typography>
        )}
      </Paper>
    </Box>
  );
}
