'use client';

import { useLayoutEffect, useMemo, useState } from 'react';
import { buildRegistroPrintPages, PRINT_PX_TO_MM, REGISTRO_PRINT_SIZES, type RegistroPrintColumn, type RegistroPrintMeasurements } from '@/lib/registroPrintLayout';

type Label = { code: string; text: string };
const emptyMeasurements = (): RegistroPrintMeasurements => ({ indicators: { base: {}, extended: {} }, capacities: { base: {}, extended: {} } });

export function useRegistroPrintLayout<T extends RegistroPrintColumn>(
  columns: T[], contentWidthMm: number,
  indicatorLabel: (column: T) => Label, capacityLabel: (column: T) => Label,
  maxHorizontalPages: 1 | 2 = 2,
) {
  const [measurements, setMeasurements] = useState<RegistroPrintMeasurements>(emptyMeasurements);
  useLayoutEffect(() => {
    let active = true;
    const measure = () => {
      if (!active) return;
      const probe = document.createElement('div');
      probe.setAttribute('aria-hidden', 'true');
      probe.inert = true;
      Object.assign(probe.style, {
        position: 'fixed', left: '-100000px', top: '0', visibility: 'hidden', pointerEvents: 'none',
        fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: '400', lineHeight: '1',
        whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'normal', boxSizing: 'content-box', padding: '0', border: '0',
      });
      document.body.appendChild(probe);
      const setLabel = (label: Label) => {
        const code = document.createElement('strong');
        code.style.fontWeight = '700';
        code.textContent = label.code;
        probe.replaceChildren(code, document.createTextNode(` ${label.text}`));
      };
      const next = emptyMeasurements();
      try {
        for (const variant of ['base', 'extended'] as const) {
          const factor = variant === 'extended' ? REGISTRO_PRINT_SIZES.heightIncrease : 1;
          probe.style.fontSize = '6pt';
          probe.style.width = `${REGISTRO_PRINT_SIZES.indicatorHeightPx * factor - 10}px`;
          for (const column of columns.filter(column => column.type === 'indicador')) {
            setLabel(indicatorLabel(column));
            next.indicators[variant][column.key] = Math.max(REGISTRO_PRINT_SIZES.minimumIndicatorMm, (Math.max(probe.scrollHeight, probe.getBoundingClientRect().height) + 8) * PRINT_PX_TO_MM);
          }
          probe.style.fontSize = '6.7pt';
          const capacityHeight = REGISTRO_PRINT_SIZES.capacityHeightPx * factor - 5;
          const capacities = new Map(columns.filter(column => column.capacidad).map(column => [column.capacidad!.id, column]));
          for (const column of capacities.values()) {
            setLabel(capacityLabel(column));
            probe.style.width = 'max-content';
            let low = 1, high = Math.max(1, Math.ceil(probe.getBoundingClientRect().width));
            while (low < high) {
              const middle = Math.floor((low + high) / 2);
              probe.style.width = `${middle}px`;
              if (Math.max(probe.scrollHeight, probe.getBoundingClientRect().height) <= capacityHeight && probe.scrollWidth <= middle) high = middle;
              else low = middle + 1;
            }
            next.capacities[variant][column.capacidad!.id] = (low + 1) * PRINT_PX_TO_MM + 1.4;
          }
        }
      } finally {
        probe.remove();
      }
      setMeasurements(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    measure();
    void document.fonts.ready.then(measure);
    document.fonts.addEventListener('loadingdone', measure);
    return () => { active = false; document.fonts.removeEventListener('loadingdone', measure); };
  }, [columns, indicatorLabel, capacityLabel]);
  return useMemo(() => buildRegistroPrintPages(columns, contentWidthMm, measurements, maxHorizontalPages), [columns, contentWidthMm, measurements, maxHorizontalPages]);
}
