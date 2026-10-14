'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useSearchParams } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useIntranetPermissions } from '@/hooks/useIntranetPermissions';
import { dayInLima } from '@/lib/calendar';
import { activityLabel, isParteSaved, parteDateLabel, ParteDiarioData, ParteDiarioRow, parteTeacherGroupLabel, unitLabel } from '@/lib/parteDiario';
import { parteColumnWidths, parteHeadings, parteRowColors } from '@/lib/parteDiarioTable';
import PrintDocumentViewer, { cmToMm, getA4PageSizeMm, getPrintContentHeightMm, getPrintContentWidthMm, PrintMarginsCm, PrintOrientation } from '@/components/print/PrintDocumentViewer';
import { parteSavedColor } from './parteFieldStyles';

const columns = parteHeadings.map((label, index) => ({ label, width: parteColumnWidths[index], index })).filter(column => column.index !== 1);
const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
function PrintTable({ rows }: { rows: ParteDiarioRow[] }) {
  return <table className="parte-print-table"><colgroup>{columns.map(column => <col key={column.index} style={{ width: `${100 * column.width / totalWidth}%` }} />)}</colgroup>
    <thead><tr>{columns.map(column => <th key={column.index}>{column.label}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row.key} data-row-key={row.key} style={{ background: parteRowColors[row.turnoOrden], color: isParteSaved(row) ? parteSavedColor : '#153447' }}>
      <td>{row.orden}</td><td><strong>{row.docenteNombre}</strong><br />{parteTeacherGroupLabel(row)}{isParteSaved(row) && <strong style={{ color: '#c62828' }}> (Guardado)</strong>}</td>
      <td>{unitLabel(row.unidad)}</td><td>{activityLabel(row.actividad)}</td><td>{row.matriculados}</td><td>{row.asistentes}</td>
      <td>{row.usoMedios}</td><td>{row.silabo}</td><td>{row.fichaActividad}</td><td>{row.instrumentoEvaluacion}</td><td>{row.registroAsistencia}</td><td>{row.registroAuxiliarEvaluacion}</td><td>{row.material}</td><td>{row.tareas}</td>
      <td>{row.firma && <Box component="img" src={row.firma} alt={`Firma de ${row.docenteNombre}`} sx={{ width: '100%', height: 'auto', maxHeight: '24mm', objectFit: 'contain' }} />}</td>
      <td>{row.observaciones.length > 0 && <ul>{row.observaciones.map((value, index) => <li key={index}>{value}</li>)}</ul>}</td>
    </tr>)}</tbody>
  </table>;
}

