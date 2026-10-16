'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { TextField, TextFieldProps } from '@mui/material';

export type ParteDraftTextHandle = { read: () => string; replace: (value: string) => void; flush: () => void };
type Props = Omit<TextFieldProps, 'value' | 'defaultValue' | 'onChange'> & {
  value: string;
  active?: boolean;
  onPersist: (value: string) => void;
  onFilledChange?: (filled: boolean) => void;
};

/** Keep keystrokes inside this field; publish only at an editing boundary. */
const ParteDraftTextField = forwardRef<ParteDraftTextHandle, Props>(function ParteDraftTextField({ value, active = true, onPersist, onFilledChange, onBlur, ...props }, ref) {
  const [text, setText] = useState(value);
  const current = useRef(value), published = useRef(value), external = useRef(value);
  const callbacks = useRef({ onPersist, onFilledChange });
  callbacks.current = { onPersist, onFilledChange };
  const flush = () => {
    if (current.current === published.current) return;
    published.current = current.current;
    callbacks.current.onPersist(current.current);
  };
  const latestFlush = useRef(flush); latestFlush.current = flush;
  const replace = (next: string) => {
    const wasFilled = !!current.current.trim();
    current.current = next; setText(next);
    if (wasFilled !== !!next.trim()) callbacks.current.onFilledChange?.(!!next.trim());
  };
  useImperativeHandle(ref, () => ({ read: () => current.current, replace, flush }));
  useEffect(() => {
    if (value === external.current) return;
    const wasFilled=!!current.current.trim();
    external.current = value; published.current = value; current.current = value; setText(value);
    if(wasFilled!==!!value.trim())callbacks.current.onFilledChange?.(!!value.trim());
  }, [value]);
  useEffect(() => { if (!active) latestFlush.current(); }, [active]);
  useEffect(() => {
    const flushPending=()=>latestFlush.current();
    window.addEventListener('pagehide',flushPending);
    return ()=>{window.removeEventListener('pagehide',flushPending);flushPending();};
  }, []);
  return <TextField {...props} value={text} onChange={event => replace(event.target.value)} onBlur={event => { flush(); onBlur?.(event); }} />;
});
export default ParteDraftTextField;
