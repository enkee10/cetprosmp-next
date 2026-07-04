import {
  DELETE_ASPECTOS_EVALUACION_ESTUDIANTES_BY_EVALUACION_ESTUDIANTE_MUTATION,
  DELETE_MATRICULA_DEPENDENCIES_MUTATION,
  DELETE_MATRICULA_MUTATION,
  LIST_EVALUACION_ESTUDIANTE_IDS_BY_MATRICULA_QUERY,
  LIST_MATRICULA_IDS_BY_USER_QUERY,
} from "../../dataconnectOperations.js";
import { dataConnect } from "./dataConnectCore.js";
import { getIdFromKeyOutput } from "./userMappers.js";

type MatriculaIdsByUserResult = {
  matriculas?: Array<{ id?: number | null }> | null;
  matriculaUsers?: Array<{ matriculaId?: number | null }> | null;
};

type EvaluacionEstudianteIdsResult = {
  evaluacionesEstudiantes?: Array<{ id?: number | null }> | null;
};

export async function listMatriculaIdsByUser(userId: number): Promise<number[]> {
  const response = await dataConnect.executeGraphql<MatriculaIdsByUserResult, { userId: number }>(
    LIST_MATRICULA_IDS_BY_USER_QUERY,
    { variables: { userId } },
  );

  const ids = new Set<number>();
  for (const matricula of response.data.matriculas ?? []) {
    if (typeof matricula.id === "number" && Number.isFinite(matricula.id)) ids.add(matricula.id);
  }
  for (const matriculaUser of response.data.matriculaUsers ?? []) {
    if (typeof matriculaUser.matriculaId === "number" && Number.isFinite(matriculaUser.matriculaId)) {
      ids.add(matriculaUser.matriculaId);
    }
  }

  return Array.from(ids);
}

async function deleteAspectosEvaluacionEstudiantesByMatricula(matriculaId: number): Promise<void> {
  const response = await dataConnect.executeGraphql<EvaluacionEstudianteIdsResult, { matriculaId: number }>(
    LIST_EVALUACION_ESTUDIANTE_IDS_BY_MATRICULA_QUERY,
    { variables: { matriculaId } },
  );

  for (const evaluacionEstudiante of response.data.evaluacionesEstudiantes ?? []) {
    if (typeof evaluacionEstudiante.id !== "number" || !Number.isFinite(evaluacionEstudiante.id)) continue;
    await dataConnect.executeGraphql<
      { aspectoEvaluacionEstudiante_deleteMany: number },
      { evaluacionEstudianteId: number }
    >(
      DELETE_ASPECTOS_EVALUACION_ESTUDIANTES_BY_EVALUACION_ESTUDIANTE_MUTATION,
      { variables: { evaluacionEstudianteId: evaluacionEstudiante.id } },
    );
  }
}

export async function deleteMatriculaTree(matriculaId: number): Promise<number> {
  await deleteAspectosEvaluacionEstudiantesByMatricula(matriculaId);
  await dataConnect.executeGraphql<Record<string, number>, { matriculaId: number }>(
    DELETE_MATRICULA_DEPENDENCIES_MUTATION,
    { variables: { matriculaId } },
  );

  const deleted = await dataConnect.executeGraphql<{ matricula_delete: unknown }, { id: number }>(
    DELETE_MATRICULA_MUTATION,
    { variables: { id: matriculaId } },
  );

  return getIdFromKeyOutput(deleted.data.matricula_delete) ?? matriculaId;
}

export async function deleteMatriculasForUser(userId: number): Promise<number[]> {
  const matriculaIds = await listMatriculaIdsByUser(userId);
  for (const matriculaId of matriculaIds) {
    await deleteMatriculaTree(matriculaId);
  }
  return matriculaIds;
}
