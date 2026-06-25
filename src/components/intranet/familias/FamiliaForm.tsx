'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import CoverImageField from '@/components/intranet/academico/CoverImageField';

interface FamiliaFormProps {
  familia?: {
    id: string;
    titulo: string;
    descripcion: string;
    imagenPortadaUrl?: string | null;
    sectorId: string;
  } | null;
  familiaId?: string;
  asModal?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface FamiliaData {
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

export function FamiliaForm({ familia, familiaId, asModal = false, onSaved, onCancel }: FamiliaFormProps) {
  const [titulo, setTitulo] = useState(familia ? familia.titulo : '');
  const [descripcion, setDescripcion] = useState(familia ? familia.descripcion : '');
  const [imagenPortadaUrl, setImagenPortadaUrl] = useState(familia?.imagenPortadaUrl || '');
  const [sectorId, setSectorId] = useState(familia ? familia.sectorId : '');
  const [sectores, setSectores] = useState<SectorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFamilia, setLoadingFamilia] = useState(Boolean(familiaId && !familia));
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSectores = async () => {
      try {
        const functions = getFunctions(app);
        const listSectors = httpsCallable<undefined, { sectors?: SectorOption[] }>(functions, 'listSectors');
        const result = await listSectors();
        setSectores(result.data.sectors || []);
      } catch (err) {
        console.error('Error fetching sectores: ', err);
        setError('No se pudieron cargar los sectores para el selector.');
      }
    };

    void fetchSectores();
  }, []);

  useEffect(() => {
    const fetchFamilia = async () => {
      if (!familiaId || familia) return;

      setLoadingFamilia(true);
      try {
        const functions = getFunctions(app);
        const getFamilia = httpsCallable<{ id: number }, { familia: FamiliaData | null }>(functions, 'getFamilia');
        const result = await getFamilia({ id: Number(familiaId) });
        const fetched = result.data.familia;

        if (fetched) {
          setTitulo(fetched.titulo || '');
          setDescripcion(fetched.descripcion || '');
          setImagenPortadaUrl(fetched.imagenPortadaUrl || '');
          setSectorId(fetched.sectorId != null ? String(fetched.sectorId) : '');
        }
      } catch (err) {
        console.error('Error fetching familia: ', err);
        setError('No se pudo cargar la familia para edicion.');
      } finally {
        setLoadingFamilia(false);
      }
    };

    void fetchFamilia();
  }, [familiaId, familia]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(app);
      const createOrUpdateFamilia = httpsCallable<
        { id?: number; titulo: string; descripcion: string; imagenPortadaUrl?: string | null; sectorId?: number | null },
        { id: number | null }
      >(functions, 'createOrUpdateFamilia');

      await createOrUpdateFamilia({
        id: familiaId ? Number(familiaId) : undefined,
        titulo,
        descripcion,
        imagenPortadaUrl: imagenPortadaUrl.trim() || null,
        sectorId: sectorId ? Number(sectorId) : null,
      });

      if (onSaved) {
        onSaved();
      } else {
        router.push('/intranet/familias');
        router.refresh();
      }
    } catch (err) {
      console.error('Error handling familia form: ', err);
      const code = (err as { code?: string } | null)?.code || '';
      const message = (err as { message?: string } | null)?.message || '';
      if (code === 'functions/permission-denied') {
        setError('No tienes acceso para crear o editar familias (requiere level >= 600).');
      } else if (message) {
        setError(`No se pudo guardar la familia: ${message}`);
      } else {
        setError('No se pudo guardar la familia en Data Connect.');
      }
      setLoading(false);
    }
  };

  if (loadingFamilia) {
    const loadingContent = (
      <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );

    if (asModal) {
      return loadingContent;
    }

    return <Container maxWidth="sm">{loadingContent}</Container>;
  }

  const formContent = (
    <Box sx={asModal ? { pt: 1 } : { my: 4 }}>
      {!asModal && (
        <Typography variant="h4" component="h1" gutterBottom>
          {familiaId ? 'Editar Familia' : 'Crear Familia'}
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        <TextField
          label="Titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          fullWidth
          margin="normal"
          minRows={3}
          multiline
        />
        <CoverImageField
          value={imagenPortadaUrl}
          onChange={setImagenPortadaUrl}
          storageFolder="familias"
          disabled={loading}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Sector</InputLabel>
          <Select
            label="Sector"
            value={sectorId}
            onChange={(event) => setSectorId(String(event.target.value))}
          >
            <MenuItem value="">Sin sector</MenuItem>
            {sectorId && !sectores.some((sector) => String(sector.id) === sectorId) ? (
              <MenuItem value={sectorId} disabled>
                Sector actual no disponible
              </MenuItem>
            ) : null}
            {sectores.map((sector) => (
              <MenuItem key={sector.id} value={String(sector.id)}>
                {sector.titulo || `Sector ${sector.id}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : (familiaId ? 'Actualizar' : 'Crear')}
          </Button>
          {onCancel && (
            <Button variant="outlined" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
          )}
        </Box>
      </form>
    </Box>
  );

  if (asModal) {
    return formContent;
  }

  return <Container maxWidth="sm">{formContent}</Container>;
}
