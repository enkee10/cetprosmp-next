'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { DatosGenerales, datosGeneralesFallback, mergeDatosGenerales } from '@/lib/datosGenerales';

interface DatosGeneralesContextType {
  datosGenerales: DatosGenerales;
  loading: boolean;
  refreshDatosGenerales: () => Promise<DatosGenerales>;
}

const DatosGeneralesContext = createContext<DatosGeneralesContextType | undefined>(undefined);

export function DatosGeneralesProvider({ children }: { children: React.ReactNode }) {
  const [datosGenerales, setDatosGenerales] = useState<DatosGenerales>(datosGeneralesFallback);
  const [loading, setLoading] = useState(true);

  const refreshDatosGenerales = useCallback(async () => {
    setLoading(true);
    try {
      const getDatosGeneralesGlobales = httpsCallable<
        undefined,
        { datoGeneral?: DatosGenerales; datosGenerales?: DatosGenerales }
      >(functions, 'getDatosGeneralesGlobales');
      const result = await getDatosGeneralesGlobales();
      const nextDatosGenerales = mergeDatosGenerales(result.data.datoGeneral ?? result.data.datosGenerales);
      setDatosGenerales(nextDatosGenerales);
      return nextDatosGenerales;
    } catch (error) {
      console.error('Error loading datos generales globales:', error);
      setDatosGenerales((prev) => prev || datosGeneralesFallback);
      return datosGeneralesFallback;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDatosGenerales();
  }, [refreshDatosGenerales]);

  const value = useMemo(
    () => ({ datosGenerales, loading, refreshDatosGenerales }),
    [datosGenerales, loading, refreshDatosGenerales],
  );

  return (
    <DatosGeneralesContext.Provider value={value}>
      {children}
    </DatosGeneralesContext.Provider>
  );
}

export function useDatosGenerales() {
  const context = useContext(DatosGeneralesContext);
  if (!context) {
    throw new Error('useDatosGenerales must be used within DatosGeneralesProvider');
  }
  return context;
}
