import { DOMParser, XMLSerializer, type Document, type Element } from "@xmldom/xmldom";
import JSZip from "jszip";
import {
  CERTIFICATE_TABLE_HEIGHT_POINTS, certificateMinimumRowHeights, certificateTextHeight, distributeRemainingHeight,
} from "./certificateTableLayout.js";

export const WORD_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const WORD = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const DRAWING = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const GRAPHIC = "http://schemas.openxmlformats.org/drawingml/2006/main";
const PICTURE = "http://schemas.openxmlformats.org/drawingml/2006/picture";
const COMPATIBILITY = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const XML = "http://www.w3.org/XML/1998/namespace";
const DOCUMENT_PATH = "word/document.xml";
const RELATIONSHIPS_PATH = "word/_rels/document.xml.rels";
const AVATAR_RELATIONSHIP = "rIdCertificateAvatar";
const AVATAR_PATH = "media/certificate-avatar.png";

export type CertificateUnitTableRow = {
  competencia: string;
  unidad: string;
  creditos: string | number;
  horas: string | number;
  capacidades: string;
  nota: string | number;
};

type CertificateValue = string | number | null | undefined;
const descendants = (node: Document | Element, name: string, ns = WORD) =>
  Array.from(node.getElementsByTagNameNS(ns, name));
const children = (node: Element, name?: string) =>
  Array.from(node.childNodes).filter((child): child is Element =>
    child.nodeType === 1 && (!name || (child.namespaceURI === WORD && child.localName === name)),
  );
const wordElement = (doc: Document, name: string) => doc.createElementNS(WORD, `w:${name}`);
const wordValue = (node: Element, name: string, value: string | number) =>
  node.setAttributeNS(WORD, `w:${name}`, String(value));
const textValue = (node: Element) => descendants(node, "t").map(part => part.textContent ?? "").join("");
const normalize = (key: string) => key.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-PE");
const cleanXmlText = (text: string) =>
  Array.from(text).filter(char => {
    const code = char.codePointAt(0)!;
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code < 0xd800)
      || (code >= 0xe000 && code < 0xfffe) || code > 0xffff;
  }).join("");

async function readXml(zip: JSZip, path: string) {
  const part = zip.file(path);
  if (!part) throw new Error(`No se encontró ${path} en el certificado Word.`);
  return new DOMParser().parseFromString(await part.async("string"), "application/xml");
}

function writeXml(zip: JSZip, path: string, doc: Document) {
  zip.file(path, new XMLSerializer().serializeToString(doc));
}

function setText(node: Element, value: string) {
  node.textContent = cleanXmlText(value);
  node.setAttributeNS(XML, "xml:space", "preserve");
}

function fillTokens(doc: Document, input: Record<string, CertificateValue>) {
  const values = new Map(Object.entries(input).map(([key, value]) => [normalize(key), String(value ?? "")]));
  for (const [alias, original] of [
    ["[creditos]", "[creditos modulo]"],
    ["[fecha larga]", "[fecha actual larga]"],
  ]) {
    if (values.has(original) && !values.has(alias)) values.set(alias, values.get(original)!);
  }

  for (const paragraph of descendants(doc, "p")) {
    let text = "";
    const parts = children(paragraph, "r").flatMap(run => children(run, "t")).map(node => {
      const start = text.length;
      text += node.textContent ?? "";
      return { node, start, end: text.length };
    });
    // A marker may span several runs after Word applies spelling or formatting.
    for (const match of Array.from(text.matchAll(/\[[^\[\]]+\]/g)).reverse()) {
      const value = Object.prototype.hasOwnProperty.call(input, match[0])
        ? String(input[match[0]] ?? "")
        : values.get(normalize(match[0]));
      if (value === undefined) continue;
      const start = match.index!;
      const end = start + match[0].length;
      for (const part of parts.filter(part => part.end > start && part.start < end)) {
        const current = part.node.textContent ?? "";
        setText(part.node, current.slice(0, Math.max(0, start - part.start))
          + (part.start <= start ? value : "") + current.slice(Math.max(0, end - part.start)));
      }
    }
  }
}

