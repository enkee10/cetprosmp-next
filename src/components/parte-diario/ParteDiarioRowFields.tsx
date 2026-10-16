'use client';
import { useEffect, useState } from 'react';
import { Box, ButtonBase, MenuItem, TableCell, TextField, Typography } from '@mui/material';
import { activityLabel, changeParteUnit, FICHA_OPTIONS, INSTRUMENTO_OPTIONS, REG_ASISTENCIA_OPTIONS, REG_AUX_EVALUACION_OPTIONS, isParteSaved, isProgrammedParteUnit, MATERIAL_OPTIONS, MEDIOS_OPTIONS, numberedUnitLabel, selectedParteActivityLabel, selectedParteUnitLabel, parteUnitValue, ParteDiarioRow, ParteUnidad, SILABO_OPTIONS, TAREAS_OPTIONS } from '@/lib/parteDiario';
import ParteActivitySelect from './ParteActivitySelect';
import ParteObservations, { ParteObservationList, ParteObservationInput } from './ParteObservations';
import ParteObservationsHistory from './ParteObservationsHistory';
import { parteSavedColor, parteThreeLines } from './parteFieldStyles';
type Field = 'usoMedios' | 'silabo' | 'fichaActividad' | 'instrumentoEvaluacion' | 'registroAsistencia' | 'registroAuxiliarEvaluacion' | 'material' | 'tareas';
export default function ParteDiarioRowFields({ row, fecha, units, onLoadUnits, onChange, onSign, onObservationPending, observationInput, onObservationInputChange, observationsOpen, onOpenObservations, editable, disabled }: {
  row: ParteDiarioRow; fecha: string; units: ParteUnidad[]; onLoadUnits: () => void; onChange: (row: ParteDiarioRow) => void; onSign: () => void;
  onObservationPending: (pending: boolean) => void; observationsOpen: boolean; onOpenObservations: () => void; editable: boolean; disabled: boolean;
  observationInput: ParteObservationInput; onObservationInputChange: (value: ParteObservationInput) => void;
}) {
  const saved = isParteSaved(row), update = (patch: Partial<ParteDiarioRow>) => onChange({ ...row, ...patch });
  const [observationsVisited, setObservationsVisited] = useState(false),[history,setHistory]=useState(false);
  useEffect(() => { if (observationsOpen) setObservationsVisited(true); }, [observationsOpen]);
  const openObservations = () => { setObservationsVisited(true); onOpenObservations(); };
  const text = (value: string | number | null) => <Typography variant="body2" title={String(value ?? '')} sx={{ ...parteThreeLines, px: '6px', color: saved ? parteSavedColor : 'inherit' }}>{value ?? ''}</Typography>;
  const select = (field: Field, label: string, options: string[]) => <TableCell>{saved || !editable ? text(row[field]) : <TextField select value={row[field]} fullWidth size="small" disabled={disabled}
    sx={{ '& .MuiSelect-select': { minHeight: 56, display: 'flex', alignItems: 'center', whiteSpace: 'normal' } }}
    slotProps={{ select: { displayEmpty: true, renderValue: value => text(String(value || 'Seleccionar')), inputProps: { 'aria-label': `${label} de ${row.docenteNombre}` } } }}
    onChange={event => update({ [field]: event.target.value })}>
    <MenuItem value="" disabled>Seleccionar</MenuItem>{!options.includes(row[field]) && !!row[field] && <MenuItem value={row[field]} disabled>{text(row[field])}</MenuItem>}
    {options.map(value => <MenuItem key={value} value={value}>{text(value)}</MenuItem>)}
  </TextField>}</TableCell>;
  const activities = units.find(unit => unit.id === row.unidadDidacticaId)?.actividades ?? [];
  return <>
    <TableCell>{saved || !editable ? text(selectedParteUnitLabel(row, units)) : <TextField select value={parteUnitValue(row)} size="small" fullWidth disabled={disabled}
      sx={{ '& .MuiSelect-select': { minHeight: 56, display: 'flex', alignItems: 'center', whiteSpace: 'normal' } }}
      slotProps={{ select: { displayEmpty: true, renderValue: () => text(selectedParteUnitLabel(row, units) || 'Seleccionar unidad'), inputProps: { 'aria-label': `Unidad de ${row.docenteNombre}` }, onOpen: onLoadUnits } }}
      onChange={event => onChange(changeParteUnit(row, event.target.value, units))}>
      <MenuItem value="" disabled>Seleccionar unidad</MenuItem>{row.tipoUnidad === 'curricular' && row.unidadDidacticaId != null && !units.some(unit => unit.id === row.unidadDidacticaId) && <MenuItem value={'u:' + row.unidadDidacticaId}><Typography variant="body2" sx={{...parteThreeLines,fontWeight:isProgrammedParteUnit(row,`u:${row.unidadDidacticaId}`,units)?700:400}}>{selectedParteUnitLabel(row, units)}</Typography></MenuItem>}
      {units.map((unit, index) => <MenuItem key={unit.id} value={'u:' + unit.id}><Typography variant="body2" sx={{...parteThreeLines,fontWeight:isProgrammedParteUnit(row,`u:${unit.id}`,units)?700:400}}>{numberedUnitLabel(unit, index)}</Typography></MenuItem>)}<MenuItem value={row.practicaTipo} sx={{fontWeight:isProgrammedParteUnit(row,row.practicaTipo,units)?700:400}}>{row.practicaTipo.toUpperCase()}</MenuItem>
    </TextField>}</TableCell>
    <TableCell>{saved || !editable ? text(row.tipoUnidad === 'curricular' ? selectedParteActivityLabel(row,activities) : activityLabel(row.actividad)) : row.tipoUnidad === 'curricular' ? <Box onClick={onLoadUnits}>
      <ParteActivitySelect row={row} fecha={fecha} actividades={activities} label={`Actividad de ${row.docenteNombre}`} disabled={disabled} onChange={activity => update({ actividadId: activity.id, actividadNumero: activity.numeroSesion ?? null, actividad: activity.nombre || '' })} />
    </Box> : <TextField multiline fullWidth size="small" value={row.actividadManual} disabled={disabled} slotProps={{ htmlInput: { 'aria-label': `Actividad de ${row.docenteNombre}`, maxLength: 500 } }} onChange={event => update({ actividadManual: event.target.value, actividad: event.target.value })} />}</TableCell>
    <TableCell align="center">{text(row.matriculados)}</TableCell><TableCell>{saved || !editable ? text(row.asistentes) : <TextField type="number" fullWidth size="small" value={row.asistentes ?? ''} disabled={disabled} slotProps={{ htmlInput: { 'aria-label': `Asistentes de ${row.docenteNombre}`, min: 0, max: row.matriculados, step: 1 } }} onChange={event => update({ asistentes: event.target.value === '' ? null : Number(event.target.value) })} />}</TableCell>
    {select('usoMedios', 'Uso de medios en clase', MEDIOS_OPTIONS)}{select('silabo', 'Sílabo', SILABO_OPTIONS)}{select('fichaActividad', 'Ficha de Actividad', FICHA_OPTIONS)}{select('instrumentoEvaluacion', 'Instrumento de Evaluación', INSTRUMENTO_OPTIONS)}{select('registroAsistencia', 'Registro de Asistencia', REG_ASISTENCIA_OPTIONS)}{select('registroAuxiliarEvaluacion', 'Registro Auxiliar de Evaluación', REG_AUX_EVALUACION_OPTIONS)}{select('material', 'Materiales', MATERIAL_OPTIONS)}{select('tareas', 'Tareas', TAREAS_OPTIONS)}
    <TableCell sx={{ position: 'relative', overflow: 'hidden', p: 0 }}>{saved || !editable ? row.firma && <Box component="img" src={row.firma} alt={'Firma de ' + row.docenteNombreCompleto} sx={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: '100%', height: 'auto' }} /> :
      <ButtonBase disabled={disabled} aria-label={`Firmar parte de ${row.docenteNombre}`} onClick={onSign} sx={{ position: 'absolute', inset: 0, width: '100%', overflow: 'hidden' }}>Firmar</ButtonBase>}
    </TableCell>
    <TableCell data-parte-observation-key={row.key} data-parte-observation-editable={!saved && editable && !disabled} sx={{ p: '6px !important', color: saved ? parteSavedColor : 'inherit' }}>
      {!saved && editable && observationsVisited && <Box sx={{ display: observationsOpen ? 'block' : 'none' }}><ParteObservations active={observationsOpen} row={row} values={row.observaciones} compromisos={row.compromisos} onChange={(observaciones,compromisos) => update({ observaciones,compromisos })} inputDraft={observationInput} onInputDraftChange={onObservationInputChange} onPendingChange={onObservationPending} disabled={disabled} /></Box>}
      {!observationsOpen && <Box onClick={() => { if (!saved && editable && !disabled) openObservations(); }}>{row.observaciones.length ? <ParteObservationList values={row.observaciones} compromisos={row.compromisos}/> :
        editable && !saved && <ButtonBase disabled={disabled} onClick={openObservations} sx={{ minHeight: 50, width: '100%', fontSize: 12 }}>Agregar observación</ButtonBase>}</Box>}
      {!observationsOpen&&<ButtonBase onClick={()=>setHistory(true)} disabled={disabled} sx={{p:1,fontSize:12}}>Historial</ButtonBase>}
      {history&&<ParteObservationsHistory row={row} canEdit={editable} onClose={()=>setHistory(false)}/>}
    </TableCell>
  </>;
}
