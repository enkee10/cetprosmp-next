import { https } from "firebase-functions/v1";
import {
  buildPersonalDataFromInput,
  getIdFromKeyOutput,
  toNumber,
  toNumberOrNull,
} from "../core/userMappers.js";
import { dataConnect } from "../core/dataConnectCore.js";
import { requirePermission } from "../core/permissions.js";
import { DataConnectPersonal, DataConnectPersonalInput } from "../core/types.js";
import {
  DELETE_PERSONAL_MUTATION,
  DELETE_PERSONAL_ESPECIALIDADES_BY_PERSONAL_MUTATION,
  INSERT_PERSONAL_ESPECIALIDAD_MUTATION,
  INSERT_PERSONAL_MUTATION,
  UPDATE_PERSONAL_MUTATION,
} from "../../dataconnectOperations.js";
import { authAdmin } from "../core/authCore.js";

const PERSONAL_DELETED_MEMO = "__PERSONAL_DELETED__";

const PERSONAL_FIELDS = `
  id
  displayName
  memo
  userId
  user {
    id
    documentId
    username
    nombre
    apellidoPaterno
    email
    avatar
    rolId
    rol {
      id
      titulo
      scala
    }
  }
  personalEspecialidads_on_personal(limit: 100, orderBy: [{ orden: ASC }, { id: ASC }]) {
    id
    personalId
    especialidadId
    orden
    especialidad {
      id
      titulo
      tituloComercial
    }
  }
`;

const LIST_PERSONAL_QUERY = `
  query ListPersonalManual {
    personals(limit: 1000) {
      ${PERSONAL_FIELDS}
    }
  }
`;

const GET_PERSONAL_QUERY = `
  query GetPersonalManual($id: Int!) {
    personal(id: $id) {
      ${PERSONAL_FIELDS}
    }
  }
`;

const GET_PERSONAL_BY_USER_QUERY = `
  query GetPersonalByUserManual($userId: Int!) {
    personals(where: { userId: { eq: $userId } }, limit: 1) {
      id
      userId
    }
  }
`;

const addDerivedFields = (personal: DataConnectPersonal): DataConnectPersonal => {
  const especialidades = personal.personalEspecialidads_on_personal ?? [];
  return {
    ...personal,
    userUsername: personal.user?.username ?? personal.displayName ?? null,
    avatar: personal.user?.avatar ?? null,
    cargo: personal.user?.rol?.titulo ?? null,
    especialidadIds: especialidades
      .map((item) => item.especialidadId)
      .filter((id): id is number => typeof id === "number"),
    especialidadesTitulo: especialidades
      .map((item) => item.especialidad?.tituloComercial ?? item.especialidad?.titulo ?? "")
      .filter(Boolean)
      .join(" / "),
  };
};

const sortPersonal = (items: DataConnectPersonal[]) =>
  items
    .slice()
    .sort((a, b) =>
      String(a.user?.rol?.titulo ?? "").localeCompare(String(b.user?.rol?.titulo ?? ""), "es", { numeric: true }) ||
      String(a.user?.username ?? a.displayName ?? "").localeCompare(
        String(b.user?.username ?? b.displayName ?? ""),
        "es",
        { numeric: true },
      ) ||
      a.id - b.id,
    );

function getEspecialidadIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0),
    ),
  );
}

function isStudentRoleTitle(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase() === "estudiante";
}

function isDeletedPersonal(personal: Pick<DataConnectPersonal, "memo">) {
  return personal.memo === PERSONAL_DELETED_MEMO;
}

async function hydrateMissingAuthAvatars(items: DataConnectPersonal[]): Promise<DataConnectPersonal[]> {
  const missingAvatarItems = items.filter((personal) => !personal.user?.avatar && personal.user?.documentId);
  if (missingAvatarItems.length === 0) return items;

  const avatarEntries = await Promise.all(
    missingAvatarItems.map(async (personal) => {
      const documentId = personal.user?.documentId;
      if (!documentId) return null;

      const authUser = await authAdmin
        .getUser(documentId)
        .catch((error: unknown) =>
          (error as { code?: string } | null)?.code === "auth/user-not-found" ? null : Promise.reject(error),
        );

      return authUser?.photoURL ? [documentId, authUser.photoURL] as const : null;
    }),
  );
  const avatarByDocumentId = new Map(avatarEntries.filter((entry): entry is readonly [string, string] => Boolean(entry)));

  return items.map((personal) => {
    const documentId = personal.user?.documentId;
    const authAvatar = documentId ? avatarByDocumentId.get(documentId) : null;
    if (!authAvatar || !personal.user) return personal;

    return {
      ...personal,
      user: {
        ...personal.user,
        avatar: authAvatar,
      },
    };
  });
}

async function syncPersonalEspecialidades(personalId: number, especialidadIds: number[]) {
  await dataConnect.executeGraphql<
    { personalEspecialidad_deleteMany: number },
    { personalId: number }
  >(DELETE_PERSONAL_ESPECIALIDADES_BY_PERSONAL_MUTATION, { variables: { personalId } });

  await Promise.all(
    especialidadIds.map((especialidadId, index) =>
      dataConnect.executeGraphql<
        { personalEspecialidad_insert: unknown },
        { data: { personalId: number; especialidadId: number; orden: number } }
      >(INSERT_PERSONAL_ESPECIALIDAD_MUTATION, {
        variables: { data: { personalId, especialidadId, orden: index + 1 } },
      }),
    ),
  );
}