function fillCell(cell: Element, text: string, capacitySize?: number) {
  const doc = cell.ownerDocument!;
  const sample = children(cell, "p")[0];
  const paragraphProperties = sample && children(sample, "pPr")[0];
  const run = sample && children(sample, "r")[0];
  const runProperties = run && children(run, "rPr")[0];
  for (const paragraph of children(cell, "p")) cell.removeChild(paragraph);

  const groups = capacitySize === undefined ? [text] : text.split("\n\n");
  groups.forEach((group, index) => {
    if (index) {
      const spacer = wordElement(doc, "p");
      const properties = wordElement(doc, "pPr");
      const spacing = wordElement(doc, "spacing");
      wordValue(spacing, "before", 0);
      wordValue(spacing, "after", 0);
      wordValue(spacing, "line", capacitySize! * 10);
      wordValue(spacing, "lineRule", "exact");
      properties.appendChild(spacing);
      spacer.appendChild(properties);
      cell.appendChild(spacer);
    }
    const paragraph = wordElement(doc, "p");
    if (paragraphProperties) paragraph.appendChild(paragraphProperties.cloneNode(true));
    const nextRun = wordElement(doc, "r");
    if (runProperties) nextRun.appendChild(runProperties.cloneNode(true));
    group.replace(/\r\n?/g, "\n").split("\n").forEach((line, lineIndex) => {
      if (lineIndex) nextRun.appendChild(wordElement(doc, "br"));
      const node = wordElement(doc, "t");
      setText(node, line);
      nextRun.appendChild(node);
    });
    paragraph.appendChild(nextRun);
    cell.appendChild(paragraph);
  });
}

function setCompetencyMerge(cell: Element, value: "restart" | "continue" | null) {
  const properties = children(cell, "tcPr")[0];
  const previous = children(properties, "vMerge")[0];
  if (value && previous) {
    wordValue(previous, "val", value);
  } else if (previous) {
    properties.removeChild(previous);
  }
}

function unitGroups(rows: CertificateUnitTableRow[]) {
  const lastByFirst = new Map<number, number>();
  const continuations = new Set<number>();
  for (let first = 0; first < rows.length;) {
    let after = first + 1;
    while (after < rows.length && rows[first].competencia && rows[after].competencia === rows[first].competencia) {
      continuations.add(after++);
    }
    lastByFirst.set(first, after - 1);
    first = after;
  }
  return { lastByFirst, continuations };
}

