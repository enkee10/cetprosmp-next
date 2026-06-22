'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, FormHelperText } from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';
import { getAuth } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { app, storage } from '@/lib/firebase';
import { buildPostStorageFilePath } from '@/lib/postStoragePath';

interface PostTinyMceEditorProps {
  value: string;
  onChange: (value: string) => void;
  postSlug?: string | null;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

const TINYMCE_SCRIPT_SRC = '/tinymce/tinymce.min.js';
const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const VIDEO_MAX_BYTES = 80 * 1024 * 1024;

type TinyMceBlobInfo = {
  blob: () => Blob;
  filename: () => string;
};

type TinyMceProgressFn = (percent: number) => void;
type TinyMceFilePickerCallback = (value: string, meta?: Record<string, unknown>) => void;
type TinyMceFilePickerMeta = {
  filetype?: string;
};

type PostStorageTarget = {
  slug?: string | null;
};

type TinyMceImageStyleEditor = {
  dom: {
    select: (selector: string, scope?: Element) => Element[];
    removeClass: (element: Element, className: string) => void;
    addClass: (element: Element, className: string) => void;
  };
  fire?: (name: string) => void;
  getContent: () => string;
  nodeChanged: () => void;
  selection: { getNode: () => Element };
  setDirty?: (state: boolean) => void;
};

const requireUploaderUser = async () => {
  const currentUser = getAuth(app).currentUser;
  if (!currentUser) {
    throw new Error('Debes iniciar sesion para subir imagenes.');
  }

  const tokenResult = await currentUser.getIdTokenResult(true);
  const level = Number(tokenResult.claims.level ?? 0);
  if (!Number.isFinite(level) || level < 400) {
    throw new Error('Tu cuenta necesita nivel 400 o superior para subir imagenes.');
  }

  return currentUser;
};

const uploadPostAsset = async (
  file: Blob,
  fileName: string,
  post: PostStorageTarget,
  progress?: TinyMceProgressFn,
) => {
  const isVideo = file.type.startsWith('video/');
  const maxBytes = isVideo ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
  const maxMb = isVideo ? 80 : 8;

  if (file.size > maxBytes) {
    throw new Error(`El archivo no debe superar ${maxMb} MB.`);
  }

  await requireUploaderUser();
  progress?.(10);

  const storageRef = ref(storage, buildPostStorageFilePath(post, fileName));
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
  });
  progress?.(85);

  const downloadUrl = await getDownloadURL(snapshot.ref);
  progress?.(100);
  return downloadUrl;
};

const getYouTubeEmbedUrl = (url: string) => {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return '';

  try {
    const parsedUrl = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');

    if (hostname === 'youtu.be') {
      const videoId = parsedUrl.pathname.replace('/', '');
      return videoId ? `https://www.youtube.com/embed/${videoId}` : trimmedUrl;
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      const videoId = parsedUrl.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }

    if (hostname === 'youtube.com' && parsedUrl.pathname.startsWith('/embed/')) {
      return parsedUrl.toString();
    }
  } catch {
    return trimmedUrl;
  }

  return trimmedUrl;
};

const getSelectedImage = (editor: { selection: { getNode: () => Element }; dom: { select: (selector: string, scope?: Element) => Element[] } }) => {
  const node = editor.selection.getNode();
  if (node instanceof HTMLImageElement) return node;
  if (node instanceof HTMLElement && node.matches('figure.image')) {
    return editor.dom.select('img', node)[0] as HTMLImageElement | undefined;
  }
  return node instanceof HTMLElement ? (node.closest('figure.image')?.querySelector('img') ?? null) : null;
};

const postEditorContentStyle =
  'html, body { overscroll-behavior: contain; } ' +
  'body { font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.65; } ' +
  'img { max-width: 100%; height: auto; } iframe { max-width: 100%; } ' +
  'table { border-collapse: collapse; max-width: 100%; } td, th { min-width: 24px; } ' +
  'img.post-img-center { display: block; float: none; margin-left: auto; margin-right: auto; } ' +
  'img.post-img-left { float: left; margin-right: 18px; } ' +
  'img.post-img-right { float: right; margin-left: 18px; } ' +
  'img.post-img-margin-none { margin-top: 0; margin-bottom: 0; } ' +
  'img.post-img-margin-sm { margin-top: 8px; margin-bottom: 8px; } ' +
  'img.post-img-margin-md { margin-top: 14px; margin-bottom: 14px; } ' +
  'img.post-img-margin-lg { margin-top: 24px; margin-bottom: 24px; }';