export const listPersonal = https.onCall(async (_data, context) => {
  await requirePermission(context, "personal", "view");

  try {
    const response = await dataConnect.executeGraphql<{ personals: DataConnectPersonal[] }, Record<string, never>>(
      LIST_PERSONAL_QUERY,
    );
    const personales = await hydrateMissingAuthAvatars(response.data.personals ?? []);
    const deletedMarkers = personales.filter(isDeletedPersonal);
    if (deletedMarkers.length > 0) {
      await Promise.all(
        deletedMarkers.map((personal) =>
          dataConnect.executeGraphql<{ personal_delete: unknown }, { id: number }>(
            DELETE_PERSONAL_MUTATION,
            { variables: { id: personal.id } },
          ),
        ),
      );
    }

    return {
      personal: sortPersonal(personales)
        .filter((personal) => !isDeletedPersonal(personal) && !isStudentRoleTitle(personal.user?.rol?.titulo))
        .map(addDerivedFields),
    };
  } catch (error) {
    console.error("Error in listPersonal:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing personal.");
  }
});

export const getPersonal = https.onCall(async (data, context) => {
  await requirePermission(context, "personal", "view");

  const personalId = toNumber(data?.id, -1);
  if (personalId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ personal: DataConnectPersonal | null }, { id: number }>(
      GET_PERSONAL_QUERY,
      { variables: { id: personalId } },
    );
    const [personal] = await hydrateMissingAuthAvatars(response.data.personal ? [response.data.personal] : []);
    return { personal: personal ? addDerivedFields(personal) : null };
  } catch (error) {
    console.error("Error in getPersonal:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while getting personal.");
  }
});

export const createOrUpdatePersonal = https.onCall(async (data, context) => {
  const payload = buildPersonalDataFromInput(data as Record<string, unknown>) as DataConnectPersonalInput;
  if (!payload.userId) {
    throw new https.HttpsError("invalid-argument", "userId is required.");
  }

  const personalId = toNumberOrNull(data?.id);
  await requirePermission(context, "personal", personalId ? "edit" : "create");
  const especialidadIds = getEspecialidadIds((data as Record<string, unknown> | null)?.especialidadIds);

  try {
    if (personalId) {
      const updated = await dataConnect.executeGraphql<
        { personal_update: unknown },
        { id: number; data: DataConnectPersonalInput }
      >(UPDATE_PERSONAL_MUTATION, { variables: { id: personalId, data: payload } });

      await syncPersonalEspecialidades(personalId, especialidadIds);

      return { id: getIdFromKeyOutput(updated.data.personal_update) ?? personalId };
    }

    const existing = await dataConnect.executeGraphql<
      { personals: Array<{ id: number; userId?: number | null }> },
      { userId: number }
    >(GET_PERSONAL_BY_USER_QUERY, { variables: { userId: payload.userId } });
    const existingId = existing.data.personals?.[0]?.id ?? null;
    if (existingId) {
      const updated = await dataConnect.executeGraphql<
        { personal_update: unknown },
        { id: number; data: DataConnectPersonalInput }
      >(UPDATE_PERSONAL_MUTATION, { variables: { id: existingId, data: payload } });

      await syncPersonalEspecialidades(existingId, especialidadIds);

      return { id: getIdFromKeyOutput(updated.data.personal_update) ?? existingId };
    }

    const created = await dataConnect.executeGraphql<
      { personal_insert: unknown },
      { data: DataConnectPersonalInput }
    >(INSERT_PERSONAL_MUTATION, { variables: { data: payload } });

    const createdId = getIdFromKeyOutput(created.data.personal_insert);
    if (createdId) {
      await syncPersonalEspecialidades(createdId, especialidadIds);
    }

    return { id: createdId };
  } catch (error) {
    console.error("Error in createOrUpdatePersonal:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while saving personal.");
  }
});

export const deletePersonal = https.onCall(async (data, context) => {
  await requirePermission(context, "personal", "delete");

  const personalId = toNumber(data?.id, -1);
  if (personalId <= 0) {
    throw new https.HttpsError("invalid-argument", "id is required.");
  }

  try {
    await dataConnect.executeGraphql<
      { personalEspecialidad_deleteMany: number },
      { personalId: number }
    >(DELETE_PERSONAL_ESPECIALIDADES_BY_PERSONAL_MUTATION, { variables: { personalId } });

    const deleted = await dataConnect.executeGraphql<{ personal_delete: unknown }, { id: number }>(
      DELETE_PERSONAL_MUTATION,
      { variables: { id: personalId } },
    );
    return { id: getIdFromKeyOutput(deleted.data.personal_delete) ?? personalId };
  } catch (error) {
    console.error("Error in deletePersonal:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while deleting personal.");
  }
});