async function fillUnitTable(doc: Document, rows: CertificateUnitTableRow[]) {
  const table = descendants(doc, "tbl").find(node =>
    children(node, "tr").some(row => normalize(textValue(children(row, "tc")[0])) === "[unidad de competencia]"),
  );
  if (!table) throw new Error("No se encontró la tabla de competencias en la plantilla Word.");
  const [header, sample, ...remaining] = children(table, "tr");
  const efsrtRow = remaining.pop();
  const sampleCells = children(sample, "tc");
  if (!efsrtRow || sampleCells.length !== 6 || children(efsrtRow, "tc").length !== 5) {
    throw new Error("La tabla de competencias de la plantilla Word debe incluir seis columnas y la fila de EFSRT.");
  }
  const fontSize = Number(descendants(sample, "sz")[0]?.getAttributeNS(WORD, "val") ?? 18) / 2;
  const widths = sampleCells.map(cell => Number(descendants(cell, "tcW")[0].getAttributeNS(WORD, "w")) / 15);
  const { lastByFirst, continuations } = unitGroups(rows);
  const values = rows.map((row, index) => [
    continuations.has(index) ? "" : row.competencia, row.unidad, String(row.creditos),
    String(row.horas), row.capacidades, String(row.nota),
  ]);
  const rowCount = Math.max(rows.length, 3);
  const cells = values.flatMap((row, index) => row.map((text, column) => ({
    row: index, lastRow: column === 0 ? lastByFirst.get(index) ?? index : index,
    text, width: widths[column], compact: column === 4,
  })).filter(cell => cell.text));
  let reduction = 0;
  let heights: number[] = [];
  for (; reduction <= fontSize - 1; reduction++) {
    const measured = await Promise.all(cells.map(async cell => ({
      ...cell,
      height: await certificateTextHeight(cell.text, cell.width, { size: fontSize }, reduction, cell.compact),
    })));
    const minimum = certificateMinimumRowHeights(0, rowCount, measured)
      .map(height => Math.max(height, fontSize - reduction + 5));
    if (minimum.reduce((sum, height) => sum + height, 0) <= CERTIFICATE_TABLE_HEIGHT_POINTS) {
      heights = distributeRemainingHeight(minimum);
      break;
    }
  }
  if (!heights.length) throw new Error("El contenido excede el espacio disponible en la tabla del certificado Word.");

  for (const row of [sample, ...remaining]) table.removeChild(row);
  for (let index = 0; index < rowCount; index++) {
    const row = sample.cloneNode(true) as Element;
    const rowHeight = descendants(row, "trHeight")[0];
    wordValue(rowHeight, "val", Math.ceil(heights[index] * 20));
    wordValue(rowHeight, "hRule", "atLeast");
    const rowCells = children(row, "tc");
    const merge = continuations.has(index) ? "continue" : (lastByFirst.get(index) ?? index) > index ? "restart" : null;
    setCompetencyMerge(rowCells[0], merge);
    rowCells.forEach((cell, column) => fillCell(cell, values[index]?.[column] ?? "", column === 4 ? fontSize - reduction : undefined));
    table.insertBefore(row, efsrtRow);
  }
  const headerProperties = children(header, "trPr")[0];
  headerProperties.appendChild(wordElement(doc, "tblHeader"));
  for (const size of [...descendants(table, "sz"), ...descendants(table, "szCs")]) {
    wordValue(size, "val", Math.max(2, Number(size.getAttributeNS(WORD, "val")) - reduction * 2));
  }
}

function addImageRelationship(rels: Document, id: string, target: string) {
  const relationship = rels.createElementNS(PACKAGE_REL, "Relationship");
  relationship.setAttribute("Id", id);
  relationship.setAttribute("Type", `${REL}/image`);
  relationship.setAttribute("Target", target);
  rels.documentElement!.appendChild(relationship);
}

async function embedAvatar(zip: JSZip, doc: Document, avatar: Buffer) {
  const frame = descendants(doc, "AlternateContent", COMPATIBILITY).find(node =>
    descendants(node, "docPr", DRAWING).some(drawing => drawing.getAttribute("name") === "Shape 294"),
  );
  const picture = descendants(doc, "drawing").find(drawing => descendants(drawing, "pic", PICTURE).length);
  const frameExtent = frame && descendants(frame, "extent", DRAWING)[0];
  if (!frame || !picture || !frameExtent) throw new Error("La plantilla Word no contiene el marco para la foto.");
  const photo = picture.cloneNode(true) as Element;
  const inline = descendants(photo, "inline", DRAWING)[0];
  for (const name of ["anchorId", "editId"]) {
    inline.removeAttributeNS("http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing", name);
  }
  const extent = descendants(photo, "extent", DRAWING)[0];
  const transform = descendants(photo, "xfrm", GRAPHIC)[0];
  const shapeProperties = descendants(photo, "spPr", PICTURE)[0];
  const outline = descendants(frame, "ln", GRAPHIC)[0];
  if (outline) shapeProperties.appendChild(outline.cloneNode(true));
  for (const name of ["cx", "cy"]) {
    const value = frameExtent.getAttribute(name)!;
    extent.setAttribute(name, value);
    descendants(transform, "ext", GRAPHIC)[0].setAttribute(name, value);
  }
  for (const properties of [...descendants(photo, "docPr", DRAWING), ...descendants(photo, "cNvPr", PICTURE)]) {
    properties.setAttribute("id", "2");
    properties.setAttribute("name", "Foto del estudiante");
    properties.removeAttribute("descr");
    for (const node of Array.from(properties.childNodes)) properties.removeChild(node);
  }
  descendants(photo, "blip", GRAPHIC)[0].setAttributeNS(REL, "r:embed", AVATAR_RELATIONSHIP);
  frame.parentNode!.replaceChild(photo, frame);
  const rels = await readXml(zip, RELATIONSHIPS_PATH);
  addImageRelationship(rels, AVATAR_RELATIONSHIP, AVATAR_PATH);
  writeXml(zip, RELATIONSHIPS_PATH, rels);
  zip.file(`word/${AVATAR_PATH}`, avatar);
}

