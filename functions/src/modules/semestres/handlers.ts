import { https } from "firebase-functions/v1";
import { dataConnect } from "../core/dataConnectCore.js";
import { DataConnectSemestre } from "../core/types.js";

const LIST_SEMESTRES_QUERY = `
  query ListSemestresManual {
    semestres(limit: 500) {
      id
      titulo
      descripcion
      archivado
    }
  }
`;

export const listSemestres = https.onCall(async (_data, context) => {
  const requesterLevel = context.auth?.token?.level ?? 0;
  if (requesterLevel < 600) {
    throw new https.HttpsError("permission-denied", "You do not have permission to list semesters.");
  }

  try {
    const response = await dataConnect.executeGraphql<{ semestres: DataConnectSemestre[] }, Record<string, never>>(
      LIST_SEMESTRES_QUERY,
    );
    const semestres = (response.data.semestres ?? [])
      .slice()
      .sort((a, b) => String(a.titulo ?? "").localeCompare(String(b.titulo ?? ""), "es"));

    return { semestres };
  } catch (error) {
    console.error("Error in listSemestres:", error);
    throw new https.HttpsError("internal", "An unexpected error occurred while listing semesters.");
  }
});
