import { Box, Typography } from '@mui/material';
import { activityDatesLabel, activityLabel, ParteActividad } from '@/lib/parteDiario';
export default function ActivityOptionLabel({activity,programmedId,programmedIds}:{activity:ParteActividad;programmedId:number|null;programmedIds?:number[]}){
 return <Box sx={{display:'flex',alignItems:'center',width:'100%',gap:2}}><Typography component="span" sx={{flex:1,minWidth:0,whiteSpace:'normal',fontWeight:activity.id===programmedId||programmedIds?.includes(activity.id)?700:400}}>{activityLabel(activity.nombre)}</Typography><Typography component="span" variant="caption" sx={{ml:'auto',textAlign:'right',maxWidth:180,whiteSpace:'normal',flexShrink:0}}>{activityDatesLabel(activity.fechas)}</Typography></Box>;
}
