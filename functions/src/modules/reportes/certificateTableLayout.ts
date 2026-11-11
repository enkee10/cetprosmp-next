import ExcelJS from "exceljs";
import JSZip from "jszip";
import sharp from "sharp";
import { join } from "path";

const TABLE_HEIGHT_POINTS = 310;
const separatorFontSize = (size: number) => Math.max(1, size / 2);
const xmlAttribute = (xml: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(xml)?.[1];
const attribute = (xml: string, name: string, value: string) => new RegExp(`\\s${name}="[^"]*"`).test(xml)
  ? xml.replace(new RegExp(`\\s${name}="[^"]*"`), ` ${name}="${value}"`)
  : xml.replace(/\/?>$/, end => ` ${name}="${value}"${end}`);
const escapeText = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type LayoutCell = {
  row: number; lastRow: number; text: string; widthPx: number;
  font: Partial<ExcelJS.Font>;
  compactSeparators: boolean;
};

/** Measure the same normal text and half-height separators written to the workbook. */
export async function certificateTextHeight(text: string, widthPx: number, font: Partial<ExcelJS.Font>, reduction: number, compactSeparators = false) {
  const size = Math.max(1, (font.size ?? 11) - reduction);
  if (!text.trim()) return 0;
  const variant = `${font.bold ? "Bold" : ""}${font.italic ? "Italic" : ""}` || "Regular";
  const family = !font.name || /^(calibri|carlito)$/i.test(font.name) ? "Carlito" : font.name;
  const metrics = await sharp({ text: {
    text: escapeText(text.replace(/\r\n?/g, "\n")).replace(/\n\n/g,
      compactSeparators ? `\n<span size="${separatorFontSize(size)}pt">\n</span>` : "\n\n"),
    font: `${family}${font.bold ? " Bold" : ""}${font.italic ? " Italic" : ""} ${size}`,
    ...(family === "Carlito" ? { fontfile: join(__dirname, "../../../assets/fonts/carlito", `Carlito-${variant}.ttf`) } : {}),
    width: Math.max(1, Math.floor(widthPx - 8)), dpi: 96, wrap: "word-char",
  } }).metadata();
  // Pango reports ink bounds. Add the ascender/descender allowance and cell padding,
  // with a small rendering margin for Excel/LibreOffice line metrics.
  return ((metrics.height ?? 0) + size * 4 / 3 * 0.45 + 4) * 0.75 * 1.05;
}

/** Reserve every cell's minimum height, including cells spanning several rows. */
export function certificateMinimumRowHeights(firstRow: number, rowCount: number, cells: Array<{ row: number; lastRow: number; height: number }>) {
  const heights = Array<number>(rowCount).fill(1);
  for (const cell of cells.filter(item => item.row === item.lastRow)) {
    const index = cell.row - firstRow;
    if (index >= 0 && index < rowCount) heights[index] = Math.max(heights[index], cell.height);
  }
  for (const cell of cells.filter(item => item.row !== item.lastRow)) {
    const start = cell.row - firstRow, end = cell.lastRow - firstRow;
    if (start < 0 || end >= rowCount) continue;
    const current = heights.slice(start, end + 1).reduce((sum, height) => sum + height, 0);
    const deficit = Math.max(0, cell.height - current) / (end - start + 1);
    for (let index = start; index <= end; index++) heights[index] += deficit;
  }
  return heights.map(height => Math.ceil(height * 100) / 100);
}

function distributeRemainingHeight(minimum: number[]) {
  const total = minimum.reduce((sum, height) => sum + height, 0);
  const remainingCents = Math.round((TABLE_HEIGHT_POINTS - total) * 100);
  const shares = minimum.map(height => remainingCents * height / total);
  const cents = shares.map(Math.floor);
  const remainder = remainingCents - cents.reduce((sum, value) => sum + value, 0);
  shares.map((value, index) => ({ index, fraction: value - cents[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
    .slice(0, remainder).forEach(({ index }) => cents[index]++);
  return minimum.map((height, index) => Math.round(height * 100 + cents[index]) / 100);
}

/** Read with ExcelJS, but edit only XML heights/styles to preserve template drawings. */
export async function fitCertificateTable(zip: JSZip, sheetPath: string, sheetName: string, firstRow: number, rowCount: number) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await zip.generateAsync({ type: "nodebuffer" }) as unknown as ExcelJS.Buffer);
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new Error("No se encontro la tabla del certificado.");
  const headerRow = firstRow - 1, totalsRow = firstRow + rowCount;
  const merges = Object.values(sheet.model.merges ?? []).map(range => {
    const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range);
    return match ? { start: `${match[1]}${match[2]}`, firstColumn: sheet.getColumn(match[1]).number,
      lastColumn: sheet.getColumn(match[3]).number, lastRow: Number(match[4]) } : null;
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const cells: LayoutCell[] = [];
  let maximumFontSize = 1;
  for (let row = headerRow; row <= totalsRow; row++) {
    for (let column = 1; column <= 9; column++) {
      const cell = sheet.getCell(row, column);
      maximumFontSize = Math.max(maximumFontSize, cell.font?.size ?? 11);
      if (cell.type === ExcelJS.ValueType.Merge || !cell.text.trim()) continue;
      const merge = merges.find(item => item.start === cell.address);
      let widthPx = 0;
      for (let col = column; col <= (merge?.lastColumn ?? column); col++) {
        // OOXML column widths use the maximum digit width of Calibri 11 (7 px).
        widthPx += Math.floor((sheet.getColumn(col).width ?? sheet.properties.defaultColWidth ?? 8.43) * 7);
      }
      cells.push({ row, lastRow: merge?.lastRow ?? row, text: cell.text, widthPx, font: cell.font ?? {},
        compactSeparators: column === 6 && row >= firstRow && row < totalsRow });
    }
  }

  let reduction = 0, heights: number[] = [], measured: Array<LayoutCell & { height: number }> = [];
  for (; reduction <= Math.ceil(maximumFontSize) - 1; reduction++) {
    // Every trial starts from the original fonts and remeasures ALL cells.
    measured = await Promise.all(cells.map(async cell => ({ ...cell,
      height: await certificateTextHeight(cell.text, cell.widthPx, cell.font, reduction, cell.compactSeparators),
    })));
    const minimum = certificateMinimumRowHeights(firstRow, rowCount, measured);
    if (minimum.reduce((sum, height) => sum + height, 0) <= TABLE_HEIGHT_POINTS) {
      heights = distributeRemainingHeight(minimum);
      break;
    }
  }
  if (!heights.length) throw new Error(`El contenido del certificado no cabe en ${TABLE_HEIGHT_POINTS} puntos incluso con fuente de 1 punto.`);

  let sheetXml = await zip.file(sheetPath)!.async("string");
  let stylesXml = await zip.file("xl/styles.xml")!.async("string");
  const fontSection = /<fonts\b[^>]*>([\s\S]*?)<\/fonts>/;
  const xfSection = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/;
  const fonts: string[] = stylesXml.match(fontSection)?.[1].match(/<font\b[^>]*\/>|<font\b[^>]*>[\s\S]*?<\/font>/g) ?? [];
  const formats: string[] = stylesXml.match(xfSection)?.[1].match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g) ?? [];
  const styleMap = new Map<number, number>(), fontMap = new Map<number, number>();
  sheetXml = sheetXml.replace(/<c\b[^>]*>/g, tag => {
    const ref = /^([A-Z]+)(\d+)$/.exec(xmlAttribute(tag, "r") ?? "");
    if (!ref || ref[1].length !== 1 || ref[1] > "I" || Number(ref[2]) < headerRow || Number(ref[2]) > totalsRow) return tag;
    const oldStyle = Number(xmlAttribute(tag, "s") ?? 0);
    if (!styleMap.has(oldStyle)) {
      const oldFormat = formats[oldStyle];
      if (!oldFormat) throw new Error(`Estilo ${oldStyle} no encontrado en la plantilla del certificado.`);
      const oldFontId = Number(xmlAttribute(oldFormat, "fontId") ?? 0);
      if (!fontMap.has(oldFontId)) {
        const oldFont = fonts[oldFontId];
        const size = Number(xmlAttribute(oldFont?.match(/<sz\b[^>]*\/>/)?.[0] ?? "", "val") ?? 11);
        const resizedFont = oldFont.replace(/<sz\b[^>]*\/>/, `<sz val="${Math.max(1, size - reduction)}"/>`);
        fontMap.set(oldFontId, fonts.length);
        fonts.push(resizedFont);
      }
      let format = oldFormat.replace(/^<xf\b[^>]*>/, tag => attribute(attribute(tag, "fontId", String(fontMap.get(oldFontId))), "applyFont", "1"));
      const alignment = /<alignment\b[^>]*\/>/;
      format = alignment.test(format)
        ? format.replace(alignment, tag => attribute(attribute(tag, "wrapText", "1"), "shrinkToFit", "0"))
        : format.endsWith("/>") ? format.slice(0, -2) + '><alignment wrapText="1"/></xf>'
          : format.replace(/<\/xf>$/, '<alignment wrapText="1"/></xf>');
      styleMap.set(oldStyle, formats.length);
      formats.push(format);
    }
    return attribute(tag, "s", String(styleMap.get(oldStyle)));
  });
  stylesXml = stylesXml.replace(fontSection, section => attribute(section.match(/^<fonts\b[^>]*>/)![0], "count", String(fonts.length)) + fonts.join("") + "</fonts>")
    .replace(xfSection, section => attribute(section.match(/^<cellXfs\b[^>]*>/)![0], "count", String(formats.length)) + formats.join("") + "</cellXfs>");
  sheetXml = sheetXml.replace(/<row\b[^>]*>/g, tag => {
    const row = Number(xmlAttribute(tag, "r"));
    const height = row >= firstRow && row < totalsRow ? heights[row - firstRow]
      : row === headerRow || row === totalsRow ? Math.max(Number(xmlAttribute(tag, "ht") ?? 0),
        ...measured.filter(cell => cell.row === row).map(cell => cell.height)) : null;
    return height == null ? tag : attribute(attribute(tag, "ht", height.toFixed(2)), "customHeight", "1");
  });
  const capacityCells = new Map(cells.filter(cell => cell.compactSeparators).map(cell => [`F${cell.row}`, cell.text]));
  sheetXml = sheetXml.replace(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g, cellXml => {
    const tag = cellXml.match(/^<c\b[^>]*>/)![0];
    const text = capacityCells.get(xmlAttribute(tag, "r") ?? "");
    if (!text?.includes("\n\n")) return cellXml;
    const format = formats[Number(xmlAttribute(tag, "s") ?? 0)];
    const font = fonts[Number(xmlAttribute(format, "fontId") ?? 0)];
    const size = Number(xmlAttribute(font.match(/<sz\b[^>]*\/>/)?.[0] ?? "", "val") ?? 11);
    const properties = font.replace(/^<font\b[^>]*>/, "").replace(/<\/font>$/, "").replace(/<name\b/g, "<rFont");
    const separatorProperties = properties.replace(/<sz\b[^>]*\/>/, `<sz val="${separatorFontSize(size)}"/>`);
    const paragraphs = text.split("\n\n");
    const runs = paragraphs.map((paragraph, index) =>
      (index ? `<r><rPr>${separatorProperties}</rPr><t xml:space="preserve">\n</t></r>` : "")
      + `<r><rPr>${properties}</rPr><t xml:space="preserve">${escapeText(paragraph)}${index < paragraphs.length - 1 ? "\n" : ""}</t></r>`,
    ).join("");
    // Inline rich text changes only the blank separator line's size; wording and codes stay intact.
    return `${attribute(tag, "t", "inlineStr")}<is>${runs}</is></c>`;
  });
  zip.file(sheetPath, sheetXml);
  zip.file("xl/styles.xml", stylesXml);
  console.info("Certificate table layout", { rows: rowCount, fontReductionPoints: reduction, totalHeightPoints: TABLE_HEIGHT_POINTS });
  return { reduction, heights };
}
