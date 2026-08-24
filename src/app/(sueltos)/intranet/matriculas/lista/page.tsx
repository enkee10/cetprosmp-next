'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, GlobalStyles, Typography } from '@mui/material';
import PrintDocumentViewer, {
  cmToMm,
  getA4PageSizeMm,
  getPrintContentHeightMm,
  getPrintContentWidthMm,
  type PrintMarginsCm,
  type PrintOrientation,
} from '@/components/print/PrintDocumentViewer';
import { formatDateOnly } from '@/lib/dateOnly';

type MatriculaListaPrintRow = {
  id?: number | string | null;
  apellidosNombres?: string | null;
  dni?: string | null;
  celular?: string | null;
  fechaNacimiento?: string | null;
  edad?: number | string | null;
};

type MatriculaListaPrintGroup = {
  id?: number | string | null;
  grupoNombre?: string | null;
  coordinadorNombre?: string | null;
  docenteNombre?: string | null;
  rows?: MatriculaListaPrintRow[];
};

type MatriculaListaPrintPayload = {
  title?: string | null;
  grupoNombre?: string | null;
  coordinadorNombre?: string | null;
  docenteNombre?: string | null;
  rows?: MatriculaListaPrintRow[];
  groups?: MatriculaListaPrintGroup[];
};

const STORAGE_KEY = 'cetprosmp.matriculas.listaPrintPayload';
const DEFAULT_MARGINS: PrintMarginsCm = { top: 1.5, bottom: 1.5, left: 2, right: 1 };
const LOGO_URL = '/media/reportes/logos/logo-smp-nuevo-chico.png';
const HEADER_HEIGHT_MM = 30;
const TABLE_HEADER_HEIGHT_MM = 8;
const ROW_HEIGHT_MM = 7.2;
const SIGNATURES_GAP_MM = 20;
const SIGNATURES_HEIGHT_MM = 18;
const SIGNATURES_RESERVED_HEIGHT_MM = SIGNATURES_GAP_MM + SIGNATURES_HEIGHT_MM;
const MIN_ROWS_PER_PAGE = 1;

type MatriculaListaVisualPage = {
  group: MatriculaListaPrintGroup;
  rows: MatriculaListaPrintRow[];
  startIndex: number;
  isLastGroupPage: boolean;
};

const asText = (value: unknown) => String(value ?? '').trim();
const formatPrintDateTime = (value: Date | null) =>
  value
    ? new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(value)
    : '';

const chunkRows = <T,>(items: T[], firstPageSize: number, nextPageSize: number) => {
  if (items.length === 0) return [[]] as T[][];

  const pages: T[][] = [];
  let index = 0;
  const safeFirstPageSize = Math.max(MIN_ROWS_PER_PAGE, firstPageSize);
  const safeNextPageSize = Math.max(MIN_ROWS_PER_PAGE, nextPageSize);

  pages.push(items.slice(0, safeFirstPageSize));
  index = safeFirstPageSize;
  while (index < items.length) {
    pages.push(items.slice(index, index + safeNextPageSize));
    index += safeNextPageSize;
  }

  return pages;
};

const paginateRowsForSignatures = <T,>(items: T[], regularPageSize: number, lastPageSize: number) => {
  const regularPages = chunkRows(items, regularPageSize, regularPageSize);
  const lastRegularPage = regularPages[regularPages.length - 1] ?? [];
  if (lastRegularPage.length <= lastPageSize) return regularPages;

  const safeLastPageSize = Math.max(MIN_ROWS_PER_PAGE, lastPageSize);
  const leadingRows = items.slice(0, Math.max(0, items.length - safeLastPageSize));
  const lastRows = items.slice(-safeLastPageSize);
  return [...chunkRows(leadingRows, regularPageSize, regularPageSize), lastRows];
};

