'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { functions } from '@/lib/firebase';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';
import { addCalendarDays, AgendaData, CalendarEvent, CalendarView, countedMinutes, dayEventLayout, dayInLima, dayStart, monthDays, visibleDays } from '@/lib/calendar';
import { formatDateTimeInAppTimeZone } from '@/lib/dateOnly';
import { EventoForm } from './EventoForm';
import ProgramacionHorariaForm from './ProgramacionHorariaForm';

const weekLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const types = ['clase', 'evaluacion', 'feriado', 'reunion', 'actividad', 'otro'];
const number = (value: number) => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 }).format(value);
const dateLabel = (day: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-PE', { ...options, timeZone: 'America/Lima' }).format(new Date(`${day}T12:00:00-05:00`));

export default function CalendarioAgenda() {
  const { can, loading: permissionsLoading } = useIntranetPermissions();
  const [day, setDay] = useState(() => dayInLima(new Date()));
  const [view, setView] = useState<CalendarView>('mes');
  const [data, setData] = useState<AgendaData>({ eventos: [], calendarios: [], grupoModulos: [] });
  const [selectedCalendars, setSelectedCalendars] = useState<number[] | null>(null);
  const [type, setType] = useState('');
  const [groupModule, setGroupModule] = useState('');
  const [query, setQuery] = useState('');
  const [minHours, setMinHours] = useState('');
  const [maxHours, setMaxHours] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [details, setDetails] = useState<CalendarEvent | null>(null);
  const [edit, setEdit] = useState<{ id?: string; date: string } | null>(null);
  const [planning, setPlanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const requestId = useRef(0);
  const timeline = useRef<HTMLDivElement>(null);
  const days = useMemo(() => visibleDays(day, view), [day, view]);
  const range = useMemo(() => view === 'anio' ? { inicio: `${day.slice(0, 4)}-01-01T05:00:00.000Z`, fin: `${Number(day.slice(0, 4)) + 1}-01-01T05:00:00.000Z` }
    : { inicio: new Date(dayStart(days[0])).toISOString(), fin: new Date(dayStart(addCalendarDays(days[days.length - 1], 1))).toISOString() }, [day, days, view]);
  const load = useCallback(async () => {
    if (permissionsLoading || !can('calendario', 'view')) return;
    const current = ++requestId.current;
    setLoading(true); setError('');
    try {
      const result = await httpsCallable<typeof range, AgendaData>(functions, 'getCalendarioAgenda')(range);
      if (current !== requestId.current) return;
      setData(result.data);
      setSelectedCalendars(previous => previous ?? result.data.calendarios.filter(row => row.activo !== false).map(row => row.id));
    } catch (err) { if (current === requestId.current) setError((err as Error).message); }
    finally { if (current === requestId.current) setLoading(false); }
  }, [can, permissionsLoading, range]);
  useEffect(() => { void load(); return () => { requestId.current += 1; }; }, [load]);
  useEffect(() => { if (timeline.current) timeline.current.scrollTop = 7 * 48; }, [view]);
  const calendarMap = useMemo(() => new Map(data.calendarios.map(row => [row.id, row])), [data.calendarios]);
  const events = useMemo(() => data.eventos.filter(event => {
    const duration = (Date.parse(event.fechaFin) - Date.parse(event.fechaInicio)) / (60000 * event.minutosHoraAcademica);
    return selectedCalendars?.includes(event.calendarioId) && (!type || event.tipoEvento === type)
      && (!groupModule || event.grupoModuloIds.includes(Number(groupModule)))
      && (!query || `${event.titulo} ${event.descripcion || ''} ${event.ubicacion || ''}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
      && (!minHours || (!event.todoElDia && duration >= Number(minHours)))
      && (!maxHours || (!event.todoElDia && duration <= Number(maxHours)));
  }).sort((a, b) => Number(b.tipoEvento === 'feriado') - Number(a.tipoEvento === 'feriado')
    || (Date.parse(a.fechaFin) - Date.parse(a.fechaInicio)) - (Date.parse(b.fechaFin) - Date.parse(b.fechaInicio))
    || Date.parse(a.fechaInicio) - Date.parse(b.fechaInicio)), [data.eventos, selectedCalendars, type, groupModule, query, minHours, maxHours]);
  const eventsByDay = useMemo(() => {
    const index = new Map<string, CalendarEvent[]>();
    const start = Date.parse(range.inicio); const end = Date.parse(range.fin);
    for (const event of events) {
      const first = Math.max(start, Date.parse(event.fechaInicio));
      const last = Math.min(end, Date.parse(event.fechaFin));
      if (last <= first) continue;
      for (let date = dayInLima(new Date(first)); dayStart(date) < last; date = addCalendarDays(date, 1)) {
        const rows = index.get(date) || [];
        rows.push(event); index.set(date, rows);
      }
    }
    return index;
  }, [events, range]);
  const totals = useMemo(() => {
    let minutes = 0; let academic = 0; let count = 0;
    const start = Date.parse(range.inicio); const end = Date.parse(range.fin);
    for (const event of events) {
      const value = countedMinutes(event, start, end);
      minutes += value; academic += value / event.minutosHoraAcademica;
      if (Date.parse(event.fechaInicio) < end && Date.parse(event.fechaFin) > start) count += 1;
    }
    return { clock: minutes / 60, academic, count };
  }, [events, range]);
  const eventColor = (event: CalendarEvent) => event.color || calendarMap.get(event.calendarioId)?.color || '#3769a8';
  const move = (direction: number) => {
    if (view === 'dia' || view === 'semana') setDay(addCalendarDays(day, direction * (view === 'semana' ? 7 : 1)));
    else {
      const value = new Date(`${day.slice(0, 7)}-01T12:00:00Z`);
      if (view === 'anio') value.setUTCFullYear(value.getUTCFullYear() + direction);
      else value.setUTCMonth(value.getUTCMonth() + direction);
      setDay(value.toISOString().slice(0, 10));
    }
  };
  const openDay = (value: string) => { setDay(value); setView('dia'); };
  const eventButton = (event: CalendarEvent, compact = false) => <Tooltip key={event.id} title={`${event.titulo} · ${event.todoElDia ? 'Todo el día' : formatDateTimeInAppTimeZone(event.fechaInicio)}`}>
    <Box component="button" type="button" onClick={() => setDetails(event)} sx={{ display: 'block', width: '100%', border: 0, borderRadius: 1,
      bgcolor: eventColor(event), color: 'white', textAlign: 'left', px: 0.75, py: 0.35, cursor: 'pointer', fontSize: compact ? 11 : 12,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: event.estado === 'cancelado' ? 0.5 : 1,
      textDecoration: event.estado === 'cancelado' ? 'line-through' : 'none', '&:focus-visible': { outline: '2px solid #111', outlineOffset: 2 } }}>
      {!event.todoElDia && `${formatDateTimeInAppTimeZone(event.fechaInicio, { hour: '2-digit', minute: '2-digit' })} `}{event.titulo}
    </Box>
  </Tooltip>;
  const miniMonth = (month: string, yearOverview = false) => <Box>
    <Button onClick={() => { setDay(`${month}-01`); setView('mes'); }} fullWidth sx={{ textTransform: 'capitalize', fontWeight: 700 }}>{dateLabel(`${month}-01`, { month: 'long', ...(yearOverview ? {} : { year: 'numeric' }) })}</Button>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 0.25 }}>
      {weekLabels.map(label => <Typography key={label} variant="caption" textAlign="center" color="text.secondary">{label.slice(0, 1)}</Typography>)}
      {monthDays(`${month}-01`).map(value => {
        const matches = eventsByDay.get(value) || [];
        return <Tooltip key={value} title={`${dateLabel(value, { day: 'numeric', month: 'long' })}${matches.length ? ` · ${matches.length} eventos` : ''}`}>
          <Box component="button" type="button" onClick={() => openDay(value)} aria-label={`Ver ${value}`} sx={{ border: 0, borderRadius: '50%',
            height: 30, cursor: 'pointer', fontSize: 12, bgcolor: value === day ? 'primary.main' : 'transparent', color: value === day ? 'white' : value.slice(0, 7) === month ? 'text.primary' : 'text.disabled',
            outline: value === dayInLima(new Date()) ? '1px solid #3769a8' : 'none' }}>
            {Number(value.slice(8))}<Box sx={{ height: 4, display: 'flex', justifyContent: 'center', gap: 0.25 }}>{matches.slice(0, 3).map(event => <Box key={event.id} sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: eventColor(event) }} />)}</Box>
          </Box>
        </Tooltip>;
      })}
    </Box>
  </Box>;
  const saved = () => { setEdit(null); setPlanning(false); setNotice('Eventos guardados.'); void load(); };
  const deleteEvent = async () => {
    if (!details || !window.confirm(`¿Eliminar "${details.titulo}" y todas sus ocurrencias?`)) return;
    setDeleting(true);
    try { await httpsCallable(functions, 'deleteEvento')({ id: details.eventoId }); setDetails(null); setNotice('Evento eliminado.'); void load(); }
    catch (err) { setError((err as Error).message); } finally { setDeleting(false); }
  };
  if (permissionsLoading) return <CircularProgress aria-label="Cargando permisos" />;
  if (!can('calendario', 'view')) return <Alert severity="warning">No tienes permiso para ver Calendario.</Alert>;
  return <Paper sx={{ p: { xs: 1.5, md: 2.5 }, borderRadius: 2 }}>
    <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" mb={2}>
      <Typography variant="h5" fontWeight={700} sx={{ mr: 'auto' }}>Calendario</Typography>
      {can('eventos', 'create') && <Button startIcon={<AddIcon />} variant="contained" onClick={() => setEdit({ date: day })}>Crear evento</Button>}
      {can('calendario', 'create') && can('eventos', 'create') && <Button variant="outlined" onClick={() => setPlanning(true)}>Programar por horas</Button>}
      <IconButton onClick={() => void load()} aria-label="Actualizar calendario" disabled={loading}><RefreshIcon /></IconButton>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {notice && <Alert severity="success" onClose={() => setNotice('')} sx={{ mb: 2 }}>{notice}</Alert>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '220px minmax(0,1fr)' }, gap: 2 }}>
      <Stack spacing={2} sx={{ minWidth: 0 }}>
        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>{miniMonth(day.slice(0, 7))}</Box>
        <Box><Typography fontWeight={700} variant="subtitle2">Mis calendarios</Typography>
          {!data.calendarios.length && !loading && <Typography variant="body2">No hay calendarios registrados.</Typography>}
          {data.calendarios.map(calendar => <FormControlLabel key={calendar.id} sx={{ display: 'flex', m: 0 }}
            control={<Checkbox size="small" checked={!!selectedCalendars?.includes(calendar.id)} sx={{ color: calendar.color || 'primary.main', '&.Mui-checked': { color: calendar.color || 'primary.main' } }}
              onChange={(_, checked) => setSelectedCalendars(previous => checked ? [...(previous || []), calendar.id] : (previous || []).filter(id => id !== calendar.id))} />}
            label={<Typography variant="body2">{calendar.titulo || `Calendario ${calendar.id}`}{calendar.activo === false ? ' (inactivo)' : ''}</Typography>} />)}
        </Box>
        <TextField size="small" label="Buscar eventos" value={query} onChange={event => setQuery(event.target.value)} />
        <TextField size="small" select label="Tipo de evento" value={type} onChange={event => setType(event.target.value)}><MenuItem value="">Todos</MenuItem>{types.map(value => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
        <TextField size="small" select label="Grupo-módulo" value={groupModule} onChange={event => setGroupModule(event.target.value)}>
          <MenuItem value="">Todos</MenuItem>{data.grupoModulos.map(row => <MenuItem key={row.id} value={row.id}>{row.nombre || `${row.grupo.nombreDisplay || `Grupo ${row.grupoId}`} / ${row.modulo.titulo || row.id}`}</MenuItem>)}
        </TextField>
        <Stack direction="row" gap={1}>
          <TextField size="small" type="number" label="Mín. (h)" value={minHours} slotProps={{ htmlInput: { min: 0, step: 'any' } }} onChange={event => setMinHours(event.target.value)} />
          <TextField size="small" type="number" label="Máx. (h)" value={maxHours} slotProps={{ htmlInput: { min: 0, step: 'any' } }} onChange={event => setMaxHours(event.target.value)} />
        </Stack>
        <Typography variant="caption" color="text.secondary">El filtro usa la duración académica de cada sesión. Los feriados, eventos de todo el día y cancelados no suman horas.</Typography>
      </Stack>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap" mb={1.5}>
          <Button variant="outlined" size="small" onClick={() => setDay(dayInLima(new Date()))}>Hoy</Button>
          <IconButton aria-label="Periodo anterior" onClick={() => move(-1)}><ChevronLeftIcon /></IconButton>
          <IconButton aria-label="Periodo siguiente" onClick={() => move(1)}><ChevronRightIcon /></IconButton>
          <Typography fontWeight={700} sx={{ mr: 'auto', textTransform: 'capitalize' }}>{view === 'anio' ? day.slice(0, 4) : view === 'semana' ? `${dateLabel(days[0], { day: 'numeric', month: 'short' })} – ${dateLabel(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}` : dateLabel(day, { ...(view === 'dia' ? { day: 'numeric' } : {}), month: 'long', year: 'numeric' })}</Typography>
          <TextField select size="small" value={view} onChange={event => setView(event.target.value as CalendarView)} slotProps={{ htmlInput: { 'aria-label': 'Vista del calendario' } }}>
            <MenuItem value="anio">Año</MenuItem><MenuItem value="mes">Mes</MenuItem><MenuItem value="semana">Semana</MenuItem><MenuItem value="dia">Día</MenuItem>
          </TextField>
        </Stack>
        <Stack direction="row" gap={1} mb={1.5} flexWrap="wrap">
          <Chip label={`${totals.count} eventos`} size="small" /><Chip label={`${number(totals.clock)} horas reloj`} size="small" /><Chip label={`${number(totals.academic)} horas académicas`} size="small" />
          <Typography variant="caption" alignSelf="center" color="text.secondary">Periodo visible · America/Lima</Typography>
          {loading && <CircularProgress size={18} aria-label="Cargando calendario" />}
        </Stack>
        {view === 'anio' && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', xl: 'repeat(3,1fr)' }, gap: 2 }}>{Array.from({ length: 12 }, (_, index) =>
          <Paper key={index} variant="outlined" sx={{ p: 1 }}>{miniMonth(`${day.slice(0, 4)}-${String(index + 1).padStart(2, '0')}`, true)}</Paper>)}</Box>}
        {view === 'mes' && <Box sx={{ overflowX: 'auto' }}><Box sx={{ minWidth: { xs: 0, sm: 560 }, display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', borderTop: '1px solid', borderLeft: '1px solid', borderColor: 'divider' }}>
          {weekLabels.map(label => <Typography key={label} textAlign="center" variant="caption" sx={{ py: 1, borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>{label}</Typography>)}
          {days.map(value => {
            const daily = eventsByDay.get(value) || [];
            return <Box key={value} sx={{ minHeight: { xs: 92, md: 120 }, p: 0.5, borderRight: '1px solid', borderBottom: '1px solid', borderColor: 'divider', bgcolor: value.slice(0, 7) === day.slice(0, 7) ? 'background.paper' : 'action.hover' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Button size="small" onClick={() => openDay(value)} aria-label={`Ver día ${value}`} sx={{ minWidth: 28, borderRadius: '50%', bgcolor: value === dayInLima(new Date()) ? 'primary.main' : 'transparent', color: value === dayInLima(new Date()) ? 'white' : 'text.primary' }}>{Number(value.slice(8))}</Button>
                {can('eventos', 'create') && <IconButton size="small" sx={{ display: { xs: 'none', sm: 'inline-flex' } }} aria-label={`Crear evento el ${value}`} onClick={() => setEdit({ date: value })}><AddIcon sx={{ fontSize: 15 }} /></IconButton>}
              </Stack>
              <Stack gap={0.35}>{daily.slice(0, 3).map(event => eventButton(event, true))}</Stack>
              {daily.length > 3 && <Button size="small" onClick={() => openDay(value)}>+{daily.length - 3} más</Button>}
            </Box>;
          })}
        </Box></Box>}
        {(view === 'semana' || view === 'dia') && <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: view === 'semana' ? 700 : 280 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: `56px repeat(${days.length},minmax(0,1fr))`, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" textAlign="center" sx={{ p: 1 }}>Día</Typography>
              {days.map(value => <Button key={value} onClick={() => openDay(value)} sx={{ borderLeft: '1px solid', borderColor: 'divider', textTransform: 'none' }}>{dateLabel(value, { weekday: 'short', day: 'numeric' })}</Button>)}
              <Typography variant="caption" sx={{ p: 0.5 }}>Todo el día</Typography>
              {days.map(value => <Stack key={value} gap={0.5} sx={{ p: 0.5, borderLeft: '1px solid', borderColor: 'divider', minHeight: 40 }}>{(eventsByDay.get(value) || []).filter(event => event.todoElDia).map(event => eventButton(event, true))}</Stack>)}
            </Box>
            <Box ref={timeline} sx={{ height: 610, overflowY: 'auto', border: '1px solid', borderTop: 0, borderColor: 'divider' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: `56px repeat(${days.length},minmax(0,1fr))`, height: 1152 }}>
                <Box>{Array.from({ length: 24 }, (_, hour) => <Typography key={hour} variant="caption" textAlign="center" sx={{ display: 'block', height: 48, color: 'text.secondary' }}>{String(hour).padStart(2, '0')}:00</Typography>)}</Box>
                {days.map(value => <Box key={value} sx={{ position: 'relative', borderLeft: '1px solid', borderColor: 'divider', bgcolor: value === dayInLima(new Date()) ? '#f6faff' : 'background.paper', backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 47px, #e6e8ec 47px, #e6e8ec 48px)' }}>
                  {dayEventLayout(eventsByDay.get(value) || [], value).map(row => <Tooltip key={row.event.id} title={`${row.event.titulo} · ${formatDateTimeInAppTimeZone(row.event.fechaInicio)} → ${formatDateTimeInAppTimeZone(row.event.fechaFin)}`}>
                    <Box component="button" type="button" onClick={() => setDetails(row.event)} sx={{ position: 'absolute', top: row.start * 0.8, height: Math.max(18, (row.end - row.start) * 0.8 - 2),
                      left: `calc(${row.column / row.columns * 100}% + 2px)`, width: `calc(${100 / row.columns}% - 4px)`, border: '1px solid white', borderRadius: 1,
                      bgcolor: eventColor(row.event), color: 'white', textAlign: 'left', p: 0.5, cursor: 'pointer', overflow: 'hidden', fontSize: 12,
                      opacity: row.event.estado === 'cancelado' ? 0.5 : 1, textDecoration: row.event.estado === 'cancelado' ? 'line-through' : 'none', '&:focus-visible': { outline: '2px solid #111' } }}>
                      <Box sx={{ fontWeight: 700 }}>{row.event.titulo}</Box><Box sx={{ fontSize: 11 }}>{formatDateTimeInAppTimeZone(row.event.fechaInicio, { hour: '2-digit', minute: '2-digit' })} · {number((row.end - row.start) / row.event.minutosHoraAcademica)} h</Box>
                    </Box>
                  </Tooltip>)}
                </Box>)}
              </Box>
            </Box>
          </Box>
        </Box>}
      </Box>
    </Box>
    <Dialog open={!!details} onClose={() => { if (!deleting) setDetails(null); }} fullWidth maxWidth="sm">
      <DialogTitle>{details?.titulo}</DialogTitle>
      <DialogContent><Stack spacing={1.5}>
        <Typography>{details && (details.todoElDia ? `${dateLabel(dayInLima(details.fechaInicio), { day: 'numeric', month: 'long', year: 'numeric' })} · Todo el día` : `${formatDateTimeInAppTimeZone(details.fechaInicio)} → ${formatDateTimeInAppTimeZone(details.fechaFin)}`)}</Typography>
        <Typography variant="body2">{details && calendarMap.get(details.calendarioId)?.titulo} · {details?.tipoEvento} · {details?.estado}</Typography>
        {details?.ubicacion && <Typography>{details.ubicacion}</Typography>}
        {details?.descripcion && <Typography sx={{ whiteSpace: 'pre-wrap' }}>{details.descripcion}</Typography>}
        {details && <Typography variant="body2">{number(countedMinutes(details, 0, Infinity) / 60)} horas reloj · {number(countedMinutes(details, 0, Infinity) / details.minutosHoraAcademica)} horas académicas ({details.minutosHoraAcademica} minutos/hora)</Typography>}
        {details?.grupoModuloIds.map(id => <Chip key={id} label={data.grupoModulos.find(row => row.id === id)?.nombre || `Grupo-módulo ${id}`} />)}
        {details?.ocurrenciaId && <Alert severity="info">La edición y eliminación se aplican al evento completo y sus recurrencias.</Alert>}
      </Stack></DialogContent>
      <DialogActions>
        {can('eventos', 'delete') && <Button color="error" disabled={deleting} onClick={() => void deleteEvent()}>Eliminar evento</Button>}
        {can('eventos', 'edit') && <Button disabled={deleting} onClick={() => { if (details) setEdit({ id: String(details.eventoId), date: dayInLima(details.fechaInicio) }); setDetails(null); }}>Editar evento</Button>}
        <Button disabled={deleting} onClick={() => setDetails(null)}>Cerrar</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={!!edit} onClose={() => setEdit(null)} fullWidth maxWidth="md"><DialogTitle>{edit?.id ? 'Editar evento' : 'Crear evento'}</DialogTitle><DialogContent>
      {edit && <EventoForm key={`${edit.id || 'new'}:${edit.date}`} asModal eventoId={edit.id} initialDate={edit.date} initialCalendarId={selectedCalendars?.[0]} onSaved={saved} onCancel={() => setEdit(null)} />}
    </DialogContent></Dialog>
    <Dialog open={planning} onClose={() => setPlanning(false)} fullWidth maxWidth="md"><DialogTitle>Programar por horas</DialogTitle><DialogContent>
      {planning && <ProgramacionHorariaForm calendarios={data.calendarios} grupoModulos={data.grupoModulos} initialCalendarId={selectedCalendars?.[0]} date={day} onSaved={saved} onCancel={() => setPlanning(false)} />}
    </DialogContent></Dialog>
  </Paper>;
}
