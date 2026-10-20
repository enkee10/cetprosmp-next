import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { createDocenteModulosLoader, type DocenteModulosData } from './docenteModulosCache';

export const loadDocenteModulos = createDocenteModulosLoader(async ({ matriculas, notas, estructura }) => {
  const result = await httpsCallable<
    { matriculas: boolean; notas: boolean; estructura: boolean }, DocenteModulosData
  >(functions, 'listDocenteMenuModulos')({ matriculas: Boolean(matriculas), notas: Boolean(notas), estructura: Boolean(estructura) });
  return result.data;
});
