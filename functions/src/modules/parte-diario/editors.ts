import { dataConnect } from '../core/dataConnectCore.js';

export type ParteEditor = { uid: string; nombre: string; avatar: string | null };
export const PARTE_EDITORS_QUERY = `query ParteEditors($uids:[String!]!){users(where:{documentId:{in:$uids}},limit:1000){documentId nombre apellidoPaterno apellidoMaterno apellidos avatar}}`;

export async function parteEditors(uids: string[]): Promise<Map<string, ParteEditor>> {
  const ids = [...new Set(uids.filter(Boolean))];
  if (!ids.length) return new Map();
  type Profile = { documentId: string | null; nombre: string | null; apellidoPaterno: string | null; apellidoMaterno: string | null; apellidos: string | null; avatar: string | null };
  const { data } = await dataConnect.executeGraphql<{ users: Profile[] }, { uids: string[] }>(PARTE_EDITORS_QUERY, { variables: { uids: ids } });
  return new Map(data.users.filter(p => !!p.documentId).map(p => [p.documentId!, {
    uid: p.documentId!, nombre: [p.nombre, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ') || p.apellidos || 'Coordinador', avatar: p.avatar,
  }]));
}
