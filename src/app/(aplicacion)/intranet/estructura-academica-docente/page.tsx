import EstructuraAcademicaMasterDetail from '@/components/intranet/academico/EstructuraAcademicaMasterDetail';

export default function EstructuraAcademicaDocentePage() {
  return (
    <EstructuraAcademicaMasterDetail
      callableName="listEstructuraAcademicaDocente"
      title="Estructura Academica"
      readOnly
      showSearch={false}
      errorMessage="No se pudo cargar la estructura academica del docente."
    />
  );
}
