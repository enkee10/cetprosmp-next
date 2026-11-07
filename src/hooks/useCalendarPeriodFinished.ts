'use client';

import { useEffect, useState } from 'react';
import { calendarDayEndExclusive, isCalendarPeriodFinished } from '@/lib/dateOnly';

/** Update at Peru midnight even if the teacher leaves the register open. */
export function useCalendarPeriodFinished(fin: string | null | undefined) {
  const [, refresh] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      refresh(value => value + 1);
      const end = calendarDayEndExclusive(fin);
      if (end !== null && end > Date.now()) timer = setTimeout(update, Math.min(end - Date.now(), 2147483647));
    };
    update();
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [fin]);
  return isCalendarPeriodFinished(fin);
}
