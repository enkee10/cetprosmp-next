'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  FormHelperText,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import CodeIcon from '@mui/icons-material/Code';
import LinkIcon from '@mui/icons-material/Link';
import ImageIcon from '@mui/icons-material/Image';
import TitleIcon from '@mui/icons-material/Title';
import TableChartIcon from '@mui/icons-material/TableChart';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { mergeAttributes } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import { getAuth } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { app, storage } from '@/lib/firebase';

interface PostTiptapRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

type EditorMode = 'visual' | 'html';
type ImageAlign = 'left' | 'center' | 'right';
type ContextMenuPosition = { mouseX: number; mouseY: number } | null;

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => {
          const align = String(attributes.align || 'center') as ImageAlign;
          const marginStyle =
            align === 'left'
              ? 'float:left;margin:0 16px 12px 0;'
              : align === 'right'
                ? 'float:right;margin:0 0 12px 16px;'
                : 'display:block;margin-left:auto;margin-right:auto;';

          return {
            'data-align': align,
            style: marginStyle,
          };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },
});

export default function PostTiptapRichTextEditor({
  value,
  onChange,
  disabled = false,
  error = false,
  helperText,
}: PostTiptapRichTextEditorProps) {
  const [mode, setMode] = useState<EditorMode>('visual');
  const [htmlDraft, setHtmlDraft] = useState(value || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [tableMenuAnchorEl, setTableMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [imageContextMenuPosition, setImageContextMenuPosition] = useState<ContextMenuPosition>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      ResizableImage.configure({
        allowBase64: false,
        resize: {
          enabled: true,
          directions: ['bottom-right'],
          minWidth: 80,
          alwaysPreserveAspectRatio: true,
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: 'Escribe el contenido del post...',
      }),
    ],
    content: value || '<p></p>',
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: activeEditor }) => {
      const html = activeEditor.getHTML();
      setHtmlDraft(html);
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const nextValue = value || '<p></p>';
    if (nextValue !== editor.getHTML()) {
      editor.commands.setContent(nextValue, { emitUpdate: false });
      setHtmlDraft(value || '');
    }
  }, [editor, value]);

  const applyHtmlDraft = useCallback(() => {
    if (!editor) return;
    editor.commands.setContent(htmlDraft || '<p></p>', { emitUpdate: true });
  }, [editor, htmlDraft]);

  const setLink = useCallback(() => {
    if (!editor || disabled) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL del enlace', previousUrl || 'https://');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  }, [disabled, editor]);

  const openImagePicker = useCallback(() => {
    if (!editor || disabled) return;
    imageInputRef.current?.click();
  }, [disabled, editor]);

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    setUploadError(null);
    setIsUploadingImage(true);

    try {
      const currentUser = getAuth(app).currentUser;
      if (!currentUser) {
        setUploadError('Debes iniciar sesion para subir imagenes.');
        return;
      }

      const tokenResult = await currentUser.getIdTokenResult(true);
      const level = Number(tokenResult.claims.level ?? 0);
      if (!Number.isFinite(level) || level < 400) {
        setUploadError('Tu cuenta necesita nivel 400 o superior para subir imagenes.');
        return;
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
      const storageRef = ref(storage, `post/${Date.now()}_${safeName}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      const maxEditorWidth = Math.max(240, editor.view.dom.clientWidth - 48);
      editor
        .chain()
        .focus()
        .setImage({ src: downloadUrl, width: Math.min(720, maxEditorWidth) })
        .updateAttributes('image', { align: 'center' })
        .run();
    } catch (error: unknown) {
      console.error('Error uploading editor image:', error);
      setUploadError((error as { message?: string } | null)?.message || 'No se pudo subir la imagen.');
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  };

  const closeTableMenu = () => setTableMenuAnchorEl(null);

  const runTableAction = (action: () => void) => {
    action();
    closeTableMenu();
  };

  const setSelectedImageAlign = (align: ImageAlign) => {
    editor?.chain().focus().updateAttributes('image', { align }).run();
    setImageContextMenuPosition(null);
  };

  const handleEditorContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!editor || disabled) return;

    const target = event.target as HTMLElement | null;
    const image = target?.closest('img');
    if (!image || !editor.view.dom.contains(image)) {
      setImageContextMenuPosition(null);
      return;
    }

    event.preventDefault();
    const imagePosition = editor.view.posAtDOM(image, 0);
    editor.chain().focus().setNodeSelection(imagePosition).run();
    setImageContextMenuPosition({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
    });
  };

  return (
    <Box>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFileChange}
      />
      <Box
        sx={{
          border: '1px solid',
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: disabled ? 'action.disabledBackground' : 'background.paper',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            p: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <ToggleButtonGroup
            value={mode}
            exclusive
            size="small"
            onChange={(_, nextMode: EditorMode | null) => {
              if (nextMode) setMode(nextMode);
            }}
          >
            <ToggleButton value="visual">Visual</ToggleButton>
            <ToggleButton value="html">HTML</ToggleButton>
          </ToggleButtonGroup>

          <ButtonGroup size="small" variant="outlined" disabled={disabled || mode !== 'visual'}>
            <Tooltip title="Negrita">
              <Button
                color={editor?.isActive('bold') ? 'primary' : 'inherit'}
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                <FormatBoldIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Cursiva">
              <Button
                color={editor?.isActive('italic') ? 'primary' : 'inherit'}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                <FormatItalicIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Subrayado">
              <Button
                color={editor?.isActive('underline') ? 'primary' : 'inherit'}
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
              >
                <FormatUnderlinedIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Titulo">
              <Button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
                <TitleIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Lista">
              <Button
                color={editor?.isActive('bulletList') ? 'primary' : 'inherit'}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
              >
                <FormatListBulletedIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Lista numerada">
              <Button
                color={editor?.isActive('orderedList') ? 'primary' : 'inherit'}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              >
                <FormatListNumberedIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Cita">
              <Button
                color={editor?.isActive('blockquote') ? 'primary' : 'inherit'}
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              >
                <FormatQuoteIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Codigo">
              <Button
                color={editor?.isActive('codeBlock') ? 'primary' : 'inherit'}
                onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              >
                <CodeIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Enlace">
              <Button onClick={setLink}>
                <LinkIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip title="Imagen">
              <Button onClick={openImagePicker} disabled={isUploadingImage}>
                {isUploadingImage ? <CircularProgress size={18} /> : <ImageIcon fontSize="small" />}
              </Button>
            </Tooltip>
          </ButtonGroup>

          <Tooltip title="Opciones de tabla">
            <span>
              <Button
                size="small"
                variant="outlined"
                disabled={disabled || mode !== 'visual'}
                startIcon={<TableChartIcon fontSize="small" />}
                endIcon={<ArrowDropDownIcon fontSize="small" />}
                onClick={(event) => setTableMenuAnchorEl(event.currentTarget)}
              >
                Tabla
              </Button>
            </span>
          </Tooltip>

          <Menu
            anchorEl={tableMenuAnchorEl}
            open={Boolean(tableMenuAnchorEl)}
            disableScrollLock
            onClose={closeTableMenu}
          >
            <MenuItem
              onClick={() =>
                runTableAction(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())
              }
            >
              <ListItemIcon>
                <TableChartIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Insertar tabla</ListItemText>
            </MenuItem>
            <MenuItem
              disabled={!editor?.isActive('table')}
              onClick={() => runTableAction(() => editor?.chain().focus().addRowAfter().run())}
            >
              <ListItemIcon>
                <TableRowsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Agregar fila</ListItemText>
              <AddIcon fontSize="small" />
            </MenuItem>
            <MenuItem
              disabled={!editor?.isActive('table')}
              onClick={() => runTableAction(() => editor?.chain().focus().addColumnAfter().run())}
            >
              <ListItemIcon>
                <ViewColumnIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Agregar columna</ListItemText>
              <AddIcon fontSize="small" />
            </MenuItem>
            <MenuItem
              disabled={!editor?.isActive('table')}
              onClick={() => runTableAction(() => editor?.chain().focus().deleteRow().run())}
            >
              <ListItemIcon>
                <TableRowsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Eliminar fila</ListItemText>
              <DeleteIcon fontSize="small" />
            </MenuItem>
            <MenuItem
              disabled={!editor?.isActive('table')}
              onClick={() => runTableAction(() => editor?.chain().focus().deleteColumn().run())}
            >
              <ListItemIcon>
                <ViewColumnIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Eliminar columna</ListItemText>
              <DeleteIcon fontSize="small" />
            </MenuItem>
            <MenuItem
              disabled={!editor?.isActive('table')}
              onClick={() => runTableAction(() => editor?.chain().focus().deleteTable().run())}
            >
              <ListItemIcon>
                <TableChartIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Eliminar tabla</ListItemText>
              <DeleteIcon fontSize="small" />
            </MenuItem>
          </Menu>
        </Box>

        {mode === 'visual' ? (
          <Box
            onContextMenu={handleEditorContextMenu}
            sx={{
              minHeight: 260,
              p: 2,
              '& .ProseMirror': {
                minHeight: 230,
                outline: 'none',
                lineHeight: 1.65,
              },
              '& .ProseMirror p': { my: 1 },
              '& .ProseMirror img': {
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 0.5,
              },
              '& .ProseMirror img.ProseMirror-selectednode': {
                outline: '2px solid',
                outlineColor: 'primary.main',
              },
              '& .ProseMirror [data-resize-container][data-node="image"]': {
                maxWidth: '100%',
              },
              '& .ProseMirror [data-resize-container][data-node="image"].ProseMirror-selectednode img': {
                outline: '2px solid',
                outlineColor: 'primary.main',
              },
              '& .ProseMirror [data-resize-container][data-node="image"][data-resize-state="true"]': {
                userSelect: 'none',
              },
              '& .ProseMirror [data-resize-handle]': {
                display: 'none',
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                border: '2px solid',
                borderColor: 'background.paper',
                boxShadow: 2,
                cursor: 'nwse-resize',
                transform: 'translate(50%, 50%)',
              },
              '& .ProseMirror [data-resize-container][data-node="image"]:has(.ProseMirror-selectednode) [data-resize-handle]': {
                display: 'block',
              },
              '& .ProseMirror [data-resize-container][data-node="image"].ProseMirror-selectednode [data-resize-handle]': {
                display: 'block',
              },
              '& .ProseMirror [data-resize-handle="bottom-right"]': {
                cursor: 'nwse-resize',
                transform: 'translate(50%, 50%)',
              },
              '& .ProseMirror table': {
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
                width: '100%',
                my: 2,
                overflow: 'hidden',
              },
              '& .ProseMirror td, & .ProseMirror th': {
                border: '1px solid',
                borderColor: 'divider',
                boxSizing: 'border-box',
                minWidth: '1em',
                padding: '8px 10px',
                position: 'relative',
                verticalAlign: 'top',
              },
              '& .ProseMirror th': {
                bgcolor: 'grey.100',
                fontWeight: 700,
              },
              '& .ProseMirror .selectedCell:after': {
                bgcolor: 'rgba(25, 118, 210, 0.16)',
                content: '""',
                inset: 0,
                pointerEvents: 'none',
                position: 'absolute',
                zIndex: 2,
              },
              '& .ProseMirror .column-resize-handle': {
                bgcolor: 'primary.main',
                bottom: '-2px',
                pointerEvents: 'none',
                position: 'absolute',
                right: '-2px',
                top: 0,
                width: 4,
              },
              '& .ProseMirror blockquote': {
                borderLeft: '4px solid',
                borderColor: 'divider',
                pl: 2,
                ml: 0,
                color: 'text.secondary',
              },
              '& .ProseMirror pre': {
                bgcolor: 'grey.100',
                borderRadius: 1,
                p: 1.5,
                overflowX: 'auto',
              },
            }}
          >
            <EditorContent editor={editor} />
            <Menu
              open={Boolean(imageContextMenuPosition)}
              onClose={() => setImageContextMenuPosition(null)}
              anchorReference="anchorPosition"
              anchorPosition={
                imageContextMenuPosition
                  ? {
                    top: imageContextMenuPosition.mouseY,
                    left: imageContextMenuPosition.mouseX,
                  }
                  : undefined
              }
              disableScrollLock
            >
              <MenuItem onClick={() => setSelectedImageAlign('right')}>
                <ListItemIcon>
                  <FormatAlignRightIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Flotar a la derecha</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => setSelectedImageAlign('left')}>
                <ListItemIcon>
                  <FormatAlignLeftIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Flotar a la izquierda</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        ) : null}

        {mode === 'html' ? (
          <Box sx={{ p: 1.5 }}>
            <TextField
              value={htmlDraft}
              onChange={(event) => setHtmlDraft(event.target.value)}
              onBlur={applyHtmlDraft}
              minRows={11}
              multiline
              fullWidth
              disabled={disabled}
              inputProps={{ spellCheck: false }}
            />
          </Box>
        ) : null}
      </Box>
      {uploadError ? (
        <FormHelperText error sx={{ mx: 1.75 }}>
          {uploadError}
        </FormHelperText>
      ) : null}
      {helperText ? (
        <FormHelperText error={error} sx={{ mx: 1.75 }}>
          {helperText}
        </FormHelperText>
      ) : null}
    </Box>
  );
}
