'use client';

import { useEffect, useState } from 'react';
import { useAppSettings } from '@/hooks/useAppSettings';

// Initial selection is synchronous; only a change of the configured semester resets it.
export function useCurrentSemestreFilter(emptyValue = '') {
  const { settings } = useAppSettings();
  const current = settings.general.semestreActualId ? String(settings.general.semestreActualId) : emptyValue;
  const [value, setValue] = useState(current);
  useEffect(() => { setValue(current); }, [current]);
  return [value, setValue] as const;
}

export function useCurrentSemestresFilter() {
  const { settings } = useAppSettings();
  const current = settings.general.semestreActualId;
  const [value, setValue] = useState<number[]>(() => current ? [current] : []);
  useEffect(() => { setValue(current ? [current] : []); }, [current]);
  return [value, setValue] as const;
}
