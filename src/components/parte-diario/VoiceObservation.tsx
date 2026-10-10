'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SendIcon from '@mui/icons-material/Send';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';

export default function VoiceObservation({ onText, onBusyChange, disabled, subject = 'observación' }: { onText: (value: string) => void; onBusyChange: (busy: boolean) => void; disabled: boolean; subject?: 'observación' | 'actividad' }) {
  const [phase, setPhase] = useState<'idle' | 'starting' | 'recording' | 'review' | 'sending'>('idle');
  const [clip, setClip] = useState<Blob | null>(null), [url, setUrl] = useState(''), [error, setError] = useState(''), [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null), stream = useRef<MediaStream | null>(null), chunks = useRef<Blob[]>([]), mode = useRef<'cancel' | 'send' | 'review'>('review'), alive = useRef(true);
  const stopTracks = () => { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; };
  useEffect(() => { alive.current = true; return () => { alive.current = false; mode.current = 'cancel'; if (recorder.current?.state === 'recording') recorder.current.stop(); stopTracks(); }; }, []);
  useEffect(() => { onBusyChange(phase !== 'idle'); }, [onBusyChange, phase]);
  useEffect(() => { if (!clip) { setUrl(''); return; } const value = URL.createObjectURL(clip); setUrl(value); return () => URL.revokeObjectURL(value); }, [clip]);
  useEffect(() => {
    if (phase !== 'recording') return;
    const timer = window.setInterval(() => setSeconds(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);
  useEffect(() => { if (phase === 'recording' && seconds >= 90 && recorder.current?.state === 'recording') { mode.current = 'review'; recorder.current.stop(); } }, [phase, seconds]);
  const send = useCallback(async (blob: Blob) => {
    setPhase('sending'); setError('');
    try {
      if (blob.size > 2000000) throw new Error('La grabación es demasiado larga. Graba una observación más corta.');
      const audio = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(blob); });
      const result = await httpsCallable<{ audio: string; mimeType: string }, { texto: string }>(functions, 'transcribeParteDiario')({ audio, mimeType: blob.type });
      if (!alive.current) return;
      onText(result.data.texto); setClip(null); setPhase('idle');
    } catch (err) { if (alive.current) { setError(err instanceof Error ? err.message : 'No se pudo transcribir. Vuelve a enviar la grabación.'); setPhase('review'); } }
  }, [onText]);
  const start = async () => {
    setError(''); setPhase('starting');
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Este navegador no permite grabar audio. Puedes escribir la observación con el teclado.');
      const captured = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { captured.getTracks().forEach(track => track.stop()); return; }
      stream.current = captured;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      const recording = new MediaRecorder(captured, mimeType ? { mimeType } : undefined);
      chunks.current = []; mode.current = 'review'; recorder.current = recording;
      recording.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      recording.onstop = () => {
        stopTracks(); recorder.current = null;
        if (!alive.current) return;
        if (mode.current === 'cancel') { setClip(null); setPhase('idle'); return; }
        const blob = new Blob(chunks.current, { type: recording.mimeType || 'audio/webm' });
        setClip(blob); if (mode.current === 'send') void send(blob); else setPhase('review');
      };
      recording.onerror = () => { mode.current = 'cancel'; stopTracks(); if (alive.current) { setError('No se pudo completar la grabación. Vuelve a grabar.'); setPhase('idle'); } };
      recording.start(); setSeconds(0); setPhase('recording');
    } catch (err) { stopTracks(); if (alive.current) { setError(err instanceof Error ? err.message : 'Permite el acceso al micrófono para grabar.'); setPhase('idle'); } }
  };
  return <Stack gap={1}>
    <Stack direction="row" alignItems="center" gap={1} sx={{ bgcolor: '#edf5f8', borderRadius: 2, p: 0.5 }}>
      <IconButton aria-label={phase === 'idle' ? `Grabar ${subject}` : 'Cancelar grabación'} disabled={disabled || phase === 'sending' || phase === 'starting'} onClick={() => {
        if (phase === 'idle') void start();
        else { mode.current = 'cancel'; if (recorder.current?.state === 'recording') recorder.current.stop(); else { setClip(null); setPhase('idle'); } }
      }}>{phase === 'idle' ? <MicIcon /> : <DeleteOutlineIcon />}</IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {phase === 'review' && url ? <Box component="audio" controls src={url} sx={{ width: '100%', height: 40 }} /> : <Typography variant="body2">{phase === 'recording' ? `Grabando · ${seconds} s` : phase === 'sending' ? 'Convirtiendo voz a texto…' : phase === 'starting' ? 'Abriendo micrófono…' : `Grabar una ${subject}`}</Typography>}
      </Box>
      <IconButton aria-label="Enviar grabación para convertir a texto" disabled={disabled || !['recording', 'review'].includes(phase)} onClick={() => { if (phase === 'recording' && recorder.current?.state === 'recording') { mode.current = 'send'; setPhase('sending'); recorder.current.stop(); } else if (clip) void send(clip); }}>{phase === 'sending' ? <CircularProgress size={22} /> : <SendIcon />}</IconButton>
    </Stack>
    {error && <AutoDismissAlert severity="error" onClose={() => setError('')}>{error}</AutoDismissAlert>}
  </Stack>;
}
