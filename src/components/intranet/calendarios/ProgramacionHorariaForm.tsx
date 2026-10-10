'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import { Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { functions } from '@/lib/firebase';
import { addCalendarDays, CalendarOption, GroupModuleOption } from '@/lib/calendar';
import { formatDateTimeInAppTimeZone } from '@/lib/dateOnly';

interface Props { calendarios: CalendarOption[]; grupoModulos: GroupModuleOption[]; initialCalendarId?: number; date: string; onSaved: () => void; onCancel: () => void }
interface Preview { sesiones: { fechaInicio: string; fechaFin: string; minutos: number }[]; omitidos: { fecha: string; motivo: string }[]; horasProgramadas: number; horasPendientes: number; completa: boolean; huella: string }
export default function ProgramacionHorariaForm({ calendarios, grupoModulos, initialCalendarId, date, onSaved, onCancel }: Props) {
  const [rules, setRules] = useState({ titulo: '', calendarioId: String(initialCalendarId && calendarios.find(row => row.id === initialCalendarId && row.activo !== false)?.id || calendarios.find(row => row.activo !== false)?.id || ''), grupoModuloId: '',
    horasObjetivo: '20', minutosHoraAcademica: '60', horasSesion: '2', fechaInicio: date, fechaFin: addCalendarDays(date, 60),
    diasSemana: [1, 3, 5], horaInicio: '08:00', horaFin: '12:00', excluirFeriados: true, evitarCruces: true });
  const [proposed, setProposed] = useState<Preview | null>(null);
  const [clave, setClave] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (patch: Partial<typeof rules>) => { setRules(previous => ({ ...previous, ...patch })); setProposed(null); setClave(''); setError(''); };
  const payload = () => ({ ...rules, calendarioId: Number(rules.calendarioId), grupoModuloId: rules.grupoModuloId ? Number(rules.grupoModuloId) : null,
    horasObjetivo: Number(rules.horasObjetivo), minutosHoraAcademica: Number(rules.minutosHoraAcademica),
    minutosSesion: Number(rules.horasSesion) * Number(rules.minutosHoraAcademica) });
  const preview = async () => {
    setBusy(true); setError(''); setProposed(null);
    try {
      const result = await httpsCallable<ReturnType<typeof payload>, Preview>(functions, 'previewProgramacionHoraria')(payload());
      setProposed(result.data); setClave(crypto.randomUUID());
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  const save = async () => {
    if (!proposed?.completa) return;
    setBusy(true); setError('');
    try {
      await httpsCallable(functions, 'createProgramacionHoraria')({ ...payload(), clave, huella: proposed.huella });
      onSaved();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  return <Stack spacing={2} component="form" onSubmit={event => { event.preventDefault(); void preview(); }}>
    <Typography variant="body2">Programa una cantidad de horas nuevas, con una sesión por día seleccionado. La última sesión se ajusta para completar exactamente el objetivo.</Typography>
    {error && <AutoDismissAlert severity="error">{error}</AutoDismissAlert>}
    <Box component="fieldset" disabled={busy} sx={{ border: 0, p: 0, m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <TextField label="Título de los eventos" value={rules.titulo} required onChange={event => update({ titulo: event.target.value })} />
      <TextField select label="Calendario" value={rules.calendarioId} required onChange={event => update({ calendarioId: event.target.value })}>
        {calendarios.filter(row => row.activo !== false).map(row => <MenuItem key={row.id} value={row.id}>{row.titulo || `Calendario ${row.id}`}</MenuItem>)}
      </TextField>
      <TextField select label="Grupo-módulo (opcional)" value={rules.grupoModuloId} onChange={event => {
        const selected = grupoModulos.find(row => row.id === Number(event.target.value));
        update({ grupoModuloId: event.target.value, ...(selected?.modulo.horas ? { horasObjetivo: String(selected.modulo.horas) } : {}) });
      }} sx={{ gridColumn: { sm: 'span 2' } }}>
        <MenuItem value="">Evento general</MenuItem>
        {grupoModulos.map(row => <MenuItem key={row.id} value={row.id}>{row.nombre || `${row.grupo.nombreDisplay || `Grupo ${row.grupoId}`} / ${row.modulo.titulo || `Módulo ${row.id}`}`}</MenuItem>)}
      </TextField>
      <TextField type="number" label="Horas a programar" value={rules.horasObjetivo} required slotProps={{ htmlInput: { min: 0.01, max: 10000, step: 'any' } }} onChange={event => update({ horasObjetivo: event.target.value })} />
      <TextField type="number" label="Minutos por hora académica" value={rules.minutosHoraAcademica} required slotProps={{ htmlInput: { min: 1, max: 120, step: 1 } }} onChange={event => update({ minutosHoraAcademica: event.target.value })} helperText="60 = hora reloj; puedes usar 45, 50 u otra duración." />
      <TextField type="number" label="Horas por sesión" value={rules.horasSesion} required slotProps={{ htmlInput: { min: 0.01, step: 'any' } }} onChange={event => update({ horasSesion: event.target.value })} />
      <Box />
      <TextField type="date" label="Desde" value={rules.fechaInicio} required slotProps={{ inputLabel: { shrink: true } }} onChange={event => update({ fechaInicio: event.target.value })} />
      <TextField type="date" label="Hasta" value={rules.fechaFin} required slotProps={{ inputLabel: { shrink: true } }} onChange={event => update({ fechaFin: event.target.value })} />
      <TextField type="time" label="Hora de inicio" value={rules.horaInicio} required slotProps={{ inputLabel: { shrink: true } }} onChange={event => update({ horaInicio: event.target.value })} />
      <TextField type="time" label="Fin de la franja disponible" value={rules.horaFin} required slotProps={{ inputLabel: { shrink: true } }} onChange={event => update({ horaFin: event.target.value })} />
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ gridColumn: { sm: 'span 2' } }}>
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((label, day) => <Chip key={day} label={label} disabled={busy} color={rules.diasSemana.includes(day) ? 'primary' : 'default'}
          onClick={() => update({ diasSemana: rules.diasSemana.includes(day) ? rules.diasSemana.filter(value => value !== day) : [...rules.diasSemana, day] })} />)}
      </Stack>
      <FormControlLabel control={<Checkbox checked={rules.excluirFeriados} onChange={event => update({ excluirFeriados: event.target.checked })} />} label="Excluir feriados de calendarios activos" />
      <FormControlLabel control={<Checkbox checked={rules.evitarCruces} onChange={event => update({ evitarCruces: event.target.checked })} />} label="Evitar cruces del calendario y del grupo" />
    </Box>
    {proposed && <>
      <AutoDismissAlert severity={proposed.completa ? 'success' : 'warning'}>{proposed.sesiones.length} sesiones · {proposed.horasProgramadas.toFixed(2)} horas académicas · {proposed.horasPendientes.toFixed(2)} horas pendientes. {proposed.completa ? 'Puedes guardar la programación.' : 'Amplía el periodo o ajusta los días disponibles.'}</AutoDismissAlert>
      <Box sx={{ maxHeight: 240, overflow: 'auto' }}>
        {proposed.sesiones.map(session => <Typography variant="body2" key={session.fechaInicio} sx={{ py: 0.5 }}>
          {formatDateTimeInAppTimeZone(session.fechaInicio)} → {formatDateTimeInAppTimeZone(session.fechaFin)} · {(session.minutos / Number(rules.minutosHoraAcademica)).toFixed(2)} h
        </Typography>)}
        {proposed.omitidos.map(row => <Typography variant="caption" display="block" key={row.fecha}>{row.fecha}: {row.motivo}</Typography>)}
      </Box>
    </>}
    <Stack direction="row" gap={1} justifyContent="flex-end">
      <Button onClick={onCancel} disabled={busy}>Cancelar</Button>
      <Button type="submit" variant="outlined" disabled={busy}>{busy ? 'Procesando…' : 'Previsualizar'}</Button>
      <Button variant="contained" disabled={busy || !proposed?.completa} onClick={() => void save()}>Guardar programación</Button>
    </Stack>
  </Stack>;
}
