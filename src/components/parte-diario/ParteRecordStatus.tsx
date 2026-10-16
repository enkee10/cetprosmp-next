'use client';
import { Avatar, Box, Tooltip } from '@mui/material';
import { isParteDraft, isParteSaved, ParteDiarioRow } from '@/lib/parteDiario';

export default function ParteRecordStatus({ row }: { row: ParteDiarioRow }) {
  const draft = isParteDraft(row), saved = isParteSaved(row);
  if (!draft && !saved) return null;
  return <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '4px', ml: '4px', verticalAlign: 'middle' }}>
    <Box component="span" sx={{ fontWeight: 700, color: draft ? '#9a5700' : '#c62828' }}>({draft ? 'Borrador' : 'Guardado'})</Box>
    {row.editor && <Tooltip title={`${draft ? 'Última edición' : 'Guardado por'}: ${row.editor.nombre}`}>
      <Avatar component="span" src={row.editor.avatar || undefined} alt={row.editor.nombre} aria-label={`Coordinador: ${row.editor.nombre}`} sx={{ width: 20, height: 20, fontSize: 11 }}>{row.editor.nombre.charAt(0)}</Avatar>
    </Tooltip>}
  </Box>;
}
