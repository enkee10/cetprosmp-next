import { https } from 'firebase-functions/v1';
import { dataConnect } from './dataConnectCore.js';

export const MATRICULA_MODULO_DELETE_CONTEXT_QUERY = `
  query MatriculaModuloDeleteContext($grupoModuloId: Int!, $moduloEstudianteId: Int!) {
    grupoModulo(id: $grupoModuloId) { id grupoId moduloId }
    moduloEstudiante(id: $moduloEstudianteId) {
      id matriculaId grupoId moduloId grupoModuloId
      matricula { userId }
    }
  }
`;

// SQL mutation fields share a snapshot: exclude the link being removed when
// checking whether the parent has any other module inscriptions.
const emptyMatricula = 'matricula: { id: { eq: $matriculaId }, modulosEstudiantes_on_matricula: { count: { eq: 0 }, exist: { id: { ne: $moduloEstudianteId } } } }';
export const DELETE_MATRICULA_MODULO_MUTATION = `
  mutation DeleteMatriculaModulo($moduloEstudianteId: Int!, $matriculaId: Int!, $grupoModuloId: Int!, $grupoId: Int!, $moduloId: Int!) @transaction {
    query @redact {
      moduloEstudiante(id: $moduloEstudianteId)
        @check(expr: "this != null && this.matriculaId == vars.matriculaId && (this.grupoModuloId == vars.grupoModuloId || (this.grupoModuloId == null && this.grupoId == vars.grupoId && this.moduloId == vars.moduloId))", message: "La inscripción ya no pertenece al grupo-módulo seleccionado.") {
        id matriculaId grupoModuloId grupoId moduloId
      }
    }
    efsrtPppNota_deleteMany(where: { efsrtPppEstudiante: { moduloEstudianteId: { eq: $moduloEstudianteId } } })
    efsrtPppEstudiante_deleteMany(where: { moduloEstudianteId: { eq: $moduloEstudianteId } })
    certificadoTituloDocumento_deleteMany(where: { moduloEstudianteId: { eq: $moduloEstudianteId } })
    certificado_deleteMany(where: { moduloEstudianteId: { eq: $moduloEstudianteId } })
    moduloEstudiante_delete(id: $moduloEstudianteId)
    aspectoEvaluacionEstudiante_deleteMany(where: { evaluacionEstudiante: { ${emptyMatricula} } })
    evaluacionEstudiante_deleteMany(where: { ${emptyMatricula} })
    indicadorCapacidadEstudiante_deleteMany(where: { ${emptyMatricula} })
    capacidadTerminalEstudiante_deleteMany(where: { ${emptyMatricula} })
    unidadDidacticaEstudiante_deleteMany(where: { ${emptyMatricula} })
    asistencia_deleteMany(where: { ${emptyMatricula} })
    matriculaCambioModulo_deleteMany(where: { ${emptyMatricula} })
    matriculaGrupo_deleteMany(where: { ${emptyMatricula} })
    matriculaUser_deleteMany(where: { ${emptyMatricula} })
    matricula_deleteMany(where: { id: { eq: $matriculaId }, modulosEstudiantes_on_matricula: { count: { eq: 0 }, exist: { id: { ne: $moduloEstudianteId } } } })
  }
`;

export async function deleteMatriculaModulo(grupoModuloId: number, moduloEstudianteId: number, expectedMatriculaId?: number) {
  const response = await dataConnect.executeGraphql<{
    grupoModulo: { id: number; grupoId: number; moduloId: number } | null;
    moduloEstudiante: { id: number; matriculaId: number; grupoId: number | null; moduloId: number; grupoModuloId: number | null; matricula: { userId: number | null } } | null;
  }, { grupoModuloId: number; moduloEstudianteId: number }>(
    MATRICULA_MODULO_DELETE_CONTEXT_QUERY, { variables: { grupoModuloId, moduloEstudianteId } },
  );
  const group = response.data.grupoModulo;
  const link = response.data.moduloEstudiante;
  if (!group || !link) throw new https.HttpsError('not-found', 'No se encontró la inscripción solicitada.');
  const belongs = link.grupoModuloId
    ? link.grupoModuloId === grupoModuloId
    : link.grupoId === group.grupoId && link.moduloId === group.moduloId;
  if (!belongs || (expectedMatriculaId !== undefined && link.matriculaId !== expectedMatriculaId)) {
    throw new https.HttpsError('failed-precondition', 'La inscripción no pertenece a esta matrícula y grupo-módulo.');
  }
  const deleted = await dataConnect.executeGraphql<{ matricula_deleteMany: number }, {
    grupoModuloId: number; moduloEstudianteId: number; matriculaId: number; grupoId: number; moduloId: number;
  }>(DELETE_MATRICULA_MODULO_MUTATION, {
    variables: { grupoModuloId, moduloEstudianteId, matriculaId: link.matriculaId, grupoId: group.grupoId, moduloId: group.moduloId },
  });
  return { grupoModuloId, moduloEstudianteId, matriculaId: link.matriculaId, userId: link.matricula.userId,
    matriculaDeleted: deleted.data.matricula_deleteMany > 0, deleted: true };
}
