'use client';
import { useCallback, useEffect, useState } from 'react';
import { Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { activityLabel,unitLabel,changeParteUnit, FICHA_OPTIONS,INSTRUMENTO_OPTIONS,TAREAS_OPTIONS, MATERIAL_OPTIONS, parteGroupLabel, ParteDiarioRow, parteUnitValue, ParteUnidad, SILABO_OPTIONS } from '@/lib/parteDiario';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import SignaturePad from './SignaturePad';
import VoiceObservation from './VoiceObservation';
import VoiceActivityField from './VoiceActivityField';
import ActivityOptionLabel from './ActivityOptionLabel';

export default function ParteDiarioModal({ row, fecha, onClose, onSaved, reportRecordId,onDeleted }: { row: ParteDiarioRow; fecha: string; onClose: () => void; onSaved: () => void; reportRecordId?:number;onDeleted?:()=>void }) {
  const [draft, setDraft] = useState({ ...row }), [unidades, setUnidades] = useState<ParteUnidad[]>([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const [voiceBusy, setVoiceBusy] = useState(false),[activityVoiceBusy,setActivityVoiceBusy]=useState(false), [editing, setEditing] = useState<number | null>(null), [typed, setTyped] = useState('');
  useEffect(() => {
    let active = true;
    httpsCallable<unknown, { unidades: ParteUnidad[] }>(functions, reportRecordId?'getParteReporteOpciones':'getParteDiarioOpciones')(reportRecordId?{id:reportRecordId}:{ grupoModuloId: row.grupoModuloId, actividadProgramadaId: row.actividadProgramadaId, jornadaId: row.jornadaId })
      .then(result => { if (active) setUnidades(result.data.unidades); }).catch(err => { if (active) setError(err.message || 'No se pudieron cargar las unidades.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [row.actividadProgramadaId, row.grupoModuloId, row.jornadaId,reportRecordId]);
  const actividades = unidades.find(u => u.id === draft.unidadDidacticaId)?.actividades ?? [];
  const addText = useCallback((text: string) => { setDraft(previous => ({ ...previous, observaciones: [...previous.observaciones, text.trim()] })); }, []);
  const setFirma = useCallback((firma: string | null) => setDraft(previous => ({ ...previous, firma })), []);
  const commitTyped = () => {
    if (!typed.trim()) return;
    setDraft(previous => ({ ...previous, observaciones: editing === null ? [...previous.observaciones, typed.trim()] : previous.observaciones.map((value, i) => i === editing ? typed.trim() : value) }));
    setEditing(null); setTyped('');
  };
  const save = async () => {
    if (typed.trim() || editing !== null) { setError('Añade o termina de editar la observación antes de guardar.'); return; }
    setSaving(true); setError('');
    try {
      await httpsCallable(functions, reportRecordId?'saveParteReporteRegistro':'saveParteDiario')({ ...draft, id:reportRecordId,fecha, version: row.version });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el parte diario.'); }
    finally { setSaving(false); }
  };
  const remove=async()=>{if(!row.recordId||!window.confirm('¿Eliminar este registro del Parte Diario?'))return;setSaving(true);try{await httpsCallable(functions,'deleteParteDiarioRegistro')({id:row.recordId,version:row.version});onDeleted?.();}catch(err){setError(err instanceof Error?err.message:'No se pudo eliminar el registro.');}finally{setSaving(false);}};
  const documentSelect = (field: 'silabo' | 'fichaActividad' | 'instrumentoEvaluacion' | 'material' | 'tareas', label: string, options: string[]) => <TextField id={`parte-${field}`} key={field} select label={label} value={draft[field]} disabled={saving} onChange={event => setDraft(previous => ({ ...previous, [field]: event.target.value }))} fullWidth>
    {!options.includes(draft[field])&&<MenuItem value={draft[field]} disabled>{draft[field]} (sin valoración)</MenuItem>}{options.map(value => <MenuItem key={value} value={value} sx={{whiteSpace:'normal'}}>{value}</MenuItem>)}
  </TextField>;
  return <Dialog open onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth="md" slotProps={{ paper: { sx: { maxHeight: 'calc(100dvh - 24px)', m: 1.5, width: 'calc(100% - 24px)' } } }} aria-labelledby="parte-diario-modal-title">
    <DialogTitle id="parte-diario-modal-title"><Stack direction="row" alignItems="center" gap={2}><Avatar src={row.avatar ?? undefined} alt={row.docenteNombreCompleto} sx={{ width: 76, height: 76 }} /><Box><Typography component="span" fontWeight={700}>{row.docenteNombre}</Typography><Typography variant="body2">{parteGroupLabel(row.modulo)}</Typography></Box></Stack></DialogTitle>
    <DialogContent dividers>
      {error && <AutoDismissAlert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</AutoDismissAlert>}
      {loading ? <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress aria-label="Cargando unidades y actividades" /></Box> : <Stack gap={2.5}>
        <TextField id="parte-unidad" select label="Unidad" value={parteUnitValue(draft)} disabled={saving||activityVoiceBusy} onChange={event => setDraft(previous => changeParteUnit(previous, event.target.value, unidades))}>
          <MenuItem value="" disabled>Seleccionar unidad</MenuItem>{unidades.map(u => <MenuItem key={u.id} value={`u:${u.id}`}>{unitLabel(u.nombre) || `UNIDAD ${u.id}`}</MenuItem>)}<MenuItem value={row.practicaTipo}>{row.practicaTipo.toUpperCase()}</MenuItem>
        </TextField>
        {draft.tipoUnidad !== 'curricular' ? <VoiceActivityField value={draft.actividadManual} disabled={saving||voiceBusy} onBusyChange={setActivityVoiceBusy} fieldProps={{label:'Actividad / sesión',placeholder:`Escribir actividad de ${draft.tipoUnidad.toUpperCase()}`}} onChange={value=>setDraft(previous=>({...previous,actividadManual:value,actividad:value}))}/> : <TextField id="parte-actividad" select label="Actividad / sesión" value={actividades.some(a => a.id === draft.actividadId) ? draft.actividadId : ''} slotProps={{select:{renderValue:()=>activityLabel(actividades.find(a=>a.id===draft.actividadId)?.nombre||draft.actividad)}}} disabled={saving || !actividades.length} onChange={event => setDraft(previous => ({ ...previous, actividadId: Number(event.target.value) }))}>
          {actividades.map(a => <MenuItem key={a.id} value={a.id} sx={{ whiteSpace: 'normal' }}><ActivityOptionLabel activity={a} programmedId={row.actividadProgramadaId} programmedIds={row.actividadesDelDia?.map(a=>a.id)}/></MenuItem>)}
        </TextField>}
        {draft.tipoUnidad === 'curricular' && !actividades.length && <AutoDismissAlert severity="info">La unidad seleccionada no tiene actividades cargadas.</AutoDismissAlert>}
        <Stack direction="row" alignItems="center" gap={3}><Typography>Matriculados: <strong>{row.matriculados}</strong></Typography><TextField label="Asistentes" type="number" value={draft.asistentes ?? ''} disabled={saving} sx={{ width: 180 }} slotProps={{ htmlInput: { min: 0, max: row.matriculados, step: 1 } }} onChange={event => setDraft(previous => ({ ...previous, asistentes: event.target.value === '' ? null : Number(event.target.value) }))} /></Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {documentSelect('silabo', 'Sílabo', SILABO_OPTIONS)}
          {documentSelect('fichaActividad', 'Ficha de Actividad', FICHA_OPTIONS)}
          {documentSelect('instrumentoEvaluacion', 'Instrumento de Evaluación', INSTRUMENTO_OPTIONS)}
          {documentSelect('material', 'Materiales', MATERIAL_OPTIONS)}
          {documentSelect('tareas', 'Tareas', TAREAS_OPTIONS)}
        </Box>
        <Typography fontWeight={600}>Observaciones</Typography>
        <VoiceObservation onText={addText} onBusyChange={setVoiceBusy} disabled={saving || activityVoiceBusy || draft.observaciones.length >= 50} />
        <Box component="ul" sx={{ pl: 3 }} aria-label="Apartados de observaciones">{draft.observaciones.map((text, i) => <Box component="li" key={i} sx={{ mb: '5px' }}>
          <Stack direction="row" alignItems="flex-start"><Typography sx={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{text}</Typography>
          <Stack direction="row" sx={{ ml: 1, flexShrink: 0 }}><IconButton aria-label={`Eliminar observación ${i + 1}`} disabled={saving || editing !== null} onClick={() => setDraft(previous => ({ ...previous, observaciones: previous.observaciones.filter((_, index) => index !== i) }))}><DeleteOutlineIcon /></IconButton>
            <IconButton aria-label={`Editar observación ${i + 1}`} disabled={saving || voiceBusy} onClick={() => { setEditing(i); setTyped(text); }}><EditOutlinedIcon /></IconButton></Stack>
          </Stack>
        </Box>)}</Box>
        <TextField label={editing === null ? 'Escribir observación' : 'Editar observación'} multiline minRows={2} value={typed} disabled={saving || voiceBusy} slotProps={{ htmlInput: { maxLength: 4000 } }} onChange={event => setTyped(event.target.value)} />
        <Stack direction="row" gap={1}><Button onClick={commitTyped} disabled={saving || voiceBusy || !typed.trim() || (editing === null && draft.observaciones.length >= 50)}>{editing === null ? 'Añadir observación' : 'Aceptar edición'}</Button>{editing !== null && <Button onClick={() => { setEditing(null); setTyped(''); }}>Cancelar edición</Button>}</Stack>
        <SignaturePad initialValue={row.firma} onChange={setFirma} disabled={saving} />
      </Stack>}
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>{onDeleted&&row.recordId&&<Button color="error" onClick={()=>void remove()} disabled={saving||voiceBusy||activityVoiceBusy} sx={{mr:'auto'}}>Eliminar registro</Button>}<Button onClick={onClose} disabled={saving}>Cancelar</Button><Button variant="contained" disabled={saving || loading || voiceBusy || activityVoiceBusy || (draft.tipoUnidad === 'curricular' && !row.pendiente && (!draft.actividadId || !draft.unidadDidacticaId))} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar'}</Button></DialogActions>
  </Dialog>;
}
