import type { Timestamp } from 'firebase/firestore';

export type ComentarioEstado = 'visible' | 'oculto' | 'eliminado' | 'pendiente';

export interface Comentario {
  id: string;
  postId: string;
  parentId: string | null;
  nivel: 0 | 1;
  texto: string;
  autorUid: string;
  autorNombre: string;
  autorFoto: string | null;
  estado: ComentarioEstado;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
  moderadoPorUid: string | null;
}

export type RespuestaComentario = Comentario & {
  parentId: string;
  nivel: 1;
};