const getPayloadPrintGroups = (payload: MatriculaListaPrintPayload | null): MatriculaListaPrintGroup[] => {
  const groups = (payload?.groups || [])
    .map((group) => ({ ...group, rows: group.rows || [] }))
    .filter((group) => asText(group.grupoNombre) || asText(group.docenteNombre) || (group.rows || []).length > 0);
  if (groups.length > 0) return groups;

  return [{
    id: 'lista-general',
    grupoNombre: payload?.grupoNombre || 'Lista de matriculados',
    coordinadorNombre: payload?.coordinadorNombre || '',
    docenteNombre: payload?.docenteNombre || '',
    rows: payload?.rows || [],
  }];
};

const buildVisualPages = (
  groups: MatriculaListaPrintGroup[],
  rowsPerRegularPage: number,
  rowsPerLastPageWithSignatures: number,
): MatriculaListaVisualPage[] =>
  groups.flatMap((group) => {
    const rows = group.rows || [];
    const rowPages = paginateRowsForSignatures(rows, rowsPerRegularPage, rowsPerLastPageWithSignatures);
    let startIndex = 0;
    return rowPages.map((pageRows, pageIndex) => {
      const page: MatriculaListaVisualPage = {
        group,
        rows: pageRows,
        startIndex,
        isLastGroupPage: pageIndex === rowPages.length - 1,
      };
      startIndex += pageRows.length;
      return page;
    });
  });

function SignatureBlock({ name, cargo }: { name: string; cargo: string }) {
  return (
    <Box sx={{ width: '68mm', maxWidth: '48%', minWidth: 0, textAlign: 'center' }}>
      <Box sx={{ borderTop: '0.7px solid #111', pt: '1.5mm', minHeight: '6mm', fontWeight: 700 }}>
        {name || '\u00a0'}
      </Box>
      <Box sx={{ fontSize: '8pt', textTransform: 'uppercase' }}>{cargo}</Box>
    </Box>
  );
}

