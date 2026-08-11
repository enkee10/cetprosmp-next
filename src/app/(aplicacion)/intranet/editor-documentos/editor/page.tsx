import { Suspense } from 'react';
import { EditorImagenesPage } from '@/components/intranet/editor-documentos/EditorDocumentosClient';

export default function EditorImagenesRoutePage() {
  return (
    <Suspense fallback={null}>
      <EditorImagenesPage />
    </Suspense>
  );
}
