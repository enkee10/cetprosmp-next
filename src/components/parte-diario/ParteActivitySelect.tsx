'use client';
import { useState } from 'react';
import { Box, Button, ButtonBase, MenuItem, Popover, Stack, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { selectedParteActivityLabel, ParteActividad, ParteDiarioRow } from '@/lib/parteDiario';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import ActivityOptionLabel from './ActivityOptionLabel';
import { parteThreeLines } from './parteFieldStyles';

export default function ParteActivitySelect({row,fecha,actividades,onChange,disabled,reportRecordId,label='Actividad / sesión',error:invalid=false,id}:{row:ParteDiarioRow;fecha:string;actividades:ParteActividad[];onChange:(activity:ParteActividad)=>void;disabled?:boolean;reportRecordId?:number;label?:string;error?:boolean;id?:string}) {
 const [anchor,setAnchor]=useState<HTMLElement|null>(null),[selected,setSelected]=useState<number|null>(row.actividadId),[editing,setEditing]=useState(false),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const chosen=actividades.find(a=>a.id===selected);
 const open=(element:HTMLElement)=>{setSelected(row.actividadId);setEditing(false);setError('');setAnchor(element);};
 const save=async()=>{if(!chosen)return;const nombre=editing?name.trim():chosen.nombre;if(!nombre){setError('Escribe el nombre de la actividad.');return;}setBusy(true);setError('');try{
  if(editing&&nombre!==chosen.nombre)await httpsCallable(functions,'renameParteActividad')({...row,fecha,reportRecordId,actividadId:chosen.id,nombre,nombreAnterior:chosen.nombre});
  onChange({...chosen,nombre,numeroSesion:chosen.numeroSesion??actividades.findIndex(activity=>activity.id===chosen.id)+1});setAnchor(null);
 }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la actividad.');}finally{setBusy(false);}};
 return <>
  <ButtonBase id={id} role="combobox" aria-label={label} aria-invalid={invalid||undefined} aria-expanded={!!anchor} aria-controls={anchor?'parte-activity-options':undefined} disabled={disabled} onClick={e=>open(e.currentTarget)} sx={{width:'100%',minHeight:44,px:1,py:1,border:'1px solid',borderColor:invalid?'error.main':'divider',color:invalid?'error.main':undefined,borderRadius:1,textAlign:'left',justifyContent:'space-between',gap:1}}><Typography variant="body2" sx={{...parteThreeLines,flex:1}}>{selectedParteActivityLabel(row,actividades)||'Seleccionar actividad'}</Typography><ExpandMoreIcon fontSize="small"/></ButtonBase>
  <Popover open={!!anchor} anchorEl={anchor} onClose={()=>{if(!busy)setAnchor(null);}} anchorOrigin={{vertical:'bottom',horizontal:'left'}} slotProps={{paper:{sx:{width:560,maxWidth:'calc(100vw - 24px)',maxHeight:'70dvh'}}}}>
   {error&&<AutoDismissAlert severity="error" sx={{m:1}}>{error}</AutoDismissAlert>}
   <Box id="parte-activity-options" role="listbox" aria-label="Actividades disponibles" sx={{maxHeight:'calc(70dvh - 80px)',overflow:'auto'}}>
    {actividades.map((a,index)=><MenuItem key={a.id} role="option" aria-selected={selected===a.id} selected={selected===a.id} disabled={busy} tabIndex={0} onClick={()=>{if(editing&&selected===a.id)return;setSelected(a.id);setEditing(false);}} onDoubleClick={()=>{if(selected===a.id){setName(a.nombre||'');setEditing(true);}}} onKeyDown={e=>{if(e.key==='Enter'&&!editing){setSelected(a.id);e.preventDefault();}if(e.key==='F2'&&selected===a.id){setName(a.nombre||'');setEditing(true);e.preventDefault();}}} sx={{whiteSpace:'normal'}}>
     {editing&&selected===a.id?<TextField autoFocus multiline fullWidth label="Nombre de actividad" value={name} disabled={busy} onChange={e=>setName(e.target.value)} onClick={e=>e.stopPropagation()} onDoubleClick={e=>e.stopPropagation()} onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape')setEditing(false);}} slotProps={{htmlInput:{maxLength:2000}}}/>:<ActivityOptionLabel number={a.numeroSesion??index+1} activity={a} programmedId={row.actividadProgramadaId} programmedIds={row.actividadesDelDia?.map(a=>a.id)}/>}
    </MenuItem>)}
   </Box>
   <Stack direction="row" justifyContent="flex-end" gap={1} sx={{p:1,borderTop:'1px solid',borderColor:'divider'}}><Button variant="contained" disabled={busy||!chosen} onClick={()=>void save()}>{busy?'Aceptando…':'Aceptar'}</Button><Button disabled={busy} onClick={()=>{setEditing(false);setSelected(row.actividadId);setAnchor(null);}}>Cancelar</Button></Stack>
  </Popover>
 </>;
}
