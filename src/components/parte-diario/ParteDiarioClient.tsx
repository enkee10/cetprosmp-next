'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, Box, Button, ButtonBase, CircularProgress, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { parteHeadings, parteColumnWidths, parteRowColors } from '@/lib/parteDiarioTable';
import { parteSavedColor } from './parteFieldStyles';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';
import { dayInLima } from '@/lib/calendar';
import { isParteSaved, parteMissingFields, ParteDiarioData, ParteDiarioRow, parteTeacherGroupLabel, ParteUnidad } from '@/lib/parteDiario';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import ParteDiarioModal from './ParteDiarioModal';
import type { ParteObservationInput } from './ParteObservations';
import ParteDiarioRowFields from './ParteDiarioRowFields';
import ParteDateFilter from './ParteDateFilter';
import ParteAccountMenu from './ParteAccountMenu';
import ParteSignatureDialog from './ParteSignatureDialog';

const headings=parteHeadings, rowColors=parteRowColors, columnWidths=parteColumnWidths;
export default function ParteDiarioClient() {
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const { can, loading: permissionLoading } = useIntranetPermissions();
  const [data, setData] = useState<ParteDiarioData | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [selected, setSelected] = useState<ParteDiarioRow | null>(null);
  const [today, setToday] = useState(() => dayInLima(new Date())), request = useRef(0);
  const [dateFilter,setDateFilter]=useState<string|null>(null),[drafts,setDrafts]=useState<Record<string,ParteDiarioRow>>({}),[unitCache,setUnitCache]=useState<Record<number,ParteUnidad[]>>({}),[signatureRow,setSignatureRow]=useState<ParteDiarioRow|null>(null),[saving,setSaving]=useState(false);
  const observationPending=useRef(new Set<string>()),unitEpoch=useRef(0);
  const [draftEpoch,setDraftEpoch]=useState(0),[openObservationKey,setOpenObservationKey]=useState<string|null>(null);
  const [modalObservationDrafts,setModalObservationDrafts]=useState<Record<string,ParteObservationInput>>({});
  const unitRequests=useRef(new Set<number>()),fecha=dateFilter||today;
  const [scrolled, setScrolled] = useState({ x: false, y: false });
  const load = useCallback(async (clearDrafts=false) => {
    if ( authLoading || permissionLoading || !user || !can('parte-diario', 'view')) return;
    const id = ++request.current; setLoading(true); setError('');if(clearDrafts){setOpenObservationKey(null);observationPending.current.clear();unitEpoch.current++;setDraftEpoch(n=>n+1);setDrafts({});setModalObservationDrafts({});setUnitCache({});unitRequests.current.clear();}
    try { const result = await httpsCallable<{fecha:string}, ParteDiarioData>(functions, 'getParteDiario')({fecha}); if (id === request.current) setData(result.data); }
    catch (err) { if (id === request.current) setError(err instanceof Error ? err.message : 'No se pudo cargar el parte diario.'); }
    finally { if (id === request.current) setLoading(false); }
  }, [authLoading, can, permissionLoading, user, fecha]);
  const invalidateRequest = useCallback(() => { request.current++; }, []);
  useEffect(() => { void load(); return invalidateRequest; }, [load, today, invalidateRequest]);
  useEffect(() => { const timer = window.setInterval(() => setToday(dayInLima(new Date())), 60000); return () => window.clearInterval(timer); }, []);
  useEffect(()=>{setDrafts({});setModalObservationDrafts({});setUnitCache({});setSignatureRow(null);setSelected(null);setOpenObservationKey(null);observationPending.current.clear();unitEpoch.current++;unitRequests.current.clear();},[user?.uid,fecha]);
  useEffect(() => {
    if (!openObservationKey) return;
    const closeOutsideObservation = (event: PointerEvent) => {
      const cell = event.target instanceof Element ? event.target.closest('[data-parte-observation-key]') : null;
      const nextKey = cell?.getAttribute('data-parte-observation-editable') === 'true'
        ? cell.getAttribute('data-parte-observation-key') : null;
      if (nextKey !== openObservationKey) setOpenObservationKey(nextKey);
    };
    document.addEventListener('pointerdown', closeOutsideObservation);
    return () => document.removeEventListener('pointerdown', closeOutsideObservation);
  }, [openObservationKey]);
  const loadUnits=async(row:ParteDiarioRow)=>{if(unitCache[row.grupoModuloId]||unitRequests.current.has(row.grupoModuloId))return;unitRequests.current.add(row.grupoModuloId);const epoch=unitEpoch.current;try{const r=await httpsCallable<unknown,{unidades:ParteUnidad[]}>(functions,'getParteDiarioOpciones')({...row,fecha});if(epoch!==unitEpoch.current)return;setUnitCache(previous=>({...previous,[row.grupoModuloId]:r.data.unidades}));}catch(e){if(epoch!==unitEpoch.current)return;unitRequests.current.delete(row.grupoModuloId);setError(e instanceof Error?e.message:'No se pudieron cargar las actividades.');}};
  const updateRow=(row:ParteDiarioRow)=>{setDrafts(previous=>({...previous,[row.key]:row}));if(row.actividadId&&row.tipoUnidad==='curricular')setUnitCache(previous=>{let changed=false;const next=Object.fromEntries(Object.entries(previous).map(([id,units])=>[id,units.map(unit=>({...unit,actividades:unit.actividades.map(activity=>{if(activity.id!==row.actividadId||activity.nombre===row.actividad)return activity;changed=true;return {...activity,nombre:row.actividad};})}))]));return changed?next:previous;});};
  const saveSigned=async(firma:string)=>{if(!signatureRow)return;const pendingModal=modalObservationDrafts[signatureRow.key];if(observationPending.current.has(signatureRow.key)||!!pendingModal?.text.trim()||pendingModal?.editing!=null)throw new Error('Agrega o termina de editar la observación antes de guardar.');setSaving(true);try{const row=drafts[signatureRow.key]||signatureRow;if(parteMissingFields(row).length)throw new Error('Completa todos los campos antes de guardar.');await httpsCallable(functions,'saveParteDiario')({...row,fecha,firma});setSignatureRow(null);setOpenObservationKey(null);observationPending.current.delete(row.key);setDrafts(previous=>{const next={...previous};delete next[row.key];return next;});setModalObservationDrafts(previous=>{const next={...previous};delete next[row.key];return next;});setNotice('Parte diario guardado.');await load();}finally{setSaving(false);}};
  const currentData=data?.fecha===fecha?data:null,editable=can('parte-diario','edit')&&fecha<=today;
  if (authLoading || (user && permissionLoading)) return <Box sx={{ p: 5 }}><CircularProgress aria-label="Cargando parte diario" /></Box>;
  if (!user) return <Box sx={{ p: 4 }}><Typography sx={{ mb: 2 }}>Inicia sesión para registrar el Parte Diario.</Typography><Button variant="contained" onClick={() => void loginWithGoogle().catch(err => setError(err.message))}>Iniciar sesión</Button>{error && <AutoDismissAlert severity="error">{error}</AutoDismissAlert>}</Box>;
  if (!can('parte-diario', 'view')) return <Box sx={{ p: 4 }}><AutoDismissAlert severity="info">No tienes permiso para ver el Parte Diario.</AutoDismissAlert></Box>;
  const open = (row: ParteDiarioRow) => { if (editable) { if(observationPending.current.has(row.key)){setError('Agrega o termina de editar la observación antes de abrir el formulario.');return;}setOpenObservationKey(null);setSelected(row); } };
  return <Box component="main" sx={{ p: 0, bgcolor: '#f7fbfd', minHeight: '100dvh' }}>
    <Stack direction="row" alignItems="center" flexWrap="nowrap" sx={{ mb: '6px', height:50, minWidth:0, maxWidth:'100%', overflowX:'auto', flexShrink:0 }}><Typography component="h1" variant="h5" fontWeight={800} sx={{ pl: '8px', mr: 2,whiteSpace:'nowrap',flexShrink:0 }}>PARTE DIARIO</Typography><ParteDateFilter fecha={fecha} filtered={dateFilter!==null} onChange={setDateFilter}/><IconButton aria-label="Actualizar parte diario" onClick={() => void load(true)} disabled={loading||saving} sx={{ ml: '25px',flexShrink:0 }}>{loading?<CircularProgress size={24} aria-label="Actualizando parte diario"/>:<RefreshIcon />}</IconButton><ParteAccountMenu onError={setError}/></Stack>
    {error && <AutoDismissAlert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</AutoDismissAlert>}
    {notice && <AutoDismissAlert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</AutoDismissAlert>}
    {currentData&&!currentData.laborable&&<Typography sx={{pl:1}}>{fecha===today?'Hoy no es día laborable':'La fecha seleccionada no es día laborable'}</Typography>}
    {currentData?.laborable && !currentData.filas.length && <Typography>No hay sesiones programadas para la fecha seleccionada.</Typography>}
    {!!currentData?.filas.length && <TableContainer component={Paper} onScroll={event => setScrolled({ x: event.currentTarget.scrollLeft > 0, y: event.currentTarget.scrollTop > 0 })} sx={{ p: 0, maxHeight: 'calc(100dvh - 56px)', overflow: 'auto', overscrollBehavior: 'contain', borderRadius: 0, border: '1px solid #d4e3ec' }}>
      <Table stickyHeader size="small" aria-label="Parte diario de docentes" sx={{ tableLayout: 'fixed', width: columnWidths.reduce((a, b) => a + b, 0), '& th': { bgcolor: '#164863', color: 'white', fontWeight: 700, p: 0, height: 50 }, '& td': { p: 0, color: '#153447', borderBottom: '1px solid #aacbdc', verticalAlign: 'middle', overflowWrap: 'anywhere' } }}>
        <colgroup>{columnWidths.map((width, i) => <col key={i} style={{ width }} />)}</colgroup>
        <TableHead><TableRow>{headings.map((label, index) => <TableCell key={label} align="center" sx={{ ...(index < 3 ? { position: 'sticky', left: [0, 32, 108][index], zIndex: 4 } : {}), boxShadow: [scrolled.y ? '0 6px 7px -4px #19394d70' : '', index === 2 && scrolled.x ? '6px 0 7px -4px #19394d70' : ''].filter(Boolean).join(', ') || 'none' }}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{currentData.filas.map(original => {
          const row=drafts[original.key]||original,saved=isParteSaved(row);
          const bgcolor = rowColors[row.turnoOrden] || rowColors[0], sticky = (index: number) => ({ position: 'sticky' as const, left: [0, 32, 108][index], bgcolor, zIndex: 1, boxShadow: index === 2 && scrolled.x ? '6px 0 7px -4px #19394d70' : 'none' });
          return <TableRow key={`${fecha}:${user.uid}:${row.key}:${row.version}:${draftEpoch}`} sx={{ bgcolor, height: 88 }}>
            <TableCell align="center" sx={sticky(0)}>{row.orden}</TableCell>
            <TableCell align="center" sx={sticky(1)}><ButtonBase onClick={() => open(row)} disabled={!editable||saving} aria-label={`Abrir registro de ${row.docenteNombre}`} sx={{ borderRadius: '50%' }}><Avatar src={row.avatar ?? undefined} alt={row.docenteNombreCompleto} sx={{ width: 52, height: 52 }} /></ButtonBase></TableCell>
            <TableCell sx={sticky(2)}><ButtonBase onClick={() => open(row)} disabled={!editable||saving} sx={{ display: 'block', textAlign: 'left', minHeight: 48, width: '100%', px: '6px' }}><Typography variant="body2" fontWeight={600} color={saved?parteSavedColor:undefined}>{row.docenteNombre}</Typography><Typography variant="body2" color={saved?parteSavedColor:undefined}>{parteTeacherGroupLabel(row)}{saved&&<Box component="span" sx={{fontWeight:700,color:'#c62828'}}> (Guardado)</Box>}</Typography></ButtonBase></TableCell>
            <ParteDiarioRowFields row={row} fecha={fecha} units={unitCache[row.grupoModuloId]||[]} onLoadUnits={()=>void loadUnits(row)} onChange={updateRow} onSign={()=>setSignatureRow(row)} observationsOpen={openObservationKey===row.key} onOpenObservations={()=>setOpenObservationKey(row.key)} onObservationPending={pending=>{if(pending)observationPending.current.add(row.key);else observationPending.current.delete(row.key);}} editable={editable} disabled={saving||loading}/>
          </TableRow>;
        })}</TableBody>
      </Table>
    </TableContainer>}
    {signatureRow&&<ParteSignatureDialog initialValue={signatureRow.firma} saving={saving} onClose={()=>setSignatureRow(null)} onAccept={saveSigned}/>}
    {selected && currentData && <ParteDiarioModal key={selected.key} row={drafts[selected.key]||selected} fecha={fecha} onDraftChange={updateRow} observationInput={modalObservationDrafts[selected.key]||{text:'',editing:null}} onObservationInputChange={value=>setModalObservationDrafts(previous=>({...previous,[selected.key]:value}))} onClose={() => setSelected(null)} onSaved={() => { observationPending.current.delete(selected.key);setDrafts(previous=>{const next={...previous};delete next[selected.key];return next;});setModalObservationDrafts(previous=>{const next={...previous};delete next[selected.key];return next;});setSelected(null);setOpenObservationKey(null);setUnitCache({});unitRequests.current.clear();setNotice('Parte diario guardado.'); void load(); }} onDeleted={can('parte-diario','delete')?()=>{setDrafts(previous=>{const next={...previous};delete next[selected.key];return next;});setModalObservationDrafts(previous=>{const next={...previous};delete next[selected.key];return next;});setSelected(null);setNotice('Registro eliminado.');void load();}:undefined}/>}
  </Box>;
}
