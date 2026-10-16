'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { activityLabel, ParteCompromiso, ParteDiarioRow, ParteEditor, selectedParteUnitLabel } from '@/lib/parteDiario';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import ParteDraftTextField, { ParteDraftTextHandle } from './ParteDraftTextField';
import {clearParteCommentDraft,readParteCommentDraft,writeParteCommentDraft} from '@/lib/parteCommentDrafts';

type HistoryRow = { key: string; recordId: number; fecha: string; actividad: string; unidadFiltro: string; observacion: string; compromiso: ParteCompromiso | null; version: string };
type HistoryData = { registros: HistoryRow[]; unidades: { value: string; label: string }[]; autores: ParteEditor[] };
const dateLabel = (value: string) => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', ...(value.includes('T') ? { hour: '2-digit', minute: '2-digit' } as const : {}) }).format(new Date(value.includes('T') ? value : `${value}T12:00:00Z`));
const currentUnit = (row: ParteDiarioRow) => row.tipoUnidad === 'curricular' ? row.unidadDidacticaId ? `u:${row.unidadDidacticaId}` : 'pendiente' : row.tipoUnidad;

export default function ParteObservationsHistory({ row, canEdit, onClose }: { row: ParteDiarioRow; canEdit: boolean; onClose: () => void }) {
  const [data, setData] = useState<HistoryData | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [filter, setFilter] = useState(currentUnit(row)), [busy, setBusy] = useState(false), [commentId, setCommentId] = useState<string | null>(null), [comment, setComment] = useState('');
  const commentField=useRef<ParteDraftTextHandle>(null);
  const [commentFilled,setCommentFilled]=useState(false);
  const persistComment=(entry:HistoryRow,text:string)=>{
    if(!entry.compromiso?.id)return;
    try{writeParteCommentDraft(window.localStorage,entry.recordId,entry.compromiso.id,text);}catch{setError('No se pudo conservar el borrador del comentario.');}
  };
  const openComment=(entry:HistoryRow)=>{
    commentField.current?.flush();
    let text='';try{text=readParteCommentDraft(window.localStorage,entry.recordId,entry.compromiso!.id!);}catch{setError('No se pudo recuperar el borrador del comentario.');}
    setCommentId(entry.compromiso!.id);setComment(text);setCommentFilled(!!text.trim());
  };
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await httpsCallable<unknown, HistoryData>(functions, 'getParteObservacionesHistorial')({ grupoModuloId: row.grupoModuloId, docenteId: row.docenteId }); setData(result.data); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar el historial.'); }
    finally { setLoading(false); }
  }, [row.grupoModuloId, row.docenteId]);
  useEffect(() => { void load(); }, [load]);
  const followUp = async (entry: HistoryRow, action: 'cumplir' | 'comentar',text?:string) => {
    if (!entry.compromiso?.id) return;
    if(action==='comentar')commentField.current?.flush();
    setBusy(true); setError('');
    try {
      const response = await httpsCallable<unknown, { recordId: number; version: string; compromisos: ParteCompromiso[]; autores: ParteEditor[] }>(functions, 'saveParteCompromisoSeguimiento')({ recordId: entry.recordId, grupoModuloId: row.grupoModuloId, docenteId: row.docenteId, compromisoId: entry.compromiso.id, version: entry.version, action, comentario: action === 'comentar' ? text : undefined });
      const saved = response.data;
      setData(previous => previous && ({ ...previous, autores: [...previous.autores, ...saved.autores], registros: previous.registros.map(r => r.recordId === saved.recordId ? { ...r, version: saved.version, compromiso: saved.compromisos.find(c => c.id === r.compromiso?.id) || null } : r) }));
      if(action==='comentar')clearParteCommentDraft(window.localStorage,entry.recordId,entry.compromiso.id);
      setCommentId(null); setComment('');setCommentFilled(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el seguimiento.'); }
    finally { setBusy(false); }
  };
  const authors = new Map(data?.autores.map(a => [a.uid, a.nombre]) ?? []);
  const units = new Map((data?.unidades ?? []).map(u => [u.value, u.label]));
  if (!units.has(currentUnit(row))) units.set(currentUnit(row), selectedParteUnitLabel(row) || 'Sin unidad');
  const entries = data?.registros.filter(r => !filter || r.unidadFiltro === filter) ?? [];
  return <Dialog open fullWidth maxWidth="md" onClose={() => { if (!busy) onClose(); }} aria-labelledby="parte-history-title">
    <DialogTitle id="parte-history-title" sx={{ pr: 7 }}>Historial de observaciones<IconButton aria-label="Cerrar historial" disabled={busy} onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton><Typography variant="body2">{row.docenteNombre} · {row.modulo}</Typography></DialogTitle>
    <DialogContent dividers>
      <Stack direction="row" gap={2} alignItems="center" sx={{ mb: 2 }}><TextField select label="Unidad del historial" value={filter} disabled={loading || busy} onChange={e => setFilter(e.target.value)} slotProps={{inputLabel:{shrink:true},select:{displayEmpty:true,renderValue:value=>units.get(String(value))||'Todas las unidades'}}} sx={{ flex: 1 }}><MenuItem value="">Todas las unidades</MenuItem>{[...units].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField><Button disabled={loading || busy} onClick={() => void load()}>Actualizar</Button></Stack>
      {error && <AutoDismissAlert severity="error" onClose={() => setError('')}>{error}</AutoDismissAlert>}
      {loading ? <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress aria-label="Cargando historial" /></Box> : <Stack gap={2}>
        {!entries.length && <Typography>No hay observaciones de partes firmados para este filtro.</Typography>}
        {entries.map(entry => {
          const c = entry.compromiso;
          return <Paper key={entry.key} variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" fontWeight={700}>{dateLabel(entry.fecha)} · {activityLabel(entry.actividad)}</Typography>
            <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{entry.observacion}</Typography>
            {c && <Box sx={{ ml: 2, mt: 1 }}>
              <Stack direction="row" gap={0.5} alignItems="flex-start"><SubdirectoryArrowRightIcon fontSize="small" sx={{ flexShrink: 0 }} /><Typography sx={{ whiteSpace: 'pre-wrap' }}>{c.texto}</Typography></Stack>
              <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
                <FormControlLabel label="Cumplido" control={<Checkbox checked={!!c.cumplidoEn} disabled={!canEdit || busy || !!c.cumplidoEn} onChange={() => void followUp(entry, 'cumplir')} inputProps={{ 'aria-label': `Cumplido: ${c.texto}` }} />} />
                {!c.comentario && <Button size="small" disabled={!canEdit || busy || !c.cumplidoEn} onClick={() => openComment(entry)}>Agregar comentario</Button>}
              </Stack>
              {c.cumplidoEn && <Typography variant="caption" display="block">Cumplido el {dateLabel(c.cumplidoEn)} por {authors.get(c.cumplidoPor || '') || 'Coordinador'}</Typography>}
              {c.comentario && <Box sx={{ ml: 2, mt: 1 }}><Typography sx={{ whiteSpace: 'pre-wrap' }}>{c.comentario}</Typography>{c.comentadoEn && <Typography variant="caption">{dateLabel(c.comentadoEn)} · {authors.get(c.comentadoPor || '') || 'Coordinador'}</Typography>}</Box>}
              {commentId === c.id && <Stack gap={1} sx={{ mt: 1, ml: 2 }}><ParteDraftTextField key={c.id} ref={commentField} label="Comentario" helperText="Opcional. Se admite un solo comentario por compromiso cumplido." multiline minRows={2} value={comment} onPersist={value=>persistComment(entry,value)} onFilledChange={setCommentFilled} disabled={busy} slotProps={{ htmlInput: { maxLength: 4000 } }} /><Stack direction="row" gap={1}><Button disabled={busy || !commentFilled} variant="contained" onClick={() => void followUp(entry, 'comentar',commentField.current?.read()??comment)}>Guardar comentario</Button><Button disabled={busy} onClick={() => {commentField.current?.flush();setCommentId(null);}}>Ocultar comentario</Button></Stack></Stack>}
            </Box>}
          </Paper>;
        })}
      </Stack>}
    </DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>Cerrar</Button></DialogActions>
  </Dialog>;
}
