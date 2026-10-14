'use client';
import { useState } from 'react';
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VoiceObservation from './VoiceObservation';

export default function ParteObservations({values,onChange,disabled=false,voice=false,onBusyChange,onPendingChange}:{values:string[];onChange:(values:string[])=>void;disabled?:boolean;voice?:boolean;onBusyChange?:(busy:boolean)=>void;onPendingChange?:(pending:boolean)=>void}) {
 const [text,setText]=useState(''),[editing,setEditing]=useState<number|null>(null),[busy,setBusy]=useState(false);
 const pending=(value:string,index:number|null)=>{setText(value);setEditing(index);onPendingChange?.(!!value.trim()||index!==null);};
 const add=(value:string)=>onChange([...values,value.trim()]);
 const commit=()=>{if(!text.trim())return;onChange(editing===null?[...values,text.trim()]:values.map((v,i)=>i===editing?text.trim():v));pending('',null);};
 return <Stack gap={1}>
  {voice&&<VoiceObservation onText={add} disabled={disabled||values.length>=50} onBusyChange={value=>{setBusy(value);onBusyChange?.(value);}}/>}
  <TextField label={editing===null?'Escribir observación':'Editar observación'} multiline minRows={2} fullWidth value={text} disabled={disabled||busy} onChange={e=>pending(e.target.value,editing)} slotProps={{inputLabel:{shrink:true},htmlInput:{maxLength:4000}}}/>
  <Stack direction="row" gap={1}><Button onClick={commit} disabled={disabled||busy||!text.trim()||(editing===null&&values.length>=50)}>{editing===null?'Agregar observación':'Aceptar edición'}</Button>{editing!==null&&<Button onClick={()=>pending('',null)}>Cancelar edición</Button>}</Stack>
  <Box component="ul" aria-label="Apartados de observaciones" sx={{pl:3,m:0}}>{values.map((value,i)=><Box component="li" key={i} sx={{mb:'5px'}}><Stack direction="row" alignItems="flex-start"><Typography variant="body2" sx={{flex:1,minWidth:0,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{value}</Typography><Stack direction="row" sx={{ml:1,flexShrink:0}}><IconButton size="small" aria-label={`Eliminar observación ${i+1}`} disabled={disabled||editing!==null} onClick={()=>onChange(values.filter((_,n)=>n!==i))}><DeleteOutlineIcon fontSize="small"/></IconButton><IconButton size="small" aria-label={`Editar observación ${i+1}`} disabled={disabled||busy} onClick={()=>pending(value,i)}><EditOutlinedIcon fontSize="small"/></IconButton></Stack></Stack></Box>)}</Box>
 </Stack>;
}