const postEditorTableToolbar =
  'tableprops tablecellprops tablerowprops tabledelete | ' +
  'tableinsertrowbefore tableinsertrowafter tabledeleterow | ' +
  'tableinsertcolbefore tableinsertcolafter tabledeletecol';

const postEditorTableOptions = {
  table_toolbar: postEditorTableToolbar,
  table_sizing_mode: 'fixed',
  table_style_by_css: true,
  table_advtab: true,
  table_cell_advtab: true,
  table_row_advtab: true,
  table_appearance_options: true,
};

const applyImageStyle = (editor: TinyMceImageStyleEditor, className: string) => {
  const image = getSelectedImage(editor);
  if (!image) return null;

  [
    'post-img-center',
    'post-img-left',
    'post-img-right',
    'post-img-margin-none',
    'post-img-margin-sm',
    'post-img-margin-md',
    'post-img-margin-lg',
  ].forEach((name) => editor.dom.removeClass(image, name));

  className.split(' ').forEach((name) => {
    if (name) editor.dom.addClass(image, name);
  });
  editor.setDirty?.(true);
  editor.fire?.('change');
  editor.nodeChanged();
  return editor.getContent();
};

export default function PostTinyMceEditor({
  value,
  onChange,
  postSlug,
  disabled = false,
  error = false,
  helperText,
}: PostTinyMceEditorProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const postStorageTarget = useMemo(
    () => ({
      slug: postSlug,
    }),
    [postSlug],
  );
  const postStorageTargetRef = useRef<PostStorageTarget>(postStorageTarget);
  postStorageTargetRef.current = postStorageTarget;

  const handleImageUpload = useCallback(async (blobInfo: TinyMceBlobInfo, progress: TinyMceProgressFn) => {
    setUploadError(null);

    try {
      return await uploadPostAsset(blobInfo.blob(), blobInfo.filename(), postStorageTargetRef.current, progress);
    } catch (uploadError: unknown) {
      const message = (uploadError as { message?: string } | null)?.message || 'No se pudo subir la imagen.';
      setUploadError(message);
      throw new Error(message);
    }
  }, []);

  const handleFilePicker = useCallback(
    (callback: TinyMceFilePickerCallback, _value: string, meta: TinyMceFilePickerMeta) => {
      if (meta.filetype === 'media') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';

        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;

          setUploadError(null);
          try {
            const downloadUrl = await uploadPostAsset(file, file.name, postStorageTargetRef.current);
            callback(downloadUrl, { source2: '', poster: '' });
          } catch (uploadError: unknown) {
            const message = (uploadError as { message?: string } | null)?.message || 'No se pudo subir el video.';
            setUploadError(message);
          }
        };

        input.click();
        return;
      }

      if (meta.filetype !== 'image') return;

      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        setUploadError(null);
        try {
          const downloadUrl = await uploadPostAsset(file, file.name, postStorageTargetRef.current);
          callback(downloadUrl, { alt: file.name });
        } catch (uploadError: unknown) {
          const message = (uploadError as { message?: string } | null)?.message || 'No se pudo subir la imagen.';
          setUploadError(message);
        }
      };

      input.click();
    },
    [],
  );

  return (
    <Box>
      <Box
        sx={{
          border: '1px solid',
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          '& .tox.tox-tinymce': {
            border: 0,
          },
          '& .tox .tox-edit-area::before': {
            borderColor: error ? 'error.main' : 'primary.main',
          },
        }}
      >
        <Editor
          tinymceScriptSrc={TINYMCE_SCRIPT_SRC}
          licenseKey="gpl"
          value={value || ''}
          disabled={disabled}
          onEditorChange={(content) => onChange(content)}
          init={{
            base_url: '/tinymce',
            suffix: '.min',
            language: 'es',
            language_url: '/tinymce/langs/es.js',
            height: 420,
            min_height: 320,
            menubar: 'file edit view insert format tools table help',
            block_formats:
              'Parrafo=p; Encabezado 1=h1; Encabezado 2=h2; Encabezado 3=h3; Encabezado 4=h4; Preformateado=pre',
            plugins: [
              'accordion',
              'advlist',
              'anchor',
              'autolink',
              'charmap',
              'code',
              'codesample',
              'image',
              'insertdatetime',
              'link',
              'lists',
              'media',
              'preview',
              'quickbars',
              'searchreplace',
              'table',
              'visualblocks',
              'wordcount',
            ],
            toolbar:
              'undo redo | blocks fontfamily fontsize | bold italic underline forecolor backcolor | ' +
              'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' +
              'link image media table tablecellprops tableprops | removeformat code preview wideedit',
            menu: {
              view: {
                title: 'Ver',
                items: 'visualaid visualchars visualblocks | preview wideedit',
              },
            },
            quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
            quickbars_insert_toolbar: 'quickimage quicktable media',
            ...postEditorTableOptions,
            file_picker_types: 'file image media',
            file_picker_callback: handleFilePicker,
            images_upload_handler: handleImageUpload,
            automatic_uploads: true,
            images_reuse_filename: true,
            image_advtab: true,
            image_caption: true,
            image_title: true,
            image_dimensions: true,
            image_uploadtab: true,
            image_class_list: [{ title: 'Sin ajuste', value: '' }],
            media_live_embeds: true,
            media_alt_source: true,
            media_poster: true,
            media_dimensions: true,
            media_url_resolver: (data: { url: string }) =>
              new Promise<{ html?: string; url: string }>((resolve) => {
                const embedUrl = getYouTubeEmbedUrl(data.url);
                if (embedUrl.includes('youtube.com/embed/')) {
                  resolve({
                    url: embedUrl,
                    html: `<iframe src="${embedUrl}" width="560" height="315" allowfullscreen="allowfullscreen"></iframe>`,
                  });
                  return;
                }
                resolve({ url: data.url });
              }),
            object_resizing: 'img,iframe,video',
            paste_data_images: false,
            convert_urls: false,
            extended_valid_elements:
              'iframe[src|width|height|name|align|class|style|frameborder|allow|allowfullscreen|webkitallowfullscreen|mozallowfullscreen|referrerpolicy]',
            branding: false,
            promotion: false,
            browser_spellcheck: true,
            contextmenu: 'link | postimage postmedia posttable | table',
            setup: (editor) => {
              const openWideEditor = () => {
                let wideEditorLatestContent = editor.getContent();

                editor.windowManager.open<{ content: string }>({
                  title: 'Pantalla extendida',
                  size: 'large',
                  body: {
                    type: 'panel',
                    items: [
                      {
                        type: 'customeditor',
                        name: 'content',
                        tag: 'textarea',
                        init: (element) =>
                          new Promise((resolve) => {
                            void editor.editorManager.init({
                              target: element,
                              license_key: 'gpl',
                              base_url: '/tinymce',
                              suffix: '.min',
                              language: 'es',
                              language_url: '/tinymce/langs/es.js',
                              height: '100%',
                              menubar: 'file edit view insert format tools table help',
                              block_formats:
                                'Parrafo=p; Encabezado 1=h1; Encabezado 2=h2; Encabezado 3=h3; Encabezado 4=h4; Preformateado=pre',
                              plugins: [
                                'accordion',
                                'advlist',
                                'anchor',
                                'autolink',
                                'charmap',
                                'code',
                                'codesample',
                                'image',
                                'insertdatetime',
                                'link',
                                'lists',
                                'media',
                                'preview',
                                'quickbars',
                                'searchreplace',
                                'table',
                                'visualblocks',
                                'wordcount',
                              ],
                              toolbar:
                                'undo redo | blocks fontfamily fontsize | bold italic underline forecolor backcolor | ' +
                                'alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | ' +
                                'link image media table tablecellprops tableprops | removeformat code preview',
                              toolbar_mode: 'wrap',
                              quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
                              quickbars_insert_toolbar: 'quickimage quicktable media',
                              ...postEditorTableOptions,
                              file_picker_types: 'file image media',
                              file_picker_callback: handleFilePicker,
                              images_upload_handler: handleImageUpload,
                              automatic_uploads: true,
                              images_reuse_filename: true,
                              image_advtab: true,
                              image_caption: true,
                              image_title: true,
                              image_dimensions: true,
                              image_uploadtab: true,
                              image_class_list: [{ title: 'Sin ajuste', value: '' }],
                              media_live_embeds: true,
                              media_alt_source: true,
                              media_poster: true,
                              media_dimensions: true,
                              media_url_resolver: (data: { url: string }) =>
                                new Promise<{ html?: string; url: string }>((resolve) => {
                                  const embedUrl = getYouTubeEmbedUrl(data.url);
                                  if (embedUrl.includes('youtube.com/embed/')) {
                                    resolve({
                                      url: embedUrl,
                                      html: `<iframe src="${embedUrl}" width="560" height="315" allowfullscreen="allowfullscreen"></iframe>`,
                                    });
                                    return;
                                  }
                                  resolve({ url: data.url });
                                }),
                              object_resizing: 'img,iframe,video',
                              paste_data_images: false,
                              convert_urls: false,
                              extended_valid_elements:
                                'iframe[src|width|height|name|align|class|style|frameborder|allow|allowfullscreen|webkitallowfullscreen|mozallowfullscreen|referrerpolicy]',
                              branding: false,
                              promotion: false,
                              browser_spellcheck: true,
                              contextmenu: 'link | postimage postmedia posttable | table',
                              setup: (wideEditor) => {
                                const rememberWideContent = () => {
                                  wideEditorLatestContent = wideEditor.getContent();
                                };
                                const applyWideImageStyle = (className: string) => {
                                  const nextContent = applyImageStyle(wideEditor, className);
                                  if (nextContent !== null) {
                                    wideEditorLatestContent = nextContent;
                                  }
                                };

                                wideEditor.ui.registry.addMenuItem('postimage', {
                                  text: 'Imagen...',
                                  icon: 'image',
                                  onAction: () => wideEditor.execCommand('mceImage'),
                                  onSetup: (api) => {
                                    const toggle = () => api.setEnabled(wideEditor.selection.isEditable());
                                    wideEditor.on('NodeChange', toggle);
                                    toggle();
                                    return () => wideEditor.off('NodeChange', toggle);
                                  },
                                });

                                wideEditor.ui.registry.addMenuItem('postmedia', {
                                  text: 'Medios...',
                                  icon: 'embed',
                                  onAction: () => wideEditor.execCommand('mceMedia'),
                                  onSetup: (api) => {
                                    const toggle = () => api.setEnabled(wideEditor.selection.isEditable());
                                    wideEditor.on('NodeChange', toggle);
                                    toggle();
                                    return () => wideEditor.off('NodeChange', toggle);
                                  },
                                });

                                wideEditor.ui.registry.addMenuItem('posttable', {
                                  text: 'Tabla...',
                                  icon: 'table',
                                  onAction: () => wideEditor.execCommand('mceInsertTableDialog'),
                                  onSetup: (api) => {
                                    const toggle = () => api.setEnabled(wideEditor.selection.isEditable());
                                    wideEditor.on('NodeChange', toggle);
                                    toggle();
                                    return () => wideEditor.off('NodeChange', toggle);
                                  },
                                });

                                wideEditor.ui.registry.addMenuButton('imagemargins', {
                                  text: 'Imagen',
                                  tooltip: 'Margen y posicion de imagen',
                                  fetch: (callback) => {
                                    callback([
                                      {
                                        type: 'menuitem',
                                        text: 'Centrar sin margen',
                                        onAction: () => applyWideImageStyle('post-img-center post-img-margin-none'),
                                      },
                                      {
                                        type: 'menuitem',
                                        text: 'Centrar con margen',
                                        onAction: () => applyWideImageStyle('post-img-center post-img-margin-md'),
                                      },
                                      {
                                        type: 'menuitem',
                                        text: 'Flotar izquierda',
                                        onAction: () => applyWideImageStyle('post-img-left post-img-margin-md'),
                                      },
                                      {
                                        type: 'menuitem',
                                        text: 'Flotar derecha',
                                        onAction: () => applyWideImageStyle('post-img-right post-img-margin-md'),
                                      },
                                      {
                                        type: 'menuitem',
                                        text: 'Margen grande',
                                        onAction: () => applyWideImageStyle('post-img-center post-img-margin-lg'),
                                      },
                                    ]);
                                  },
                                  onSetup: (api) => {
                                    const toggle = () => api.setEnabled(Boolean(getSelectedImage(wideEditor)));
                                    wideEditor.on('NodeChange', toggle);
                                    toggle();
                                    return () => wideEditor.off('NodeChange', toggle);
                                  },
                                });

                                wideEditor.on('init', () => {
                                  wideEditor.setContent(editor.getContent() || '');
                                  rememberWideContent();
                                  wideEditor.on('Change Input Undo Redo SetContent', rememberWideContent);
                                  resolve({
                                    setValue: (nextValue: string) => {
                                      wideEditor.setContent(nextValue || '');
                                      rememberWideContent();
                                    },
                                    getValue: () => wideEditor.getContent(),
                                    destroy: () => {
                                      wideEditor.off('Change Input Undo Redo SetContent', rememberWideContent);
                                      wideEditor.remove();
                                    },
                                  });
                                });
                              },
                              content_style: postEditorContentStyle,
                            });
                          }),
                      },
                    ],
                  },
                  buttons: [
                    { type: 'cancel', text: 'Cancelar' },
                    { type: 'submit', text: 'Aplicar cambios', primary: true },
                  ],
                  initialData: {
                    content: editor.getContent(),
                  },
                  onSubmit: (api) => {
                    const nextContent = wideEditorLatestContent || String(api.getData().content || '');
                    editor.setContent(nextContent);
                    editor.setDirty(true);
                    editor.fire('change');
                    onChange(nextContent);
                    api.close();
                  },
                });
              };

              editor.ui.registry.addMenuItem('postimage', {
                text: 'Imagen...',
                icon: 'image',
                onAction: () => editor.execCommand('mceImage'),
                onSetup: (api) => {
                  const toggle = () => api.setEnabled(editor.selection.isEditable());
                  editor.on('NodeChange', toggle);
                  toggle();
                  return () => editor.off('NodeChange', toggle);
                },
              });

              editor.ui.registry.addMenuItem('postmedia', {
                text: 'Medios...',
                icon: 'embed',
                onAction: () => editor.execCommand('mceMedia'),
                onSetup: (api) => {
                  const toggle = () => api.setEnabled(editor.selection.isEditable());
                  editor.on('NodeChange', toggle);
                  toggle();
                  return () => editor.off('NodeChange', toggle);
                },
              });

              editor.ui.registry.addMenuItem('posttable', {
                text: 'Tabla...',
                icon: 'table',
                onAction: () => editor.execCommand('mceInsertTableDialog'),
                onSetup: (api) => {
                  const toggle = () => api.setEnabled(editor.selection.isEditable());
                  editor.on('NodeChange', toggle);
                  toggle();
                  return () => editor.off('NodeChange', toggle);
                },
              });

              editor.ui.registry.addButton('wideedit', {
                icon: 'fullscreen',
                tooltip: 'Pantalla extendida',
                onAction: openWideEditor,
                onSetup: (api) => {
                  const toggle = () => api.setEnabled(editor.selection.isEditable());
                  editor.on('NodeChange', toggle);
                  toggle();
                  return () => editor.off('NodeChange', toggle);
                },
              });

              editor.ui.registry.addMenuItem('wideedit', {
                text: 'Pantalla extendida',
                icon: 'fullscreen',
                onAction: openWideEditor,
                onSetup: (api) => {
                  const toggle = () => api.setEnabled(editor.selection.isEditable());
                  editor.on('NodeChange', toggle);
                  toggle();
                  return () => editor.off('NodeChange', toggle);
                },
              });

              editor.ui.registry.addMenuButton('imagemargins', {
                text: 'Imagen',
                tooltip: 'Margen y posicion de imagen',
                fetch: (callback) => {
                  const applyMainImageStyle = (className: string) => {
                    const nextContent = applyImageStyle(editor, className);
                    if (nextContent !== null) {
                      onChange(nextContent);
                    }
                  };

                  callback([
                    {
                      type: 'menuitem',
                      text: 'Centrar sin margen',
                      onAction: () => applyMainImageStyle('post-img-center post-img-margin-none'),
                    },
                    {
                      type: 'menuitem',
                      text: 'Centrar con margen',
                      onAction: () => applyMainImageStyle('post-img-center post-img-margin-md'),
                    },
                    {
                      type: 'menuitem',
                      text: 'Flotar izquierda',
                      onAction: () => applyMainImageStyle('post-img-left post-img-margin-md'),
                    },
                    {
                      type: 'menuitem',
                      text: 'Flotar derecha',
                      onAction: () => applyMainImageStyle('post-img-right post-img-margin-md'),
                    },
                    {
                      type: 'menuitem',
                      text: 'Margen grande',
                      onAction: () => applyMainImageStyle('post-img-center post-img-margin-lg'),
                    },
                  ]);
                },
                onSetup: (api) => {
                  const toggle = () => api.setEnabled(Boolean(getSelectedImage(editor)));
                  editor.on('NodeChange', toggle);
                  toggle();
                  return () => editor.off('NodeChange', toggle);
                },
              });

            },
            content_style: postEditorContentStyle,
          }}
        />
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
