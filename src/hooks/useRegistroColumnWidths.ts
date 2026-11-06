'use client';

import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import {
  calculateRegistroColumnWidths,
  type RegistroCapacityColumns,
  type RegistroHeaderMeasurements,
} from '@/lib/registroColumnWidths';

function measureHeaders(header: HTMLElement): RegistroHeaderMeasurements {
  const document = header.ownerDocument;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.inert = true;
  Object.assign(host.style, { position: 'fixed', left: '-100000px', top: '0', visibility: 'hidden', pointerEvents: 'none' });
  document.body.appendChild(host);
  const measurements: RegistroHeaderMeasurements = { indicators: {}, capacities: {} };
  const cloneLabel = (label: HTMLElement) => {
    const style = getComputedStyle(label);
    const clone = label.cloneNode(true) as HTMLElement;
    Object.assign(clone.style, {
      position: 'static', transform: 'none', width: style.width, height: 'auto', minHeight: '0', maxHeight: 'none',
      margin: '0', overflow: 'visible', fontFamily: style.fontFamily, fontSize: style.fontSize,
      fontWeight: style.fontWeight, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing,
      wordSpacing: style.wordSpacing, overflowWrap: style.overflowWrap, wordBreak: style.wordBreak,
    });
    host.replaceChildren(clone);
    return clone;
  };
  try {
    for (const label of header.querySelectorAll<HTMLElement>('[data-registro-indicator-label]')) {
      const clone = cloneLabel(label);
      measurements.indicators[Number(label.dataset.registroIndicatorLabel)] = Math.ceil(clone.scrollHeight) + 8;
    }
    for (const label of header.querySelectorAll<HTMLElement>('[data-registro-capacity-label]')) {
      const clone = cloneLabel(label);
      const maxHeight = parseFloat(getComputedStyle(label).minHeight) || 64;
      clone.style.width = 'max-content';
      let low = 1;
      let high = Math.max(1, Math.ceil(clone.getBoundingClientRect().width));
      while (low < high) {
        const width = Math.floor((low + high) / 2);
        clone.style.width = `${width}px`;
        if (clone.scrollHeight <= maxHeight && clone.scrollWidth <= width) high = width;
        else low = width + 1;
      }
      measurements.capacities[Number(label.dataset.registroCapacityLabel)] = low + 4;
    }
  } finally {
    host.remove();
  }
  return measurements;
}

export function useRegistroColumnWidths(
  headerRef: RefObject<HTMLElement | null>,
  capacities: RegistroCapacityColumns[],
  viewportWidth: number,
  fixedWidth: number,
  averageColumnCount = capacities.length,
) {
  const [measurements, setMeasurements] = useState<RegistroHeaderMeasurements>({ indicators: {}, capacities: {} });
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let active = true;
    const measure = () => {
      if (!active || !header.isConnected) return;
      const next = measureHeaders(header);
      setMeasurements(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    measure();
    const fonts = header.ownerDocument.fonts;
    void fonts.ready.then(measure);
    fonts.addEventListener('loadingdone', measure);
    return () => {
      active = false;
      fonts.removeEventListener('loadingdone', measure);
    };
  }, [capacities, headerRef]);
  return useMemo(
    () => calculateRegistroColumnWidths(capacities, measurements, viewportWidth, fixedWidth, averageColumnCount),
    [capacities, measurements, viewportWidth, fixedWidth, averageColumnCount],
  );
}
