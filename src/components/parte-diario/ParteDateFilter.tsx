'use client';
import { useState } from 'react';
import { Box, ButtonBase, IconButton, Popover, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { parteDateLabel } from '@/lib/parteDiario';
export default function ParteDateFilter({fecha,filtered,onChange}:{fecha:string;filtered:boolean;onChange:(date:string|null)=>void}){
 const [anchor,setAnchor]=useState<HTMLElement|null>(null),[month,setMonth]=useState(fecha.slice(0,7));
 const first=new Date(month+'-01T12:00:00Z'),offset=(first.getUTCDay()+6)%7,last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 const move=(delta:number)=>setMonth(new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+delta,1,12)).toISOString().slice(0,7));
 return <Stack direction="row" alignItems="center" sx={{flexShrink:0}}><ButtonBase aria-label="Seleccionar fecha del parte diario" aria-haspopup="dialog" onClick={e=>{setMonth(fecha.slice(0,7));setAnchor(e.currentTarget);}} sx={{gap:0.5,px:0.5}}><Typography component="p" variant="h6" sx={{whiteSpace:'nowrap'}}>{parteDateLabel(fecha)}</Typography><ExpandMoreIcon/></ButtonBase>{filtered&&<IconButton aria-label="Quitar filtro de fecha" onClick={()=>onChange(null)}><CloseIcon/></IconButton>}
  <Popover open={!!anchor} anchorEl={anchor} onClose={()=>setAnchor(null)} anchorOrigin={{vertical:'bottom',horizontal:'left'}}><Box role="dialog" aria-label="Calendario del parte diario" sx={{width:320,p:1.5}}><Stack direction="row" alignItems="center" justifyContent="space-between"><IconButton aria-label="Mes anterior" onClick={()=>move(-1)}><ChevronLeftIcon/></IconButton><Typography fontWeight={700}>{new Intl.DateTimeFormat('es-PE',{month:'long',year:'numeric',timeZone:'UTC'}).format(first)}</Typography><IconButton aria-label="Mes siguiente" onClick={()=>move(1)}><ChevronRightIcon/></IconButton></Stack><Box sx={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:0.5}}>{['L','M','M','J','V','S','D'].map((label,i)=><Typography key={'h'+i} align="center" variant="caption">{label}</Typography>)}{Array.from({length:offset},(_,i)=><Box key={'blank'+i}/>)}{Array.from({length:last},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0');return <ButtonBase key={date} aria-label={`Seleccionar ${date}`} aria-pressed={date===fecha} onClick={()=>{onChange(date);setAnchor(null);}} sx={{height:36,borderRadius:'50%',bgcolor:date===fecha?'primary.main':'transparent',color:date===fecha?'white':'inherit'}}>{i+1}</ButtonBase>;})}</Box></Box></Popover>
 </Stack>;
}
