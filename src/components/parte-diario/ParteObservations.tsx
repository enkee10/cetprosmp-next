'use client';
import { useRef, useState } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AddTaskIcon from '@mui/icons-material/AddTask';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import HistoryIcon from '@mui/icons-material/History';
import { ParteCompromiso, ParteDiarioRow } from '@/lib/parteDiario';
import ParteObservationsHistory from './ParteObservationsHistory';
import VoiceObservation from './VoiceObservation';
import ParteDraftTextField, { ParteDraftTextHandle } from './ParteDraftTextField';

export type ParteObservationInput = { text: string; editing: number | null };

const newCommitment = (observacionIndex: number, texto: string): ParteCompromiso => ({ id: null, observacionIndex, texto, creadoEn: null, creadoPor: null, cumplidoEn: null, cumplidoPor: null, comentario: null, comentadoEn: null, comentadoPor: null });

export function ParteObservationList({ values, compromisos = [], controls }: { values: string[]; compromisos?: ParteCompromiso[]; controls?: (index: number) => React.ReactNode }) {
 return <Box component="ul" aria-label="Apartados de observaciones" sx={{pl:3,m:0}}>{values.map((value,i)=>{
  const c=compromisos.find(item=>item.observacionIndex===i);
  return <Box component="li" key={i} sx={{mb:'5px'}}><Stack direction="row" alignItems="flex-start"><Typography variant="body2" sx={{flex:1,minWidth:0,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{value}</Typography>{controls?.(i)}</Stack>{c&&<Stack direction="row" gap={0.5} sx={{ml:2,mt:0.5}}><SubdirectoryArrowRightIcon fontSize="small" sx={{flexShrink:0}}/><Typography variant="body2" sx={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{c.texto}</Typography></Stack>}</Box>;
 })}</Box>;
}

export default function ParteObservations({values,compromisos=[],row,onChange,disabled=false,voice=false,onBusyChange,onPendingChange,inputDraft,onInputDraftChange,active=true}:{values:string[];compromisos?:ParteCompromiso[];row?:ParteDiarioRow;onChange:(values:string[],compromisos?:ParteCompromiso[])=>void;disabled?:boolean;voice?:boolean;onBusyChange?:(busy:boolean)=>void;onPendingChange?:(pending:boolean)=>void;inputDraft?:ParteObservationInput;onInputDraftChange?:(draft:ParteObservationInput)=>void;active?:boolean}) {
 const [localInput,setLocalInput]=useState<ParteObservationInput>({text:'',editing:null}),[busy,setBusy]=useState(false);
 const [commitmentIndex,setCommitmentIndex]=useState<number|null>(null),[history,setHistory]=useState(false);
 const {text,editing}=inputDraft??localInput;
 const observationField=useRef<ParteDraftTextHandle>(null),commitmentField=useRef<ParteDraftTextHandle>(null);
 const [filled,setFilled]=useState(!!text.trim());
 const pending=(value:string,index:number|null)=>{const next={text:value,editing:index};if(onInputDraftChange)onInputDraftChange(next);else setLocalInput(next);onPendingChange?.(!!value.trim()||index!==null);};
 const add=(value:string)=>onChange([...values,value.trim()],compromisos);
 const commit=()=>{const value=observationField.current?.read()??text;if(!value.trim())return;onChange(editing===null?[...values,value.trim()]:values.map((v,i)=>i===editing?value.trim():v),compromisos);observationField.current?.replace('');pending('',null);};
 const edit=(index:number)=>{observationField.current?.replace(values[index]);setFilled(!!values[index].trim());pending(values[index],index);};
 const cancel=()=>{observationField.current?.replace('');setFilled(false);pending('',null);};
 const remove=(index:number)=>{onChange(values.filter((_,i)=>i!==index),compromisos.filter(c=>c.observacionIndex!==index).map(c=>({...c,observacionIndex:c.observacionIndex>index?c.observacionIndex-1:c.observacionIndex})));setCommitmentIndex(null);};
 const changeCommitment=(index:number,value:string)=>{const existing=compromisos.find(c=>c.observacionIndex===index),next=compromisos.filter(c=>c.observacionIndex!==index);if(value.trim())next.push(existing?{...existing,texto:value}:newCommitment(index,value));onChange(values,next);};
 return <Stack gap={1}>
  {voice&&<VoiceObservation onText={add} disabled={disabled||values.length>=50} onBusyChange={value=>{setBusy(value);onBusyChange?.(value);}}/>}
  <ParteDraftTextField ref={observationField} active={active} label={editing===null?'Escribir observación':'Editar observación'} multiline minRows={2} fullWidth value={text} disabled={disabled||busy} onPersist={value=>pending(value,editing)} onFilledChange={value=>{setFilled(value);onPendingChange?.(value||editing!==null);}} slotProps={{inputLabel:{shrink:true},htmlInput:{maxLength:4000}}}/>
  <Stack direction="row" gap={1} flexWrap="wrap"><Button onClick={commit} disabled={disabled||busy||!filled||(editing===null&&values.length>=50)}>{editing===null?'Agregar observación':'Aceptar edición'}</Button>{row&&<Button startIcon={<HistoryIcon/>} disabled={disabled||busy} onClick={()=>setHistory(true)}>Historial</Button>}{editing!==null&&<Button onClick={cancel}>Cancelar edición</Button>}</Stack>
  <ParteObservationList values={values} compromisos={compromisos} controls={i=><Stack direction="row" sx={{ml:1,flexShrink:0}}><IconButton size="small" aria-label={`Eliminar observación ${i+1}`} disabled={disabled||editing!==null} onClick={()=>remove(i)}><DeleteOutlineIcon fontSize="small"/></IconButton><IconButton size="small" aria-label={`Editar observación ${i+1}`} disabled={disabled||busy} onClick={()=>edit(i)}><EditOutlinedIcon fontSize="small"/></IconButton><IconButton size="small" aria-label={`${compromisos.some(c=>c.observacionIndex===i)?'Editar':'Agregar'} compromiso de observación ${i+1}`} title="Compromiso opcional" disabled={disabled||busy||!!compromisos.find(c=>c.observacionIndex===i)?.cumplidoEn} onClick={()=>setCommitmentIndex(i)}><AddTaskIcon fontSize="small"/></IconButton></Stack>}/>
  {commitmentIndex!==null&&<Stack gap={1} sx={{ml:2}}><ParteDraftTextField key={commitmentIndex} ref={commitmentField} active={active} label={`Compromiso de observación ${commitmentIndex+1}`} helperText="Opcional" multiline minRows={2} value={compromisos.find(c=>c.observacionIndex===commitmentIndex)?.texto||''} disabled={disabled||busy} onPersist={value=>changeCommitment(commitmentIndex,value)} slotProps={{htmlInput:{maxLength:4000}}}/><Button disabled={disabled||busy} onClick={()=>{commitmentField.current?.flush();setCommitmentIndex(null);}} sx={{alignSelf:'flex-start'}}>Listo</Button></Stack>}
  {history&&row&&<ParteObservationsHistory row={row} canEdit={!disabled} onClose={()=>setHistory(false)}/>}
 </Stack>;
}
