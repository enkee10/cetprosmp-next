'use client';

import { useEffect, useRef, useState } from 'react';
import type { DragEvent, FocusEvent, ReactNode } from 'react';
import { Box, IconButton, List, ListItemButton, Paper, Popper, Stack, TextField, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';

export interface SesionListItem { id: number; orden: number; texto: string; materialId?: number | null }

export default function SesionItemList({ kind, items, options, canEdit, disabled, visible = true, renderText, renderHeader, onAdd, onRemove, onReorder }: {
  kind: 'contenido' | 'material';
  items: SesionListItem[];
  options: SesionListItem[];
  canEdit: boolean;
  disabled: boolean;
  visible?: boolean;
  renderText: (item: SesionListItem) => ReactNode;
  renderHeader?: (editorActions: ReactNode | null) => ReactNode;
  onAdd: (data: { texto?: string; materialId?: number }) => Promise<void>;
  onRemove: (id: number) => Promise<void>;
  onReorder: (items: Array<{ id: number; orden: number }>) => Promise<void>;
}) {
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropTarget, setDropTarget] = useState<{ id: number; after: boolean } | null>(null);
  const draggedId = useRef<number | null>(null);
  const busyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const contentActionsRef = useRef<HTMLDivElement | null>(null);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const draftRef = useRef('');
  const focusAfterSave = useRef(false);
  const enabled = canEdit && !busy && !disabled;
  const isResource = kind === 'material';
  const singularLabel = isResource ? 'recurso' : 'contenido';
  const sectionLabel = isResource ? 'Recursos' : 'Contenidos';
  const parseText = (value: string) => value.split(isResource ? /[\r\n,;]+/ : /\r?\n/).map(line => line.trim()).filter(Boolean);
  const resourceFragment = isResource ? texto.split(/[\r\n,;]/).pop()?.trim() ?? '' : '';
  const suggestions = resourceFragment ? options.filter(item => item.texto.toLocaleLowerCase('es').includes(resourceFragment.toLocaleLowerCase('es'))).slice(0, 8) : [];

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
  const updateText = (value: string) => { draftRef.current = value; setTexto(value); };
  const submit = (value: string | SesionListItem = draftRef.current, restoreFocus = true) => {
    const rawText = typeof value === 'string' ? value.trim() : value.texto;
    const text = parseText(rawText).join('\n');
    if (!text) { updateText(''); return; }
    const source = kind === 'material'
      ? (typeof value === 'string' ? options.find(item => item.texto.trim().toLocaleLowerCase('es') === text.toLocaleLowerCase('es')) : value)
      : undefined;
    void run(async () => {
      focusAfterSave.current = restoreFocus;
      await onAdd(source ? { materialId: source.id } : { texto: text });
      updateText('');
    });
  };
  const saveContentOnBlur = (event: FocusEvent<HTMLElement>) => {
    if (event.relatedTarget !== inputRef.current && !contentActionsRef.current?.contains(event.relatedTarget as Node | null) && !suggestionsRef.current?.contains(event.relatedTarget as Node | null)) {
      setShowSuggestions(false);
      if (isResource) {
        if (!parseText(draftRef.current).length) updateText('');
      } else submit(draftRef.current, false);
    }
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

  const contentActions = canEdit && parseText(texto).length > 0 ? (
    <Stack ref={contentActionsRef} direction="row" sx={{ flexShrink: 0, '& .MuiIconButton-root': { width: 24, height: 24, p: 0.25 } }}
      onBlur={saveContentOnBlur}
      onMouseDown={event => { event.preventDefault(); event.stopPropagation(); }}
      onClick={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()}
    >
      <IconButton size="small" color="success" title={`Guardar ${sectionLabel.toLocaleLowerCase('es')}`} aria-label={`Guardar ${sectionLabel.toLocaleLowerCase('es')}`} disabled={!enabled} onClick={() => submit()}><CheckIcon fontSize="small" /></IconButton>
      <IconButton size="small" color="error" title={`Cancelar ${sectionLabel.toLocaleLowerCase('es')}`} aria-label={`Cancelar ${sectionLabel.toLocaleLowerCase('es')}`} disabled={!enabled} onClick={() => {
        updateText(''); setError(null); setShowSuggestions(false); inputRef.current?.blur();
      }}><CloseIcon fontSize="small" /></IconButton>
    </Stack>
  ) : null;

  return (
    <>
    {renderHeader?.(visible ? contentActions : null)}
    {visible && <Box onClick={event => event.stopPropagation()}>
      <Typography variant="caption" color="text.secondary">{sectionLabel}</Typography>
      {error && <AutoDismissAlert severity="error">{error}</AutoDismissAlert>}
      {canEdit && <Box sx={{ mt: 0.75, mb: 0.75 }}>
        <TextField ref={inputContainerRef} fullWidth size="small" label={isResource ? 'Buscar o crear recursos' : 'Nuevos contenidos (uno por línea)'} value={texto} inputRef={inputRef} disabled={!enabled}
          multiline minRows={2} maxRows={6} inputProps={{ maxLength: 50000 }}
          onChange={event => { updateText(event.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={saveContentOnBlur}
          sx={{
            '& .MuiInputBase-root': { fontSize: '0.875rem', lineHeight: 1.25 },
            '& .MuiInputBase-multiline': { p: 0 },
            '& .MuiInputBase-inputMultiline': {
              boxSizing: 'border-box', px: '7px', py: '5.65px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'var(--mui-palette-divider, #bdbdbd) transparent',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
            },
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') setShowSuggestions(false);
            if (event.key === 'Enter' && isResource) event.stopPropagation();
            if (!isResource && event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); submit(); }
          }} />
        <Popper open={enabled && isResource && showSuggestions && suggestions.length > 0} anchorEl={inputContainerRef.current} placement="bottom-start" sx={{ zIndex: theme => theme.zIndex.modal + 1 }}>
          <Paper ref={suggestionsRef} sx={{ width: inputContainerRef.current?.clientWidth, maxHeight: 200, overflowY: 'auto' }}
            onMouseDown={event => event.preventDefault()} onBlur={saveContentOnBlur}>
            <List dense disablePadding aria-label="Recursos del catálogo">
              {suggestions.map(item => <ListItemButton key={item.id} onClick={event => {
                event.stopPropagation();
                updateText(draftRef.current.replace(/[^\r\n,;]*$/, () => `${item.texto}\n`));
                setShowSuggestions(false); inputRef.current?.focus();
              }}><Typography variant="body2">{item.texto}</Typography></ListItemButton>)}
            </List>
          </Paper>
        </Popper>
      </Box>}
      {items.length ? (
        <Box component="ul" aria-label={`Lista de ${sectionLabel.toLocaleLowerCase('es')}`} sx={{
          m: 0, pl: 0, listStyle: 'none',
          ...(isResource ? { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 0.5 } : {}),
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
              <Stack direction="row" alignItems={isResource ? 'center' : 'flex-start'} spacing={0.25} sx={{ minWidth: 0 }}>
                {<Box component="span" title={`Arrastrar ${singularLabel}`} draggable={enabled}
                  onDragStart={event => { event.stopPropagation(); draggedId.current = item.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', `${kind}:${item.id}`); }}
                  onDragEnd={event => { event.stopPropagation(); endDrag(); }}
                  sx={{ display: 'inline-flex', alignSelf: isResource ? 'center' : 'flex-start', flexShrink: 0, color: enabled ? 'text.secondary' : 'action.disabled', cursor: enabled ? 'grab' : 'default' }}>
                  <DragIndicatorIcon sx={{ fontSize: 18 }} />
                </Box>}
                <Box sx={{ flex: isResource ? '0 1 auto' : 1, minWidth: 0 }}>{renderText(item)}</Box>
                {canEdit && <IconButton size="small" title={`Quitar ${singularLabel}`} aria-label={`Quitar ${singularLabel}`} disabled={!enabled} onClick={() => void run(() => onRemove(item.id))}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>}
              </Stack>
            </Box>
          ))}
        </Box>
      ) : <Typography variant="body2" color="text.secondary">{isResource ? 'Sin recursos.' : 'Sin contenidos.'}</Typography>}
    </Box>}
    </>
  );
}
