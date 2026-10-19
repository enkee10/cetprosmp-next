'use client';

import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, FormControlLabel, MenuItem, Radio, RadioGroup, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { TimeClock } from '@mui/x-date-pickers/TimeClock';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { esES } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/es';
import Modal1 from '@/components/Modal1';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import { AVANZA_INITIAL_DOWNLOAD, avanzaDateTextToIso, avanzaSplitDateTime, avanzaSplitInputToIso, avanzaTimeTextTo24, type AvanzaMeridiem } from '@/lib/avanzaDownload';
import { APP_TIME_ZONE, formatDateTimeInAppTimeZone } from '@/lib/dateOnly';

dayjs.extend(utc);
dayjs.extend(timezone);

type Props = {
  open: boolean;
  onClose: () => void;
  historyKey: string;
  isCompleteList: boolean;
  onDownload: (desde: string | null) => Promise<{ hasta: string; pendingRows: number; missingRows: number }>;
};

export default function AvanzaDownloadDialog({ open, onClose, historyKey, isCompleteList, onDownload }: Props) {
  const [mode, setMode] = useState('all');
  const [lastDownload, setLastDownload] = useState<string | null>(null);
  const [reference, setReference] = useState(AVANZA_INITIAL_DOWNLOAD);
  const [dateText, setDateText] = useState('12/10/2026');
  const [timeText, setTimeText] = useState('12:00');
  const [meridiem, setMeridiem] = useState<AvanzaMeridiem>('PM');
  const [clockView, setClockView] = useState<'hours' | 'minutes'>('hours');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let stored: string | null = null;
    try { stored = window.localStorage.getItem(historyKey); } catch { /* Restricted browsers can still download. */ }
    if (!stored || !Number.isFinite(Date.parse(stored)) || Date.parse(stored) > Date.now()) stored = null;
    setLastDownload(stored);
    const initial = stored || AVANZA_INITIAL_DOWNLOAD;
    const parts = avanzaSplitDateTime(initial);
    setReference(initial);
    setDateText(parts.date);
    setTimeText(parts.time);
    setMeridiem(parts.meridiem);
    setClockView('hours');
    setMode('since');
    setError(null);
  }, [open, historyKey]);

  const close = () => { if (!busy) onClose(); };
  const download = async () => {
    if (busy) return;
    let desde: string | null = null;
    if (mode === 'since') {
      // Preserve seconds and milliseconds of the reference behind hh:mm.
      desde = avanzaSplitInputToIso(dateText, timeText, meridiem, reference);
      if (!desde) { setError('Selecciona una fecha y hora válidas.'); return; }
      if (Date.parse(desde) > Date.now()) { setError('La fecha y hora no pueden ser futuras.'); return; }
    }
    setBusy(true);
    setError(null);
    try {
      const result = await onDownload(desde);
      // Only a complete, successful management-list export advances the reference.
      if (isCompleteList && mode === 'all' && result.pendingRows === 0 && result.missingRows === 0 && Number.isFinite(Date.parse(result.hasta))) {
        try { window.localStorage.setItem(historyKey, result.hasta); } catch { /* Download remains successful. */ }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la descarga AVANZA.');
    } finally {
      setBusy(false);
    }
  };

  const isoDate = avanzaDateTextToIso(dateText);
  const hour24 = avanzaTimeTextTo24(timeText, meridiem);
  const calendarDate = isoDate ? dayjs.tz(`${isoDate}T12:00:00`, APP_TIME_ZONE) : null;
  const clockDate = dayjs.tz(`${isoDate || avanzaDateTextToIso(avanzaSplitDateTime(reference).date)}T${hour24 || '12:00'}:00`, APP_TIME_ZONE);

  return (
    <Modal1 open={open} onClose={close} title="Descargar Registro AVANZA" maxWidth="md">
      <Stack spacing={2}>
        <AutoDismissAlert message={error} onClose={() => setError(null)} />
        <RadioGroup value={mode} onChange={event => setMode(event.target.value)} aria-label="Matrículas a descargar">
          <FormControlLabel value="all" control={<Radio />} label="Todas las matriculas filtradas por (Grupo-Modulo)" disabled={busy} />
          <FormControlLabel value="since" control={<Radio />} label="Desde una fecha y hora de matrícula" disabled={busy} />
        </RadioGroup>
        {mode === 'since' && <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es" localeText={esES.components.MuiLocalizationProvider.defaultProps.localeText}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 2 }}>
            <Stack spacing={1} sx={{ minWidth: 0 }}>
              <TextField label="Fecha" placeholder="dd/mm/yyyy" value={dateText} onChange={event => {
                const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
                setDateText([digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/'));
              }} disabled={busy} fullWidth slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: 'numeric', maxLength: 10 } }} />
              <Box role="group" aria-label="Calendario de fecha">
                <DateCalendar value={calendarDate} onChange={value => { if (value?.isValid()) setDateText(value.format('DD/MM/YYYY')); }} timezone={APP_TIME_ZONE} maxDate={dayjs().tz(APP_TIME_ZONE)} referenceDate={dayjs(reference).tz(APP_TIME_ZONE)} disabled={busy} views={['year', 'month', 'day']} sx={{ width: '100%', maxWidth: 320, m: 0 }} />
              </Box>
            </Stack>
            <Stack spacing={1} sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1}>
                <TextField label="Hora" placeholder="hh:mm" value={timeText} onChange={event => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
                  setTimeText(digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits);
                }} disabled={busy} fullWidth slotProps={{ inputLabel: { shrink: true }, htmlInput: { inputMode: 'numeric', maxLength: 5 } }} />
                <TextField select label="AM/PM" value={meridiem} onChange={event => setMeridiem(event.target.value as AvanzaMeridiem)} disabled={busy} sx={{ minWidth: 104 }}>
                  <MenuItem value="AM">AM</MenuItem><MenuItem value="PM">PM</MenuItem>
                </TextField>
              </Stack>
              <Box role="group" aria-label="Reloj de hora" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ToggleButtonGroup size="small" exclusive value={clockView} onChange={(_, value) => { if (value) setClockView(value); }} aria-label="Seleccionar horas o minutos" disabled={busy}>
                  <ToggleButton value="hours">Horas</ToggleButton><ToggleButton value="minutes">Minutos</ToggleButton>
                </ToggleButtonGroup>
                <TimeClock value={clockDate} onChange={value => {
                  if (!value?.isValid()) return;
                  setTimeText(value.format('hh:mm'));
                  setMeridiem(value.hour() >= 12 ? 'PM' : 'AM');
                }} timezone={APP_TIME_ZONE} ampm view={clockView} views={['hours', 'minutes']} onViewChange={view => { if (view === 'hours' || view === 'minutes') setClockView(view); }} disabled={busy} sx={{ width: '100%' }} />
              </Box>
            </Stack>
          </Box>
        </LocalizationProvider>}
        {lastDownload && <Typography variant="body2" color="text.secondary">Última descarga completa: {formatDateTimeInAppTimeZone(lastDownload, { dateStyle: 'short', timeStyle: 'short' })}</Typography>}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={close} disabled={busy}>Cancelar</Button>
          <Button variant="contained" onClick={() => void download()} disabled={busy} startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}>{busy ? 'Descargando…' : 'Descargar'}</Button>
        </Stack>
      </Stack>
    </Modal1>
  );
}
