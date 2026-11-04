'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Box, Button, CircularProgress, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import AutoDismissAlert from '@/components/intranet/AutoDismissAlert';
import { contentChildren, contentSubtreeIds, moveContentBranch, type ContentDropPosition, type IndicatorContentItem, type IndicatorContentMove } from '@/lib/indicatorContents';

type Pending = { kind: 'add' } | { kind: 'remove'; ids: number[] } | { kind: 'reorder' };

export default function IndicadorContenidoList({ items, canEdit, disabled, header, renderText, onAdd, onRemove, onMove }: {
  items: IndicatorContentItem[];
  canEdit: boolean;
  disabled: boolean;
  header: ReactNode;
  renderText: (item: IndicatorContentItem, addButton: ReactNode, busy: boolean) => ReactNode;
  onAdd: (data: { texto: string; contenidoPadreId: number | null; despuesDeId?: number }) => Promise<void>;
  onRemove: (id: number, includeDescendants: boolean) => Promise<void>;
  onMove: (move: IndicatorContentMove) => Promise<void>;
}) {
  const [editorAnchor, setEditorAnchor] = useState<number | null>();
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: number | null; position: ContentDropPosition } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const anchorRef = useRef<number | null | undefined>(undefined);
  const draftRef = useRef('');
  const busyRef = useRef(false);
  const draggedId = useRef<number | null>(null);
  const children = useMemo(() => contentChildren(items), [items]);
  const enabled = canEdit && !disabled && !pending;
  const editorParent = items.find(item => item.id === editorAnchor)?.contenidoPadreId ?? null;

  useEffect(() => { if (editorAnchor !== undefined) inputRef.current?.focus(); }, [editorAnchor]);

  const updateDraft = (value: string) => { draftRef.current = value; setDraft(value); };
  const closeEditor = () => { anchorRef.current = undefined; setEditorAnchor(undefined); updateDraft(''); };
  const run = async (operation: Pending, action: () => Promise<void>) => {
    if (!canEdit || disabled || busyRef.current) return false;
    busyRef.current = true;
    setPending(operation);
    try { await action(); setError(null); return true; }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.'); return false; }
    finally { busyRef.current = false; setPending(null); }
  };
  const submit = async (asChild = false) => {
    if (busyRef.current || anchorRef.current === undefined) return false;
    const texto = draftRef.current.trim();
    if (!texto) { closeEditor(); return true; }
    const anchorId = anchorRef.current;
    const anchor = items.find(item => item.id === anchorId);
    if (anchorId != null && !anchor) { setError('El contenido ya no existe. Actualiza la vista.'); return false; }
    const contenidoPadreId = asChild ? anchorId : anchor?.contenidoPadreId ?? null;
    const saved = await run({ kind: 'add' }, () => onAdd({ texto, contenidoPadreId,
      ...(!asChild && anchorId != null ? { despuesDeId: anchorId } : {}) }));
    if (saved) closeEditor();
    return saved;
  };
  const openEditor = async (anchorId: number | null) => {
    if (!enabled || busyRef.current) return;
    if (anchorRef.current === anchorId) { inputRef.current?.focus(); return; }
    if (anchorRef.current !== undefined && !(await submit())) return;
    anchorRef.current = anchorId;
    setEditorAnchor(anchorId);
    setError(null);
  };
  const addButton = (anchorId: number | null) => canEdit ? <IconButton
    size="small" disabled={!enabled}
    aria-label={anchorId == null ? 'Agregar contenido' : 'Agregar contenido debajo'}
    title={anchorId == null ? 'Agregar contenido' : 'Agregar contenido debajo'}
    onMouseDown={event => { event.preventDefault(); event.stopPropagation(); }}
    onClick={event => { event.stopPropagation(); void openEditor(anchorId); }}
    onDoubleClick={event => event.stopPropagation()}
    sx={{ width: 20, height: 20, p: 0, ml: 'auto', flexShrink: 0, verticalAlign: 'top', bgcolor: 'action.hover',
      '&:hover': { bgcolor: 'action.selected' } }}
  ><AddIcon sx={{ fontSize: 18 }} /></IconButton> : null;
  const editor = (anchorId: number | null) => editorAnchor === anchorId ? <Box
    data-content-editor-after={anchorId ?? 'root'} data-content-editor-parent={editorParent ?? 'root'} sx={{ my: 0.5 }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) void submit(); }}
  >
    <TextField inputRef={inputRef} fullWidth multiline minRows={2} maxRows={6} size="small"
      label={editorParent == null ? 'Nuevos contenidos (uno por línea)' : 'Nuevos subcontenidos (uno por línea)'}
      value={draft} disabled={!canEdit || disabled}
      slotProps={{ htmlInput: { maxLength: 50000 }, input: { readOnly: Boolean(pending) } }}
      onChange={event => { if (!busyRef.current) updateDraft(event.target.value); }}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') { if (!busyRef.current) { event.preventDefault(); closeEditor(); } }
      }}
      sx={{ '& .MuiInputBase-root': { fontSize: '0.875rem', lineHeight: 1.25 } }}
    />
    <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ mt: 0.65 }}
      onMouseDown={event => { event.preventDefault(); event.stopPropagation(); }}
      onClick={event => event.stopPropagation()}
      onDoubleClick={event => event.stopPropagation()}
    >
      {pending?.kind === 'add' && <CircularProgress size={16} aria-label="Guardando contenidos" sx={{ mr: 0.5 }} />}
      {anchorId != null && <Button size="small" startIcon={<SubdirectoryArrowRightIcon />} title="Guardar como subcontenido"
        disabled={!enabled} onClick={() => void submit(true)} sx={{ textTransform: 'none' }}>Subcontenido</Button>}
      <IconButton size="small" color="success" aria-label="Guardar cambios" title="Guardar cambios" disabled={!enabled} onClick={() => void submit()}><CheckIcon fontSize="small" /></IconButton>
      <IconButton size="small" color="error" aria-label="Cancelar cambios" title="Cancelar cambios" disabled={!enabled} onClick={closeEditor}><CloseIcon fontSize="small" /></IconButton>
    </Stack>
  </Box> : null;
  const remove = async (item: IndicatorContentItem) => {
    const ids = contentSubtreeIds(items, item.id);
    if (ids.length > 1 && !window.confirm(`Se eliminará este contenido y sus ${ids.length - 1} subcontenidos. ¿Deseas continuar?`)) return;
    const closeAfterRemoval = anchorRef.current != null && ids.includes(anchorRef.current);
    const removed = await run({ kind: 'remove', ids }, () => onRemove(item.id, ids.length > 1));
    if (removed && closeAfterRemoval) closeEditor();
  };
  const endDrag = () => { draggedId.current = null; setDraggingId(null); setDropTarget(null); };
  const canDrop = (move: IndicatorContentMove) => enabled && moveContentBranch(items, move).length > 0;
  const dropPosition = (event: DragEvent<HTMLElement>): ContentDropPosition => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offset = (event.clientY - rect.top) / rect.height;
    return offset < 0.25 ? 'before' : offset > 0.75 ? 'after' : 'inside';
  };
  const dragProps = (targetId: number | null) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (draggedId.current == null) return;
      event.stopPropagation();
      const position = targetId == null ? 'inside' : dropPosition(event);
      if (!canDrop({ itemId: draggedId.current, targetId, position })) { event.dataTransfer.dropEffect = 'none'; setDropTarget(null); return; }
      event.preventDefault(); event.dataTransfer.dropEffect = 'move';
      setDropTarget({ id: targetId, position });
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      if (draggedId.current == null) return;
      event.stopPropagation();
      const move: IndicatorContentMove = { itemId: draggedId.current, targetId, position: targetId == null ? 'inside' : dropPosition(event) };
      if (canDrop(move)) { event.preventDefault(); void run({ kind: 'reorder' }, () => onMove(move)); }
      endDrag();
    },
  });
  const renderItems = (parentId: number | null): ReactNode => (children.get(parentId) ?? []).map(item => {
    const removing = pending?.kind === 'remove' && pending.ids.includes(item.id);
    return <Box component="li" key={item.id} data-content-id={item.id} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      <Stack direction="row" alignItems="flex-start" spacing={0.25} aria-busy={removing || undefined}
        {...dragProps(item.id)}
        data-content-drop-position={dropTarget?.id === item.id ? dropTarget.position : undefined}
        sx={{ minWidth: 0, position: 'relative', pt: 0, pb: 0.25,
          ...(dropTarget?.id === item.id && dropTarget.position === 'inside' ? { bgcolor: 'action.hover', outline: '1px dashed', outlineColor: 'primary.main', borderRadius: 0.5 } : {}),
          '&::after': dropTarget?.id === item.id && dropTarget.position !== 'inside' ? { content: '""', position: 'absolute', left: 0, right: 0, height: 2,
            top: dropTarget.position === 'before' ? 0 : undefined, bottom: dropTarget.position === 'after' ? 0 : undefined, bgcolor: 'primary.main', pointerEvents: 'none' } : undefined }}
      >
        <Box component="span" draggable={enabled} title="Arrastrar contenido"
          onDragStart={event => {
            event.stopPropagation();
            if (!enabled) { event.preventDefault(); return; }
            draggedId.current = item.id;
            setDraggingId(item.id);
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', `indicator-content:${item.id}`);
          }}
          onDragEnd={event => { event.stopPropagation(); endDrag(); }}
          sx={{ display: 'inline-flex', flexShrink: 0, color: enabled ? 'text.secondary' : 'action.disabled', cursor: enabled ? 'grab' : 'default', opacity: removing ? 0.35 : 1 }}
        ><DragIndicatorIcon sx={{ fontSize: 18 }} /></Box>
        <Box inert={removing || undefined} sx={{ flex: 1, minWidth: 0, opacity: removing ? 0.35 : 1 }}>
          {renderText(item, addButton(item.id), !enabled)}
        </Box>
        {canEdit && <IconButton size="small" title="Quitar contenido" aria-label="Quitar contenido" disabled={!enabled}
          onMouseDown={event => { event.preventDefault(); event.stopPropagation(); }}
          onClick={() => void remove(item)} sx={{ p: 0.25, ml: '2px', flexShrink: 0, bgcolor: 'action.hover',
            '&:hover': { bgcolor: 'action.selected' } }}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>}
        {removing && <CircularProgress size={18} aria-label="Eliminando contenido" sx={{ position: 'absolute', left: '50%', top: '50%', mt: '-9px', ml: '-9px' }} />}
      </Stack>
      {(children.get(item.id)?.length ?? 0) > 0 && <Box sx={{ ml: '8px' }} data-content-children={item.id}>
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>{renderItems(item.id)}</Box>
      </Box>}
      {editor(item.id)}
    </Box>;
  });

  return <>
    {header}
    <Box onClick={event => event.stopPropagation()} sx={{ mt: '6px' }}>
      <Stack direction="row" alignItems="center" spacing={0.25} sx={{ mb: '6px', '& > .MuiIconButton-root': { ml: '10px' } }}>
        <Typography variant="caption" color="text.secondary">Contenidos</Typography>
        {addButton(null)}
        {pending?.kind === 'reorder' && <CircularProgress size={14} aria-label="Moviendo contenidos" />}
      </Stack>
      {error && <AutoDismissAlert severity="error">{error}</AutoDismissAlert>}
      {editor(null)}
      {items.length ? <Box component="ul" aria-label="Lista de contenidos" sx={{ m: 0, ml: '-5px', p: 0, listStyle: 'none' }}>{renderItems(null)}</Box>
        : editorAnchor !== null && <Typography variant="body2" color="text.secondary">Sin contenidos.</Typography>}
      {draggingId != null && <Box data-content-root-drop="" {...dragProps(null)}
        sx={{ mt: '6px', p: 0.5, border: '1px dashed', borderColor: 'primary.main', borderRadius: 0.5,
          bgcolor: dropTarget?.id === null ? 'action.hover' : undefined }}>
        <Typography variant="caption" color="text.secondary">Soltar aquí como contenido principal</Typography>
      </Box>}
    </Box>
  </>;
}
