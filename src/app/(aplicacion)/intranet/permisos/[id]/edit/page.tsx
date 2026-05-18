import { PermisoForm } from '@/components/intranet/permisos/PermisoForm';

export default function EditPermisoPage({ params }: { params: { id: string } }) {
  return <PermisoForm permisoId={params.id} />;
}
