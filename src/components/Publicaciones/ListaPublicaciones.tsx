'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  Grid,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
//import Grid from '@mui/material/Grid2'; // 👈 Grid v2 (para usar prop `size`)
import PublicacionesCard, { Publicacion } from './PublicacionesCard';

type FiltroTipo = 'todos' | 'noticia' | 'evento' | 'comunicado';

type Props = {
  showFilters?: boolean;
  tipo?: FiltroTipo;
  soloDestacados?: boolean;
  limit?: number;
  destacadosPrimero?: boolean;
  columnsMd?: 3 | 4; // 3 columnas (md=4) o 4 columnas (md=3)
};

export default function ListaPublicaciones({
  showFilters = true,
  tipo = 'todos',
  soloDestacados = false,
  limit,
  destacadosPrimero = true,
  columnsMd = 3,
}: Props) {
  const [data, setData] = useState<Publicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado local SOLO si se muestran filtros
  const [tipoState, setTipoState] = useState<FiltroTipo>(tipo);
  const [soloDestacadosState, setSoloDestacadosState] = useState<boolean>(soloDestacados);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/data/publicaciones.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
        const json = await res.json();
        if (alive) setData(Array.isArray(json) ? json : []);
      } catch (e: any) {
        setError(e?.message || 'No se pudo cargar publicaciones.json');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Si usas el componente como “bloque” (showFilters=false) y cambian props, reflejar
  useEffect(() => {
    if (!showFilters) {
      setTipoState(tipo);
      setSoloDestacadosState(soloDestacados);
    }
  }, [showFilters, tipo, soloDestacados]);

  const tiposDisponibles = useMemo(() => {
    const set = new Set<string>();
    data.forEach(p => p?.tipo && set.add(p.tipo.toLowerCase()));
    const base: FiltroTipo[] = ['todos', 'noticia', 'evento', 'comunicado'];
    const extra = Array.from(set).filter(t => !base.includes(t as FiltroTipo));
    return [...base, ...extra] as string[];
  }, [data]);

  const ordenar = (a: Publicacion, b: Publicacion) => {
    if (destacadosPrimero) {
      const da = !!a.destacado;
      const db = !!b.destacado;
      if (da !== db) return db ? 1 : -1; // destacados primero
    }
    const fa = a.fechaPublicacion ? new Date(a.fechaPublicacion).getTime() : 0;
    const fb = b.fechaPublicacion ? new Date(b.fechaPublicacion).getTime() : 0;
    if (fb !== fa) return fb - fa; // recientes primero
    return (a.titulo || '').localeCompare(b.titulo || '');
  };

  // Filtros efectivos: de UI si hay filtros; de props si no
  const tipoEfectivo = showFilters ? tipoState : tipo;
  const destEfectivo = showFilters ? soloDestacadosState : soloDestacados;

  const filtradas = useMemo(() => {
    const base = data
      .filter(p => {
        const t = p.tipo?.toLowerCase();
        const pasaTipo = tipoEfectivo === 'todos' ? true : (t === tipoEfectivo);
        const pasaDest = destEfectivo ? !!p.destacado : true;
        return pasaTipo && pasaDest;
      })
      .sort(ordenar);

    return typeof limit === 'number' ? base.slice(0, limit) : base;
  }, [data, tipoEfectivo, destEfectivo, destacadosPrimero, limit]);

  const mdSize = columnsMd === 4 ? 3 : 4; // 12/4=3 — 12/3=4

  return (
    <Box sx={{ width: '100%' }}>
      {showFilters && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="filtro-tipo-label">Tipo de publicación</InputLabel>
            <Select
              labelId="filtro-tipo-label"
              label="Tipo de publicación"
              value={tipoState}
              onChange={(e) => setTipoState(e.target.value as FiltroTipo)}
            >
              {tiposDisponibles.map((t) => (
                <MenuItem key={t} value={t as FiltroTipo}>
                  {t === 'todos' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Checkbox
                checked={soloDestacadosState}
                onChange={(e) => setSoloDestacadosState(e.target.checked)}
              />
            }
            label="Solo destacados"
          />
        </Stack>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {`No se pudieron cargar las publicaciones. ${error}.
Asegúrate de que exista /public/data/publicaciones.json.`}
        </Alert>
      )}

      {!loading && !error && filtradas.length === 0 && (
        <Typography variant="body1">No hay publicaciones para los filtros seleccionados.</Typography>
      )}

      <Grid container spacing={2}>
        {filtradas.map((pub) => (
          <Grid key={pub.id} size={{ xs: 12, sm: 6, md: mdSize }}>
            <PublicacionesCard publicacion={pub} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// (Opcional) re-export del tipo por comodidad
export type { Publicacion } from './PublicacionesCard';
