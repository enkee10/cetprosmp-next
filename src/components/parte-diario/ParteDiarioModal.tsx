'use client';
import { useEffect, useRef, useState } from 'react';
import { Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { selectedParteUnitLabel,isProgrammedParteUnit,numberedUnitLabel,parteMissingFields,changeParteUnit, MEDIOS_OPTIONS, FICHA_OPTIONS,INSTRUMENTO_OPTIONS,REG_ASISTENCIA_OPTIONS,REG_AUX_EVALUACION_OPTIONS,TAREAS_OPTIONS, MATERIAL_OPTIONS, parteTeacherGroupLabel, ParteDiarioRow, parteUnitValue, ParteUnidad, SILABO_OPTIONS } from '@/lib/parteDiario';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import SignaturePad from './SignaturePad';
import ParteObservations, { ParteObservationInput } from './ParteObservations';
import { parteThreeLines } from './parteFieldStyles';
import ParteActivitySelect from './ParteActivitySelect';
import CloseIcon from '@mui/icons-material/Close';
import ParteRecordStatus from './ParteRecordStatus';
import { useAuth } from '@/context/AuthContext';
import { clearParteDraft, editedParteDraft, emptyParteObservation, readParteDraft, writeParteDraft } from '@/lib/parteDiarioDrafts';

const requiredControls = [
  ['Unidad','unidad'], ['Actividad','actividad'], ['Asistentes','asistentes'],
  ['Uso de medios en clase','usoMedios'], ['Sílabo','silabo'], ['Ficha de Actividad','fichaActividad'],
  ['Instrumento de Evaluación','instrumentoEvaluacion'], ['Registro de Asistencia','registroAsistencia'],
  ['Registro Auxiliar de Evaluación','registroAuxiliarEvaluacion'], ['Recursos','material'], ['Tareas','tareas'],
] as const;

export default function ParteDiarioModal({ row, fecha, onClose, onSaved, onDraftChange, observationInput, onObservationInputChange, reportRecordId,onDeleted,onDiscardDraft }: { row: ParteDiarioRow; fecha: string; onClose: () => void; onSaved: () => void; onDraftChange?: (draft: ParteDiarioRow) => void; observationInput?: ParteObservationInput; onObservationInputChange?: (value: ParteObservationInput) => void; reportRecordId?:number;onDeleted?:()=>void;onDiscardDraft?:()=>void }) {
  const { user } = useAuth();
  const [restored] = useState(()=>{if(onDraftChange||typeof window==='undefined')return null;try{return readParteDraft(window.localStorage,fecha,row);}catch{return null;}});
  const [localDraft,setLocalDraft]=useState(restored?.row||{...row}),[localObservation,setLocalObservation]=useState(restored?.observation||emptyParteObservation());
  const [unidades,setUnidades]=useState<ParteUnidad[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const draft=onDraftChange?row:localDraft,activeObservation=observationInput??localObservation;
  const [attempted,setAttempted]=useState(false);
  const contentRef=useRef<HTMLDivElement>(null);
  const missing=parteMissingFields(draft);
  const invalid=(field:string)=>attempted&&requiredControls.some(([label,key])=>key===field&&missing.includes(label));
  const draftRef=useRef(draft),inputRef=useRef(activeObservation);draftRef.current=draft;inputRef.current=activeObservation;
  const persistLocal=(next:ParteDiarioRow,input:ParteObservationInput)=>{
    if(!user)return;
    const editor={uid:user.uid,nombre:user.displayName||user.email||'Coordinador',avatar:user.photoURL};
    const updated=editedParteDraft(next,draftRef.current,editor);draftRef.current=updated;inputRef.current=input;setLocalDraft(updated);setLocalObservation(input);
    try{writeParteDraft(window.localStorage,fecha,updated,input,editor);}catch{setError('No se pudo conservar el borrador en este navegador. Mantén el formulario abierto y guarda el parte.');}
  };
  const setDraft=(update:(previous:ParteDiarioRow)=>ParteDiarioRow)=>{if(onDraftChange)onDraftChange(update(row));else persistLocal(update(draftRef.current),inputRef.current);};
  const changeObservation=(input:ParteObservationInput)=>{if(onObservationInputChange)onObservationInputChange(input);else persistLocal(draftRef.current,input);};
  const [pendingObservationInput,setPendingObservationInput]=useState(false);
  const pendingObservation=pendingObservationInput||!!activeObservation.text.trim()||activeObservation.editing!=null;
  const discardDraft=()=>{if(!window.confirm('¿Descartar el borrador y recuperar el último registro guardado?'))return;if(onDiscardDraft)onDiscardDraft();else {try{clearParteDraft(window.localStorage,fecha,row);onClose();}catch{setError('No se pudo descartar el borrador.');}}};
  useEffect(() => {
    let active = true;
    httpsCallable<unknown, { unidades: ParteUnidad[] }>(functions, reportRecordId?'getParteReporteOpciones':'getParteDiarioOpciones')(reportRecordId?{id:reportRecordId}:{ fecha, grupoModuloId: row.grupoModuloId, actividadProgramadaId: row.actividadProgramadaId, jornadaId: row.jornadaId })
      .then(result => { if (active) setUnidades(result.data.unidades); }).catch(err => { if (active) setError(err.message || 'No se pudieron cargar las unidades.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [row.actividadProgramadaId, row.grupoModuloId, row.jornadaId,reportRecordId,fecha]);
  const actividades = unidades.find(u => u.id === draft.unidadDidacticaId)?.actividades ?? [];
  const setFirma = (firma: string | null) => setDraft(previous => ({ ...previous, firma }));
  const save = async () => {
    setAttempted(true);
    const firstMissing=requiredControls.find(([label])=>missing.includes(label));
    if(firstMissing||!draft.firma){
      setError('Completa los campos marcados en rojo antes de guardar.');
      const id=`parte-${firstMissing?.[1]||'firma'}`;
      requestAnimationFrame(()=>{const control=contentRef.current?.querySelector<HTMLElement>(`#${id}`);control?.focus({preventScroll:true});control?.scrollIntoView({block:'center',behavior:'smooth'});});
      return;
    }
    if (pendingObservation) { setError('Añade o termina de editar la observación antes de guardar.'); return; }
    setSaving(true); setError('');
    try {
      await httpsCallable(functions, reportRecordId?'saveParteReporteRegistro':'saveParteDiario')({ ...draft, id:reportRecordId,fecha, version: draft.version });
      clearParteDraft(window.localStorage,fecha,draft);
      onSaved();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el parte diario.'); }
    finally { setSaving(false); }
  };
  const remove=async()=>{if(!row.recordId||!window.confirm('¿Eliminar este registro del Parte Diario?'))return;setSaving(true);try{await httpsCallable(functions,'deleteParteDiarioRegistro')({id:row.recordId,version:row.version});clearParteDraft(window.localStorage,fecha,row);onDeleted?.();}catch(err){setError(err instanceof Error?err.message:'No se pudo eliminar el registro.');}finally{setSaving(false);}};
  const documentSelect = (field: 'usoMedios' | 'silabo' | 'fichaActividad' | 'instrumentoEvaluacion' | 'registroAsistencia' | 'registroAuxiliarEvaluacion' | 'material' | 'tareas', label: string, options: string[]) => <TextField id={`parte-${field}`} key={field} error={invalid(field)} helperText={invalid(field)?'Selecciona una opción.':undefined} select label={label} value={draft[field]} disabled={saving} onChange={event => setDraft(previous => ({ ...previous, [field]: event.target.value }))} fullWidth required sx={{'& .MuiSelect-select':{minHeight:56,display:'flex',alignItems:'center',whiteSpace:'normal'}}} slotProps={{inputLabel:{shrink:true},select:{displayEmpty:true,renderValue:value=><Typography component="span" sx={parteThreeLines}>{String(value||'Seleccionar')}</Typography>}}}>
    <MenuItem value="" disabled>Seleccionar</MenuItem>{!options.includes(draft[field])&&!!draft[field]&&<MenuItem value={draft[field]} disabled>{draft[field]} (sin valoración)</MenuItem>}{options.map(value => <MenuItem key={value} value={value}><Typography sx={parteThreeLines}>{value}</Typography></MenuItem>)}
  </TextField>;
  return <Dialog open onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth="md" slotProps={{ paper: { sx: { maxHeight: 'calc(100dvh - 24px)', m: 1.5, width: 'calc(100% - 24px)' } } }} aria-labelledby="parte-diario-modal-title">
    <DialogTitle id="parte-diario-modal-title" sx={{pr:7,position:'relative'}}><IconButton aria-label="Cerrar formulario" title="Cerrar y conservar borrador" onClick={onClose} disabled={saving} sx={{position:'absolute',right:8,top:8}}><CloseIcon/></IconButton><Stack direction="row" alignItems="center" gap={2}><Avatar src={row.avatar ?? undefined} alt={row.docenteNombreCompleto} sx={{ width: 76, height: 76 }} /><Box><Typography component="span" fontWeight={700}>{row.docenteNombre}</Typography><Typography variant="body2">{parteTeacherGroupLabel(row)}<ParteRecordStatus row={draft}/></Typography></Box></Stack></DialogTitle>
    <DialogContent dividers ref={contentRef}>
      {draft.borradorConflicto&&<AutoDismissAlert severity="warning">El registro guardado cambió después de crear este borrador. Sus datos se conservan; descarta el borrador para recuperar la versión actual antes de firmar.</AutoDismissAlert>}
      {error && <AutoDismissAlert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</AutoDismissAlert>}
      {loading ? <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress aria-label="Cargando unidades y actividades" /></Box> : <Stack gap={2.5}>
        <TextField id="parte-unidad" error={invalid('unidad')} helperText={invalid('unidad')?'Selecciona una unidad.':undefined} select label="Unidad" value={parteUnitValue(draft)} disabled={saving} onChange={event => setDraft(previous => changeParteUnit(previous, event.target.value, unidades))} sx={{'& .MuiSelect-select':{minHeight:56,display:'flex',alignItems:'center',whiteSpace:'normal'}}} slotProps={{inputLabel:{shrink:true},select:{displayEmpty:true,renderValue:()=> <Typography component="span" sx={parteThreeLines}>{selectedParteUnitLabel(draft,unidades)||'Seleccionar unidad'}</Typography>}}}>
          <MenuItem value="" disabled>Seleccionar unidad</MenuItem>{unidades.map((u,index) => <MenuItem key={u.id} value={`u:${u.id}`}><Typography sx={{...parteThreeLines,fontWeight:isProgrammedParteUnit(row,`u:${u.id}`,unidades)?700:400}}>{numberedUnitLabel(u,index)}</Typography></MenuItem>)}<MenuItem value={row.practicaTipo} sx={{fontWeight:isProgrammedParteUnit(row,row.practicaTipo,unidades)?700:400}}>{row.practicaTipo.toUpperCase()}</MenuItem>
        </TextField>
        {draft.tipoUnidad !== 'curricular' ? <TextField id="parte-actividad" error={invalid('actividad')} helperText={invalid('actividad')?'Escribe la actividad.':undefined} multiline required label="Actividad / sesión" placeholder={`Escribir actividad de ${draft.tipoUnidad.toUpperCase()}`} value={draft.actividadManual} disabled={saving} slotProps={{inputLabel:{shrink:true},htmlInput:{maxLength:500}}} onChange={event=>setDraft(previous=>({...previous,actividadManual:event.target.value,actividad:event.target.value}))}/> : <ParteActivitySelect id="parte-actividad" error={invalid('actividad')} row={draft} fecha={fecha} reportRecordId={reportRecordId} actividades={actividades} disabled={saving} onChange={a=>{setDraft(previous=>({...previous,actividadId:a.id,actividadNumero:a.numeroSesion??null,actividad:a.nombre||''}));setUnidades(previous=>previous.map(u=>({...u,actividades:u.actividades.map(item=>item.id===a.id?a:item)})));}}/>}
        {draft.tipoUnidad === 'curricular' && !actividades.length && <AutoDismissAlert severity="info">La unidad seleccionada no tiene actividades cargadas.</AutoDismissAlert>}
        <Stack direction="row" alignItems="center" gap={3}><Typography>Matriculados: <strong>{row.matriculados}</strong></Typography><TextField id="parte-asistentes" error={invalid('asistentes')} helperText={invalid('asistentes')?'Indica los asistentes.':undefined} label="Asistentes" required type="number" value={draft.asistentes ?? ''} disabled={saving} sx={{ width: 180 }} slotProps={{ inputLabel:{shrink:true}, htmlInput: { min: 0, max: row.matriculados, step: 1 } }} onChange={event => setDraft(previous => ({ ...previous, asistentes: event.target.value === '' ? null : Number(event.target.value) }))} /></Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {documentSelect('usoMedios', 'Uso de medios en clase', MEDIOS_OPTIONS)}
          {documentSelect('silabo', 'Sílabo', SILABO_OPTIONS)}
          {documentSelect('fichaActividad', 'Ficha de Actividad', FICHA_OPTIONS)}
          {documentSelect('instrumentoEvaluacion', 'Instrumento de Evaluación', INSTRUMENTO_OPTIONS)}
          {documentSelect('registroAsistencia', 'Reg. Asist.', REG_ASISTENCIA_OPTIONS)}
          {documentSelect('registroAuxiliarEvaluacion', 'Reg. Aux. Eva.', REG_AUX_EVALUACION_OPTIONS)}
          {documentSelect('material', 'Recursos', MATERIAL_OPTIONS)}
          {documentSelect('tareas', 'Tareas', TAREAS_OPTIONS)}
        </Box>
        <Typography fontWeight={600}>Observaciones</Typography>
        <ParteObservations row={draft} values={draft.observaciones} compromisos={draft.compromisos} onChange={(observaciones,compromisos)=>setDraft(previous=>({...previous,observaciones,compromisos}))} disabled={saving} inputDraft={activeObservation} onInputDraftChange={changeObservation} onPendingChange={setPendingObservationInput}/>
        <SignaturePad id="parte-firma" error={attempted&&!draft.firma} initialValue={draft.firma} onChange={setFirma} disabled={saving} />
      </Stack>}
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>{onDeleted&&row.recordId&&<Button color="error" onClick={()=>void remove()} disabled={saving} sx={{mr:'auto'}}>Eliminar registro</Button>}{draft.borrador&&<Button onClick={discardDraft} disabled={saving}>Descartar borrador</Button>}<Button onClick={onClose} disabled={saving}>Cerrar</Button><Button variant="contained" disabled={saving || loading} onClick={() => void save()}>{saving ? 'Guardando…' : 'Guardar'}</Button></DialogActions>
  </Dialog>;
}