export default function ParteDiarioPrint() {
  const params = useSearchParams(), fecha = params.get('fecha') || dayInLima(new Date());
  const { user, loading: authLoading, loginWithGoogle } = useAuth(), { can, loading: permissionLoading } = useIntranetPermissions();
  const [data, setData] = useState<ParteDiarioData | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [orientation, setOrientation] = useState<PrintOrientation>('landscape'), [margins, setMargins] = useState<PrintMarginsCm>({ top: 0.7, right: 0.7, bottom: 0.7, left: 0.7 });
  const [scale, setScale] = useState(100), [overflow, setOverflow] = useState(false), [pages, setPages] = useState<ParteDiarioRow[][]>([]);
  const measure = useRef<HTMLDivElement>(null), paper = getA4PageSizeMm(orientation), width = getPrintContentWidthMm(paper, margins), height = getPrintContentHeightMm(paper, margins);
  useEffect(() => {
    let active = true;
    if (authLoading || permissionLoading) return () => { active = false; };
    if (!user || !can('parte-diario', 'view')) { setLoading(false); return () => { active = false; }; }
    setLoading(true); setError('');
    httpsCallable<{ fecha: string }, ParteDiarioData>(functions, 'getParteDiario')({ fecha }).then(result => { if (active) setData(result.data); })
      .catch(cause => { if (active) setError(cause.message || 'No se pudo cargar el Parte Diario.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authLoading, permissionLoading, user, can, fecha]);
  useLayoutEffect(() => {
    const element = measure.current;
    if (!element || !data?.filas.length) { setPages([]); return; }
    let active = true;
    const paginate = () => {
      if (!active || !element.getClientRects().length || element.offsetHeight === 0) return;
      const title = element.querySelector('h2')!.getBoundingClientRect().height;
      const header = element.querySelector('thead')!.getBoundingClientRect().height;
      const budget = height * 96 / 25.4 - title - header - 32;
      const chunks: ParteDiarioRow[][] = []; let current: ParteDiarioRow[] = [], used = 0;
      element.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((tr, index) => {
        const rowHeight = tr.getBoundingClientRect().height;
        if (current.length && used + rowHeight > budget) { chunks.push(current); current = []; used = 0; }
        current.push(data.filas[index]); used += rowHeight;
      });
      if (current.length) chunks.push(current);
      setPages(chunks);
    };
    const observer = new ResizeObserver(paginate); observer.observe(element);
    void document.fonts.ready.then(paginate);
    const images = Array.from(element.querySelectorAll('img'));
    void Promise.all(images.map(image => image.decode().catch(() => undefined))).then(paginate);
    paginate();
    return () => { active = false; observer.disconnect(); };
  }, [data, width, height, scale, loading, authLoading, permissionLoading]);
  if (!authLoading && !user) return <Box sx={{ p: 4 }}><Typography>Inicia sesión para ver el Parte Diario.</Typography><Button onClick={() => void loginWithGoogle().catch(cause => setError(cause.message))}>Iniciar sesión</Button>{error && <Typography color="error">{error}</Typography>}</Box>;
  const title = `PARTE DIARIO — ${parteDateLabel(fecha)}`;
  return <PrintDocumentViewer title="Parte Diario" orientation={orientation} onOrientationChange={setOrientation} margins={margins} onMarginsChange={setMargins}
    showPageOverflow={overflow} onShowPageOverflowChange={setOverflow} scalePercent={scale} onScalePercentChange={setScale} minScalePercent={55} maxScalePercent={100}
    loading={loading || authLoading || permissionLoading} error={error || (!can('parte-diario', 'view') && !permissionLoading ? 'No tienes permiso para ver el Parte Diario.' : !loading && data && !data.filas.length ? data.mensaje || 'No hay registros para esta fecha.' : null)}
    canPrint={pages.length > 0} pageSizeMm={paper} contentMinWidthMm={paper.width} globalStyles={{
      '.parte-print-table': { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: `${7 * scale / 100}pt`, lineHeight: 1.25 },
      '.parte-print-table th, .parte-print-table td': { border: '0.2mm solid #aacbdc', padding: '0.5mm', verticalAlign: 'middle', overflowWrap: 'anywhere', whiteSpace: 'normal' },
      '.parte-print-table th': { background: '#164863', color: 'white', textAlign: 'center' },
      '.parte-print-table th:first-child, .parte-print-table td:first-child': { padding: '0.1mm', whiteSpace: 'nowrap', textAlign: 'center' },
      '.parte-print-table ul': { paddingLeft: '2.5mm', margin: 0 }, '.parte-print-table li': { marginBottom: '1mm' },
      '.parte-print-table thead': { display: 'table-header-group' }, '.parte-print-table tr': { breakInside: 'avoid' },
      '.parte-print-title': { margin: '0 0 2mm', fontSize: '12pt', lineHeight: 1.25 },
      '.parte-daily-sheet': { width: `${paper.width}mm`, height: 'auto', minHeight: `${paper.height}mm`, boxSizing: 'border-box', padding: `${cmToMm(margins.top)}mm ${cmToMm(margins.right)}mm ${cmToMm(margins.bottom)}mm ${cmToMm(margins.left)}mm`, marginBottom: '18px', background: 'white', boxShadow: '0 8px 24px #0f172a2e',
        '@media print': { width: `${width}mm !important`, minHeight: '0 !important', height: 'auto !important', padding: '0 !important', margin: '0 !important', boxShadow: 'none !important', breakAfter: 'page', '&:last-child': { breakAfter: 'auto' } },
      },
    }}>
    <Box ref={measure} aria-hidden="true" className="parte-print-measure" sx={{ position: 'absolute', left: '-100000px', width: `${width}mm`, visibility: 'hidden', pointerEvents: 'none', '@media print': { display: 'none !important' } }}><h2 className="parte-print-title">{title}</h2><PrintTable rows={data?.filas || []} /></Box>
    {pages.map((rows, index) => <Box className="print-page parte-daily-sheet" key={index}>
      <h2 className="parte-print-title">{title}</h2><PrintTable rows={rows} /><Box sx={{ mt: '2mm', fontSize: '7pt', textAlign: 'right' }}>Página {index + 1} de {pages.length}</Box>
    </Box>)}
  </PrintDocumentViewer>;
}
