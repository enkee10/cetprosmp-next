'use client';
import { useCallback, useEffect, useState } from 'react';
import { Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { selectedParteUnitLabel,isProgrammedParteUnit,numberedUnitLabel,parteMissingFields,changeParteUnit, MEDIOS_OPTIONS, FICHA_OPTIONS,INSTRUMENTO_OPTIONS,REG_ASISTENCIA_OPTIONS,REG_AUX_EVALUACION_OPTIONS,TAREAS_OPTIONS, MATERIAL_OPTIONS, parteTeacherGroupLabel, ParteDiarioRow, parteUnitValue, ParteUnidad, SILABO_OPTIONS } from '@/lib/parteDiario';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import SignaturePad from './SignaturePad';
import ParteObservations from './ParteObservations';
import { parteThreeLines } from './parteFieldStyles';
import ParteActivitySelect from './ParteActivitySelect';

export default function ParteDiarioModal({ row, fecha, onClose, onSaved, reportRecordId,onDeleted }: { row: ParteDiarioRow; fecha: string; onClose: () => void; onSaved: () => void; reportRecordId?:number;onDeleted?:()=>void }) {
  const [draft, setDraft] = useState({ ...row }), [unidades, setUnidades] = useState<ParteUnidad[]>([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const [pendingObservation,setPendingObservation]=useState(false);
  useEffect(() => {
    let active = true;
    httpsCallable<unknown, { unidades: ParteUnidad[] }>(functions, reportRecordId?'getParteReporteOpciones':'getParteDiarioOpciones')(reportRecordId?{id:reportRecordId}:{ fecha, grupoModuloId: row.grupoModuloId, actividadProgramadaId: row.actividadProgramadaId, jornadaId: row.jornadaId })
      .then(result => { if (active) setUnidades(result.data.unidades); }).catch(err => { if (active) setError(err.message || 'No se pudieron cargar las unidades.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [row.actividadProgramadaId, row.grupoModuloId, row.jornadaId,reportRecordId,fecha]);
  const actividades = unidades.find(u => u.id === draft.unidadDidacticaId)?.actividades ?? [];
  const setFirma = useCallback((firma: string | null) => setDraft(previous => ({ ...previous, firma })), []);
  const save = async () => {
    if (pendingObservation) { setError('Añade o termina de editar la observación antes de guardar.'); return; }
    if (!draft.firma) { setError('Firma el parte antes de guardarlo.'); return; }
    if (parteMissingFields(draft).length) { setError('Completa todos los campos antes de guardar.'); return; }
    setSaving(true); setError('');
    try {
      await httpsCallable(functions, reportRecordId?'saveParteReporteRegistro':'saveParteDiario')({ ...draft, id:reportRecordId,fecha, version: row.version });
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el parte diario.'); }
    finally { setSaving(false); }
  };
  const remove=async()=>{if(!row.recordId||!window.confirm('¿Eliminar este registro del Parte Diario?'))return;setSaving(true);try{await httpsCallable(functions,'deleteParteDiarioRegistro')({id:row.recordId,version:row.version});onDeleted?.();}catch(err){setError(err instanceof Error?err.message:'No se pudo eliminar el registro.');}finally{setSaving(false);}};
  const documentSelect = (field: 'usoMedios' | 'silabo' | 'fichaActividad' | 'instrumentoEvaluacion' | 'registroAsistencia' | 'registroAuxiliarEvaluacion' | 'material' | 'tareas', label: string, options: string[]) => <TextField id={`parte-${field}`} key={field} select label={label} value={draft[field]} disabled={saving} onChange={event => setDraft(previous => ({ ...previous, [field]: event.target.value }))} fullWidth required sx={{'& .MuiSelect-select':{minHeight:56,display:'flex',alignItems:'center',whiteSpace:'normal'}}} slotProps={{inputLabel:{shrink:true},select:{displayEmpty:true,renderValue:value=><Typography component="span" sx={parteThreeLines}>{String(value||'Seleccionar')}</Typography>}}}>
    <MenuItem value="" disabled>Seleccionar</MenuItem>{!options.includes(draft[field])&&!!draft[field]&&<MenuItem value={draft[field]} disabled>{draft[field]} (sin valoración)</MenuItem>}{options.map(value => <MenuItem key={value} value={value}><Typography sx={parteThreeLines}>{value}</Typography></MenuItem>)}
  </TextField>;
  return <Dialog open onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth="md" slotProps={{ paper: { sx: { maxHeight: 'calc(100dvh - 24px)', m: 1.5, width: 'calc(100% - 24px)' } } }} aria-labelledby="parte-diario-modal-title">
    <DialogTitle id="parte-diario-modal-title"><Stack direction="row" alignItems="center" gap={2}><Avatar src={row.avatar ?? undefined} alt={row.docenteNombreCompleto} sx={{ width: 76, height: 76 }} /><Box><Typography component="span" fontWeight={700}>{row.docenteNombre}</Typography><Typography variant="body2">{parteTeacherGroupLabel(row)}</Typography></Box></Stack></DialogTitle>
    <DialogContent dividers>
      {error && <AutoDismissAlert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</AutoDismissAlert>}
      {loading ? <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress aria-label="Cargando unidades y actividades" /></Box> : <Stack gap={2.5}>
        <TextField id="parte-unidad" select label="Unidad" value={parteUnitValue(draft)} disabled={saving} onChange={event => setDraft(previous => changeParteUnit(previous, event.target.value, unidades))} sx={{'& .MuiSelect-select':{minHeight:56,display:'flex',alignItems:'center',whiteSpace:'normal'}}} slotProps={{inputLabel:{shrink:true},select:{displayEmpty:true,renderValue:()=> <Typography component="span" sx={parteThreeLines}>{selectedParteUnitLabel(draft,unidades)||'Seleccionar unidad'}</Typography>}}}>
          <MenuItem value="" disabled>Seleccionar unidad</MenuItem>{unidades.map((u,index) => <MenuItem key={u.id} value={`u:${u.id}`}><Typography sx={{...parteThreeLines,fontWeight:isProgrammedParteUnit(row,`u:${u.id}`,unidades)?700:400}}>{numberedUnitLabel(u,index)}</Typography></MenuItem>)}<MenuItem value={row.practicaTipo} sx={{fontWeight:isProgrammedParteUnit(row,row.practicaTipo,unidades)?700:400}}>{row.practicaTipo.toUpperCase()}</MenuItem>
        </TextField>
        {draft.tipoUnidad !== 'curricular' ? <TextField multiline required label="Actividad / sesión" placeholder={`Escribir actividad de ${draft.tipoUnidad.toUpperCase()}`} value={draft.actividadManual} disabled={saving} slotProps={{inputLabel:{shrink:true},htmlInput:{maxLength:500}}} onChange={event=>setDraft(previous=>({...previous,actividadManual:event.target.value,actividad:event.target.value}))}/> : <ParteActivitySelect row={draft} fecha={fecha} reportRecordId={reportRecordId} actividades={actividades} disabled={saving} onChange={a=>{setDraft(previous=>({...previous,actividadId:a.id,actividad:a.nombre||''}));setUnidades(previous=>previous.map(u=>({...u,actividades:u.actividades.map(item=>item.id===a.id?a:item)})));}}/>}
        {draft.tipoUnidad === 'curricular' && !actividades.length && <AutoDismissAlert severity="info">La unidad seleccionada no tiene actividades cargadas.</AutoDismissAlert>}
        <Stack direction="row" alignItems="center" gap={3}><Typography>Matriculados: <strong>{row.matriculados}</strong></Typography><TextField label="Asistentes" required type="number" value={draft.asistentes ?? ''} disabled={saving} sx={{ width: 180 }} slotProps={{ inputLabel:{shrink:true}, htmlInput: { min: 0, max: row.matriculados, step: 1 } }} onChange={event => setDraft(previous => ({ ...previous, asistentes: event.target.value === '' ? null : Number(event.target.value) }))} /></Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {documentSelect('usoMedios', 'Uso de medios en clase', MEDIOS_OPTIONS)}
          {documentSelect('silabo', 'Sílabo', SILABO_OPTIONS)}
          {documentSelect('fichaActividad', 'Ficha de Actividad', FICHA_OPTIONS)}
          {documentSelect('instrumentoEvaluacion', 'Instrumento de Evaluación', INSTRUMENTO_OPTIONS)}
          {documentSelect('registroAsistencia', 'Reg. Asist.', REG_ASISTENCIA_OPTIONS)}
          {documentSelect('registroAuxiliarEvaluacion', 'Reg. Aux. Eva.', REG_AUX_EVALUACION_OPTIONS)}
          {documentSelect('material', 'Materiales', MATERIAL_OPTIONS)}
          {documentSelect('tareas', 'Tareas', TAREAS_OPTIONS)}
        </Box>
        <Typography fontWeight={600}>Observaciones</Typography>
        <ParteObservations values={draft.observaciones} onChange={observaciones=>setDraft(previous=>({...previous,observaciones}))} disabled={saving} onPendingChange={setPendingObservation}/>
        <SignaturePad initialValue={row.firma} onChange={setFirma} disabled={saving} />
      </Stack>}
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>{onDeleted&&row.recordId&&<Button color="error" onClick={()=>void remove()} disabled={saving} sx={{mr:'auto'}}>Eliminar registro</Button>}<Button onClick={onClose} disabled={saving}>Cancelar</Button><Button variant="contained" disabled={saving || loading || !draft.firma || parteMissingFields(draft).length > 0 || pendingObservation} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar'}</Button></DialogActions>
  </Dialog>;
}
