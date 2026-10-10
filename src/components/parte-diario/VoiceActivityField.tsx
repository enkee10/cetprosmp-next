'use client';
import { useCallback, useRef } from 'react';
import { Stack, TextField, TextFieldProps } from '@mui/material';
import VoiceObservation from './VoiceObservation';
import {activityLabel} from '@/lib/parteDiario';
type Props = { value: string; onChange: (value: string) => void; onVoiceText?: (value: string) => void; onBlur?: () => void; onBusyChange: (busy: boolean) => void; disabled: boolean; fieldProps?: TextFieldProps };
export default function VoiceActivityField({ value,onChange,onVoiceText,onBlur,onBusyChange,disabled,fieldProps }: Props){
 const latest=useRef({value,onChange,onVoiceText});latest.current={value,onChange,onVoiceText};
 const append=useCallback((text:string)=>{const current=latest.current,next=[current.value.trim(),text.trim()].filter(Boolean).join('\n');if(next.length>500)throw new Error('La actividad admite hasta 500 caracteres. Reduce el texto o graba un apartado más corto.');current.onChange(next);current.onVoiceText?.(next);},[]);
 return <Stack gap={0.5}><TextField {...fieldProps} multiline value={activityLabel(value)} disabled={disabled} onChange={e=>onChange(e.target.value)} onBlur={onBlur} slotProps={{...fieldProps?.slotProps,htmlInput:{maxLength:500,...fieldProps?.slotProps?.htmlInput}}}/><VoiceObservation subject="actividad" onText={append} onBusyChange={onBusyChange} disabled={disabled}/></Stack>;
}
