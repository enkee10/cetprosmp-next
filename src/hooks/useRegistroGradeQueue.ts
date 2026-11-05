'use client';
import { useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import { RegistroGradeQueue, type GradeChange, type GradeQueueStatus } from '@/lib/registroGradeQueue';

const queues = new Map<string, RegistroGradeQueue>();
const idle: GradeQueueStatus = { pending: 0, saving: false, error: null, backedUp: true };

export function useRegistroGradeQueue(uid: string | undefined, groupId: string, enabled: boolean) {
  const queue = useMemo(() => {
    if (!uid || !groupId || !enabled || typeof window === 'undefined') return null;
    const key = `cetpro.registro-notas.v1:${window.location.origin}:${app.options.projectId}:${uid}:${groupId}`;
    let instance = queues.get(key);
    if (!instance) {
      const auth = getAuth(app);
      const save = httpsCallable(getFunctions(app), 'saveRegistroAuxiliar', { timeout: 180000 });
      instance = new RegistroGradeQueue(key, {
        getItem: name => window.localStorage.getItem(name),
        setItem: (name, value) => window.localStorage.setItem(name, value),
        removeItem: name => window.localStorage.removeItem(name),
      }, async changes => {
        if (auth.currentUser?.uid !== uid) throw Object.assign(new Error('Inicia sesión para guardar las notas pendientes.'), { code: 'unauthenticated' });
        const result = await save({ grupoModuloId: Number(groupId), partial: true,
          notas: changes.flatMap(row => row.kind === 'nota' ? [{ matriculaId: row.matriculaId, indicadorCapacidadId: row.indicadorCapacidadId, nota: row.value }] : []),
          efsrtPppPromedios: changes.flatMap(row => row.kind === 'efsrt' ? [{ moduloEstudianteId: row.moduloEstudianteId, promedioFinal: row.value }] : []),
        });
        const response = result.data as { saved: number; efsrtPppSaved?: number };
        const notes = changes.filter(row => row.kind === 'nota').length;
        if (response.saved !== notes || (response.efsrtPppSaved ?? 0) !== changes.length - notes) throw new Error('El servidor no confirmó todas las notas. Se reintentará el guardado.');
      }, () => navigator.onLine && auth.currentUser?.uid === uid);
      queues.set(key, instance);
    }
    return instance;
  }, [uid, groupId, enabled]);
  const [status, setStatus] = useState(idle);
  useEffect(() => {
    if (!queue) { setStatus(idle); return; }
    const update = () => setStatus(queue.status());
    const unsubscribe = queue.subscribe(update);
    const retry = () => { void queue.flush(); };
    update(); retry();
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    return () => { unsubscribe(); window.removeEventListener('online', retry); window.removeEventListener('focus', retry); };
  }, [queue]);
  return { queue, status, enqueue: (changes: GradeChange[]) => queue?.enqueue(changes), flush: () => { void queue?.flush(); } };
}
