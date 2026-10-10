'use client';
import { Box, TableCell } from '@mui/material';
import { activityLabel, unitLabel, ParteDiarioRow } from '@/lib/parteDiario';

export default function ParteDiarioRowFields({ row }: { row: ParteDiarioRow }) {
  const scheduled = !row.recordId && row.tipoUnidad === 'curricular' ? row.actividadesDelDia : undefined;
  const units = scheduled?.length ? [...new Set(scheduled.map(a => a.unidad))].join(' / ') : row.unidad;
  const activities = scheduled?.length ? scheduled.map(a => a.nombre).join('\n') : row.actividad;
  const textCell = (text: string) => <TableCell><Box sx={{ px: '6px', py: '6px', whiteSpace: 'pre-wrap' }}>{text}</Box></TableCell>;
  return <>
    {textCell(unitLabel(units))}
    {textCell(activityLabel(activities))}
    <TableCell align="center">{row.matriculados}</TableCell>
    <TableCell align="center">{row.asistentes ?? ''}</TableCell>
    {textCell(row.silabo)}{textCell(row.fichaActividad)}{textCell(row.instrumentoEvaluacion)}{textCell(row.material)}{textCell(row.tareas)}
    <TableCell sx={{ position: 'relative', overflow: 'hidden', p: 0 }}>{row.firma && <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden' }}><Box component="img" src={row.firma} alt={'Firma de '+row.docenteNombreCompleto} sx={{ display: 'block', position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: '100%', height: 'auto' }} /></Box>}</TableCell>
    <TableCell>{row.observaciones.length ? <Box component="ul" sx={{ pl: '20px', pr: '6px', '& li': { mb: '5px', whiteSpace: 'pre-wrap' } }}>{row.observaciones.map((text, i) => <li key={i}>{text}</li>)}</Box> : <Box sx={{ minHeight: 50 }} />}</TableCell>
  </>;
}
