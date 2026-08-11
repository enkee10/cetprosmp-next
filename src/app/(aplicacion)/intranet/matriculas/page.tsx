import { Suspense } from 'react';
import { MatriculasPage } from '@/components/intranet/matriculas/MatriculasClient';

export default function MatriculasRoutePage() {
  return (
    <Suspense fallback={null}>
      <MatriculasPage />
    </Suspense>
  );
}