export async function fillCertificateWord(
  template: Buffer,
  tokens: Record<string, CertificateValue>,
  rows: CertificateUnitTableRow[],
  avatar?: Buffer,
) {
  const zip = await JSZip.loadAsync(template);
  const doc = await readXml(zip, DOCUMENT_PATH);
  await fillUnitTable(doc, rows);
  fillTokens(doc, tokens);
  if (avatar) await embedAvatar(zip, doc, avatar);
  writeXml(zip, DOCUMENT_PATH, doc);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

function certificateBody(doc: Document) {
  const body = descendants(doc, "body")[0];
  const section = children(body, "sectPr")[0];
  if (!section) throw new Error("El certificado Word no contiene la configuración de página.");
  return { body, section };
}

export async function combineCertificateWordDocuments(files: Buffer[]) {
  if (files.length === 1) return files[0];
  const zip = await JSZip.loadAsync(files[0]);
  const doc = await readXml(zip, DOCUMENT_PATH);
  const rels = await readXml(zip, RELATIONSHIPS_PATH);
  const { body, section } = certificateBody(doc);
  let currentSection = section;
  let drawingId = 0;

  for (let index = 0; index < files.length; index++) {
    const source = index ? await JSZip.loadAsync(files[index]) : zip;
    const sourceDoc = index ? await readXml(source, DOCUMENT_PATH) : doc;
    const sourceBody = certificateBody(sourceDoc);
    const blocks = children(sourceBody.body).filter(block => block !== sourceBody.section);
    const avatar = index ? source.file(`word/${AVATAR_PATH}`) : null;
    const avatarId = `${AVATAR_RELATIONSHIP}${index}`;
    if (avatar) {
      const target = `media/certificate-avatar-${index}.png`;
      zip.file(`word/${target}`, await avatar.async("nodebuffer"));
      addImageRelationship(rels, avatarId, target);
    }

    if (index) {
      // Use the existing trailing paragraph to end the previous certificate's section.
      const lastParagraph = children(body, "p").pop()!;
      const properties = children(lastParagraph, "pPr")[0];
      properties.appendChild(currentSection);
      currentSection = doc.importNode(sourceBody.section, true) as Element;
    } else {
      body.removeChild(currentSection);
    }

    for (const sourceBlock of blocks) {
      const block = index ? doc.importNode(sourceBlock, true) as Element : sourceBlock;
      for (const drawing of descendants(block, "docPr", DRAWING)) {
        drawing.setAttribute("id", String(++drawingId));
      }
      if (avatar) {
        for (const image of descendants(block, "blip", GRAPHIC)) {
          if (image.getAttributeNS(REL, "embed") === AVATAR_RELATIONSHIP) {
            image.setAttributeNS(REL, "r:embed", avatarId);
          }
        }
      }
      if (index) body.appendChild(block);
    }
  }
  body.appendChild(currentSection);
  writeXml(zip, DOCUMENT_PATH, doc);
  writeXml(zip, RELATIONSHIPS_PATH, rels);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
