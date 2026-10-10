'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Box, Button, ButtonBase, CircularProgress, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';
import { dayInLima } from '@/lib/calendar';
import { ParteDiarioData, ParteDiarioRow, parteDateLabel, parteGroupLabel } from '@/lib/parteDiario';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import ParteDiarioModal from './ParteDiarioModal';
import ParteDiarioRowFields from './ParteDiarioRowFields';

const headings = ['N°', 'Avatar', 'Nombre', 'Unidad', 'Actividad', 'Matr.', 'Asist.', 'Sílabo', 'Fich. Act.', 'Inst. Eva.', 'Material', 'Tareas', 'Firma', 'Observación'];
const rowColors = ['#effaff', '#d9f1fc', '#bfdfef'];
const columnWidths = [32, 76, 270, 200, 260, 90, 70, 180, 140, 170, 130, 130, 180, 260];
export default function ParteDiarioClient() {
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const { can, loading: permissionLoading } = useIntranetPermissions();
  const [data, setData] = useState<ParteDiarioData | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [selected, setSelected] = useState<ParteDiarioRow | null>(null);
  const [today, setToday] = useState(() => dayInLima(new Date())), request = useRef(0);
  const [scrolled, setScrolled] = useState({ x: false, y: false });
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay(), weekend = weekday === 0 || weekday === 6;
  const load = useCallback(async () => {
    if (weekend || authLoading || permissionLoading || !user || !can('parte-diario', 'view')) return;
    const id = ++request.current; setLoading(true); setError('');
    try { const result = await httpsCallable<undefined, ParteDiarioData>(functions, 'getParteDiario')(); if (id === request.current) setData(result.data); }
    catch (err) { if (id === request.current) setError(err instanceof Error ? err.message : 'No se pudo cargar el parte diario.'); }
    finally { if (id === request.current) setLoading(false); }
  }, [authLoading, can, permissionLoading, user, weekend]);
  const invalidateRequest = useCallback(() => { request.current++; }, []);
  useEffect(() => { void load(); return invalidateRequest; }, [load, today, invalidateRequest]);
  useEffect(() => { const timer = window.setInterval(() => setToday(dayInLima(new Date())), 60000); return () => window.clearInterval(timer); }, []);
  if (weekend || (data?.fecha === today && !data.laborable)) return <Box sx={{ p: 4 }}><Typography>Hoy no es día laborable</Typography></Box>;
  if (authLoading || (user && permissionLoading) || (!data && loading)) return <Box sx={{ p: 5 }}><CircularProgress aria-label="Cargando parte diario" /></Box>;
  if (!user) return <Box sx={{ p: 4 }}><Typography sx={{ mb: 2 }}>Inicia sesión para registrar el Parte Diario.</Typography><Button variant="contained" onClick={() => void loginWithGoogle().catch(err => setError(err.message))}>Iniciar sesión</Button>{error && <AutoDismissAlert severity="error">{error}</AutoDismissAlert>}</Box>;
  if (!can('parte-diario', 'view')) return <Box sx={{ p: 4 }}><AutoDismissAlert severity="info">No tienes permiso para ver el Parte Diario.</AutoDismissAlert></Box>;
  const open = (row: ParteDiarioRow) => { if (can('parte-diario', 'edit')) setSelected(row); };
  return <Box component="main" sx={{ p: 0, bgcolor: '#f7fbfd', minHeight: '100dvh' }}>
    <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ mb: '6px', minHeight: 40 }}><Typography component="h1" variant="h5" fontWeight={800} sx={{ pl: '8px', mr: 2 }}>PARTE DIARIO</Typography><Typography component="p" variant="h6">{parteDateLabel(data?.fecha || today)}</Typography><IconButton aria-label="Actualizar parte diario" onClick={() => void load()} disabled={loading} sx={{ ml: '50px' }}><RefreshIcon /></IconButton></Stack>
    {error && <AutoDismissAlert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</AutoDismissAlert>}
    {notice && <AutoDismissAlert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</AutoDismissAlert>}
    {loading && <CircularProgress size={20} aria-label="Actualizando parte diario" />}
    {data?.laborable && !data.filas.length && <Typography>No hay sesiones programadas para hoy.</Typography>}
    {!!data?.filas.length && <TableContainer component={Paper} onScroll={event => setScrolled({ x: event.currentTarget.scrollLeft > 0, y: event.currentTarget.scrollTop > 0 })} sx={{ p: 0, maxHeight: 'calc(100dvh - 52px)', overflow: 'auto', overscrollBehavior: 'contain', borderRadius: 0, border: '1px solid #d4e3ec' }}>
      <Table stickyHeader size="small" aria-label="Parte diario de docentes" sx={{ tableLayout: 'fixed', width: columnWidths.reduce((a, b) => a + b, 0), '& th': { bgcolor: '#164863', color: 'white', fontWeight: 700, p: 0, height: 52 }, '& td': { p: 0, color: '#153447', borderBottom: '1px solid #aacbdc', verticalAlign: 'middle', overflowWrap: 'anywhere' } }}>
        <colgroup>{columnWidths.map((width, i) => <col key={i} style={{ width }} />)}</colgroup>
        <TableHead><TableRow>{headings.map((label, index) => <TableCell key={label} align="center" sx={{ ...(index < 3 ? { position: 'sticky', left: [0, 32, 108][index], zIndex: 4 } : {}), boxShadow: [scrolled.y ? '0 6px 7px -4px #19394d70' : '', index === 2 && scrolled.x ? '6px 0 7px -4px #19394d70' : ''].filter(Boolean).join(', ') || 'none' }}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{data.filas.map(row => {
          const bgcolor = rowColors[row.turnoOrden] || rowColors[0], sticky = (index: number) => ({ position: 'sticky' as const, left: [0, 32, 108][index], bgcolor, zIndex: 1, boxShadow: index === 2 && scrolled.x ? '6px 0 7px -4px #19394d70' : 'none' });
          return <TableRow key={row.key} sx={{ bgcolor, height: 88 }}>
            <TableCell align="center" sx={sticky(0)}>{row.orden}</TableCell>
            <TableCell align="center" sx={sticky(1)}><ButtonBase onClick={() => open(row)} disabled={!can('parte-diario', 'edit')} aria-label={`Abrir registro de ${row.docenteNombre}`} sx={{ borderRadius: '50%' }}><Avatar src={row.avatar ?? undefined} alt={row.docenteNombreCompleto} sx={{ width: 52, height: 52 }} /></ButtonBase></TableCell>
            <TableCell sx={sticky(2)}><ButtonBase onClick={() => open(row)} disabled={!can('parte-diario', 'edit')} sx={{ display: 'block', textAlign: 'left', minHeight: 48, width: '100%', px: '6px' }}><Typography variant="body2" fontWeight={600}>{row.docenteNombre}</Typography><Typography variant="body2">{parteGroupLabel(row.modulo)}</Typography></ButtonBase></TableCell>
            <ParteDiarioRowFields row={row}/>
          </TableRow>;
        })}</TableBody>
      </Table>
    </TableContainer>}
    {selected && data && <ParteDiarioModal key={selected.key} row={selected} fecha={data.fecha} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); setNotice('Parte diario guardado.'); void load(); }} onDeleted={can('parte-diario','delete')?()=>{setSelected(null);setNotice('Registro eliminado.');void load();}:undefined}/>}
  </Box>;
}