export default function ListaMatriculadosPrintPage() {
  const [payload, setPayload] = useState<MatriculaListaPrintPayload | null>(null);
  const [orientation, setOrientation] = useState<PrintOrientation>('portrait');
  const [margins, setMargins] = useState<PrintMarginsCm>(DEFAULT_MARGINS);
  const [showOverflow, setShowOverflow] = useState(false);
  const [scalePercent, setScalePercent] = useState(100);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  useEffect(() => {
    document.title = 'Lista de Matriculados';
    setGeneratedAt(new Date());
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.sessionStorage.getItem(STORAGE_KEY);
      setPayload(raw ? JSON.parse(raw) as MatriculaListaPrintPayload : null);
    } catch {
      setPayload(null);
    }
  }, []);

  const groups = useMemo(() => getPayloadPrintGroups(payload), [payload]);
  const pageSizeMm = useMemo(() => getA4PageSizeMm(orientation), [orientation]);
  const contentWidthMm = useMemo(() => getPrintContentWidthMm(pageSizeMm, margins), [pageSizeMm, margins]);
  const contentHeightMm = useMemo(() => getPrintContentHeightMm(pageSizeMm, margins), [pageSizeMm, margins]);
  const rowsPerRegularPage = useMemo(() => {
    const availableHeight = contentHeightMm - HEADER_HEIGHT_MM - TABLE_HEADER_HEIGHT_MM;
    return Math.max(MIN_ROWS_PER_PAGE, Math.floor(availableHeight / ROW_HEIGHT_MM));
  }, [contentHeightMm]);
  const rowsPerLastPageWithSignatures = useMemo(() => {
    const availableHeight = contentHeightMm - HEADER_HEIGHT_MM - TABLE_HEADER_HEIGHT_MM - SIGNATURES_RESERVED_HEIGHT_MM;
    return Math.max(MIN_ROWS_PER_PAGE, Math.floor(availableHeight / ROW_HEIGHT_MM));
  }, [contentHeightMm]);
  const visualPages = useMemo(
    () => buildVisualPages(groups, rowsPerRegularPage, rowsPerLastPageWithSignatures),
    [groups, rowsPerLastPageWithSignatures, rowsPerRegularPage],
  );

  const renderHeader = (group: MatriculaListaPrintGroup, pageIndex: number, pageCount: number) => (
    <Box className="matricula-list-header">
      <Box component="img" src={LOGO_URL} alt="" className="matricula-list-logo" />
      <Box className="matricula-list-heading">
        <Typography className="matricula-list-title">
          CETPRO SAN MARTIN DE PORRES
        </Typography>
        <Typography className="matricula-list-subtitle">
          Grupo: {asText(group.grupoNombre) || 'Lista de matriculados'}
        </Typography>
      </Box>
      <Box className="matricula-list-meta">
        <Typography className="matricula-list-date-time" sx={{ fontSize: '12px !important' }}>
          Fecha y hora: {formatPrintDateTime(generatedAt)}
        </Typography>
        <Box className="matricula-list-page-number">
          {pageIndex + 1}/{pageCount}
        </Box>
      </Box>
    </Box>
  );

  const renderTable = (pageRows: MatriculaListaPrintRow[], startIndex: number) => (
    <Box component="table" className="matricula-list-table">
      <colgroup>
        <col style={{ width: '9mm' }} />
        <col />
        <col style={{ width: '25mm' }} />
        <col style={{ width: '27mm' }} />
        <col style={{ width: '27mm' }} />
        <col style={{ width: '13mm' }} />
      </colgroup>
      <thead>
        <tr>
          <th>#</th>
          <th>Apellidos y Nombres</th>
          <th>DNI</th>
          <th>Celular</th>
          <th>Fecha Nac.</th>
          <th>Edad</th>
        </tr>
      </thead>
      <tbody>
        {pageRows.map((row, index) => (
          <tr key={`${row.id ?? startIndex + index}-${row.dni ?? ''}`}>
            <td style={{ textAlign: 'center' }}>{startIndex + index + 1}</td>
            <td>{asText(row.apellidosNombres) || '\u00a0'}</td>
            <td style={{ textAlign: 'center' }}>{asText(row.dni)}</td>
            <td style={{ textAlign: 'center' }}>{asText(row.celular)}</td>
            <td style={{ textAlign: 'center' }}>
              {formatDateOnly(asText(row.fechaNacimiento), { dateStyle: 'short' }) || asText(row.fechaNacimiento)}
            </td>
            <td style={{ textAlign: 'center' }}>{asText(row.edad)}</td>
          </tr>
        ))}
      </tbody>
    </Box>
  );

  return (
    <PrintDocumentViewer
      title="Lista de Matriculados"
      orientation={orientation}
      onOrientationChange={setOrientation}
      margins={margins}
      onMarginsChange={setMargins}
      showPageOverflow={showOverflow}
      onShowPageOverflowChange={setShowOverflow}
      scalePercent={scalePercent}
      onScalePercentChange={setScalePercent}
      minScalePercent={70}
      maxScalePercent={100}
      canPrint={Boolean(payload)}
      pageSizeMm={pageSizeMm}
      contentMinWidthMm={pageSizeMm.width}
      backgroundColor="transparent"
      error={!payload ? 'No se encontro la lista para imprimir. Vuelve a abrirla desde Matriculas.' : null}
    >
      <GlobalStyles
        styles={{
          '@media print': {
            '.print-page': {
              width: `${contentWidthMm}mm !important`,
              height: `${contentHeightMm}mm !important`,
              boxShadow: 'none !important',
              margin: '0 !important',
              padding: '0 !important',
              boxSizing: 'border-box',
              breakAfter: 'page',
              pageBreakAfter: 'always',
            },
            '.print-page:last-child': {
              breakAfter: 'auto',
              pageBreakAfter: 'auto',
            },
            '.print-page-inner': { outline: 'none !important' },
          },
          '.print-page': {
            width: `${pageSizeMm.width}mm`,
            height: `${pageSizeMm.height}mm`,
            marginLeft: 'auto',
            marginRight: 'auto',
            marginBottom: '18px',
            backgroundColor: '#fff',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
            padding: `${cmToMm(margins.top)}mm ${cmToMm(margins.right)}mm ${cmToMm(margins.bottom)}mm ${cmToMm(margins.left)}mm`,
            boxSizing: 'border-box',
            overflow: showOverflow ? 'visible' : 'hidden',
          },
          '.print-page-inner': {
            width: `${contentWidthMm}mm`,
            height: `${contentHeightMm}mm`,
            display: 'flex',
            flexDirection: 'column',
            overflow: showOverflow ? 'visible' : 'hidden',
            transform: `scale(${scalePercent / 100})`,
            transformOrigin: 'top left',
            fontFamily: 'Arial, Helvetica, sans-serif',
            color: '#111',
          },
          '.matricula-list-header': {
            height: `${HEADER_HEIGHT_MM}mm`,
            display: 'grid',
            gridTemplateColumns: '22mm minmax(0, 1fr) 52mm',
            alignItems: 'center',
            gap: '4mm',
            flexShrink: 0,
          },
          '.matricula-list-heading': {
            minWidth: 0,
          },
          '.matricula-list-logo': {
            width: '18mm',
            height: '18mm',
            objectFit: 'contain',
          },
          '.matricula-list-meta': {
            alignSelf: 'center',
            justifySelf: 'stretch',
            minWidth: 0,
            textAlign: 'right',
          },
          '.matricula-list-title': {
            fontWeight: 900,
            fontSize: '13pt',
            lineHeight: 1,
          },
          '.matricula-list-date-time': {
            fontSize: '7px',
            lineHeight: 1,
            fontWeight: 700,
            textAlign: 'right',
            whiteSpace: 'nowrap',
          },
          '.matricula-list-subtitle': {
            fontSize: '10pt',
            marginTop: '1.5mm',
            fontWeight: 700,
            lineHeight: 1.15,
          },
          '.matricula-list-page-number': {
            textAlign: 'right',
            fontSize: '7pt',
            color: '#555',
            paddingTop: '1.5mm',
          },
          '.matricula-list-table': {
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            fontSize: '8.5pt',
            lineHeight: 1.05,
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
          },
          '.matricula-list-table th, .matricula-list-table td': {
            border: '0.6px solid #111',
            padding: '1mm 1.4mm',
            verticalAlign: 'middle',
            overflow: 'hidden',
          },
          '.matricula-list-table th': {
            height: `${TABLE_HEADER_HEIGHT_MM}mm`,
            backgroundColor: '#dbeafe',
            textAlign: 'center',
            fontWeight: 800,
          },
          '.matricula-list-table tbody td': {
            height: `${ROW_HEIGHT_MM}mm`,
            paddingTop: '0.7mm',
            paddingBottom: '0.7mm',
          },
          '.matricula-list-table tbody td:nth-of-type(2)': {
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          },
          '.matricula-list-signatures': {
            height: `${SIGNATURES_HEIGHT_MM}mm`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12mm',
            padding: '0 8mm',
            marginTop: `${SIGNATURES_GAP_MM}mm`,
            flexShrink: 0,
          },
        }}
      />
      {visualPages.map((page, pageIndex) => {
        return (
          <Box className="print-page" key={`${page.group.id ?? 'group'}-${pageIndex}`}>
            <Box className="print-page-inner">
              {renderHeader(page.group, pageIndex, visualPages.length)}
              {renderTable(page.rows, page.startIndex)}
              {page.isLastGroupPage ? (
                <Box className="matricula-list-signatures">
                  <SignatureBlock name={asText(page.group.coordinadorNombre)} cargo="COORDINADOR" />
                  <SignatureBlock name={asText(page.group.docenteNombre)} cargo="Docente" />
                </Box>
              ) : null}
            </Box>
          </Box>
        );
      })}
    </PrintDocumentViewer>
  );
}
