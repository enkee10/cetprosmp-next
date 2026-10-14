import { Box, Typography } from '@mui/material';
import { activityDatesLabel, activityLabel, ParteActividad } from '@/lib/parteDiario';
import { parteThreeLines } from './parteFieldStyles';
export default function ActivityOptionLabel({activity,programmedId,programmedIds,number}:{activity:ParteActividad;programmedId:number|null;programmedIds?:number[];number?:number}){
 return <Box sx={{display:'flex',alignItems:'center',width:'100%',gap:2}}><Typography component="span" sx={{...parteThreeLines,flex:1,fontWeight:activity.id===programmedId||programmedIds?.includes(activity.id)?700:400}}>{number === undefined ? '' : `${number}. `}{activityLabel(activity.nombre)}</Typography><Typography component="span" variant="caption" sx={{ml:'auto',textAlign:'right',maxWidth:180,whiteSpace:'normal',flexShrink:0}}>{activityDatesLabel(activity.fechas)}</Typography></Box>;
}
