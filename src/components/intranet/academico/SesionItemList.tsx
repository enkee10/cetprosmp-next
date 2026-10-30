'use client';

import { useEffect, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { Autocomplete, Box, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';

export interface SesionListItem { id: number; orden: number; texto: string; materialId?: number | null }

export default function SesionItemList({ kind, items, options, canEdit, disabled, renderText, onAdd, onRemove, onReorder }: {
  kind: 'contenido' | 'material';
  items: SesionListItem[];
  options: SesionListItem[];
  canEdit: boolean;
  disabled: boolean;
  renderText: (item: SesionListItem) => ReactNode;
  onAdd: (data: { texto?: string; materialId?: number }) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  onReorder: (items: Array<{ id: number; orden: number }>) => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: number; after: boolean } | null>(null);
  const draggedId = useRef<number | null>(null);
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusAfterSave = useRef(false);
  const enabled = canEdit && !busy && !disabled;
  const isResource = kind === 'material';
  const singularLabel = isResource ? 'recurso' : 'contenido';
  const sectionLabel = isResource ? 'Recursos' : 'Contenidos';

  useEffect(() => {
    if (!busy && focusAfterSave.current) {
      focusAfterSave.current = false;
      inputRef.current?.focus();
    }
  }, [busy]);

  const run = async (action: () => Promise<void>) => {
    if (!canEdit || disabled || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try { await action(); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const submit = (value: string | SesionListItem = texto) => {
    const text = typeof value === 'string' ? value.trim() : value.texto;
    if (!text) return;
    const source = kind === 'material'
      ? (typeof value === 'string' ? options.find(item => item.texto.trim().toLocaleLowerCase('es') === text.toLocaleLowerCase('es')) : value)
      : undefined;
    void run(async () => {
      focusAfterSave.current = true;
      await onAdd(source ? { materialId: source.id } : { texto: text });
      setTexto('');
    });
  };
  const endDrag = () => { draggedId.current = null; setDropTarget(null); };
  const afterPointer = (event: DragEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return isResource
      ? event.clientX >= rect.left + rect.width / 2
      : event.clientY >= rect.top + rect.height / 2;
  };
  const dragOver = (event: DragEvent<HTMLElement>, id: number) => {
    if (!enabled || draggedId.current == null) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setDropTarget({ id, after: afterPointer(event) });
  };
  const drop = (event: DragEvent<HTMLElement>, targetId: number) => {
    const sourceId = draggedId.current;
    if (!enabled || sourceId == null) return;
    event.preventDefault();
    event.stopPropagation();
    const after = afterPointer(event);
    endDrag();
    if (sourceId === targetId) return;
    const reordered = items.filter(item => item.id !== sourceId);
    const source = items.find(item => item.id === sourceId);
    const index = reordered.findIndex(item => item.id === targetId);
    if (!source || index < 0) return;
    reordered.splice(index + Number(after), 0, source);
    if (reordered.every((item, i) => item.id === items[i].id)) return;
    void run(() => onReorder(reordered.map((item, i) => ({ id: item.id, orden: i + 1 }))));
  };

  return (
    <Box onClick={event => event.stopPropagation()}>
      <Typography variant="caption" color="text.secondary">{sectionLabel}</Typography>
      {error && <AutoDismissAlert severity="error">{error}</AutoDismissAlert>}
      {items.length ? (
        <Box component="ul" aria-label={`Lista de ${sectionLabel.toLocaleLowerCase('es')}`} sx={{
          m: 0, pl: 0, listStyle: 'none',
          ...(isResource ? { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 } : {}),
        }}>
          {items.map(item => (
            <Box component="li" key={item.id} data-item-id={item.id}
              onDragOver={event => dragOver(event, item.id)}
              onDragLeave={() => setDropTarget(current => current?.id === item.id ? null : current)}
              onDrop={event => drop(event, item.id)}
              sx={{
                position: 'relative',
                py: isResource ? 0 : 0.25,
                ...(isResource ? {
                  display: 'inline-flex', maxWidth: '100%', border: 1, borderColor: 'divider', borderRadius: 1,
                  bgcolor: 'background.paper', px: 0.25,
                } : {}),
                '&::after': dropTarget?.id === item.id ? {
                  content: '""', position: 'absolute',
                  ...(isResource ? {
                    top: 0, bottom: 0, width: 2,
                    left: dropTarget.after ? undefined : -3, right: dropTarget.after ? -3 : undefined,
                  } : {
                    left: 0, right: 0, height: 2,
                    top: dropTarget.after ? undefined : 0, bottom: dropTarget.after ? 0 : undefined,
                  }),
                  bgcolor: 'primary.main', pointerEvents: 'none',
                } : undefined,
              }}>
              <Stack direction="row" alignItems="center" spacing={0.25} sx={{ minWidth: 0 }}>
                {<Box component="span" title={`Arrastrar ${singularLabel}`} draggable={enabled}
                  onDragStart={event => { event.stopPropagation(); draggedId.current = item.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', `${kind}:${item.id}`); }}
                  onDragEnd={event => { event.stopPropagation(); endDrag(); }}
                  sx={{ display: 'inline-flex', color: enabled ? 'text.secondary' : 'action.disabled', cursor: enabled ? 'grab' : 'default' }}>
                  <DragIndicatorIcon sx={{ fontSize: 18 }} />
                </Box>}
                <Box sx={{ flex: isResource ? '0 1 auto' : 1, minWidth: 0 }}>{renderText(item)}</Box>
                {canEdit && <IconButton size="small" title={`Quitar ${singularLabel}`} aria-label={`Quitar ${singularLabel}`} disabled={!enabled} onClick={() => void run(() => onRemove(item.id))}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>}
              </Stack>
            </Box>
          ))}
        </Box>
      ) : <Typography variant="body2" color="text.secondary">{isResource ? 'Sin recursos.' : 'Sin contenidos.'}</Typography>}
      {canEdit && <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75 }}>
        {kind === 'contenido' ? (
          <TextField fullWidth size="small" label="Nuevos contenidos (uno por línea)" value={texto} inputRef={inputRef} disabled={!enabled}
            multiline minRows={2} maxRows={6} inputProps={{ maxLength: 50000 }} onChange={event => setTexto(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); submit(); }
            }} />
        ) : (
          <Autocomplete freeSolo fullWidth size="small" options={options} value={null} inputValue={texto} disabled={!enabled}
            getOptionLabel={item => typeof item === 'string' ? item : item.texto}
            isOptionEqualToValue={(a, b) => typeof b !== 'string' && a.id === b.id}
            onInputChange={(_, value, reason) => { if (reason === 'input' || reason === 'clear') setTexto(value); }}
            onChange={(_, value) => { if (value) submit(value); }}
            onKeyDown={event => { if (event.key === 'Enter') event.stopPropagation(); }}
            noOptionsText="Escribe un recurso nuevo"
            renderInput={params => <TextField {...params} label="Buscar o crear recurso" inputRef={inputRef} inputProps={{ ...params.inputProps, maxLength: 10000 }} />} />
        )}
        <IconButton size="small" title={`Agregar ${singularLabel}`} aria-label={`Agregar ${singularLabel}`} disabled={!enabled || !texto.trim()} onClick={() => submit()}><AddIcon fontSize="small" /></IconButton>
      </Stack>}
    </Box>
  );
}
